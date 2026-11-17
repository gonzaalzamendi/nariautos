"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, CarFront, ChevronDown, MapPin, Pause, Play, Search, Tag } from "lucide-react";

export type Diapositiva = { antetitulo: string; titulo: string; destacado: string; texto: string; accion: string; href: string };

/** Silueta de auto en trazo fino (decorativa, mismo dibujo de las imágenes ilustrativas). */
function Silueta({ className }: { className?: string }) {
  return (
    <svg viewBox="80 150 440 190" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        <path d="M120 290 h-14 q-10 0 -10 -12 v-22 q0 -14 16 -18 l62 -14 l42 -40 q8 -8 22 -8 h112 q14 0 24 9 l44 39 l74 12 q22 4 22 24 v18 q0 12 -12 12 h-16" />
        <path d="M190 290 h196" /><circle cx="155" cy="290" r="33" /><circle cx="421" cy="290" r="33" /><path d="M186 224 h214 M290 178 v46" />
      </g>
    </svg>
  );
}

/** Portada con 3 mensajes que rotan cada 7 s; se pausa al pasar el mouse, con el foco o con el botón, y no rota si se pide menos movimiento. */
export function HeroInicio({ diapositivas }: { diapositivas: Diapositiva[] }) {
  const [i, setI] = useState(0);
  const [pausa, setPausa] = useState(false);
  const [quieto, setQuieto] = useState(false);
  const [encima, setEncima] = useState(false);
  useEffect(() => { setQuieto(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  useEffect(() => {
    if (pausa || quieto || encima || diapositivas.length < 2) return;
    const t = setTimeout(() => setI((x) => (x + 1) % diapositivas.length), 7000);
    return () => clearTimeout(t);
  }, [i, pausa, quieto, encima, diapositivas.length]);
  const d = diapositivas[i];
  return (
    <section aria-roledescription="carrusel" aria-label="Destacados de NariAutos" onMouseEnter={() => setEncima(true)} onMouseLeave={() => setEncima(false)}
      onFocus={() => setEncima(true)} onBlur={() => setEncima(false)}
      className="relative overflow-hidden bg-marino bg-[radial-gradient(ellipse_at_85%_15%,rgb(44_74_110/0.95),transparent_55%),radial-gradient(ellipse_at_10%_100%,rgb(44_74_110/0.35),transparent_50%)] pb-24 pt-14 text-white sm:pb-28 sm:pt-20">
      <Silueta className="pointer-events-none absolute -right-16 bottom-10 w-[560px] max-w-none text-white/[0.07] sm:right-0 lg:w-[680px]" />
      <div className="relative mx-auto max-w-6xl px-4">
        <div key={i} className="max-w-xl border-l-4 border-dorado pl-5 motion-safe:animate-[nari-entrada_0.5s_ease-out] sm:pl-7" aria-live={pausa || quieto ? "polite" : "off"}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dorado">{d.antetitulo}</p>
          <h1 className="mt-3 text-[40px] leading-[1.05] !text-white sm:text-6xl">{d.titulo} <span className="text-dorado">{d.destacado}</span></h1>
          <p className="mt-4 max-w-md text-lg text-white/85">{d.texto}</p>
          <Link href={d.href} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-dorado px-6 font-semibold text-marino shadow-[0_6px_18px_rgb(0_0_0/0.25)] hover:bg-[#b89759]">
            {d.accion}<ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {diapositivas.length > 1 && (
          <div className="mt-10 flex items-center justify-center gap-1">
            {diapositivas.map((x, n) => (
              <button key={n} type="button" onClick={() => setI(n)} aria-label={`Ver destacado ${n + 1} de ${diapositivas.length}: ${x.titulo} ${x.destacado}`} aria-current={n === i}
                className="flex h-9 w-9 items-center justify-center"><span className={clsx("block h-2.5 rounded-full transition-all", n === i ? "w-7 bg-dorado" : "w-2.5 bg-white/70 hover:bg-white")} /></button>
            ))}
            {!quieto && (
              <button type="button" onClick={() => setPausa((p) => !p)} aria-label={pausa ? "Reanudar el carrusel" : "Pausar el carrusel"}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
                {pausa ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function CampoBusqueda({ icono, etiqueta, children }: { icono: React.ReactNode; etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="relative flex min-h-14 flex-1 items-center gap-2.5 px-4 lg:border-r lg:border-borde/80 lg:last-of-type:border-r-0">
      <span className="text-marino" aria-hidden="true">{icono}</span>
      <span className="sr-only">{etiqueta}</span>
      {children}
      <ChevronDown size={16} className="pointer-events-none absolute right-4 text-grafito" aria-hidden="true" />
    </label>
  );
}
const claseSelect = "h-14 w-full cursor-pointer appearance-none bg-transparent pr-6 text-[15px] text-grafito focus:outline-none";

/** Buscador de la portada: el modelo se filtra según la marca elegida. Envía a /catalogo con los filtros. */
export function BuscadorInicio({ modelos, sucursales }: { modelos: { marca: string; modelo: string }[]; sucursales: { id: number; nombre: string }[] }) {
  const [marca, setMarca] = useState("");
  const marcas = useMemo(() => [...new Set(modelos.map((m) => m.marca))].sort(), [modelos]);
  const lista = useMemo(() => [...new Set(modelos.filter((m) => !marca || m.marca === marca).map((m) => m.modelo))].sort(), [modelos, marca]);
  return (
    <form action="/catalogo" role="search" aria-label="Buscar vehículos"
      className="relative z-10 mx-auto -mt-12 grid max-w-5xl overflow-hidden rounded-xl border border-borde/60 bg-white shadow-[0_12px_32px_rgb(11_31_58/0.14)] max-lg:divide-y max-lg:divide-borde/80 sm:grid-cols-2 lg:flex lg:items-center lg:pr-2">
      <CampoBusqueda icono={<CarFront size={20} />} etiqueta="Marca">
        <select name="marca" value={marca} onChange={(e) => setMarca(e.target.value)} className={claseSelect}><option value="">Marca</option>{marcas.map((m) => <option key={m}>{m}</option>)}</select>
      </CampoBusqueda>
      <CampoBusqueda icono={<CarFront size={20} />} etiqueta="Modelo">
        <select name="modelo" key={marca} defaultValue="" className={claseSelect}><option value="">Modelo</option>{lista.map((m) => <option key={m}>{m}</option>)}</select>
      </CampoBusqueda>
      <CampoBusqueda icono={<Tag size={20} />} etiqueta="Condición">
        <select name="condicion" defaultValue="" className={claseSelect}><option value="">0 km o usados</option><option value="0km">0 km</option><option value="usado">Usados</option></select>
      </CampoBusqueda>
      <CampoBusqueda icono={<MapPin size={20} />} etiqueta="Sucursal">
        <select name="sucursal" defaultValue="" className={claseSelect}><option value="">Sucursal</option>{sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
      </CampoBusqueda>
      <div className="p-2 sm:col-span-2 lg:p-0">
        <button type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-dorado px-7 font-semibold text-marino hover:bg-[#b89759] lg:w-auto">
          <Search size={18} aria-hidden="true" />Buscar
        </button>
      </div>
    </form>
  );
}
