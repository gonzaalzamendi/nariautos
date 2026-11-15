import Link from "next/link";
import { CalendarClock, Search, Wrench } from "lucide-react";
import { db, leer } from "@/lib/db";
import { SEL_UNIDAD, fotosDe, promocionesVigentes, sucursales } from "@/lib/datos";
import { fecha } from "@/lib/formato";
import { BotonLink, Insignia, claseCampo, claseBoton } from "@/components/ui";
import { TarjetaUnidad } from "@/components/unidades";
import { BarraComparar } from "@/components/comparador";

export const dynamic = "force-dynamic";

export default async function Inicio() {
  const [sucs, promos, destacadas, marcas] = await Promise.all([
    sucursales(), promocionesVigentes(),
    leer<any[]>(db().from("unidades").select(SEL_UNIDAD).eq("estado", "disponible").order("fecha_ingreso", { ascending: false }).limit(6)),
    leer<any[]>(db().from("unidades").select("marca").neq("estado", "vendida")),
  ]);
  const listaMarcas = [...new Set(marcas.map((m) => m.marca))].sort();
  const enPromo = new Set(promos.flatMap((p) => p.promocion_unidad.map((x: any) => x.unidad_id)));
  return (
    <div className="space-y-12">
      <section className="rounded-lg bg-marino px-5 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-sm uppercase tracking-widest text-dorado">Concesionaria · Taller oficial</p>
        <h1 className="mt-2 max-w-2xl text-3xl !text-white sm:text-4xl">Todo el stock de nuestras cuatro sucursales, en un solo lugar</h1>
        <p className="mt-3 max-w-xl text-white/80">Buscá tu próxima unidad, pedí una cotización o un test drive y reservá el turno de taller sin llamar por teléfono.</p>
        <form action="/catalogo" className="mt-6 grid max-w-3xl gap-3 rounded-lg bg-white p-4 text-grafito sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <div><label htmlFor="b-marca" className="mb-1 block text-sm font-medium">Marca</label>
            <select id="b-marca" name="marca" className={claseCampo}><option value="">Todas las marcas</option>{listaMarcas.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label htmlFor="b-cond" className="mb-1 block text-sm font-medium">Condición</label>
            <select id="b-cond" name="condicion" className={claseCampo}><option value="">0 km y usados</option><option value="0km">0 km</option><option value="usado">Usados</option></select></div>
          <div><label htmlFor="b-suc" className="mb-1 block text-sm font-medium">Sucursal</label>
            <select id="b-suc" name="sucursal" className={claseCampo}><option value="">Toda la red</option>{sucs.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
          <button type="submit" className={claseBoton("primario")}><Search size={16} aria-hidden="true" />Buscar unidades</button>
        </form>
      </section>

      <section aria-labelledby="t-accesos" className="grid gap-4 sm:grid-cols-2">
        <h2 id="t-accesos" className="sr-only">Taller y post-venta</h2>
        <Link href="/turnos" className="flex items-start gap-4 rounded-lg border border-borde/80 bg-white p-5 shadow-suave hover:border-acero">
          <Wrench className="mt-1 shrink-0 text-dorado" size={28} aria-hidden="true" />
          <span><span className="titulo block text-xl">Sacar turno de taller</span><span className="mt-1 block text-sm text-medio">Elegí el servicio, el taller, el día y la hora. Recibís un código para seguir tu turno.</span></span>
        </Link>
        <Link href="/turnos/seguir" className="flex items-start gap-4 rounded-lg border border-borde/80 bg-white p-5 shadow-suave hover:border-acero">
          <CalendarClock className="mt-1 shrink-0 text-dorado" size={28} aria-hidden="true" />
          <span><span className="titulo block text-xl">Seguir mi turno</span><span className="mt-1 block text-sm text-medio">Con tu patente y el código, mirá en qué estado está tu vehículo, reprogramá o cancelá.</span></span>
        </Link>
      </section>

      {promos.length > 0 && (
        <section aria-labelledby="t-promos">
          <div className="mb-4 flex items-end justify-between gap-3"><h2 id="t-promos" className="text-2xl">Promociones vigentes</h2><Link href="/promociones" className="text-sm text-acero underline">Ver todas</Link></div>
          <div className="grid gap-4 md:grid-cols-3">
            {promos.slice(0, 3).map((p) => (
              <article key={p.id} className="rounded-lg border border-borde/80 border-t-2 border-t-dorado bg-white p-5 shadow-suave">
                <Insignia tono="dorado">{p.sucursales?.nombre ?? "Toda la red"}</Insignia>
                <h3 className="mt-2 text-lg leading-snug">{p.titulo}</h3>
                <p className="mt-1 text-sm text-medio">{p.descripcion}</p>
                <p className="mt-3 text-xs text-medio">Vigente hasta el {fecha(p.vigente_hasta)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="t-ingresos">
        <div className="mb-4 flex items-end justify-between gap-3"><h2 id="t-ingresos" className="text-2xl">Últimos ingresos</h2><Link href="/catalogo" className="text-sm text-acero underline">Ver el catálogo completo</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{destacadas.map((u) => <TarjetaUnidad key={u.id} u={u} foto={fotosDe(u)[0]} promo={enPromo.has(u.id)} />)}</div>
      </section>

      <section aria-labelledby="t-suc">
        <div className="mb-4 flex items-end justify-between gap-3"><h2 id="t-suc" className="text-2xl">Nuestras sucursales</h2><Link href="/sucursales" className="text-sm text-acero underline">Direcciones y horarios</Link></div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sucs.map((s) => (
            <li key={s.id} className="rounded-lg border border-borde/80 bg-white p-4 shadow-suave">
              <h3 className="text-lg">{s.nombre}</h3>
              <p className="text-sm text-medio">{s.direccion}, {s.localidad}</p>
              <div className="mt-2 flex flex-wrap gap-1.5"><Insignia tono="info">Ventas</Insignia>{s.tiene_taller ? <Insignia tono="exito">Con taller</Insignia> : <Insignia>Sin taller · deriva a {s.referencia?.nombre}</Insignia>}</div>
            </li>
          ))}
        </ul>
        <div className="mt-5"><BotonLink href="/tasacion" variante="contorno">Tasar mi usado online</BotonLink></div>
      </section>
      <BarraComparar />
    </div>
  );
}
