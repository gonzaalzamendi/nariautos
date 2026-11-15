import Link from "next/link";
import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { cambiarEstadoUnidad } from "@/lib/acciones/ventas";
import { etiqueta, fecha, moneda, numero } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Selector, Tabla, claseBoton } from "@/components/ui";
import { BotonAccion } from "@/components/formularios";

export const metadata = { title: "Unidades de la red" };
export default async function Unidades({ searchParams }: { searchParams: Promise<{ sucursal?: string; estado?: string }> }) {
  await exigir("gerencia");
  const sp = await searchParams;
  let q = db().from("unidades").select("*, sucursales(nombre)");
  if (/^\d+$/.test(sp.sucursal ?? "")) q = q.eq("sucursal_id", Number(sp.sucursal));
  if (["disponible", "reservada", "vendida"].includes(sp.estado ?? "")) q = q.eq("estado", sp.estado);
  const [us, sucs] = await Promise.all([leer<any[]>(q.order("sucursal_id").order("marca").order("modelo")), leer<any[]>(db().from("sucursales").select("id, nombre").order("id"))]);
  return (
    <>
      <Encabezado titulo="Unidades de toda la red" texto="Alta y edición sin depender de sistemas.">
        <BotonLink href="/api/csv/unidades" variante="contorno" download>Exportar a CSV</BotonLink><BotonLink href="/gerencia/unidades/nueva" variante="primario">Dar de alta una unidad</BotonLink>
      </Encabezado>
      <form className="mb-4 flex flex-wrap items-end gap-3" aria-label="Filtros">
        <Selector etiqueta="Sucursal" name="sucursal" defaultValue={sp.sucursal ?? ""} vacio="Todas" opciones={sucs.map((s) => [s.id, s.nombre] as const)} contenedor="w-44" />
        <Selector etiqueta="Estado" name="estado" defaultValue={sp.estado ?? ""} vacio="Todos" opciones={[["disponible", "Disponible"], ["reservada", "Reservada"], ["vendida", "Vendida"]]} contenedor="w-44" />
        <button type="submit" className={claseBoton("secundario")}>Aplicar filtros</button>
      </form>
      <p className="mb-2 text-sm text-medio">{us.length} unidades</p>
      <Tabla cabeceras={["Unidad", "Sucursal", "Año · km", "Precio", "Ingreso", "Estado", "Acciones"]}>
        {us.map((u) => (
          <tr key={u.id}>
            <td><Link href={`/gerencia/unidades/${u.id}`} className="font-medium text-marino underline">{u.marca} {u.modelo}</Link><br /><span className="text-xs text-medio">{u.version} · {etiqueta(u.condicion)}</span></td>
            <td>{u.sucursales.nombre}</td><td className="cifras whitespace-nowrap">{u.anio} · {numero(u.km)} km</td><td className="cifras whitespace-nowrap">{moneda(u.precio)}</td>
            <td className="cifras whitespace-nowrap">{fecha(u.fecha_ingreso)}</td><td><Insignia estado={u.estado}>{etiqueta(u.estado)}</Insignia></td>
            <td><div className="flex flex-wrap gap-1.5"><BotonLink href={`/gerencia/unidades/${u.id}`} variante="contorno" chico>Editar unidad</BotonLink>
              {u.estado === "vendida" ? <BotonAccion accion={cambiarEstadoUnidad} campos={{ unidad: u.id, estado: "disponible" }}>Volver a disponible</BotonAccion>
                : <BotonAccion accion={cambiarEstadoUnidad} campos={{ unidad: u.id, estado: "vendida" }} confirmar={`¿Marcar ${u.marca} ${u.modelo} como vendida?`}>Marcar como vendida</BotonAccion>}</div></td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
