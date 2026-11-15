"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { COOKIE_SESION, firmarSesion, opcionesCookie } from "@/lib/token";
import { INICIO } from "@/lib/permisos";
import { auditar, sesionActual, sesionObligatoria } from "@/lib/sesion";
import { ipCliente } from "@/lib/antispam";
import { zPin, primerError, objeto } from "@/lib/validaciones";
import { fechaHora } from "@/lib/formato";
import type { Estado, Sesion } from "@/lib/tipos";

function errorDePin(r: any): string {
  if (r?.motivo === "bloqueado") return `Acceso bloqueado por 5 intentos fallidos. Vas a poder volver a intentarlo a las ${fechaHora(r.hasta).slice(-5)} h.`;
  return "Usuario o PIN incorrectos. Revisá los dos datos y volvé a intentarlo.";
}

export async function ingresar(_: Estado, fd: FormData): Promise<Estado> {
  const p = z.object({ usuario: z.string().trim().toLowerCase().min(3, "Ingresá tu usuario.").max(30), pin: zPin }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  const { data, error } = await db().rpc("verificar_acceso", { p_usuario: p.data.usuario, p_pin: p.data.pin, p_ip: await ipCliente() });
  if (error) return { error: "No pudimos conectar con el sistema. Probá de nuevo en unos segundos." };
  if (!data?.ok) return { error: errorDePin(data) };
  const sesion: Sesion = { id: data.id, nombre: data.nombre, rol: data.rol, sucursalId: data.sucursal_id ?? null, ...(data.pin_vencido ? { cambiarPin: true } : {}) };
  (await cookies()).set(COOKIE_SESION, await firmarSesion(sesion), opcionesCookie);
  await auditar(sesion, "Inicio de sesión", "empleados", sesion.id);
  redirect(sesion.cambiarPin ? "/cuenta" : INICIO[sesion.rol]);
}

export async function cerrarSesion(fd?: FormData) {
  const s = await sesionActual();
  if (s) await auditar(s, "Cierre de sesión", "empleados", s.id);
  (await cookies()).delete(COOKIE_SESION);
  redirect(fd?.get("motivo") === "inactividad" ? "/acceso?motivo=inactividad" : "/acceso");
}
export async function cerrarPorInactividad() {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/acceso?motivo=inactividad");
}

export async function cambiarMiPin(_: Estado, fd: FormData): Promise<Estado> {
  const s = await sesionObligatoria();
  const p = z.object({ actual: zPin, nuevo: zPin, repetir: zPin }).safeParse(objeto(fd));
  if (!p.success) return { error: primerError(p.error) };
  if (p.data.nuevo !== p.data.repetir) return { error: "Los dos PIN nuevos no coinciden. Escribilos otra vez." };
  if (p.data.nuevo === p.data.actual) return { error: "El PIN nuevo tiene que ser distinto del actual." };
  const { data } = await db().rpc("verificar_pin", { p_empleado: s.id, p_pin: p.data.actual, p_ip: await ipCliente() });
  if (!data?.ok) return { error: data?.motivo === "pin" ? "El PIN actual no coincide. Revisalo y probá otra vez." : errorDePin(data) };
  const { data: hash } = await db().rpc("hash_pin", { p_pin: p.data.nuevo });
  const { error } = await db().from("empleados").update({ pin_hash: hash, pin_cambiado_en: new Date().toISOString() }).eq("id", s.id);
  if (error || !hash) return { error: "No pudimos guardar el PIN nuevo. Tu PIN actual sigue vigente." };
  await auditar(s, "Cambio de PIN propio", "empleados", s.id);
  if (s.cambiarPin) (await cookies()).set(COOKIE_SESION, await firmarSesion({ id: s.id, nombre: s.nombre, rol: s.rol, sucursalId: s.sucursalId }), opcionesCookie);
  revalidatePath("/", "layout");
  return { ok: true, mensaje: s.cambiarPin ? "PIN actualizado. Ya podés usar el sistema desde el menú." : "PIN actualizado. Usalo en tu próximo ingreso." };
}
