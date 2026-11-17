"use client";
import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { etiqueta, fecha, fechaLarga, linkWhatsApp } from "@/lib/formato";
import { BotonLink, Insignia, Vacio } from "./ui";
import { BotonEmail } from "./email";

export type FilaAgenda = {
  id: number; codigo: string; fecha: string; hora: string; duracion: number; estado: string;
  vehiculo: string; patente: string; anio: number | null; cliente: string; telefono: string; email: string | null;
  mecanico: string | null; servicio: string; problema: string | null; orden: number | null; origen: string | null;
};

/** Planilla de turnos: horario, vehículo, cliente y mecánico. Al tocar una fila se despliega el detalle. */
export function PlanillaAgenda({ filas }: { filas: FilaAgenda[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  if (filas.length === 0) return <Vacio titulo="No hay turnos en este período" texto="Probá con un período más largo. Los turnos los cargan los clientes desde la web o el asesor." />;
  const dias = [...new Set(filas.map((f) => f.fecha))];
  return (
    <div className="overflow-x-auto rounded-lg border border-borde/80 bg-white shadow-suave">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b border-borde bg-fondo text-xs uppercase tracking-wide text-medio">
          <tr><th scope="col" className="w-36 px-3 py-2.5 font-medium">Horario</th><th scope="col" className="px-3 py-2.5 font-medium">Vehículo</th><th scope="col" className="px-3 py-2.5 font-medium">Cliente</th><th scope="col" className="px-3 py-2.5 font-medium">Mecánico</th><th className="w-10" /></tr>
        </thead>
        <tbody>
          {dias.map((d) => (
            <Fragment key={d}>
              <tr className="border-b border-borde/60 bg-acero/5"><th colSpan={5} scope="colgroup" className="px-3 py-2 text-left text-xs font-semibold text-acero">{fechaLarga(d).replace(/^./, (c) => c.toUpperCase())} · {fecha(d)} <span className="font-normal normal-case text-medio">({filas.filter((f) => f.fecha === d).length} turnos)</span></th></tr>
              {filas.filter((f) => f.fecha === d).map((f) => {
                const abierto = abierta === f.id, fin = (() => { const [h, m] = f.hora.split(":").map(Number), t = h * 60 + m + f.duracion; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; })();
                return (
                  <Fragment key={f.id}>
                    <tr onClick={() => setAbierta(abierto ? null : f.id)} className={clsx("cursor-pointer border-b border-borde/60 hover:bg-fondo", abierto && "bg-fondo")}>
                      <td className="cifras px-3 py-2.5 font-medium text-marino">
                        <button type="button" aria-expanded={abierto} aria-controls={`det-${f.id}`} onClick={(e) => { e.stopPropagation(); setAbierta(abierto ? null : f.id); }} className="text-left underline-offset-2 hover:underline">{f.hora} a {fin} h</button>
                      </td>
                      <td className="px-3 py-2.5"><span className="cifras font-medium">{f.patente}</span><br /><span className="text-xs text-medio">{f.vehiculo}</span></td>
                      <td className="px-3 py-2.5">{f.cliente}</td>
                      <td className="px-3 py-2.5">{f.mecanico ?? <span className="text-medio">Sin asignar</span>}</td>
                      <td className="px-2 text-medio"><ChevronDown size={18} className={clsx("transition-transform", abierto && "rotate-180")} aria-hidden="true" /></td>
                    </tr>
                    {abierto && (
                      <tr id={`det-${f.id}`} className="border-b border-borde/60 bg-fondo/60">
                        <td colSpan={5} className="px-3 pb-4 pt-1">
                          <dl className="grid gap-x-6 gap-y-3 rounded-md border border-borde/70 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Horario</dt><dd className="cifras">{f.hora} a {fin} h ({f.duracion} min)</dd></div>
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Vehículo</dt><dd>{f.vehiculo}{f.anio ? ` ${f.anio}` : ""} · <span className="cifras">{f.patente}</span></dd></div>
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Cliente</dt><dd>{f.cliente}</dd></div>
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Mecánico</dt><dd>{f.mecanico ?? "Sin asignar"}</dd></div>
                            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-medio">Problema / trabajo pedido</dt><dd><strong>{f.servicio}</strong>{f.problema && f.problema !== f.servicio ? ` — ${f.problema}` : ""}</dd></div>
                            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide text-medio">Contacto</dt>
                              <dd className="cifras"><a href={`tel:${f.telefono}`} className="underline">{f.telefono}</a>{f.email && <> · <a href={`mailto:${f.email}`} className="underline">{f.email}</a></>}</dd></div>
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Estado</dt><dd className="flex flex-wrap gap-1"><Insignia estado={f.estado}>{etiqueta(f.estado)}</Insignia>{f.origen && <Insignia tono="dorado">Derivado de {f.origen}</Insignia>}</dd></div>
                            <div><dt className="text-xs uppercase tracking-wide text-medio">Código de turno</dt><dd className="cifras">{f.codigo}</dd></div>
                          </dl>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <BotonLink href={linkWhatsApp(f.telefono, `Hola ${f.cliente.split(" ")[0]}, te escribimos del taller de NariAutos por tu turno del ${fecha(f.fecha)} a las ${f.hora} h (${f.servicio}, patente ${f.patente}).`)} target="_blank" rel="noreferrer" variante="contorno" chico>Escribir por WhatsApp</BotonLink>
                            {f.email && <BotonEmail email={f.email} asunto="Tu turno en NariAutos" texto="Escribir por email" mensaje={`Hola ${f.cliente.split(" ")[0]}, te escribimos del taller de NariAutos por tu turno del ${fecha(f.fecha)} a las ${f.hora} h (${f.servicio}, patente ${f.patente}).`} />}
                            {f.orden && <BotonLink href={`/taller/ordenes/${f.orden}`} variante="contorno" chico>Ver orden de trabajo</BotonLink>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
