import Link from "next/link";
import { ArrowRight, Car, Handshake, ShieldCheck, Wrench } from "lucide-react";
import { db, leer } from "@/lib/db";
import { SEL_UNIDAD, fotosDe, promocionesVigentes, sucursales } from "@/lib/datos";
import { fecha, moneda, numero } from "@/lib/formato";
import { Insignia } from "@/components/ui";
import { BuscadorInicio, HeroInicio, type Diapositiva } from "@/components/inicio";
import { BarraComparar } from "@/components/comparador";

export const dynamic = "force-dynamic";

function Titulo({ id, children, href, accion }: { id: string; children: React.ReactNode; href?: string; accion?: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-1 sm:flex-nowrap">
      <h2 id={id} className="text-2xl sm:shrink-0 sm:text-[32px]">{children}</h2>
      <span className="hidden h-px flex-1 bg-dorado/70 sm:block" aria-hidden="true" />
      {href && <Link href={href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-medium text-dorado-texto hover:underline">{accion}<ArrowRight size={16} aria-hidden="true" /></Link>}
    </div>
  );
}

function TarjetaDestacada({ u }: { u: any }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-borde/60 bg-white shadow-suave transition-shadow hover:shadow-[0_8px_24px_rgb(11_31_58/0.10)]">
      <Link href={`/catalogo/${u.id}`} className="relative block" tabIndex={-1} aria-hidden="true">
        <img src={fotosDe(u)[0]} alt="" width={640} height={400} loading="lazy" className="aspect-[16/10] w-full bg-fondo object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-marino px-3 py-1 text-xs font-semibold text-white">{u.condicion === "0km" ? "0 km" : "Usado"}</span>
        {u.estado === "reservada" && <span className="absolute right-3 top-3"><Insignia estado="reservada">Reservada</Insignia></span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="!font-sans text-[17px] font-semibold !text-grafito"><Link href={`/catalogo/${u.id}`} className="hover:underline">{u.marca} {u.modelo}</Link></h3>
        <p className="cifras text-sm text-medio">{u.anio} · {u.km === 0 ? "0 km" : `${numero(u.km)} km`} · {u.sucursales?.nombre}</p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <p className="cifras text-xl font-semibold text-marino">{moneda(u.precio)}</p>
          <Link href={`/catalogo/${u.id}`} className="inline-flex min-h-10 items-center rounded-full border border-dorado px-4 text-sm font-medium text-marino hover:bg-dorado/10" aria-label={`Consultar por ${u.marca} ${u.modelo}`}>Consultar</Link>
        </div>
      </div>
    </article>
  );
}

function Banner({ titulo, texto, children, icono }: { titulo: string; texto: string; children: React.ReactNode; icono: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-marino bg-[linear-gradient(110deg,#0b1f3a_0%,#0b1f3a_45%,#2c4a6e_100%)] p-6 text-white shadow-suave sm:p-8">
      <span className="pointer-events-none absolute -bottom-6 -right-4 text-white/[0.08]" aria-hidden="true">{icono}</span>
      <h2 className="relative font-sans text-[26px] font-semibold !text-white">{titulo}</h2>
      <p className="relative mt-1 max-w-xs text-white/85">{texto}</p>
      <div className="relative mt-5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
const botonBanner = "inline-flex min-h-11 items-center gap-1.5 rounded-full px-5 text-sm font-semibold";

export default async function Inicio() {
  const [sucs, promos, destacadas, modelos] = await Promise.all([
    sucursales(), promocionesVigentes(),
    leer<any[]>(db().from("unidades").select(SEL_UNIDAD).eq("estado", "disponible").order("fecha_ingreso", { ascending: false }).limit(6)),
    leer<any[]>(db().from("unidades").select("marca, modelo").neq("estado", "vendida")),
  ]);
  const promo = promos[0];
  const diapositivas: Diapositiva[] = [
    { antetitulo: "Concesionaria · Taller oficial", titulo: "Encontrá tu próximo", destacado: "auto.", texto: "En NariAutos te acompañamos en cada camino: todo el stock de nuestras cuatro sucursales, en un solo lugar.", accion: "Explorar vehículos", href: "/catalogo" },
    { antetitulo: "Post-venta", titulo: "Tu auto, en", destacado: "buenas manos.", texto: "Reservá el turno de taller online, sin llamar por teléfono, y seguí el estado de tu vehículo desde la web.", accion: "Sacar turno de taller", href: "/turnos" },
    promo
      ? { antetitulo: `Promoción · ${promo.sucursales?.nombre ?? "Toda la red"}`, titulo: promo.titulo.replace(/\s+\S+$/, ""), destacado: promo.titulo.split(/\s+/).pop()!, texto: `${promo.descripcion} Vigente hasta el ${fecha(promo.vigente_hasta)}.`, accion: "Ver promociones", href: "/promociones" }
      : { antetitulo: "Usados", titulo: "Tasá tu usado", destacado: "online.", texto: "Recibí un valor estimado y entregalo como parte de pago.", accion: "Tasar mi usado", href: "/tasacion" },
  ];
  const motivos = [
    [Car, `${sucs.length} sucursales`, "en la región"], [Handshake, "Atención", "personalizada"],
    [Wrench, "Taller propio", "de post-venta"], [ShieldCheck, "Financiación", "y promociones"],
  ] as const;
  return (
    <div className="pb-6">
      <HeroInicio diapositivas={diapositivas} />
      <div className="px-4"><BuscadorInicio modelos={modelos} sucursales={sucs.map((s) => ({ id: s.id, nombre: s.nombre }))} /></div>

      <section aria-labelledby="t-destacados" className="mx-auto mt-14 max-w-6xl px-4">
        <Titulo id="t-destacados" href="/catalogo" accion="Ver todos">Vehículos destacados</Titulo>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{destacadas.map((u) => <TarjetaDestacada key={u.id} u={u} />)}</div>
      </section>

      <section aria-labelledby="t-por-que" className="mt-14 bg-marino text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[auto_1fr]">
          <h2 id="t-por-que" className="font-sans text-3xl font-semibold leading-tight !text-white lg:border-r lg:border-dorado/70 lg:pr-10">¿Por qué elegir<br /><span className="text-dorado">NariAutos?</span></h2>
          <ul className="grid grid-cols-2 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-white/15">
            {motivos.map(([Icono, a, b]) => (
              <li key={a} className="flex flex-col items-center px-3 text-center">
                <Icono size={36} strokeWidth={1.6} className="text-dorado" aria-hidden="true" />
                <p className="mt-3 leading-snug">{a}<br />{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Usados y servicio técnico" className="mx-auto mt-10 grid max-w-6xl gap-5 px-4 md:grid-cols-2">
        <Banner titulo="Tasá tu usado" texto="Recibí un valor estimado en 24 horas hábiles y entregalo como parte de pago." icono={<Car size={190} strokeWidth={1} />}>
          <Link href="/tasacion" className={`${botonBanner} bg-dorado text-marino hover:bg-[#b89759]`}>Cotizar ahora<ArrowRight size={16} aria-hidden="true" /></Link>
        </Banner>
        <Banner titulo="Servicio técnico" texto="Cuidamos tu auto, siempre. Reservá el turno online y seguí cada etapa del trabajo." icono={<Wrench size={180} strokeWidth={1} />}>
          <Link href="/turnos" className={`${botonBanner} bg-dorado text-marino hover:bg-[#b89759]`}>Sacar turno<ArrowRight size={16} aria-hidden="true" /></Link>
          <Link href="/turnos/seguir" className={`${botonBanner} border border-white/50 text-white hover:bg-white/10`}>Seguir mi turno</Link>
        </Banner>
      </section>

      <BarraComparar />
    </div>
  );
}
