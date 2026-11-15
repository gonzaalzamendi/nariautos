import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase exclusivo del servidor: se identifica con el secreto que habilitan las políticas RLS. */
export function db(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, secreto = process.env.SUPABASE_SERVER_SECRET;
  if (!url || !clave || !secreto) throw new Error("Faltan variables de entorno de Supabase");
  cliente = createClient(url, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-nari-server": secreto }, fetch: (u, i) => fetch(u, { ...i, cache: "no-store" }) },
  });
  return cliente;
}

/** Convierte un error de la base en un mensaje claro para la persona. */
export function mensajeError(e: { message?: string } | null | undefined, porDefecto = "No pudimos completar la operación. Probá de nuevo en unos segundos."): string {
  const m = e?.message ?? "";
  const i = m.indexOf("NARI: ");
  return i >= 0 ? m.slice(i + 6) : porDefecto;
}

/** Ejecuta una consulta y devuelve los datos, o lanza un error legible. */
export async function leer<T = any>(consulta: PromiseLike<{ data: any; error: any }>): Promise<T> {
  const { data, error } = await consulta;
  if (error) { console.error("[db]", error.message); throw new Error(mensajeError(error, "No pudimos cargar los datos.")); }
  return data as T;
}
