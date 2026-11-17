"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, mensajeError } from "@/lib/db";
import { auditar, exigir, exigirSucursal } from "@/lib/sesion";
import { obtenerCliente } from "@/lib/datos";
import { hoyAR } from "@/lib/formato";
import { normalizarPatente, objeto, primerError, zContacto, zFecha, zHora, zId, zOpcional, zTurno, zUnidad } from "@/lib/validaciones";
import type { Estado, Sesion } from "@/lib/tipos";

const listo = (mensaje: string, datos?: any): Estado => { revalidatePath("/", "layout"); return { ok: true, mensaje, datos }; };
const AJENA = { error: "Ese registro pertenece a otra sucursal. Solo podés operar sobre los de tu sucursal." };
const idOpcional = z.preprocess((v) => (v === "" || v == null ? undefined : v), zId.optional());

/** Capa 3: la consulta debe ser de la sucursal del vendedor. */
async function consultaPropia(s: Sesion, id: number) {
  const { data } = await db().from("consultas").select("*").eq("id", id).maybeSingle();
  return data && data.sucursal_id === s.sucursalId ? data : null;
}
async function unidadOperable(s: Sesion, id: number) {
  const { data } = await db().from("unidades").select("*").eq("id", id).maybeSingle();
  return data && (s.rol === "gerencia" || data.sucursal_id === s.sucursalId) ? data : null;
}

// ---------- Consultas ----------
export async function crearConsultaManual(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = zContacto.extend({ tipo: z.enum(["cotizacion", "general"]), canal: z.enum(["telefono", "whatsapp", "presencial"]), unidad: idOpcional, mensaje: zOpcional(600) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const cliente = await obtenerCliente(p.data.nombre, p.data.telefono, p.data.email);
  const { data, error } = await db().from("consultas").insert({
    tipo: p.data.tipo, canal: p.data.canal, estado: "en_seguimiento", sucursal_id: s.sucursalId, vendedor_id: s.id, unidad_id: p.data.unidad ?? null,
    cliente_id: cliente, mensaje: p.data.mensaje ?? null, primera_respuesta_en: new Date().toISOString(),
  }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Carga manual de consulta", "consultas", data.id, { canal: p.data.canal });
  revalidatePath("/", "layout");
  redirect(`/vendedor/consultas/${data.id}`);
}

export async function agregarSeguimiento(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ consulta: zId, nota: z.string().trim().min(3, "Escribí una nota de al menos 3 caracteres.").max(800) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const c = await consultaPropia(s, p.data.consulta);
  if (!c) return AJENA;
  await db().from("seguimientos_consulta").insert({ consulta_id: c.id, empleado_id: s.id, nota: p.data.nota });
  await db().from("consultas").update({ vendedor_id: c.vendedor_id ?? s.id, primera_respuesta_en: c.primera_respuesta_en ?? new Date().toISOString(), ...(c.estado === "nueva" ? { estado: "en_seguimiento" } : {}) }).eq("id", c.id);
  return listo("Seguimiento registrado.");
}

export async function responderCotizacion(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ consulta: zId, precio: z.coerce.number().positive("Ingresá el precio cotizado."), bonificacion: z.coerce.number().min(0, "La bonificación no puede ser negativa.").default(0), financiacion: zOpcional(400) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.bonificacion >= p.data.precio) return { error: "La bonificación tiene que ser menor que el precio cotizado." };
  const c = await consultaPropia(s, p.data.consulta);
  if (!c) return AJENA;
  if (["ganada", "perdida"].includes(c.estado)) return { error: "Esta consulta ya está cerrada." };
  const ahora = new Date().toISOString();
  const { error } = await db().from("consultas").update({ estado: "cotizada", precio_cotizado: p.data.precio, bonificacion: p.data.bonificacion, financiacion_ofrecida: p.data.financiacion ?? null, cotizada_en: ahora, vendedor_id: c.vendedor_id ?? s.id, primera_respuesta_en: c.primera_respuesta_en ?? ahora }).eq("id", c.id);
  if (error) return { error: mensajeError(error) };
  await db().from("seguimientos_consulta").insert({ consulta_id: c.id, empleado_id: s.id, nota: "Cotización enviada al cliente." });
  await auditar(s, "Cotización respondida", "consultas", c.id, { precio: p.data.precio, bonificacion: p.data.bonificacion });
  return listo("Cotización guardada. Ya podés descargar el PDF y enviarlo.");
}

export async function cerrarConsulta(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ consulta: zId, resultado: z.enum(["ganada", "perdida"]), motivo: zOpcional(300) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.resultado === "perdida" && !p.data.motivo) return { error: "Indicá el motivo por el que se perdió la consulta." };
  const c = await consultaPropia(s, p.data.consulta);
  if (!c) return AJENA;
  const ahora = new Date().toISOString();
  const { error } = await db().from("consultas").update({ estado: p.data.resultado, motivo_perdida: p.data.resultado === "perdida" ? p.data.motivo : null, cerrada_en: ahora, vendedor_id: c.vendedor_id ?? s.id, primera_respuesta_en: c.primera_respuesta_en ?? ahora }).eq("id", c.id);
  if (error) return { error: mensajeError(error) };
  if (p.data.resultado === "ganada" && c.unidad_id) {
    const u = await unidadOperable(s, c.unidad_id);
    if (u && u.estado !== "vendida") {
      await db().from("unidades").update({ estado: "vendida", fecha_venta: hoyAR(), precio_venta: c.precio_cotizado ? Number(c.precio_cotizado) - Number(c.bonificacion ?? 0) : u.precio, vendedor_id: s.id }).eq("id", u.id);
      await db().from("reservas_unidad").update({ estado: "concretada" }).eq("unidad_id", u.id).eq("estado", "activa");
    }
  }
  await auditar(s, p.data.resultado === "ganada" ? "Consulta ganada (venta)" : "Consulta perdida", "consultas", c.id, { motivo: p.data.motivo });
  return listo(p.data.resultado === "ganada" ? "Venta registrada. La unidad quedó marcada como vendida." : "Consulta cerrada como perdida.");
}

export async function gestionarTestDrive(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ test: zId, accion: z.enum(["confirmar", "reprogramar", "realizado", "cancelar"]), fecha: z.preprocess((v) => v || undefined, zFecha.optional()), hora: z.preprocess((v) => v || undefined, zHora.optional()) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: td } = await db().from("test_drives").select("*").eq("id", p.data.test).maybeSingle();
  const c = td ? await consultaPropia(s, td.consulta_id) : null;
  if (!td || !c) return AJENA;
  const cambio: Record<string, unknown> = {};
  if (p.data.accion === "reprogramar") {
    if (!p.data.fecha || !p.data.hora) return { error: "Elegí la nueva fecha y el horario." };
    if (p.data.fecha < hoyAR()) return { error: "La nueva fecha no puede ser anterior a hoy." };
    Object.assign(cambio, { fecha: p.data.fecha, hora: p.data.hora, estado: "confirmado" });
  } else cambio.estado = { confirmar: "confirmado", realizado: "realizado", cancelar: "cancelado" }[p.data.accion];
  await db().from("test_drives").update(cambio).eq("id", td.id);
  const ahora = new Date().toISOString();
  if (!["ganada", "perdida"].includes(c.estado))
    await db().from("consultas").update({ vendedor_id: c.vendedor_id ?? s.id, primera_respuesta_en: c.primera_respuesta_en ?? ahora, ...(cambio.estado === "confirmado" ? { estado: "test_drive_agendado" } : {}) }).eq("id", c.id);
  await auditar(s, `Test drive: ${p.data.accion}`, "test_drives", td.id);
  return listo({ confirmar: "Test drive confirmado.", reprogramar: "Test drive reprogramado y confirmado.", realizado: "Test drive marcado como realizado.", cancelar: "Test drive cancelado." }[p.data.accion]);
}

// ---------- Unidades ----------
export async function guardarUnidad(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia"); // el vendedor solo ve las unidades
  const p = zUnidad.extend({ id: idOpcional, sucursal: idOpcional }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { id, sucursal, ...campos } = p.data;
  const base = "/gerencia/unidades";
  const fila = { ...campos, version: campos.version ?? null, color: campos.color ?? null, descripcion: campos.descripcion ?? null, km: campos.condicion === "0km" ? 0 : campos.km };
  if (id) {
    if (!(await unidadOperable(s, id))) return AJENA;
    const { error } = await db().from("unidades").update({ ...fila, ...(s.rol === "gerencia" && sucursal ? { sucursal_id: sucursal } : {}) }).eq("id", id);
    if (error) return { error: mensajeError(error) };
    await auditar(s, "Edición de unidad", "unidades", id);
    return listo("Cambios guardados.");
  }
  const suc = s.rol === "gerencia" ? sucursal : s.sucursalId;
  if (!suc) return { error: "Elegí la sucursal donde ingresa la unidad." };
  const { data, error } = await db().from("unidades").insert({ ...fila, sucursal_id: suc }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await db().from("fotos_unidad").insert([1, 2, 3].map((n) => ({ unidad_id: data.id, url: `/placeholder?u=${data.id}&v=${n}`, orden: n })));
  await auditar(s, "Alta de unidad", "unidades", data.id, { marca: fila.marca, modelo: fila.modelo });
  revalidatePath("/", "layout");
  redirect(`${base}/${data.id}`);
}

export async function cambiarEstadoUnidad(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ unidad: zId, estado: z.enum(["disponible", "vendida"]) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const u = await unidadOperable(s, p.data.unidad);
  if (!u) return AJENA;
  const cambio = p.data.estado === "vendida" ? { estado: "vendida", fecha_venta: hoyAR(), precio_venta: u.precio, vendedor_id: s.rol === "vendedor" ? s.id : u.vendedor_id } : { estado: "disponible", fecha_venta: null, precio_venta: null };
  const { error } = await db().from("unidades").update(cambio).eq("id", u.id);
  if (error) return { error: mensajeError(error) };
  await db().from("reservas_unidad").update({ estado: p.data.estado === "vendida" ? "concretada" : "cancelada" }).eq("unidad_id", u.id).eq("estado", "activa");
  await auditar(s, `Unidad marcada como ${p.data.estado}`, "unidades", u.id);
  return listo(p.data.estado === "vendida" ? "Unidad marcada como vendida." : "Unidad disponible nuevamente.");
}

export async function subirFotos(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ unidad: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const u = await unidadOperable(s, p.data.unidad);
  if (!u) return AJENA;
  const fotos = fd.getAll("foto").map(String).filter((f) => f.startsWith("data:image/jpeg;base64,") && f.length < 600000).slice(0, 4);
  if (fotos.length === 0) return { error: "Elegí al menos una foto para subir." };
  const d = db();
  const { data: actuales } = await d.from("fotos_unidad").select("id, url, orden").eq("unidad_id", u.id);
  if ((actuales ?? []).filter((f: any) => !f.url).length + fotos.length > 8) return { error: "Cada unidad admite hasta 8 fotos. Quitá alguna antes de subir más." };
  await d.from("fotos_unidad").delete().eq("unidad_id", u.id).like("url", "/placeholder%"); // las fotos reales reemplazan a las ilustrativas
  const { error } = await d.from("fotos_unidad").insert(fotos.map((f, i) => ({ unidad_id: u.id, datos: f.split(",")[1], mime: "image/jpeg", orden: (actuales?.length ?? 0) + i + 1 })));
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Carga de fotos", "unidades", u.id, { cantidad: fotos.length });
  return listo(fotos.length === 1 ? "Foto subida." : `${fotos.length} fotos subidas.`);
}

export async function eliminarFoto(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ foto: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: f } = await db().from("fotos_unidad").select("id, unidad_id").eq("id", p.data.foto).maybeSingle();
  if (!f || !(await unidadOperable(s, f.unidad_id))) return AJENA;
  await db().from("fotos_unidad").delete().eq("id", f.id);
  return listo("Foto eliminada.");
}

// ---------- Reservas (72 h) y transferencias ----------
export async function reservarUnidad(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ unidad: zId, cliente_nombre: z.string().trim().min(3, "Ingresá el nombre del cliente que reserva.").max(80), cliente_telefono: zOpcional(20) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const u = await unidadOperable(s, p.data.unidad);
  if (!u) return AJENA;
  if (u.estado !== "disponible") return { error: "Solo se pueden reservar unidades disponibles." };
  const { error } = await db().from("reservas_unidad").insert({ unidad_id: u.id, vendedor_id: s.id, cliente_nombre: p.data.cliente_nombre, cliente_telefono: p.data.cliente_telefono ?? null });
  if (error) return { error: error.code === "23505" ? "Esta unidad ya tiene una reserva activa." : mensajeError(error) };
  await db().from("unidades").update({ estado: "reservada" }).eq("id", u.id);
  await auditar(s, "Reserva de unidad", "unidades", u.id, { cliente: p.data.cliente_nombre });
  return listo("Unidad reservada por 72 horas. Si no se concreta, vuelve a estar disponible automáticamente.");
}

export async function cancelarReserva(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ reserva: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: r } = await db().from("reservas_unidad").select("*").eq("id", p.data.reserva).eq("estado", "activa").maybeSingle();
  if (!r || !(await unidadOperable(s, r.unidad_id))) return AJENA;
  await db().from("reservas_unidad").update({ estado: "cancelada" }).eq("id", r.id);
  await db().from("unidades").update({ estado: "disponible" }).eq("id", r.unidad_id).eq("estado", "reservada");
  await auditar(s, "Reserva cancelada", "unidades", r.unidad_id);
  return listo("Reserva cancelada. La unidad volvió a estar disponible.");
}

export async function solicitarTransferencia(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ unidad: zId, motivo: zOpcional(300) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: u } = await db().from("unidades").select("id, sucursal_id, estado").eq("id", p.data.unidad).maybeSingle();
  if (!u || u.estado !== "disponible") return { error: "Solo se pueden pedir unidades disponibles." };
  if (u.sucursal_id === s.sucursalId) return { error: "Esta unidad ya está en tu sucursal." };
  const { count } = await db().from("transferencias_unidad").select("id", { count: "exact", head: true }).eq("unidad_id", u.id).eq("estado", "solicitada");
  if (count) return { error: "Esta unidad ya tiene un pedido de transferencia en curso." };
  const { data, error } = await db().from("transferencias_unidad").insert({ unidad_id: u.id, origen_id: u.sucursal_id, destino_id: s.sucursalId, solicitada_por: s.id, motivo: p.data.motivo ?? null }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Pedido de transferencia", "transferencias_unidad", data.id, { unidad: u.id });
  return listo("Pedido enviado. Lo aprueba la sucursal de origen o la gerencia.");
}

export async function resolverTransferencia(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("vendedor", "gerencia");
  const p = z.object({ transferencia: zId, decision: z.enum(["aprobada", "rechazada"]) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: t } = await db().from("transferencias_unidad").select("*").eq("id", p.data.transferencia).eq("estado", "solicitada").maybeSingle();
  if (!t) return { error: "Este pedido ya fue resuelto." };
  if (s.rol === "vendedor" && t.origen_id !== s.sucursalId) return AJENA;
  if (p.data.decision === "aprobada") {
    const { data: u } = await db().from("unidades").update({ sucursal_id: t.destino_id }).eq("id", t.unidad_id).eq("estado", "disponible").select("id");
    if (!u?.length) return { error: "La unidad ya no está disponible, así que no se puede transferir. Rechazá el pedido." };
  }
  await db().from("transferencias_unidad").update({ estado: p.data.decision, resuelta_por: s.id, resuelta_en: new Date().toISOString() }).eq("id", t.id);
  await auditar(s, `Transferencia ${p.data.decision}`, "transferencias_unidad", t.id, { unidad: t.unidad_id, destino: t.destino_id });
  return listo(p.data.decision === "aprobada" ? "Transferencia aprobada: la unidad ya figura en la sucursal de destino." : "Pedido de transferencia rechazado.");
}

// ---------- Promociones y tasaciones ----------
export async function guardarPromocion(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia"); // los vendedores solo ven las promociones vigentes
  const p = z.object({ id: idOpcional, sucursal: idOpcional, titulo: z.string().trim().min(5, "Escribí un título de al menos 5 caracteres.").max(90), descripcion: z.string().trim().min(10, "Describí la promoción en al menos 10 caracteres.").max(500), vigente_desde: zFecha, vigente_hasta: zFecha }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.vigente_hasta < p.data.vigente_desde) return { error: "La fecha de fin tiene que ser igual o posterior a la de inicio." };
  const suc = s.rol === "gerencia" ? p.data.sucursal ?? null : s.sucursalId;
  const fila = { titulo: p.data.titulo, descripcion: p.data.descripcion, vigente_desde: p.data.vigente_desde, vigente_hasta: p.data.vigente_hasta, sucursal_id: suc };
  const d = db();
  let id = p.data.id;
  if (id) {
    const { data: actual } = await d.from("promociones").select("sucursal_id").eq("id", id).maybeSingle();
    if (!actual || (s.rol === "vendedor" && actual.sucursal_id !== s.sucursalId)) return AJENA;
    const { error } = await d.from("promociones").update(fila).eq("id", id);
    if (error) return { error: mensajeError(error) };
  } else {
    const { data, error } = await d.from("promociones").insert(fila).select("id").single();
    if (error) return { error: mensajeError(error) };
    id = data.id;
  }
  const ids = fd.getAll("unidades").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  let validas: number[] = [];
  if (ids.length) {
    let q = d.from("unidades").select("id").in("id", ids).neq("estado", "vendida");
    if (suc) q = q.eq("sucursal_id", suc);
    validas = ((await q).data ?? []).map((u: any) => u.id);
  }
  await d.from("promocion_unidad").delete().eq("promocion_id", id);
  if (validas.length) await d.from("promocion_unidad").insert(validas.map((u) => ({ promocion_id: id, unidad_id: u })));
  await auditar(s, p.data.id ? "Edición de promoción" : "Alta de promoción", "promociones", id);
  return listo("Promoción guardada.");
}

export async function alternarPromocion(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ promocion: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: pr } = await db().from("promociones").select("id, activa, sucursal_id").eq("id", p.data.promocion).maybeSingle();
  if (!pr || (s.rol === "vendedor" && pr.sucursal_id !== s.sucursalId)) return AJENA;
  await db().from("promociones").update({ activa: !pr.activa }).eq("id", pr.id);
  await auditar(s, pr.activa ? "Promoción pausada" : "Promoción reactivada", "promociones", pr.id);
  return listo(pr.activa ? "Promoción pausada: ya no se muestra en la web." : "Promoción publicada nuevamente.");
}

export async function responderTasacion(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = z.object({ tasacion: zId, valor: z.coerce.number().positive("Ingresá el valor estimado."), respuesta: zOpcional(500) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: t } = await db().from("tasaciones").select("id, sucursal_id").eq("id", p.data.tasacion).maybeSingle();
  if (!t || t.sucursal_id !== s.sucursalId) return AJENA;
  const { error } = await db().from("tasaciones").update({ estado: "respondida", valor_estimado: p.data.valor, respuesta: p.data.respuesta ?? null, respondida_por: s.id, respondida_en: new Date().toISOString() }).eq("id", t.id);
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Tasación respondida", "tasaciones", t.id, { valor: p.data.valor });
  return listo("Valor estimado guardado. Avisale al cliente por WhatsApp o email.");
}

// ---------- Test drives cargados por el vendedor ----------
export async function crearTestDrive(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigirSucursal("vendedor");
  const p = zContacto.extend({ unidad: zId, fecha: zFecha, hora: zHora }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.fecha < hoyAR()) return { error: "La fecha del test drive no puede ser anterior a hoy." };
  const u = await unidadOperable(s, p.data.unidad);
  if (!u || u.estado === "vendida") return { error: "Elegí una unidad disponible de tu sucursal." };
  const cliente = await obtenerCliente(p.data.nombre, p.data.telefono, p.data.email);
  const ahora = new Date().toISOString();
  const { data: c, error } = await db().from("consultas").insert({ tipo: "test_drive", canal: "presencial", estado: "test_drive_agendado", sucursal_id: s.sucursalId, vendedor_id: s.id, unidad_id: u.id, cliente_id: cliente, mensaje: "Test drive agendado por el vendedor.", primera_respuesta_en: ahora }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await db().from("test_drives").insert({ consulta_id: c.id, unidad_id: u.id, fecha: p.data.fecha, hora: p.data.hora, estado: "confirmado" });
  await auditar(s, "Test drive agendado", "test_drives", c.id, { unidad: u.id, fecha: p.data.fecha, hora: p.data.hora });
  return listo("Test drive agendado y confirmado.");
}

// ---------- Autocompletar con datos ya registrados (solo empleados) ----------
export async function buscarRegistrados(q: { patente?: string; texto?: string }): Promise<{ vehiculo?: any; clientes: any[] }> {
  await exigir("vendedor", "asesor");
  const d = db();
  if (q.patente) {
    const { data: v } = await d.from("vehiculos").select("patente, marca, modelo, anio, km_actual, clientes(nombre, telefono, email)").eq("patente", normalizarPatente(q.patente)).maybeSingle();
    return v ? { vehiculo: v, clientes: [] } : { clientes: [] };
  }
  const t = (q.texto ?? "").replace(/[%_,()]/g, "").trim();
  if (t.length < 3) return { clientes: [] };
  const { data } = await d.from("clientes").select("id, nombre, telefono, email").ilike("nombre", `%${t}%`).order("nombre").limit(6);
  return { clientes: data ?? [] };
}

// ---------- Turnos cargados por el asesor (con sucursal de origen) ----------
export async function derivarTurno(datos: Record<string, unknown>): Promise<Estado> {
  const s = await exigirSucursal("asesor");
  const p = zTurno.extend({ canal: z.enum(["presencial", "telefono", "whatsapp"]) }).safeParse({ ...datos, taller: s.sucursalId });
  if (!p.success) return { error: primerError(p.error) };
  const t = p.data;
  const { data, error } = await db().rpc("reservar_turno", {
    p_servicio: t.servicio, p_taller: s.sucursalId, p_origen: t.origen, p_canal: t.canal, p_fecha: t.fecha, p_hora: t.hora,
    p_patente: t.patente, p_marca: t.marca, p_modelo: t.modelo, p_anio: t.anio, p_km: t.km,
    p_nombre: t.nombre, p_telefono: t.telefono, p_email: t.email ?? null, p_observaciones: t.observaciones ?? null, p_empleado: s.id,
  });
  if (error) return { error: mensajeError(error) };
  const { data: veh } = await db().from("vehiculos").select("codigo_auto").eq("id", data.vehiculo_id).single();
  await auditar(s, data.derivado ? "Turno derivado cargado" : "Turno cargado", "turnos", data.id, { codigo: data.codigo, origen: t.origen });
  revalidatePath("/", "layout");
  return { ok: true, datos: { id: data.id, codigo: data.codigo, fecha: data.fecha, hora: data.hora, derivado: data.derivado, patente: t.patente, codigoAuto: veh?.codigo_auto, nombre: t.nombre, telefono: t.telefono, email: t.email ?? null } };
}
