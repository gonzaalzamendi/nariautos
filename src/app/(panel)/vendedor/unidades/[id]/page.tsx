import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { SEL_UNIDAD } from "@/lib/datos";
import { BotonLink, Encabezado, Tarjeta } from "@/components/ui";
import { FormUnidad, GestorFotos } from "@/components/gestion";

export const metadata = { title: "Unidad" };
export default async function Unidad({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSucursal("vendedor");
  const id = (await params).id;
  const u = id === "nueva" ? null : (await db().from("unidades").select(SEL_UNIDAD).eq("id", Number(id) || 0).eq("sucursal_id", s.sucursalId).maybeSingle()).data as any;
  if (id !== "nueva" && !u) notFound();
  return (
    <>
      <Encabezado titulo={u ? `${u.marca} ${u.modelo}` : "Dar de alta una unidad"} texto={u ? "Los cambios se publican en la web al guardar." : "La unidad ingresa a tu sucursal y se publica en el catálogo."}>
        {u && u.estado !== "vendida" && <BotonLink href={`/catalogo/${u.id}`} variante="contorno" chico target="_blank">Ver ficha pública</BotonLink>}
        <BotonLink href="/vendedor/unidades" variante="contorno" chico>Volver a mis unidades</BotonLink>
      </Encabezado>
      <div className="space-y-5"><Tarjeta titulo="Datos de la unidad"><FormUnidad u={u ?? undefined} /></Tarjeta>{u && <GestorFotos u={u} />}</div>
    </>
  );
}
