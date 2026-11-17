"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, mensajeError } from "@/lib/db";
import { protegerFormulario } from "@/lib/antispam";
import { franjasLibres, historialDePatente, obtenerCliente } from "@/lib/datos";
import { auditar } from "@/lib/sesion";
import { objeto, primerError, zContacto, zEntero, zFecha, zHora, zId, zOpcional, zPatente, zTurno } from "@/lib/validaciones";
import { hoyAR } from "@/lib/formato";
import type { Estado } from "@/lib/tipos";

const SPAM_OK: Estado = { ok: true, mensaje: "Recibimos tu solicitud. Un asesor te va a contactar a la brevedad." };

async function unidadPublicada(id: number) {
  return (await db().from("unidades").select("id, sucursal_id, estado").eq("id", id).neq("estado", "vendida").maybeSingle()).data;
}

export async function pedirCotizacion(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "cotizacion");
  if (freno === "spam") return SPAM_OK; if (freno) return freno;
  const p = zContacto.extend({ unidad: zId, mensaje: zOpcional(600), simulacion: zOpcional(600) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const u = await unidadPublicada(p.data.unidad);
  if (!u) return { error: "Esta unidad ya no está publicada. Volvé al catálogo para ver las disponibles." };
  let simulacion = null;
  try { simulacion = p.data.simulacion ? JSON.parse(p.data.simulacion) : null; } catch { /* se ignora una simulación inválida */ }
  const cliente = await obtenerCliente(p.data.nombre, p.data.telefono, p.data.email);
  const { error } = await db().from("consultas").insert({ tipo: "cotizacion", canal: "web", sucursal_id: u.sucursal_id, unidad_id: u.id, cliente_id: cliente, mensaje: p.data.mensaje ?? null, simulacion });
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Recibimos tu pedido de cotización. Un vendedor de la sucursal te va a contactar dentro de las próximas 24 horas hábiles." };
}

export async function agendarTestDrive(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "test_drive");
  if (freno === "spam") return SPAM_OK; if (freno) return freno;
  const p = zContacto.extend({ unidad: zId, fecha: zFecha, hora: zHora }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.hora < "09:00" || p.data.hora > "18:00") return { error: "Elegí un horario entre las 9 y las 18 h, que es cuando atiende el salón." };
  if (p.data.fecha <= hoyAR()) return { error: "Elegí una fecha a partir de mañana para el test drive." };
  const u = await unidadPublicada(p.data.unidad);
  if (!u) return { error: "Esta unidad ya no está publicada. Volvé al catálogo para ver las disponibles." };
  const cliente = await obtenerCliente(p.data.nombre, p.data.telefono, p.data.email);
  const { data: c, error } = await db().from("consultas").insert({ tipo: "test_drive", canal: "web", sucursal_id: u.sucursal_id, unidad_id: u.id, cliente_id: cliente, mensaje: "Solicitud de test drive desde la web." }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await db().from("test_drives").insert({ consulta_id: c.id, unidad_id: u.id, fecha: p.data.fecha, hora: p.data.hora });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Test drive solicitado. Queda pendiente de confirmación: el vendedor te va a avisar por teléfono o WhatsApp." };
}

export async function consultarDisponibilidad(taller: number, fecha: string, servicio: number): Promise<{ hora: string; libres: number }[]> {
  const p = z.object({ taller: zId, fecha: zFecha, servicio: zId }).safeParse({ taller, fecha, servicio });
  if (!p.success) return [];
  try { return await franjasLibres(p.data.taller, p.data.fecha, p.data.servicio); } catch { return []; }
}

export async function reservarTurnoWeb(datos: Record<string, unknown>): Promise<Estado> {
  const freno = await protegerFormulario(null, "turno");
  if (freno === "spam") return SPAM_OK; if (freno) return freno;
  if (datos.sitio_web) return SPAM_OK;
  const p = zTurno.safeParse(datos);
  if (!p.success) return { error: primerError(p.error) };
  const t = p.data;
  const { data, error } = await db().rpc("reservar_turno", {
    p_servicio: t.servicio, p_taller: t.taller, p_origen: t.origen, p_canal: "web", p_fecha: t.fecha, p_hora: t.hora,
    p_patente: t.patente, p_marca: t.marca, p_modelo: t.modelo, p_anio: t.anio, p_km: t.km,
    p_nombre: t.nombre, p_telefono: t.telefono, p_email: t.email ?? null, p_observaciones: t.observaciones ?? null, p_empleado: null,
  });
  if (error) return { error: mensajeError(error) };
  const { data: veh } = await db().from("vehiculos").select("codigo_auto").eq("id", data.vehiculo_id).single();
  revalidatePath("/", "layout");
  return { ok: true, datos: { codigo: data.codigo, fecha: data.fecha, hora: data.hora, derivado: data.derivado, patente: t.patente, codigoAuto: veh?.codigo_auto } };
}

const zSeguir = z.object({ patente: zPatente, codigo: z.preprocess((v) => String(v ?? "").toUpperCase().trim(), z.string().min(4, "Ingresá el código de turno que recibiste al reservar.").max(10)) });
const faltanMasDe24h = (fecha: string, hora: string) => new Date(`${fecha}T${hora.slice(0, 5)}:00-03:00`).getTime() - Date.now() >= 24 * 3600e3;

async function turnoDeCliente(patente: string, codigo: string) {
  const { data } = await db().from("turnos")
    .select("*, vehiculos!inner(patente, marca, modelo, codigo_auto), servicios(nombre, duracion_min), taller:sucursales!turnos_sucursal_taller_id_fkey(nombre, direccion, localidad, telefono), origen:sucursales!turnos_sucursal_origen_id_fkey(nombre), clientes(nombre), eventos_turno(estado, detalle, creado_en), encuestas(id)")
    .eq("codigo", codigo).eq("vehiculos.patente", patente).maybeSingle();
  return data as any;
}

export async function buscarTurno(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "seguir", 20);
  if (freno === "spam") return {}; if (freno) return freno;
  const p = zSeguir.safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoDeCliente(p.data.patente, p.data.codigo);
  if (!t) return { error: "No encontramos un turno con esa patente y ese código. Revisá los dos datos; el código figura en la confirmación del turno." };
  return { ok: true, datos: {
    codigo: t.codigo, patente: t.vehiculos.patente, codigoAuto: t.vehiculos.codigo_auto, vehiculo: `${t.vehiculos.marca} ${t.vehiculos.modelo}`, servicio: t.servicios.nombre, servicioId: t.servicio_id,
    estado: t.estado, fecha: t.fecha, hora: t.hora, tallerId: t.sucursal_taller_id, taller: t.taller, origen: t.origen?.nombre, derivado: t.derivado, cliente: t.clientes.nombre.split(" ")[0],
    eventos: [...t.eventos_turno].sort((a: any, b: any) => a.creado_en.localeCompare(b.creado_en)),
    modificable: ["solicitado", "confirmado"].includes(t.estado) && faltanMasDe24h(t.fecha, t.hora),
    activo: ["solicitado", "confirmado"].includes(t.estado),
    encuestaPendiente: t.estado === "entregado" && !(Array.isArray(t.encuestas) ? t.encuestas.length : t.encuestas),
  } };
}

export async function cancelarTurnoCliente(_: Estado, fd: FormData): Promise<Estado> {
  const p = zSeguir.safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoDeCliente(p.data.patente, p.data.codigo);
  if (!t) return { error: "No encontramos el turno. Volvé a buscarlo con patente y código." };
  if (!["solicitado", "confirmado"].includes(t.estado)) return { error: "Este turno ya no se puede cancelar desde la web." };
  if (!faltanMasDe24h(t.fecha, t.hora)) return { error: `Faltan menos de 24 horas para el turno. Para cancelarlo llamá al taller: ${t.taller.telefono}.` };
  const { error } = await db().from("turnos").update({ estado: "cancelado" }).eq("id", t.id);
  if (error) return { error: mensajeError(error) };
  await db().from("eventos_turno").insert({ turno_id: t.id, estado: "cancelado", detalle: "Cancelado por el cliente desde la web" });
  await auditar(null, "Cancelación de turno", "turnos", t.id, { codigo: t.codigo });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Turno cancelado. Podés sacar uno nuevo cuando quieras." };
}

export async function reprogramarTurnoCliente(_: Estado, fd: FormData): Promise<Estado> {
  const p = zSeguir.extend({ fecha: zFecha, hora: zHora }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoDeCliente(p.data.patente, p.data.codigo);
  if (!t) return { error: "No encontramos el turno. Volvé a buscarlo con patente y código." };
  if (!["solicitado", "confirmado"].includes(t.estado) || !faltanMasDe24h(t.fecha, t.hora)) return { error: `Este turno ya no se puede reprogramar desde la web. Llamá al taller: ${t.taller.telefono}.` };
  const { error } = await db().rpc("reprogramar_turno", { p_turno: t.id, p_fecha: p.data.fecha, p_hora: p.data.hora, p_empleado: null });
  if (error) return { error: mensajeError(error) };
  await auditar(null, "Reprogramación de turno", "turnos", t.id, { codigo: t.codigo, fecha: p.data.fecha, hora: p.data.hora });
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Turno reprogramado. Volvé a buscarlo para ver la nueva fecha." };
}

export async function buscarHistorial(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "historial", 15);
  if (freno === "spam") return {}; if (freno) return freno;
  const p = z.object({ patente: zPatente, codigo_auto: z.preprocess((v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""), z.string().regex(/^[A-Z]{2}\d{2}$/, "El código del vehículo tiene 2 letras y 2 números, por ejemplo TC18. Figura en la confirmación de tu turno.")) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const h = await historialDePatente(p.data.patente);
  // Única llave válida: patente + código del vehículo (no sirve el código de turno ni el teléfono)
  if (!h || h.vehiculo.codigo_auto !== p.data.codigo_auto) return { error: "No encontramos un vehículo con esa patente y ese código. Revisá los dos datos; el código figura en la confirmación de tu turno o te lo da el asesor del taller." };
  return { ok: true, datos: { vehiculo: { patente: h.vehiculo.patente, marca: h.vehiculo.marca, modelo: h.vehiculo.modelo, anio: h.vehiculo.anio, km_actual: h.vehiculo.km_actual }, historial: h.historial } };
}

/** Datos no personales de una patente ya registrada, para autocompletar y evitar cargas inconsistentes. */
export async function datosDePatente(patente: string): Promise<{ marca: string; modelo: string; anio: number } | null> {
  const p = zPatente.safeParse(patente);
  if (!p.success || (await protegerFormulario(null, "patente", 40))) return null;
  const { data } = await db().from("vehiculos").select("marca, modelo, anio").eq("patente", p.data).maybeSingle();
  return data ?? null;
}

export async function solicitarTasacion(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "tasacion", 4);
  if (freno === "spam") return SPAM_OK; if (freno) return freno;
  const p = zContacto.extend({
    sucursal: zId, unidad_interes: z.preprocess((v) => (v ? v : undefined), zId.optional()),
    marca: z.string().trim().min(2, "Ingresá la marca de tu usado.").max(40), modelo: z.string().trim().min(1, "Ingresá el modelo de tu usado.").max(40),
    anio: zEntero.min(1980, "Revisá el año de tu usado.").max(new Date().getFullYear() + 1, "Revisá el año de tu usado."), km: zEntero.min(0).max(2000000),
    estado_general: z.enum(["excelente", "muy_bueno", "bueno", "regular"]), comentarios: zOpcional(600),
  }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  // Fotos obligatorias, en orden: frente, costado izquierdo, costado derecho, atrás e interior
  const fotos = fd.getAll("foto").map(String).filter((f) => f.startsWith("data:image/jpeg;base64,") && f.length < 600000).slice(0, 5);
  if (fotos.length < 5) return { error: `Faltan fotos del vehículo: subí las 5 (frente, ambos costados, atrás e interior). Cargaste ${fotos.length}.` };
  const d = p.data, cliente = await obtenerCliente(d.nombre, d.telefono, d.email);
  const { error } = await db().from("tasaciones").insert({ cliente_id: cliente, sucursal_id: d.sucursal, unidad_interes_id: d.unidad_interes ?? null, marca: d.marca, modelo: d.modelo, anio: d.anio, km: d.km, estado_general: d.estado_general, comentarios: d.comentarios ?? null, fotos });
  if (error) return { error: mensajeError(error) };
  revalidatePath("/", "layout");
  return { ok: true, mensaje: "Recibimos los datos de tu usado. Un vendedor te va a responder con un valor estimado dentro de las próximas 24 horas hábiles." };
}

export async function enviarEncuesta(_: Estado, fd: FormData): Promise<Estado> {
  const freno = await protegerFormulario(fd, "encuesta");
  if (freno === "spam") return SPAM_OK; if (freno) return freno;
  const p = z.object({ codigo: z.string().trim().toUpperCase().min(4).max(10), puntaje: zEntero.min(1, "Elegí un puntaje del 1 al 5.").max(5), comentario: zOpcional(600) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: t } = await db().from("turnos").select("id, estado").eq("codigo", p.data.codigo).maybeSingle();
  if (!t || t.estado !== "entregado") return { error: "Esta encuesta todavía no está disponible. Se habilita cuando retirás tu vehículo." };
  const { error } = await db().from("encuestas").insert({ turno_id: t.id, puntaje: p.data.puntaje, comentario: p.data.comentario ?? null });
  if (error) return { error: error.code === "23505" ? "Ya recibimos tu opinión sobre este turno. Gracias." : mensajeError(error) };
  return { ok: true, mensaje: "Gracias por tu opinión. Nos ayuda a mejorar la atención del taller." };
}

