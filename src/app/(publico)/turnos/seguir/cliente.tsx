"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { buscarTurno, cancelarTurnoCliente, reprogramarTurnoCliente } from "@/lib/acciones/publico";
import { etiqueta, fechaLarga } from "@/lib/formato";
import { Entrada, Insignia, claseBoton } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion, Mensajes } from "@/components/formularios";
import { LineaTiempo, SelectorHorario } from "@/components/turnos";

export function Seguimiento() {
  const [estado, buscar, pendiente] = useActionState(buscarTurno, {});
  const [reprog, setReprog] = useState(false);
  const [horario, setHorario] = useState<{ fecha: string; hora: string } | null>(null);
  const t = estado.datos;
  const rebuscar = () => { if (!t) return; const fd = new FormData(); fd.set("patente", t.patente); fd.set("codigo", t.codigo); setReprog(false); setHorario(null); startTransition(() => buscar(fd)); };
  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => buscar(fd)); }}
        className="grid gap-3 rounded-lg border border-borde/80 bg-white p-4 shadow-suave sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Entrada etiqueta="Patente" name="patente" required placeholder="AB123CD" className="uppercase" autoCapitalize="characters" />
        <Entrada etiqueta="Código de turno" name="codigo" required placeholder="6 caracteres" className="uppercase" autoCapitalize="characters" />
        <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" />
        <button type="submit" disabled={pendiente} className={claseBoton("secundario") + " sm:mt-6"}>{pendiente ? "Buscando…" : "Buscar mi turno"}</button>
        {estado.error && <div className="sm:col-span-3"><Mensajes estado={estado} /></div>}
      </form>
      {t && (
        <section className="rounded-lg border border-borde/80 bg-white p-5 shadow-suave" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 className="text-xl">{t.servicio}</h2><p className="text-sm text-medio">{t.vehiculo} · patente <span className="cifras">{t.patente}</span></p></div>
            <Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia>
          </div>
          <p className="mt-3 text-sm"><strong className="capitalize">{fechaLarga(t.fecha)}</strong> a las <span className="cifras">{t.hora.slice(0, 5)}</span> h<br />{t.taller.nombre} · {t.taller.direccion}, {t.taller.localidad} · Tel. {t.taller.telefono}</p>
          {t.derivado && <p className="mt-2 rounded-md bg-fondo px-3 py-2 text-sm">Turno derivado desde {t.origen}: el trabajo se realiza en {t.taller.nombre}.</p>}
          {["cancelado", "rechazado", "ausente"].includes(t.estado) ? (
            <div className="mt-4 rounded-md border border-borde bg-fondo px-3 py-3 text-sm">
              {t.estado === "cancelado" ? "Este turno fue cancelado." : t.estado === "rechazado" ? `El taller no pudo tomar este turno. ${t.eventos.at(-1)?.detalle ?? ""}` : "No registramos tu visita en la fecha del turno."}
              <div className="mt-2"><Link href="/turnos" className={claseBoton("secundario", true)}>Sacar un turno nuevo</Link></div>
            </div>
          ) : <div className="mt-5"><LineaTiempo estado={t.estado} eventos={t.eventos} /></div>}
          {t.encuestaPendiente && <div className="mt-4 rounded-md border border-dorado/40 bg-dorado/10 px-3 py-3 text-sm">¿Cómo fue tu experiencia? <Link href={`/encuesta/${t.codigo}`} className="font-medium text-marino underline">Responder la encuesta de satisfacción</Link></div>}
          {t.activo && (
            <div className="mt-5 border-t border-borde/70 pt-4">
              {!t.modificable ? <p className="text-sm text-medio">Faltan menos de 24 horas: para reprogramar o cancelar, llamá al taller al {t.taller.telefono}.</p> : reprog ? (
                <FormAccion accion={reprogramarTurnoCliente} ocultos={{ patente: t.patente, codigo: t.codigo, fecha: horario?.fecha, hora: horario?.hora }} alTerminar={rebuscar}>
                  <SelectorHorario taller={t.tallerId} servicio={t.servicioId} valor={horario} onChange={setHorario} />
                  <div className="mt-4 flex gap-2"><BotonEnviar variante="primario">Reprogramar turno</BotonEnviar><button type="button" className={claseBoton("contorno")} onClick={() => setReprog(false)}>Conservar el turno actual</button></div>
                </FormAccion>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={claseBoton("contorno", true)} onClick={() => setReprog(true)}>Reprogramar turno</button>
                  <BotonAccion accion={async (p, fd) => { const r = await cancelarTurnoCliente(p, fd); if (r.ok) rebuscar(); return r; }} campos={{ patente: t.patente, codigo: t.codigo }} variante="peligro"
                    confirmar={`¿Cancelar el turno del ${fechaLarga(t.fecha)} a las ${t.hora.slice(0, 5)} h? El horario queda libre para otro cliente.`}>Cancelar turno</BotonAccion>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
