"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, mensajeError } from "@/lib/db";
import { auditar, exigir } from "@/lib/sesion";
import { objeto, primerError, zEntero, zId, zOpcional, zPin } from "@/lib/validaciones";
import type { Estado } from "@/lib/tipos";

const listo = (mensaje: string): Estado => { revalidatePath("/", "layout"); return { ok: true, mensaje }; };
const idOpcional = z.preprocess((v) => (v === "" || v == null ? undefined : v), zId.optional());
const hash = async (pin: string) => (await db().rpc("hash_pin", { p_pin: pin })).data as string;

export async function guardarEmpleado(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ id: idOpcional, nombre: z.string().trim().min(3, "Ingresá nombre y apellido.").max(80), rol: z.enum(["vendedor", "asesor", "jefe_taller", "gerencia"]), sucursal: idOpcional, pin: z.preprocess((v) => v || undefined, zPin.optional()) }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { id, nombre, rol, sucursal, pin } = p.data;
  if (rol !== "gerencia" && !sucursal) return { error: "Elegí la sucursal del empleado." };
  if (sucursal && ["asesor", "jefe_taller"].includes(rol)) {
    const { data: suc } = await db().from("sucursales").select("tiene_taller").eq("id", sucursal).single();
    if (!suc?.tiene_taller) return { error: "Los asesores y jefes de taller trabajan en una sucursal con taller. Elegí Casa Central o Sucursal 2." };
  }
  const fila = { nombre, rol, sucursal_id: rol === "gerencia" ? null : sucursal };
  if (id) {
    const { error } = await db().from("empleados").update(fila).eq("id", id);
    if (error) return { error: mensajeError(error) };
    await auditar(s, "Edición de empleado", "empleados", id, fila);
    return listo("Datos del empleado guardados.");
  }
  if (!pin) return { error: "Definí un PIN de 4 dígitos para el nuevo empleado." };
  const { data, error } = await db().from("empleados").insert({ ...fila, pin_hash: await hash(pin) }).select("id").single();
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Alta de empleado", "empleados", data.id, fila);
  return listo(`${nombre} ya puede ingresar con su PIN.`);
}

export async function cambiarPinEmpleado(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ empleado: zId, pin: zPin }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { error } = await db().from("empleados").update({ pin_hash: await hash(p.data.pin), intentos_fallidos: 0, bloqueado_hasta: null }).eq("id", p.data.empleado);
  if (error) return { error: mensajeError(error) };
  await auditar(s, "Cambio de PIN por gerencia", "empleados", p.data.empleado);
  return listo("PIN actualizado y bloqueo levantado.");
}

export async function alternarEmpleado(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ empleado: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.empleado === s.id) return { error: "No podés desactivar tu propio usuario." };
  const { data: e } = await db().from("empleados").select("id, activo, nombre").eq("id", p.data.empleado).maybeSingle();
  if (!e) return { error: "No encontramos ese empleado." };
  await db().from("empleados").update({ activo: !e.activo }).eq("id", e.id);
  await auditar(s, e.activo ? "Baja de empleado" : "Reactivación de empleado", "empleados", e.id);
  return listo(e.activo ? `${e.nombre} ya no puede ingresar al sistema.` : `${e.nombre} puede volver a ingresar.`);
}

export async function guardarSucursal(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const hora = z.preprocess((v) => v || undefined, z.string().regex(/^\d{2}:\d{2}/).optional());
  const p = z.object({
    id: idOpcional, nombre: z.string().trim().min(3, "Ingresá el nombre de la sucursal.").max(60), direccion: z.string().trim().min(3, "Ingresá la dirección.").max(120),
    localidad: z.string().trim().min(2, "Ingresá la localidad.").max(60), telefono: z.string().trim().min(6, "Ingresá el teléfono.").max(30), horario_atencion: z.string().trim().min(3, "Ingresá el horario de atención.").max(120),
    tiene_taller: z.enum(["si", "no"]), capacidad_boxes: z.preprocess((v) => v || undefined, zEntero.min(1).max(30).optional()), taller_abre: hora, taller_cierra: hora,
    taller_referencia_id: idOpcional, km_a_referencia: z.preprocess((v) => v || undefined, z.coerce.number().min(0).max(999).optional()),
  }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { id, tiene_taller, ...d } = p.data, conTaller = tiene_taller === "si";
  if (conTaller && (!d.capacidad_boxes || !d.taller_abre || !d.taller_cierra)) return { error: "Una sucursal con taller necesita cantidad de boxes y horario del taller." };
  if (conTaller && d.taller_abre! >= d.taller_cierra!) return { error: "El taller tiene que cerrar después de abrir." };
  if (!conTaller && !d.taller_referencia_id) return { error: "Una sucursal sin taller necesita un taller de referencia para derivar los turnos." };
  if (!conTaller && id) {
    const { count } = await db().from("turnos").select("id", { count: "exact", head: true }).eq("sucursal_taller_id", id).in("estado", ["solicitado", "confirmado", "recibido", "en_reparacion", "listo"]);
    if (count) return { error: `Este taller tiene ${count} turnos en curso. Reprogramalos o terminá los trabajos antes de quitarle el taller.` };
  }
  const fila = { nombre: d.nombre, direccion: d.direccion, localidad: d.localidad, telefono: d.telefono, horario_atencion: d.horario_atencion, tiene_taller: conTaller,
    capacidad_boxes: conTaller ? d.capacidad_boxes : null, taller_abre: conTaller ? d.taller_abre : null, taller_cierra: conTaller ? d.taller_cierra : null,
    taller_referencia_id: conTaller ? null : d.taller_referencia_id, km_a_referencia: conTaller ? null : d.km_a_referencia ?? null };
  const r = id ? await db().from("sucursales").update(fila).eq("id", id).select("id").single() : await db().from("sucursales").insert(fila).select("id").single();
  if (r.error) return { error: r.error.code === "23505" ? "Ya existe una sucursal con ese nombre." : mensajeError(r.error) };
  await auditar(s, id ? "Edición de sucursal" : "Alta de sucursal", "sucursales", r.data.id, { tiene_taller: conTaller, taller_referencia_id: fila.taller_referencia_id });
  return listo("Sucursal guardada.");
}

export async function guardarServicio(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ id: idOpcional, nombre: z.string().trim().min(3, "Ingresá el nombre del servicio.").max(60), descripcion: zOpcional(300),
    duracion_min: zEntero.min(30, "La duración mínima es de 30 minutos.").max(600), precio_orientativo: z.coerce.number().min(0, "El precio no puede ser negativo.") }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.duracion_min % 30 !== 0) return { error: "La duración debe ser múltiplo de 30 minutos, porque la agenda trabaja con franjas de media hora." };
  const { id, ...d } = p.data, fila = { ...d, descripcion: d.descripcion ?? null };
  const r = id ? await db().from("servicios").update(fila).eq("id", id).select("id").single() : await db().from("servicios").insert(fila).select("id").single();
  if (r.error) return { error: r.error.code === "23505" ? "Ya existe un servicio con ese nombre." : mensajeError(r.error) };
  await auditar(s, id ? "Edición de servicio" : "Alta de servicio", "servicios", r.data.id, fila);
  return listo("Servicio guardado.");
}

export async function alternarServicio(_: Estado, fd: FormData): Promise<Estado> {
  const s = await exigir("gerencia");
  const p = z.object({ servicio: zId }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data: v } = await db().from("servicios").select("id, activo").eq("id", p.data.servicio).maybeSingle();
  if (!v) return { error: "No encontramos ese servicio." };
  await db().from("servicios").update({ activo: !v.activo }).eq("id", v.id);
  await auditar(s, v.activo ? "Servicio desactivado" : "Servicio reactivado", "servicios", v.id);
  return listo(v.activo ? "Servicio desactivado: ya no se ofrece en la web." : "Servicio disponible nuevamente.");
}
