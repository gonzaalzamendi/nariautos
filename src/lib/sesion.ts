import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESION, leerToken } from "./token";
import { INICIO } from "./permisos";
import type { Rol, Sesion } from "./tipos";
import { db } from "./db";

export async function sesionActual(): Promise<Sesion | null> {
  return leerToken((await cookies()).get(COOKIE_SESION)?.value);
}

/** Capa 3 de permisos: cada página y acción del servidor vuelve a verificar el rol. */
export async function sesionObligatoria(): Promise<Sesion> {
  const s = await sesionActual();
  if (!s) redirect("/acceso");
  return s;
}
export async function exigir(...roles: Rol[]): Promise<Sesion> {
  const s = await sesionObligatoria();
  if (s.cambiarPin) redirect("/cuenta"); // PIN vencido: no puede operar hasta cambiarlo
  if (roles.length && !roles.includes(s.rol)) redirect(INICIO[s.rol]);
  return s;
}

/** Igual que exigir, pero además garantiza que el empleado tenga sucursal asignada. */
export async function exigirSucursal(...roles: Rol[]): Promise<Sesion & { sucursalId: number }> {
  const s = await exigir(...roles);
  if (s.sucursalId == null) redirect(INICIO[s.rol]);
  return s as Sesion & { sucursalId: number };
}

export async function auditar(s: Pick<Sesion, "id" | "nombre"> | null, accion: string, entidad: string, entidadId?: string | number | null, detalle?: Record<string, unknown>) {
  const { error } = await db().from("auditoria").insert({
    empleado_id: s?.id ?? null, empleado_nombre: s?.nombre ?? "Cliente (web)", accion, entidad,
    entidad_id: entidadId != null ? String(entidadId) : null, detalle: detalle ?? null,
  });
  if (error) console.error("[auditoria]", error.message);
}
