import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { GestionPromociones } from "@/components/gestion";

export const metadata = { title: "Promociones de la red" };
export default async function Promos() {
  await exigir("gerencia");
  const [promos, us, sucs] = await Promise.all([
    leer<any[]>(db().from("promociones").select("*, sucursales(nombre), promocion_unidad(unidad_id)").order("vigente_hasta", { ascending: false })),
    leer<any[]>(db().from("unidades").select("id, marca, modelo, version, sucursales(nombre)").neq("estado", "vendida").order("marca")),
    leer<any[]>(db().from("sucursales").select("id, nombre").order("id")),
  ]);
  return (<><Encabezado titulo="Promociones de toda la red" texto="De una sucursal o de toda la red." /><GestionPromociones promos={promos} unidades={us} sucursales={sucs.map((s) => [s.id, s.nombre] as const)} /></>);
}
