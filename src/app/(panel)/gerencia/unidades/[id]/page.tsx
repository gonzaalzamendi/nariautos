import { notFound } from "next/navigation";
import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { SEL_UNIDAD } from "@/lib/datos";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { FormUnidad, GestorFotos } from "@/components/gestion";

export const metadata = { title: "Unidad" };
export default async function Unidad({ params }: { params: Promise<{ id: string }> }) {
  await exigir("gerencia");
  const id = (await params).id;
  const u = id === "nueva" ? null : (await db().from("unidades").select(SEL_UNIDAD).eq("id", Number(id) || 0).maybeSingle()).data as any;
  if (id !== "nueva" && !u) notFound();
  const sucs = await leer<any[]>(db().from("sucursales").select("id, nombre").order("id"));
  return (
    <>
      <Encabezado titulo={u ? `${u.marca} ${u.modelo}` : "Dar de alta una unidad"}><BotonLink href="/gerencia/unidades" variante="contorno" chico>Volver a unidades</BotonLink></Encabezado>
      <div className="space-y-5"><Tarjeta titulo="Datos de la unidad"><FormUnidad u={u ?? undefined} sucursales={sucs.map((s) => [s.id, s.nombre] as const)} /></Tarjeta>{u && <GestorFotos u={u} />}</div>
    </>
  );
}
