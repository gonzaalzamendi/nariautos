import Link from "next/link";
import { db, leer } from "@/lib/db";
import { SEL_UNIDAD, fotosDe } from "@/lib/datos";
import { etiqueta, moneda, numero } from "@/lib/formato";
import { BotonLink, Encabezado, Vacio } from "@/components/ui";

export const metadata = { title: "Comparar unidades" };
export const dynamic = "force-dynamic";

export default async function Comparar({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const ids = [...new Set(((await searchParams).ids ?? "").split(",").filter((x) => /^\d+$/.test(x)).map(Number))].slice(0, 3);
  const us = ids.length ? await leer<any[]>(db().from("unidades").select(SEL_UNIDAD).in("id", ids).neq("estado", "vendida")) : [];
  us.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  if (us.length < 2) return (
    <><Encabezado titulo="Comparar unidades" />
      <Vacio titulo="Elegí al menos dos unidades" texto="En el catálogo, marcá «Agregar al comparador» en hasta 3 unidades para verlas lado a lado."><BotonLink href="/catalogo">Ir al catálogo</BotonLink></Vacio></>
  );
  const filas: [string, (u: any) => React.ReactNode][] = [
    ["Precio", (u) => <strong className="cifras text-dorado-texto">{moneda(u.precio)}</strong>], ["Condición", (u) => etiqueta(u.condicion)], ["Año", (u) => u.anio],
    ["Kilómetros", (u) => (u.km === 0 ? "0 km" : numero(u.km) + " km")], ["Combustible", (u) => etiqueta(u.combustible)], ["Transmisión", (u) => etiqueta(u.transmision)],
    ["Color", (u) => u.color ?? "—"], ["Sucursal", (u) => `${u.sucursales.nombre} (${u.sucursales.localidad})`], ["Estado", (u) => etiqueta(u.estado)],
  ];
  return (
    <>
      <Encabezado titulo="Comparar unidades" texto="Hasta 3 unidades lado a lado."><BotonLink href="/catalogo" variante="contorno">Volver al catálogo</BotonLink></Encabezado>
      <div className="overflow-x-auto rounded-lg border border-borde/80 bg-white shadow-suave">
        <table className="w-full min-w-[560px] text-sm">
          <thead><tr><th className="w-28 p-3" />{us.map((u) => (
            <th key={u.id} scope="col" className="p-3 text-left align-top font-normal">
              <img src={fotosDe(u)[0]} alt="" width={320} height={200} className="mb-2 aspect-[16/10] w-full rounded-md object-cover" />
              <Link href={`/catalogo/${u.id}`} className="titulo text-base hover:underline">{u.marca} {u.modelo}</Link><br /><span className="text-medio">{u.version}</span>
            </th>))}</tr></thead>
          <tbody className="divide-y divide-borde/60">
            {filas.map(([n, f]) => <tr key={n}><th scope="row" className="bg-fondo p-3 text-left text-xs font-medium uppercase tracking-wide text-medio">{n}</th>{us.map((u) => <td key={u.id} className="cifras p-3">{f(u)}</td>)}</tr>)}
            <tr><th className="bg-fondo" />{us.map((u) => <td key={u.id} className="p-3"><BotonLink href={`/catalogo/${u.id}`} chico>Ver ficha y cotizar</BotonLink></td>)}</tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
