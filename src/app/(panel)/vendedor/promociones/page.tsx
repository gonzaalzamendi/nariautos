import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { GestionPromociones } from "@/components/gestion";

export const metadata = { title: "Promociones" };
export default async function Promos() {
  const s = await exigirSucursal("vendedor");
  const [promos, us] = await Promise.all([
    leer<any[]>(db().from("promociones").select("*, sucursales(nombre), promocion_unidad(unidad_id)").eq("sucursal_id", s.sucursalId).order("vigente_hasta", { ascending: false })),
    leer<any[]>(db().from("unidades").select("id, marca, modelo, version, sucursales(nombre)").eq("sucursal_id", s.sucursalId).neq("estado", "vendida").order("marca")),
  ]);
  return (<><Encabezado titulo="Promociones de mi sucursal" texto="Se publican en la web sin depender de sistemas." /><GestionPromociones promos={promos} unidades={us} /></>);
}
