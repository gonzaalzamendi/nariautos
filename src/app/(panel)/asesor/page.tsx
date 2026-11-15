import Link from "next/link";
import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { diaSemana, etiqueta, fecha, fechaLarga, hora, hoyAR, sumarDias } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Vacio } from "@/components/ui";
import { TiempoReal } from "@/components/panel-cliente";

export const metadata = { title: "Agenda del taller" };
const SEL = "*, vehiculos(patente, marca, modelo), clientes(nombre), servicios(nombre), origen:sucursales!turnos_sucursal_origen_id_fkey(nombre)";

function Turno({ t, conFecha }: { t: any; conFecha?: boolean }) {
  return (
    <li>
      <Link href={`/asesor/turnos/${t.id}`} className={`block rounded-md border bg-white p-3 text-sm shadow-suave hover:border-acero ${t.derivado ? "border-l-4 border-l-dorado border-borde" : "border-borde"}`}>
        <span className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="cifras font-semibold text-marino">{conFecha && `${fecha(t.fecha).slice(0, 5)} · `}{hora(t.hora)} h</span>
          <Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia>
        </span>
        <span className="mt-1 block font-medium">{t.servicios.nombre}</span>
        <span className="block text-medio"><span className="cifras">{t.vehiculos.patente}</span> · {t.vehiculos.marca} {t.vehiculos.modelo} · {t.clientes.nombre}</span>
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          <Insignia>{etiqueta(t.canal_origen)}</Insignia>
          {t.derivado && <Insignia tono="dorado">Derivado desde {t.origen.nombre}</Insignia>}
        </span>
      </Link>
    </li>
  );
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ vista?: string; fecha?: string }> }) {
  const s = await exigirSucursal("asesor");
  const sp = await searchParams, vista = ["semana", "pendientes"].includes(sp.vista ?? "") ? sp.vista! : "dia";
  let dia = /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha ?? "") ? sp.fecha! : hoyAR();
  if (!sp.fecha) while (diaSemana(dia) === 0 || diaSemana(dia) === 6) dia = sumarDias(dia, 1);
  const lunes = sumarDias(dia, -((diaSemana(dia) + 6) % 7));
  const base = db().from("turnos").select(SEL).eq("sucursal_taller_id", s.sucursalId);
  const turnos = await leer<any[]>(
    vista === "pendientes" ? base.eq("estado", "solicitado").order("fecha").order("hora")
      : vista === "semana" ? base.gte("fecha", lunes).lte("fecha", sumarDias(lunes, 4)).order("hora")
      : base.eq("fecha", dia).order("hora"));
  const pestana = (v: string, t: string) => <Link href={`/asesor?vista=${v}&fecha=${dia}`} aria-current={vista === v ? "true" : undefined}
    className={`inline-flex min-h-10 items-center rounded-md border px-3 text-sm ${vista === v ? "border-marino bg-marino text-white" : "border-borde bg-white hover:border-acero"}`}>{t}</Link>;
  const paso = vista === "semana" ? 7 : 1;
  return (
    <>
      <Encabezado titulo="Agenda del taller" texto="Turnos de tu taller, incluidos los derivados desde otras sucursales."><BotonLink href="/asesor/derivar" variante="primario">Cargar turno</BotonLink></Encabezado>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">{pestana("dia", "Día")}{pestana("semana", "Semana")}{pestana("pendientes", "Por confirmar")}</div>
        <TiempoReal />
      </div>
      {vista !== "pendientes" && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <BotonLink href={`/asesor?vista=${vista}&fecha=${sumarDias(dia, -paso)}`} variante="contorno" chico>← Anterior</BotonLink>
          <p className="cifras min-w-48 text-center font-medium capitalize">{vista === "semana" ? `Semana del ${fecha(lunes)}` : fechaLarga(dia)}</p>
          <BotonLink href={`/asesor?vista=${vista}&fecha=${sumarDias(dia, paso)}`} variante="contorno" chico>Siguiente →</BotonLink>
          <BotonLink href={`/asesor?vista=${vista}`} variante="sutil" chico>Ir a hoy</BotonLink>
        </div>
      )}
      {vista === "semana" ? (
        <div className="grid gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => { const d = sumarDias(lunes, i), lista = turnos.filter((t) => t.fecha === d); return (
            <section key={d} aria-label={fechaLarga(d)}>
              <h2 className="mb-2 border-b border-borde pb-1 font-sans text-sm font-semibold capitalize text-grafito"><Link href={`/asesor?vista=dia&fecha=${d}`} className="hover:underline">{fechaLarga(d).split(",")[0]} {fecha(d).slice(0, 5)}</Link> <span className="cifras font-normal text-medio">({lista.length})</span></h2>
              {lista.length === 0 ? <p className="text-sm text-medio">Sin turnos</p> : <ul className="space-y-2">{lista.map((t) => <Turno key={t.id} t={t} />)}</ul>}
            </section>); })}
        </div>
      ) : turnos.length === 0 ? (
        <Vacio titulo={vista === "pendientes" ? "No hay turnos por confirmar" : "No hay turnos para este día"} texto={vista === "pendientes" ? "Los turnos que piden los clientes o derivan otras sucursales aparecen acá al instante." : "Podés cargar un turno para un cliente que llama o se acerca al taller."}>
          <BotonLink href="/asesor/derivar">Cargar turno</BotonLink></Vacio>
      ) : <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{turnos.map((t) => <Turno key={t.id} t={t} conFecha={vista === "pendientes"} />)}</ul>}
    </>
  );
}
