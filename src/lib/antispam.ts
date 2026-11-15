import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { db } from "./db";

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "desconocida").trim();
}

/**
 * Protección de formularios públicos: campo trampa (honeypot) y límite de solicitudes por IP.
 * Devuelve "spam" (simular éxito), un mensaje de error, o null si puede continuar.
 */
export async function protegerFormulario(fd: FormData | null, accion: string, maximo = 6, minutos = 10): Promise<"spam" | { error: string } | null> {
  if (fd && String(fd.get("sitio_web") ?? "") !== "") return "spam";
  const ipHash = createHash("sha256").update((await ipCliente()) + (process.env.SESSION_SECRET ?? "")).digest("hex").slice(0, 32);
  const desde = new Date(Date.now() - minutos * 60000).toISOString();
  const { count } = await db().from("solicitudes_publicas").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).eq("accion", accion).gte("creado_en", desde);
  if ((count ?? 0) >= maximo) return { error: `Recibimos varias solicitudes seguidas desde tu conexión. Esperá ${minutos} minutos y volvé a intentarlo, o llamanos a la sucursal.` };
  await db().from("solicitudes_publicas").insert({ ip_hash: ipHash, accion });
  return null;
}
