import { db, leer } from "@/lib/db";
import { SEL_UNIDAD, fotosDe, promocionesVigentes } from "@/lib/datos";
import { fecha } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Vacio } from "@/components/ui";
import { TarjetaUnidad } from "@/components/unidades";

export const metadata = { title: "Promociones vigentes" };
export const dynamic = "force-dynamic";

export default async function Promociones() {
  const promos = await promocionesVigentes();
  const ids = [...new Set(promos.flatMap((p) => p.promocion_unidad.map((x: any) => x.unidad_id)))];
  const us = ids.length ? await leer<any[]>(db().from("unidades").select(SEL_UNIDAD).in("id", ids).neq("estado", "vendida")) : [];
  return (
    <>
      <Encabezado titulo="Promociones vigentes" texto="Beneficios de la red y de cada sucursal." />
      {promos.length === 0 && <Vacio titulo="Hoy no hay promociones vigentes" texto="Mirá el catálogo: actualizamos precios y beneficios todas las semanas."><BotonLink href="/catalogo">Ver el catálogo</BotonLink></Vacio>}
      <div className="space-y-8">
        {promos.map((p) => {
          const lista = us.filter((u) => p.promocion_unidad.some((x: any) => x.unidad_id === u.id));
          return (
            <section key={p.id} aria-labelledby={`p-${p.id}`}>
              <div className="rounded-lg border border-borde/80 border-t-2 border-t-dorado bg-white p-5 shadow-suave">
                <Insignia tono="dorado">{p.sucursales?.nombre ?? "Toda la red"}</Insignia>
                <h2 id={`p-${p.id}`} className="mt-2 text-xl">{p.titulo}</h2>
                <p className="mt-1 max-w-3xl text-sm">{p.descripcion}</p>
                <p className="mt-2 text-xs text-medio">Vigente del {fecha(p.vigente_desde)} al {fecha(p.vigente_hasta)}</p>
              </div>
              {lista.length > 0 && <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{lista.map((u) => <TarjetaUnidad key={u.id} u={u} foto={fotosDe(u)[0]} promo />)}</div>}
            </section>
          );
        })}
      </div>
    </>
  );
}
