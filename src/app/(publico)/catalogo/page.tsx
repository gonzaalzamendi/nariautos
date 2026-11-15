import { db, leer } from "@/lib/db";
import { SEL_UNIDAD, fotosDe, promocionesVigentes, sucursales } from "@/lib/datos";
import { BotonLink, Encabezado, Entrada, Selector, Vacio, claseBoton } from "@/components/ui";
import { TarjetaUnidad } from "@/components/unidades";
import { BarraComparar } from "@/components/comparador";

export const metadata = { title: "Catálogo de unidades" };
export const dynamic = "force-dynamic";
type SP = Record<string, string | undefined>;

export default async function Catalogo({ searchParams }: { searchParams: Promise<SP> }) {
  const f = await searchParams;
  const n = (v?: string) => (v && /^\d+$/.test(v) ? Number(v) : null);
  let q = db().from("unidades").select(SEL_UNIDAD).neq("estado", "vendida");
  if (n(f.sucursal)) q = q.eq("sucursal_id", n(f.sucursal));
  if (f.marca) q = q.eq("marca", f.marca);
  if (f.modelo) q = q.ilike("modelo", `%${f.modelo.replace(/[%_,()]/g, "")}%`);
  if (f.condicion === "0km" || f.condicion === "usado") q = q.eq("condicion", f.condicion);
  if (n(f.anio)) q = q.gte("anio", n(f.anio));
  if (n(f.precio)) q = q.lte("precio", n(f.precio)! * 1000000);
  if (f.combustible) q = q.eq("combustible", f.combustible);
  if (f.transmision) q = q.eq("transmision", f.transmision);
  const orden: Record<string, [string, boolean]> = { precio_asc: ["precio", true], precio_desc: ["precio", false], anio_desc: ["anio", false], anio_asc: ["anio", true] };
  const [col, asc] = orden[f.orden ?? ""] ?? ["fecha_ingreso", false];
  const [unidades, sucs, marcas, promos] = await Promise.all([
    leer<any[]>(q.order(col, { ascending: asc }).order("id")), sucursales(),
    leer<any[]>(db().from("unidades").select("marca").neq("estado", "vendida")), promocionesVigentes(),
  ]);
  const enPromo = new Set(promos.flatMap((p) => p.promocion_unidad.map((x: any) => x.unidad_id)));
  const filtrando = Object.entries(f).some(([k, v]) => v && k !== "orden");
  return (
    <>
      <Encabezado titulo="Catálogo de unidades" texto="Stock unificado de toda la red. Cada unidad indica en qué sucursal se encuentra." />
      <form className="mb-6 grid gap-3 rounded-lg border border-borde/80 bg-white p-4 shadow-suave sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtros del catálogo">
        <Selector etiqueta="Sucursal" name="sucursal" defaultValue={f.sucursal ?? ""} vacio="Toda la red" opciones={sucs.map((s) => [s.id, s.nombre] as const)} />
        <Selector etiqueta="Marca" name="marca" defaultValue={f.marca ?? ""} vacio="Todas" opciones={[...new Set(marcas.map((m) => m.marca as string))].sort().map((m) => [m, m] as const)} />
        <Entrada etiqueta="Modelo" name="modelo" defaultValue={f.modelo ?? ""} placeholder="Ej.: Hilux" />
        <Selector etiqueta="Condición" name="condicion" defaultValue={f.condicion ?? ""} vacio="0 km y usados" opciones={[["0km", "0 km"], ["usado", "Usados"]]} />
        <Entrada etiqueta="Año desde" name="anio" type="number" inputMode="numeric" min={1990} max={2030} defaultValue={f.anio ?? ""} placeholder="Ej.: 2020" />
        <Entrada etiqueta="Precio hasta (millones de $)" name="precio" type="number" inputMode="numeric" min={1} defaultValue={f.precio ?? ""} placeholder="Ej.: 40" />
        <Selector etiqueta="Combustible" name="combustible" defaultValue={f.combustible ?? ""} vacio="Todos" opciones={[["nafta", "Nafta"], ["diesel", "Diésel"], ["hibrido", "Híbrido"], ["electrico", "Eléctrico"], ["gnc", "GNC"]]} />
        <Selector etiqueta="Transmisión" name="transmision" defaultValue={f.transmision ?? ""} vacio="Todas" opciones={[["manual", "Manual"], ["automatica", "Automática"]]} />
        <Selector etiqueta="Ordenar por" name="orden" defaultValue={f.orden ?? ""} vacio="Últimos ingresos" opciones={[["precio_asc", "Precio: menor a mayor"], ["precio_desc", "Precio: mayor a menor"], ["anio_desc", "Año: más nuevos"], ["anio_asc", "Año: más antiguos"]]} />
        <div className="flex items-end gap-2">
          <button type="submit" className={claseBoton("secundario") + " flex-1"}>Aplicar filtros</button>
          {filtrando && <BotonLink href="/catalogo" variante="sutil">Limpiar</BotonLink>}
        </div>
      </form>
      <p className="mb-3 text-sm text-medio" role="status">{unidades.length === 1 ? "1 unidad encontrada" : `${unidades.length} unidades encontradas`}</p>
      {unidades.length === 0 ? (
        <Vacio titulo="No hay unidades con esos filtros" texto="Probá ampliar el precio o quitar algún filtro. El stock se actualiza todos los días.">
          <BotonLink href="/catalogo">Ver todas las unidades</BotonLink>
        </Vacio>
      ) : (
        <div className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">{unidades.map((u) => <TarjetaUnidad key={u.id} u={u} foto={fotosDe(u)[0]} promo={enPromo.has(u.id)} />)}</div>
      )}
      <BarraComparar />
    </>
  );
}
