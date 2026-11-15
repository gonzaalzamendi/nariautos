import { db } from "@/lib/db";

// Sirve las fotos cargadas por los vendedores (guardadas en la base como JPEG reducido).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("No encontrada", { status: 404 });
  const { data } = await db().from("fotos_unidad").select("datos, mime").eq("id", id).maybeSingle();
  if (!data?.datos) return new Response("No encontrada", { status: 404 });
  return new Response(Buffer.from(data.datos, "base64"), { headers: { "content-type": data.mime ?? "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
}
