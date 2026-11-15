"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import clsx from "clsx";
import { consultarDisponibilidad } from "@/lib/acciones/publico";
import { diaSemana, fecha as fmtFecha, fechaLarga, hoyAR, moneda, sumarDias } from "@/lib/formato";
import type { Estado } from "@/lib/tipos";
import { AreaTexto, Entrada, Selector, claseBoton } from "./ui";
import { Mensajes } from "./formularios";

/** Agenda compartida: días hábiles y franjas libres del taller elegido. */
export function SelectorHorario({ taller, servicio, valor, onChange }: { taller: number; servicio: number; valor: { fecha: string; hora: string } | null; onChange: (v: { fecha: string; hora: string } | null) => void }) {
  const dias = useMemo(() => {
    const d: string[] = []; let f = hoyAR();
    while (d.length < 10) { if (diaSemana(f) >= 1 && diaSemana(f) <= 5) d.push(f); f = sumarDias(f, 1); }
    return d;
  }, []);
  const [dia, setDia] = useState(valor?.fecha ?? dias[0]);
  const [franjas, setFranjas] = useState<{ hora: string; libres: number }[] | null>(null);
  useEffect(() => {
    let vigente = true; setFranjas(null);
    consultarDisponibilidad(taller, dia, servicio).then((f) => { if (vigente) setFranjas(f); });
    return () => { vigente = false; };
  }, [taller, dia, servicio]);
  const libres = franjas?.filter((f) => f.libres > 0) ?? [];
  return (
    <div>
      <p id="lbl-dia" className="mb-2 text-sm font-medium">Día</p>
      <div role="radiogroup" aria-labelledby="lbl-dia" className="flex gap-2 overflow-x-auto pb-2">
        {dias.map((d) => (
          <button key={d} type="button" role="radio" aria-checked={d === dia} onClick={() => { setDia(d); onChange(null); }}
            className={clsx("min-h-14 min-w-24 shrink-0 rounded-md border px-3 py-1.5 text-sm capitalize", d === dia ? "border-marino bg-marino text-white" : "border-borde bg-white hover:border-acero")}>
            {fechaLarga(d).split(",")[0]}<br /><span className="cifras font-medium">{fmtFecha(d).slice(0, 5)}</span>
          </button>
        ))}
      </div>
      <p id="lbl-hora" className="mb-2 mt-3 text-sm font-medium">Horario disponible</p>
      {franjas === null ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" role="status" aria-label="Cargando horarios">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-11 animate-pulse rounded-md bg-borde/50" />)}</div>
      ) : libres.length === 0 ? (
        <p className="rounded-md border border-dashed border-borde bg-fondo px-3 py-4 text-sm text-medio">No quedan horarios libres para este servicio el {fmtFecha(dia)}. Elegí otro día.</p>
      ) : (
        <div role="radiogroup" aria-labelledby="lbl-hora" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {libres.map((f) => {
            const sel = valor?.fecha === dia && valor.hora === f.hora;
            return <button key={f.hora} type="button" role="radio" aria-checked={sel} onClick={() => onChange({ fecha: dia, hora: f.hora })}
              className={clsx("cifras min-h-11 rounded-md border text-sm font-medium", sel ? "border-marino bg-marino text-white" : "border-borde bg-white hover:border-acero")}>{f.hora}</button>;
          })}
        </div>
      )}
    </div>
  );
}

type Props = {
  servicios: any[]; sucursales: any[]; modo: "cliente" | "empleado";
  origenFijo?: number; sucursalInicial?: number;
  reservar: (datos: Record<string, unknown>) => Promise<Estado>;
};
const PASOS = ["Servicio", "Taller", "Día y hora", "Tus datos", "Confirmación"];

export function AsistenteTurno({ servicios, sucursales, modo, origenFijo, sucursalInicial, reservar }: Props) {
  const empleado = modo === "empleado";
  const [paso, setPaso] = useState(0);
  const [servicio, setServicio] = useState<number | null>(null);
  const [cercana, setCercana] = useState<number | null>(origenFijo ?? sucursalInicial ?? null);
  const [tallerElegido, setTallerElegido] = useState<number | null>(null);
  const [horario, setHorario] = useState<{ fecha: string; hora: string } | null>(null);
  const [d, setD] = useState<Record<string, string>>({ canal: "presencial" });
  const [estado, setEstado] = useState<Estado>({});
  const [enviando, iniciar] = useTransition();

  const suc = sucursales.find((s) => s.id === cercana);
  const talleres = sucursales.filter((s) => s.tiene_taller);
  const taller = suc ? (suc.tiene_taller ? suc.id : tallerElegido ?? suc.taller_referencia_id) : null;
  const tallerSuc = sucursales.find((s) => s.id === taller);
  const srv = servicios.find((s) => s.id === servicio);
  const campo = (k: string) => ({ name: k, value: d[k] ?? "", onChange: (e: React.ChangeEvent<any>) => setD((x) => ({ ...x, [k]: e.target.value })) });
  const km = (id: number) => { const v = suc?.distancias?.[id]; return v != null ? `a ${String(v).replace(".", ",")} km` : ""; };

  const confirmar = () => {
    setEstado({});
    iniciar(async () => {
      const r = await reservar({ ...d, servicio, taller, origen: origenFijo ?? cercana, fecha: horario?.fecha, hora: horario?.hora });
      setEstado(r);
      if (r.ok) setPaso(4);
    });
  };
  const puedeSeguir = [servicio != null, taller != null, horario != null, true][paso];

  if (paso === 4 && estado.datos) {
    const t = estado.datos;
    return (
      <div className="rounded-lg border border-exito/40 bg-white p-6 text-center shadow-suave" role="status">
        <p className="text-sm font-medium uppercase tracking-wide text-exito">Turno reservado</p>
        <h2 className="mt-1 text-2xl">{empleado ? "El turno quedó en la agenda del taller" : "Guardá tu código de turno"}</h2>
        <p className="cifras mx-auto mt-4 w-fit rounded-md border-2 border-dashed border-dorado bg-dorado/10 px-6 py-3 font-mono text-3xl font-semibold tracking-[0.2em] text-marino">{t.codigo}</p>
        <p className="mt-4">{srv?.nombre} · {fechaLarga(t.fecha)} a las {String(t.hora).slice(0, 5)} h<br /><strong>{tallerSuc?.nombre}</strong> · {tallerSuc?.direccion}, {tallerSuc?.localidad}</p>
        {t.derivado && <p className="mx-auto mt-3 max-w-md rounded-md bg-fondo px-3 py-2 text-sm">Turno derivado desde {suc?.nombre}: el trabajo se realiza en {tallerSuc?.nombre}.</p>}
        <p className="mx-auto mt-3 max-w-md text-sm text-medio">{empleado ? "Entregale el código al cliente: con su patente puede seguir el turno desde la web." : `Con la patente ${t.patente} y este código podés seguir, reprogramar o cancelar el turno. El asesor del taller lo va a confirmar.`}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {empleado ? <button type="button" className={claseBoton("secundario")} onClick={() => { setPaso(0); setServicio(null); setHorario(null); setD({ canal: "presencial" }); setEstado({}); }}>Cargar otro turno</button>
            : <Link href="/turnos/seguir" className={claseBoton("secundario")}>Seguir mi turno</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-borde/80 bg-white shadow-suave">
      <ol className="flex gap-1 overflow-x-auto border-b border-borde/70 px-3 py-3 text-sm" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} aria-current={i === paso ? "step" : undefined} className={clsx("flex shrink-0 items-center gap-1.5 rounded px-2 py-1", i === paso ? "font-semibold text-marino" : i < paso ? "text-exito" : "text-medio")}>
            <span className={clsx("cifras flex h-6 w-6 items-center justify-center rounded-full border text-xs", i === paso ? "border-marino bg-marino text-white" : i < paso ? "border-exito" : "border-borde")}>{i + 1}</span>{i === 3 && empleado ? "Cliente y vehículo" : p}
          </li>
        ))}
      </ol>
      <div className="p-4 sm:p-6">
        {paso === 0 && (
          <fieldset><legend className="titulo mb-3 text-xl">¿Qué servicio necesita el vehículo?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {servicios.map((s) => (
                <label key={s.id} className={clsx("flex cursor-pointer gap-3 rounded-md border p-3", servicio === s.id ? "border-marino bg-acero/5" : "border-borde hover:border-acero")}>
                  <input type="radio" name="servicio" className="mt-1 h-4 w-4 accent-[#0b1f3a]" checked={servicio === s.id} onChange={() => { setServicio(s.id); setHorario(null); }} />
                  <span><span className="block font-medium">{s.nombre}</span><span className="block text-sm text-medio">{s.descripcion}</span>
                    <span className="cifras mt-1 block text-xs text-medio">Duración estimada: {s.duracion_min} min · Desde {moneda(s.precio_orientativo)} (orientativo)</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {paso === 1 && (
          <div>
            {!origenFijo && (
              <fieldset><legend className="titulo mb-3 text-xl">¿Cuál es tu sucursal más cercana?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sucursales.map((s) => (
                    <label key={s.id} className={clsx("flex cursor-pointer gap-3 rounded-md border p-3", cercana === s.id ? "border-marino bg-acero/5" : "border-borde hover:border-acero")}>
                      <input type="radio" name="cercana" className="mt-1 h-4 w-4 accent-[#0b1f3a]" checked={cercana === s.id} onChange={() => { setCercana(s.id); setTallerElegido(null); setHorario(null); }} />
                      <span><span className="block font-medium">{s.nombre}</span><span className="block text-sm text-medio">{s.direccion}, {s.localidad}</span>
                        <span className="mt-1 block text-xs font-medium text-acero">{s.tiene_taller ? "Con taller propio" : "Sin taller"}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {suc && !suc.tiene_taller && (
              <div className={clsx("rounded-md border border-alerta/40 bg-alerta/10 p-4", !origenFijo && "mt-4")} role="status">
                <p className="font-medium text-alerta-texto">{empleado ? `${suc.nombre} no tiene taller: el turno se deriva.` : "Esta sucursal no tiene taller."}</p>
                <p className="mt-1 text-sm">{empleado ? "El turno" : "Tu turno"} se realizará en <strong>{suc.referencia?.nombre}</strong> ({suc.referencia?.direccion}, {suc.referencia?.localidad}), {km(suc.taller_referencia_id)}.</p>
                <fieldset className="mt-3"><legend className="mb-1 text-sm font-medium">Taller donde se hace el trabajo</legend>
                  {talleres.map((t) => (
                    <label key={t.id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                      <input type="radio" name="taller" className="h-4 w-4 accent-[#0b1f3a]" checked={taller === t.id} onChange={() => { setTallerElegido(t.id); setHorario(null); }} />
                      {t.nombre} · {t.localidad} <span className="text-medio">({km(t.id)}{t.id === suc.taller_referencia_id ? ", taller de referencia" : ""})</span>
                    </label>
                  ))}
                </fieldset>
              </div>
            )}
            {suc?.tiene_taller && origenFijo && <p className="text-sm">El turno se realiza en <strong>{suc.nombre}</strong>.</p>}
          </div>
        )}
        {paso === 2 && taller && servicio && (
          <div><h2 className="mb-1 text-xl">Elegí día y hora</h2>
            <p className="mb-4 text-sm text-medio">Agenda de {tallerSuc?.nombre} para «{srv?.nombre}» ({srv?.duracion_min} min). Solo se muestran horarios con lugar.</p>
            <SelectorHorario taller={taller} servicio={servicio} valor={horario} onChange={setHorario} />
          </div>
        )}
        {paso === 3 && (
          <form id="form-turno" onSubmit={(e) => { e.preventDefault(); confirmar(); }}>
            <h2 className="mb-3 text-xl">{empleado ? "Datos del cliente y del vehículo" : "Datos del vehículo y de contacto"}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Entrada etiqueta="Patente" {...campo("patente")} required placeholder="AB123CD" autoCapitalize="characters" className="uppercase" />
              <Entrada etiqueta="Kilómetros actuales" {...campo("km")} type="number" inputMode="numeric" min={0} required />
              <Entrada etiqueta="Marca" {...campo("marca")} required /><Entrada etiqueta="Modelo" {...campo("modelo")} required />
              <Entrada etiqueta="Año" {...campo("anio")} type="number" inputMode="numeric" min={1960} max={2030} required />
              <Entrada etiqueta={empleado ? "Nombre y apellido del cliente" : "Nombre y apellido"} {...campo("nombre")} required autoComplete={empleado ? "off" : "name"} />
              <Entrada etiqueta="Teléfono" {...campo("telefono")} type="tel" inputMode="tel" required ayuda="Con código de área, sin 0 ni 15." autoComplete={empleado ? "off" : "tel"} />
              <Entrada etiqueta="Email (opcional)" {...campo("email")} type="email" autoComplete={empleado ? "off" : "email"} />
              {empleado && <Selector etiqueta="Canal por el que llegó" {...campo("canal")} opciones={[["presencial", "Presencial"], ["telefono", "Teléfono"], ["whatsapp", "WhatsApp"], ["redes", "Redes sociales"]]} />}
              <AreaTexto etiqueta="Observaciones (opcional)" {...campo("observaciones")} maxLength={500} contenedor="sm:col-span-2" />
            </div>
            <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" onChange={(e) => setD((x) => ({ ...x, sitio_web: e.target.value }))} />
            <p className="mt-4 rounded-md bg-fondo px-3 py-2 text-sm"><strong>{srv?.nombre}</strong> · {horario && fechaLarga(horario.fecha)} a las {horario?.hora} h · {tallerSuc?.nombre}</p>
          </form>
        )}
        {estado.error && <div className="mt-4"><Mensajes estado={estado} /></div>}
        <div className="mt-6 flex justify-between gap-2 border-t border-borde/70 pt-4">
          <button type="button" className={clsx(claseBoton("contorno"), paso === 0 && "invisible")} onClick={() => { setEstado({}); setPaso((p) => p - 1); }}>Volver</button>
          {paso < 3 ? <button type="button" disabled={!puedeSeguir} className={claseBoton("secundario")} onClick={() => setPaso((p) => p + 1)}>Continuar</button>
            : <button type="submit" form="form-turno" disabled={enviando} aria-busy={enviando} className={claseBoton("primario")}>{enviando ? "Reservando…" : empleado ? "Reservar turno en el taller" : "Confirmar turno"}</button>}
        </div>
      </div>
    </div>
  );
}

export function LineaTiempo({ estado, eventos }: { estado: string; eventos: { estado: string; detalle: string | null; creado_en: string }[] }) {
  const pasos = [["solicitado", "Solicitado"], ["confirmado", "Confirmado"], ["recibido", "Recibido"], ["en_reparacion", "En reparación"], ["listo", "Listo para retirar"], ["entregado", "Entregado"]];
  const actual = pasos.findIndex(([e]) => e === estado);
  const cuando = (e: string) => { const ev = eventos.find((x) => x.estado === e); return ev ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Argentina/Buenos_Aires", hour12: false }).format(new Date(ev.creado_en)) : null; };
  return (
    <ol className="relative ml-3 border-l-2 border-borde">
      {pasos.map(([e, t], i) => {
        const hecho = actual >= 0 && i <= actual;
        return (
          <li key={e} className="relative pb-5 pl-6 last:pb-0" aria-current={i === actual ? "step" : undefined}>
            <span className={clsx("absolute -left-[9px] top-0.5 h-4 w-4 rounded-full border-2", i === actual ? "border-dorado bg-dorado" : hecho ? "border-exito bg-exito" : "border-borde bg-white")} aria-hidden="true" />
            <p className={clsx("leading-tight", i === actual ? "font-semibold text-marino" : hecho ? "text-grafito" : "text-medio")}>{t}{i === actual && <span className="sr-only"> (estado actual)</span>}</p>
            {hecho && cuando(e) && <p className="cifras text-xs text-medio">{cuando(e)} h</p>}
          </li>
        );
      })}
    </ol>
  );
}
