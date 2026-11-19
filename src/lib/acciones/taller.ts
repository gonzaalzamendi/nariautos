"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, mensajeError } from "@/lib/db";
import { auditar, exigirSucursal, exigirAsesor } from "@/lib/sesion";
import { hoyAR } from "@/lib/formato";
import { objeto, primerError, zEntero, zFecha, zHora, zId, zOpcional } from "@/lib/validaciones";
import type { Estado, Sesion } from "@/lib/tipos";

const listo = (mensaje: string): Estado => { revalidatePath("/", "layout"); return { ok: true, mensaje }; };
const AJENO = { error: "Ese turno pertenece a otro taller. Solo podés operar sobre los de tu taller." };

/** Capa 3: el turno debe realizarse en el taller del empleado. */
async function turnoPropio(s: Sesion, id: number) {
  const { data } = await db().from("turnos").select("*, vehiculos(id, patente, km_actual), servicios(nombre)").eq("id", id).maybeSingle();
  return data && data.sucursal_taller_id === s.sucursalId ? (data as any) : null;
}
const evento = (turno: number, estado: string, detalle: string, s: Sesion) => db().from("eventos_turno").insert({ turno_id: turno, estado, detalle, empleado_id: s.id });

// ---------- Asesor de servicio ----------
export async function gestionarTurno(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirAsesor();
  const p = z.object({ turno: zId, accion: z.enum(["confirmar", "rechazar", "ausente"]), motivo: zOpcional(300) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoPropio(s, p.data.turno);
  if (!t) return AJENO;
  const { accion, motivo } = p.data;
  if (accion === "confirmar" && t.estado !== "solicitado") return { error: "Este turno ya no está pendiente de confirmación." };
  if (accion === "rechazar" && !["solicitado", "confirmado"].includes(t.estado)) return { error: "Este turno ya no se puede rechazar." };
  if (accion === "rechazar" && !motivo) return { error: "Indicá el motivo del rechazo para avisarle al cliente." };
  if (accion === "ausente" && t.estado !== "confirmado") return { error: "Solo se marca ausente un turno confirmado." };
  const nuevo = { confirmar: "confirmado", rechazar: "rechazado", ausente: "ausente" }[accion];
  const { error } = await db().from("turnos").update({ estado: nuevo }).eq("id", t.id);
  if (error) return { error: mensajeError(error) };
  await evento(t.id, nuevo, { confirmar: "Turno confirmado por el asesor", rechazar: `Rechazado: ${motivo}`, ausente: "El cliente no se presentó" }[accion], s);
  await auditar(s, `Turno ${nuevo}`, "turnos", t.id, { codigo: t.codigo });
  return listo({ confirmar: "Turno confirmado. Avisale al cliente con los botones de aviso.", rechazar: "Turno rechazado. El horario quedó libre.", ausente: "Turno marcado como no presentado." }[accion]);
}

export async function reprogramarTurnoAsesor(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirAsesor();
  const p = z.object({ turno: zId, fecha: zFecha, hora: zHora }).safeParse(objeto(fd));
  if (!p.success) return { error: "Elegí el nuevo día y horario en la agenda." };
  const t = await turnoPropio(s, p.data.turno);
  if (!t) return AJENO;
  const { error } = await db().rpc("reprogramar_turno", { p_turno: t.id, p_fecha: p.data.fecha, p_hora: p.data.hora, p_empleado: s.id });
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Turno reprogramado", "turnos", t.id, { fecha: p.data.fecha, hora: p.data.hora });
  return listo("Turno reprogramado. Avisale al cliente la nueva fecha.");
}

export async function recibirVehiculo(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirAsesor();
  const p = z.object({
    turno: zId, km_ingreso: zEntero.min(0, "Revisá los kilómetros de ingreso.").max(2000000), combustible_nivel: z.enum(["reserva", "1/4", "1/2", "3/4", "lleno"]),
    observaciones: zOpcional(600), danos_visibles: zOpcional(600), trabajos_solicitados: z.string().trim().min(3, "Detallá los trabajos solicitados por el cliente.").max(800),
  }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoPropio(s, p.data.turno);
  if (!t) return AJENO;
  if (!["solicitado", "confirmado"].includes(t.estado)) return { error: "Este vehículo ya fue recibido o el turno no está vigente." };
  const { turno, ...orden } = p.data;
  const { data: o, error } = await db().from("ordenes_trabajo").insert({ turno_id: turno, ...orden, observaciones: orden.observaciones ?? null, danos_visibles: orden.danos_visibles ?? "Sin daños visibles." }).select("id").single();
  if (error) return { error: error.code === "23505" ? "Este turno ya tiene una orden de trabajo." : mensajeError(error) };
  await db().from("turnos").update({ estado: "recibido" }).eq("id", t.id);
  await db().from("vehiculos").update({ km_actual: Math.max(t.vehiculos.km_actual ?? 0, orden.km_ingreso) }).eq("id", t.vehiculos.id);
  await evento(t.id, "recibido", `Vehículo recibido con ${orden.km_ingreso} km. Orden de trabajo N.º ${o.id}`, s);
  await auditar(s, "Recepción de vehículo", "ordenes_trabajo", o.id, { turno: t.codigo });
  return listo(`Vehículo recibido. Se generó la orden de trabajo N.º ${o.id} para el jefe de taller.`);
}

export async function entregarVehiculo(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirAsesor();
  const p = z.object({ turno: zId, km_egreso: zEntero.min(0, "Revisá los kilómetros de egreso."), trabajos_realizados: z.string().trim().min(3, "Detallá los trabajos realizados: quedan en el historial del vehículo.").max(1000) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const t = await turnoPropio(s, p.data.turno);
  if (!t) return AJENO;
  if (t.estado !== "listo") return { error: "El vehículo se entrega cuando el taller termina el trabajo (estado «Listo para retirar»)." };
  const d = db();
  const { data: o } = await d.from("ordenes_trabajo").select("id, km_ingreso").eq("turno_id", t.id).single();
  if (o && p.data.km_egreso < o.km_ingreso) return { error: `Los kilómetros de egreso no pueden ser menores que los de ingreso (${o.km_ingreso} km).` };
  await d.from("ordenes_trabajo").update({ estado: "cerrada", km_egreso: p.data.km_egreso, trabajos_realizados: p.data.trabajos_realizados, cerrada_en: new Date().toISOString() }).eq("turno_id", t.id);
  await d.from("turnos").update({ estado: "entregado" }).eq("id", t.id);
  await d.from("vehiculos").update({ km_actual: p.data.km_egreso }).eq("id", t.vehiculos.id);
  await d.from("historial_service").insert({ vehiculo_id: t.vehiculos.id, turno_id: t.id, sucursal_id: t.sucursal_taller_id, fecha: hoyAR(), km: p.data.km_egreso, servicio: t.servicios.nombre, trabajos: p.data.trabajos_realizados });
  await d.from("notificaciones").upsert({ tipo: "encuesta", turno_id: t.id, vehiculo_id: t.vehiculos.id, cliente_id: t.cliente_id, sucursal_id: t.sucursal_taller_id, clave: `encuesta-${t.id}`,
    mensaje: `Gracias por confiar en NariAutos. ¿Nos contás cómo fue tu experiencia? Son dos preguntas: {SITIO}/encuesta/${t.codigo}` }, { onConflict: "clave", ignoreDuplicates: true });
  await evento(t.id, "entregado", `Vehículo entregado con ${p.data.km_egreso} km`, s);
  await auditar(s, "Entrega de vehículo", "turnos", t.id, { codigo: t.codigo });
  return listo("Vehículo entregado. El trabajo quedó en el historial y la encuesta está lista para enviar.");
}

export async function registrarAviso(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirAsesor();
  const p = z.object({ turno: z.preprocess((v) => v || undefined, zId.optional()), notificacion: z.preprocess((v) => v || undefined, zId.optional()), canal: z.enum(["whatsapp", "email"]), mensaje: z.string().trim().min(3).max(1000) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const ahora = new Date().toISOString();
  if (p.data.notificacion) {
    const { data: n } = await db().from("notificaciones").select("id, sucursal_id, turno_id").eq("id", p.data.notificacion).maybeSingle();
    if (!n || n.sucursal_id !== s.sucursalId) return AJENO;
    await db().from("notificaciones").update({ estado: "enviada", canal: p.data.canal, enviada_en: ahora, empleado_id: s.id }).eq("id", n.id);
  } else {
    const t = p.data.turno ? await turnoPropio(s, p.data.turno) : null;
    if (!t) return AJENO;
    await db().from("notificaciones").insert({ tipo: "estado", turno_id: t.id, vehiculo_id: t.vehiculos.id, cliente_id: t.cliente_id, sucursal_id: t.sucursal_taller_id, mensaje: p.data.mensaje, estado: "enviada", canal: p.data.canal, enviada_en: ahora, empleado_id: s.id });
  }
  return listo(`Aviso por ${p.data.canal === "whatsapp" ? "WhatsApp" : "email"} registrado en el historial.`);
}

// ---------- Jefe de taller ----------
async function ordenPropia(s: Sesion, id: number) {
  const { data } = await db().from("v_ordenes").select("*").eq("id", id).maybeSingle();
  return data && data.sucursal_taller_id === s.sucursalId ? (data as any) : null;
}

export async function asignarMecanico(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ orden: zId, mecanico: zId, minutos: zEntero.min(15, "El tiempo estimado mínimo es de 15 minutos.").max(2400) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const o = await ordenPropia(s, p.data.orden);
  if (!o) return AJENO;
  if (["terminada", "cerrada"].includes(o.estado)) return { error: "Esta orden ya está terminada." };
  const { data: m } = await db().from("mecanicos").select("id, nombre, sucursal_id, activo").eq("id", p.data.mecanico).maybeSingle();
  if (!m || m.sucursal_id !== s.sucursalId || !m.activo) return { error: "Elegí un mecánico activo de tu taller." };
  const { error } = await db().from("asignaciones").upsert({ orden_id: o.id, mecanico_id: m.id, minutos_estimados: p.data.minutos }, { onConflict: "orden_id" });
  if (error) return { error: mensajeError(error) };
  if (o.estado === "pendiente") await db().from("ordenes_trabajo").update({ estado: "asignada" }).eq("id", o.id);
  await auditar(s, "Asignación de trabajo", "ordenes_trabajo", o.id, { mecanico: m.nombre, minutos: p.data.minutos });
  return listo(`Trabajo asignado a ${m.nombre}.`);
}

export async function moverOrden(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ orden: zId, estado: z.enum(["en_reparacion", "espera_repuestos", "terminada"]), motivo: zOpcional(300) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const o = await ordenPropia(s, p.data.orden);
  if (!o) return AJENO;
  if (!o.asignacion_id) return { error: "Asigná primero un mecánico a esta orden." };
  if (["terminada", "cerrada"].includes(o.estado)) return { error: "Esta orden ya está terminada." };
  const d = db(), ahora = new Date().toISOString();
  if (p.data.estado === "terminada") {
    if (!o.inicio_en) return { error: "Iniciá el trabajo antes de terminarlo." };
    if (o.demorado && !o.motivo_demora && !p.data.motivo) return { error: "Este trabajo superó el tiempo estimado. Cargá el motivo de la demora para terminarlo." };
    await d.from("asignaciones").update({ fin_en: ahora, ...(p.data.motivo ? { motivo_demora: p.data.motivo } : {}) }).eq("id", o.asignacion_id);
    await d.from("turnos").update({ estado: "listo" }).eq("id", o.turno_id);
    await d.from("eventos_turno").insert({ turno_id: o.turno_id, estado: "listo", detalle: "Trabajo terminado. Vehículo listo para retirar", empleado_id: s.id });
  } else {
    if (!o.inicio_en) await d.from("asignaciones").update({ inicio_en: ahora }).eq("id", o.asignacion_id);
    if (o.turno_estado === "recibido") {
      await d.from("turnos").update({ estado: "en_reparacion" }).eq("id", o.turno_id);
      await d.from("eventos_turno").insert({ turno_id: o.turno_id, estado: "en_reparacion", detalle: `Trabajo iniciado por ${o.mecanico}`, empleado_id: s.id });
    }
  }
  const { error } = await d.from("ordenes_trabajo").update({ estado: p.data.estado }).eq("id", o.id);
  if (error) return { error: mensajeError(error) };
  await auditar(s, `Orden movida a ${p.data.estado}`, "ordenes_trabajo", o.id);
  return listo({ en_reparacion: "Trabajo en reparación.", espera_repuestos: "Orden en espera de repuestos.", terminada: "Trabajo terminado. El asesor ya puede avisar al cliente." }[p.data.estado]);
}

export async function guardarMotivoDemora(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ orden: zId, motivo: z.string().trim().min(5, "Escribí el motivo de la demora (al menos 5 caracteres).").max(300) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const o = await ordenPropia(s, p.data.orden);
  if (!o?.asignacion_id) return AJENO;
  await db().from("asignaciones").update({ motivo_demora: p.data.motivo }).eq("id", o.asignacion_id);
  await auditar(s, "Motivo de demora", "ordenes_trabajo", o.id, { motivo: p.data.motivo });
  return listo("Motivo de la demora guardado.");
}

// ---------- Repuestos y mecánicos (jefe de taller) ----------
const idOpc = z.preprocess((v) => (v === "" || v == null ? undefined : v), zId.optional());

export async function guardarRepuesto(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ id: idOpc, codigo: z.string().trim().toUpperCase().min(2, "Ingresá el código del repuesto.").max(20), nombre: z.string().trim().min(3, "Ingresá el nombre del repuesto.").max(80),
    stock: zEntero.min(0, "El stock no puede ser negativo.").max(100000), stock_minimo: zEntero.min(0, "El stock mínimo no puede ser negativo.").max(100000), precio: z.coerce.number().min(0, "El precio no puede ser negativo.") }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { id, ...fila } = p.data;
  const r = id ? await db().from("repuestos").update(fila).eq("id", id).eq("sucursal_id", s.sucursalId).select("id").maybeSingle()
    : await db().from("repuestos").insert({ ...fila, sucursal_id: s.sucursalId }).select("id").single();
  if (r.error) return { error: r.error.code === "23505" ? `Ya existe un repuesto con el código ${fila.codigo} en tu taller.` : mensajeError(r.error) };
  if (!r.data) return AJENO;
  await auditar(s, id ? "Edición de repuesto" : "Alta de repuesto", "repuestos", r.data.id, { codigo: fila.codigo, stock: fila.stock });
  return listo(id ? "Repuesto actualizado." : "Repuesto agregado al inventario.");
}

export async function ingresarStock(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ repuesto: zId, cantidad: zEntero.min(1, "Ingresá una cantidad mayor a cero.").max(10000) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: r } = await db().from("repuestos").select("id, stock, nombre").eq("id", p.data.repuesto).eq("sucursal_id", s.sucursalId).maybeSingle();
  if (!r) return AJENO;
  await db().from("repuestos").update({ stock: r.stock + p.data.cantidad }).eq("id", r.id);
  await auditar(s, "Ingreso de repuestos", "repuestos", r.id, { cantidad: p.data.cantidad });
  return listo(`Se sumaron ${p.data.cantidad} unidades de ${r.nombre}.`);
}

export async function usarRepuesto(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ orden: zId, repuesto: zId, cantidad: zEntero.min(1, "Ingresá una cantidad mayor a cero.").max(1000) }).safeParse(objeto(fd));
  if (!p.success) return { error: "Elegí la orden, el repuesto y la cantidad." };
  const o = await ordenPropia(s, p.data.orden);
  const { data: r } = await db().from("repuestos").select("id, sucursal_id").eq("id", p.data.repuesto).maybeSingle();
  if (!o || !r || r.sucursal_id !== s.sucursalId) return AJENO;
  if (o.estado === "cerrada") return { error: "Esa orden ya está cerrada." };
  const { error } = await db().rpc("usar_repuesto", { p_orden: o.id, p_repuesto: r.id, p_cantidad: p.data.cantidad });
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Repuesto usado en orden", "ordenes_trabajo", o.id, { repuesto: r.id, cantidad: p.data.cantidad });
  return listo("Repuesto cargado a la orden y descontado del stock.");
}

export async function guardarMecanico(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ id: idOpc, nombre: z.string().trim().min(3, "Ingresá nombre y apellido del mecánico.").max(80), especialidad: zOpcional(80) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const fila = { nombre: p.data.nombre, especialidad: p.data.especialidad ?? null };
  const r = p.data.id ? await db().from("mecanicos").update(fila).eq("id", p.data.id).eq("sucursal_id", s.sucursalId).select("id").maybeSingle()
    : await db().from("mecanicos").insert({ ...fila, sucursal_id: s.sucursalId }).select("id").single();
  if (r.error) return { error: mensajeError(r.error) };
  if (!r.data) return AJENO;
  await auditar(s, p.data.id ? "Edición de mecánico" : "Alta de mecánico", "mecanicos", r.data.id, fila);
  return listo(p.data.id ? "Datos del mecánico guardados." : `${fila.nombre} ya está disponible para asignarle trabajos.`);
}

export async function alternarMecanico(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("jefe_taller");
  const p = z.object({ mecanico: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: m } = await db().from("mecanicos").select("id, activo, nombre").eq("id", p.data.mecanico).eq("sucursal_id", s.sucursalId).maybeSingle();
  if (!m) return AJENO;
  if (m.activo) {
    const { count } = await db().from("v_ordenes").select("id", { count: "exact", head: true }).eq("mecanico_id", m.id).in("estado", ["asignada", "en_reparacion", "espera_repuestos"]);
    if (count) return { error: `${m.nombre} tiene ${count} ${count === 1 ? "trabajo" : "trabajos"} en curso. Reasignalos o terminalos antes de darlo de baja.` };
  }
  await db().from("mecanicos").update({ activo: !m.activo }).eq("id", m.id);
  await auditar(s, m.activo ? "Baja de mecánico" : "Reactivación de mecánico", "mecanicos", m.id);
  return listo(m.activo ? `${m.nombre} ya no aparece para asignar trabajos.` : `${m.nombre} vuelve a estar disponible.`);
}
