import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirAsesor } from "@/lib/sesion";
import { entregarVehiculo, gestionarTurno, recibirVehiculo } from "@/lib/acciones/taller";
import { etiqueta, fecha, fechaHora, fechaLarga, hora, numero } from "@/lib/formato";
import { AreaTexto, BotonLink, Dato, Encabezado, Entrada, Insignia, Selector, Tarjeta } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";
import { BotonesAviso, ReprogramarAsesor } from "@/components/taller-cliente";
import { TiempoReal } from "@/components/panel-cliente";

export const metadata = { title: "Turno" };

export default async function Turno({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirAsesor();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const t = (await db().from("turnos").select("*, vehiculos(*), clientes(*), servicios(nombre, duracion_min), origen:sucursales!turnos_sucursal_origen_id_fkey(nombre), taller:sucursales!turnos_sucursal_taller_id_fkey(nombre, direccion), eventos_turno(id, estado, detalle, creado_en, empleados(nombre)), notificaciones(id, tipo, canal, mensaje, estado, enviada_en), ordenes_trabajo(*)")
    .eq("id", id).eq("sucursal_taller_id", s.sucursalId).maybeSingle()).data as any;
  if (!t) notFound();
  const o = Array.isArray(t.ordenes_trabajo) ? t.ordenes_trabajo[0] : t.ordenes_trabajo;
  const v = t.vehiculos, n = t.clientes.nombre.split(" ")[0], cuando = `${fechaLarga(t.fecha)} a las ${hora(t.hora)} h`;
  const MENSAJES: Record<string, string> = {
    solicitado: `Hola ${n}, recibimos tu pedido de turno en NariAutos ${t.taller.nombre} para el ${cuando}. En breve te lo confirmamos. Código: ${t.codigo}.`,
    confirmado: `Hola ${n}, tu turno en NariAutos ${t.taller.nombre} (${t.taller.direccion}) quedó confirmado para el ${cuando}. Vehículo patente ${v.patente}. Código de turno: ${t.codigo}. Código del vehículo para ver su historial: ${v.codigo_auto}.`,
    recibido: `Hola ${n}, recibimos tu vehículo patente ${v.patente} en el taller. Te avisamos cuando esté listo.`,
    en_reparacion: `Hola ${n}, ya estamos trabajando en tu vehículo patente ${v.patente}. Te avisamos apenas esté listo.`,
    listo: `Hola ${n}, tu vehículo patente ${v.patente} está listo para retirar en NariAutos ${t.taller.nombre} (${t.taller.direccion}), de lunes a viernes de 8 a 17 h.`,
    entregado: `Gracias por confiar en NariAutos, ${n}. ¿Nos contás cómo fue tu experiencia? {SITIO}/encuesta/${t.codigo}`,
    rechazado: `Hola ${n}, no pudimos tomar tu turno del ${cuando}. Podés elegir otro horario en nuestra web o respondiendo este mensaje.`,
  };
  const eventos = [...t.eventos_turno].sort((a: any, b: any) => b.creado_en.localeCompare(a.creado_en));
  const avisos = t.notificaciones.filter((x: any) => x.estado === "enviada").sort((a: any, b: any) => (b.enviada_en ?? "").localeCompare(a.enviada_en ?? ""));
  return (
    <>
      <Encabezado titulo={`${t.servicios.nombre} · ${v.patente}`} texto={`Turno ${t.codigo} · ${cuando}`}>
        <TiempoReal /><Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia><BotonLink href={`/asesor?fecha=${t.fecha}`} variante="contorno" chico>Volver a la agenda</BotonLink>
      </Encabezado>
      {t.derivado && <p className="mb-4 rounded-md border border-dorado/40 bg-dorado/10 px-3 py-2 text-sm">Turno <strong>derivado desde {t.origen.nombre}</strong> por canal {etiqueta(t.canal_origen).toLowerCase()}.</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Tarjeta titulo="Cliente y vehículo">
            <dl className="grid grid-cols-2 gap-4">
              <Dato nombre="Cliente">{t.clientes.nombre}</Dato><Dato nombre="Teléfono"><span className="cifras">{t.clientes.telefono}</span></Dato>
              <Dato nombre="Vehículo">{v.marca} {v.modelo} {v.anio}</Dato><Dato nombre="Kilómetros"><span className="cifras">{numero(v.km_actual)} km</span></Dato>
              <Dato nombre="Código del vehículo"><span className="cifras font-medium">{v.codigo_auto}</span></Dato>
              <Dato nombre="Origen">{t.origen.nombre} · {etiqueta(t.canal_origen)}</Dato><Dato nombre="Duración estimada"><span className="cifras">{t.duracion_min} min</span></Dato>
            </dl>
            {t.observaciones && <p className="mt-4 rounded-md bg-fondo px-3 py-2 text-sm">Observaciones: {t.observaciones}</p>}
            <div className="mt-3"><BotonLink href={`/asesor/historial?patente=${v.patente}`} variante="sutil" chico>Ver historial del vehículo</BotonLink></div>
          </Tarjeta>

          {t.estado === "solicitado" && (
            <Tarjeta titulo="Confirmar o rechazar">
              <BotonAccion accion={gestionarTurno} campos={{ turno: t.id, accion: "confirmar" }} variante="primario" chico={false}>Confirmar turno</BotonAccion>
              <FormAccion accion={gestionarTurno} ocultos={{ turno: t.id, accion: "rechazar" }} className="mt-4 border-t border-borde/70 pt-4">
                <Entrada etiqueta="Motivo del rechazo" name="motivo" required maxLength={300} placeholder="Ej.: sin repuestos para esa fecha" />
                <div className="mt-2"><BotonEnviar variante="peligro">Rechazar turno</BotonEnviar></div>
              </FormAccion>
            </Tarjeta>
          )}
          {["solicitado", "confirmado"].includes(t.estado) && (
            <Tarjeta titulo="Recepción del vehículo">
              <FormAccion accion={recibirVehiculo} ocultos={{ turno: t.id }} className="grid gap-3 sm:grid-cols-2">
                <Entrada etiqueta="Kilómetros de ingreso" name="km_ingreso" type="number" inputMode="numeric" min={0} required defaultValue={v.km_actual ?? ""} />
                <Selector etiqueta="Nivel de combustible" name="combustible_nivel" required defaultValue="1/2" opciones={[["reserva", "Reserva"], ["1/4", "1/4"], ["1/2", "1/2"], ["3/4", "3/4"], ["lleno", "Lleno"]]} />
                <AreaTexto etiqueta="Trabajos solicitados" name="trabajos_solicitados" required defaultValue={t.servicios.nombre} contenedor="sm:col-span-2" />
                <AreaTexto etiqueta="Daños visibles" name="danos_visibles" placeholder="Rayones, abolladuras, faltantes. Dejar vacío si no hay." contenedor="sm:col-span-2" />
                <AreaTexto etiqueta="Observaciones" name="observaciones" defaultValue={t.observaciones ?? ""} contenedor="sm:col-span-2" />
                <div className="sm:col-span-2"><BotonEnviar variante="primario">Recibir vehículo y generar orden</BotonEnviar></div>
              </FormAccion>
              {t.estado === "confirmado" && <div className="mt-4 border-t border-borde/70 pt-4"><BotonAccion accion={gestionarTurno} campos={{ turno: t.id, accion: "ausente" }} variante="peligro" confirmar={`¿Marcar que ${t.clientes.nombre} no se presentó al turno?`}>Marcar que no se presentó</BotonAccion></div>}
            </Tarjeta>
          )}
          {["solicitado", "confirmado"].includes(t.estado) && <Tarjeta titulo="Reprogramar"><ReprogramarAsesor turno={t.id} taller={t.sucursal_taller_id} servicio={t.servicio_id} /></Tarjeta>}

          {o && (
            <Tarjeta titulo={`Orden de trabajo N.º ${o.id}`} accion={<Insignia estado={o.estado}>{etiqueta(o.estado)}</Insignia>}>
              <dl className="grid grid-cols-2 gap-4">
                <Dato nombre="Km de ingreso"><span className="cifras">{numero(o.km_ingreso)}</span></Dato><Dato nombre="Combustible">{o.combustible_nivel}</Dato>
                <Dato nombre="Trabajos solicitados">{o.trabajos_solicitados}</Dato><Dato nombre="Daños visibles">{o.danos_visibles ?? "—"}</Dato>
                {o.km_egreso != null && <Dato nombre="Km de egreso"><span className="cifras">{numero(o.km_egreso)}</span></Dato>}
                {o.trabajos_realizados && <Dato nombre="Trabajos realizados">{o.trabajos_realizados}</Dato>}
              </dl>
              {["recibido", "en_reparacion"].includes(t.estado) && <p className="mt-4 text-sm text-medio">El jefe de taller asigna y controla el trabajo. Cuando lo termine, el turno pasa a «Listo para retirar».</p>}
            </Tarjeta>
          )}
          {t.estado === "listo" && o && (
            <Tarjeta titulo="Entrega del vehículo">
              <FormAccion accion={entregarVehiculo} ocultos={{ turno: t.id }} className="space-y-3">
                <Entrada etiqueta="Kilómetros de egreso" name="km_egreso" type="number" inputMode="numeric" min={o.km_ingreso} required defaultValue={o.km_ingreso} contenedor="max-w-48" />
                <AreaTexto etiqueta="Trabajos realizados" name="trabajos_realizados" required defaultValue={o.trabajos_realizados ?? `${t.servicios.nombre} realizado.`} ayuda="Queda guardado en el historial del vehículo." />
                <BotonEnviar variante="primario">Entregar vehículo y cerrar orden</BotonEnviar>
              </FormAccion>
            </Tarjeta>
          )}
        </div>
        <div className="space-y-5">
          {MENSAJES[t.estado] && (
            <Tarjeta titulo="Avisar al cliente">
              <p className="mb-2 text-xs text-medio">Se envía al contacto cargado: <span className="cifras">{t.clientes.telefono}</span>{t.clientes.email && ` · ${t.clientes.email}`}</p>
              <p className="mb-3 rounded-md bg-fondo px-3 py-2 text-sm">{MENSAJES[t.estado].replace("{SITIO}", "nuestra web")}</p>
              <BotonesAviso telefono={t.clientes.telefono} email={t.clientes.email} mensaje={MENSAJES[t.estado]} turno={t.id} />
            </Tarjeta>
          )}
          <Tarjeta titulo="Historial del turno">
            <ol className="divide-y divide-borde/60">
              {eventos.map((e: any) => <li key={e.id} className="py-2.5"><p className="text-sm"><strong>{etiqueta(e.estado)}</strong>{e.detalle && ` · ${e.detalle}`}</p><p className="cifras text-xs text-medio">{fechaHora(e.creado_en)} · {e.empleados?.nombre ?? "Cliente / sistema"}</p></li>)}
            </ol>
            {avisos.length > 0 && <><h3 className="mt-4 font-sans text-sm font-semibold text-grafito">Avisos enviados</h3>
              <ul className="divide-y divide-borde/60">{avisos.map((a: any) => <li key={a.id} className="py-2 text-sm"><span className="cifras text-xs text-medio">{fechaHora(a.enviada_en)} · {a.canal === "whatsapp" ? "WhatsApp" : "Email"}</span><br />{a.mensaje}</li>)}</ul></>}
            <p className="mt-3 text-xs text-medio">Turno creado el {fecha(t.creado_en)}.</p>
          </Tarjeta>
        </div>
      </div>
    </>
  );
}
