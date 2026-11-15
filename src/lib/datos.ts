import "server-only";
import { db, leer } from "./db";
import { distanciaKm, hoyAR } from "./formato";

export const SEL_UNIDAD = "*, sucursales(id, nombre, localidad), fotos_unidad(id, url, orden)";
export const fotoSrc = (f: { id: number; url: string | null }) => f.url ?? `/foto/${f.id}`;
export const fotosDe = (u: any): string[] => [...(u.fotos_unidad ?? [])].sort((a: any, b: any) => a.orden - b.orden || a.id - b.id).map(fotoSrc);
export const nombreUnidad = (u: any) => `${u.marca} ${u.modelo}${u.version ? " " + u.version : ""}`;

export async function sucursales(): Promise<any[]> {
  const s = await leer<any[]>(db().from("sucursales").select("*").eq("activa", true).order("id"));
  return s.map((x) => {
    const ref = s.find((r) => r.id === x.taller_referencia_id);
    return { ...x, referencia: ref ? { id: ref.id, nombre: ref.nombre, direccion: ref.direccion, localidad: ref.localidad } : null,
      distancias: Object.fromEntries(s.filter((t) => t.tiene_taller && t.id !== x.id).map((t) => [t.id, t.id === x.taller_referencia_id && x.km_a_referencia != null ? Number(x.km_a_referencia) : distanciaKm(x, t)])) };
  });
}
export const servicios = () => leer<any[]>(db().from("servicios").select("*").eq("activo", true).order("id"));

export async function promocionesVigentes(sucursalId?: number): Promise<any[]> {
  const hoy = hoyAR();
  let q = db().from("promociones").select("*, sucursales(nombre), promocion_unidad(unidad_id)").eq("activa", true).lte("vigente_desde", hoy).gte("vigente_hasta", hoy).order("vigente_hasta");
  if (sucursalId) q = q.or(`sucursal_id.is.null,sucursal_id.eq.${sucursalId}`);
  return leer<any[]>(q);
}

/** Busca o crea el cliente por teléfono y nombre (un mismo teléfono puede repetirse). */
export async function obtenerCliente(nombre: string, telefono: string, email?: string): Promise<number> {
  const d = db();
  const { data } = await d.from("clientes").select("id").eq("telefono", telefono).ilike("nombre", nombre.trim().replace(/[%_]/g, "")).order("id").limit(1).maybeSingle();
  if (data) { if (email) await d.from("clientes").update({ email }).eq("id", data.id); return data.id; }
  const nuevo = await leer<{ id: number }>(d.from("clientes").insert({ nombre, telefono, email: email ?? null }).select("id").single());
  return nuevo.id;
}

/** Franjas libres de un taller, sin las horas que ya pasaron si es hoy. */
export async function franjasLibres(taller: number, fecha: string, servicioId: number): Promise<{ hora: string; libres: number }[]> {
  const srv = await leer<any>(db().from("servicios").select("duracion_min").eq("id", servicioId).single());
  const filas = await leer<any[]>(db().rpc("disponibilidad_taller", { p_taller: taller, p_fecha: fecha, p_duracion: srv.duracion_min }));
  const ahora = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return filas.filter((f) => fecha !== hoyAR() || f.hora.slice(0, 5) > ahora).map((f) => ({ hora: f.hora.slice(0, 5), libres: f.libres }));
}

/** Vehículos cuyo titular coincide con el nombre buscado. */
export async function vehiculosDeCliente(texto: string): Promise<any[]> {
  const t = texto.replace(/[%_,()]/g, "").trim();
  if (t.length < 3) return [];
  return leer<any[]>(db().from("vehiculos").select("patente, marca, modelo, anio, clientes!inner(nombre, telefono)").ilike("clientes.nombre", `%${t}%`).order("patente").limit(30));
}

export async function historialDePatente(patente: string) {
  const v = (await db().from("vehiculos").select("*, clientes(nombre, telefono)").eq("patente", patente).maybeSingle()).data;
  if (!v) return null;
  const historial = await leer<any[]>(db().from("historial_service").select("*, sucursales(nombre)").eq("vehiculo_id", v.id).order("fecha", { ascending: false }));
  return { vehiculo: v, historial };
}
