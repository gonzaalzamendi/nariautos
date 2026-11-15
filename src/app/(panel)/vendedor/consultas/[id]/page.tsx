import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { agregarSeguimiento, cerrarConsulta, gestionarTestDrive, responderCotizacion } from "@/lib/acciones/ventas";
import { etiqueta, fecha, fechaHora, linkEmail, linkWhatsApp, moneda } from "@/lib/formato";
import { AreaTexto, BotonLink, Dato, Encabezado, Entrada, Insignia, Selector, Tarjeta } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Consulta" };

export default async function Consulta({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSucursal("vendedor");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const c = (await db().from("consultas").select("*, clientes(*), unidades(id, marca, modelo, version, precio, estado, sucursales(nombre)), seguimientos_consulta(id, nota, creado_en, empleados(nombre)), test_drives(*)").eq("id", id).eq("sucursal_id", s.sucursalId).maybeSingle()).data as any;
  if (!c) notFound();
  const abierta = !["ganada", "perdida"].includes(c.estado);
  const u = c.unidades, nombre = c.clientes.nombre.split(" ")[0];
  const final = c.precio_cotizado ? Number(c.precio_cotizado) - Number(c.bonificacion ?? 0) : null;
  const msj = c.precio_cotizado ? `Hola ${nombre}, te escribe ${s.nombre} de NariAutos. Te envío la cotización de ${u ? `${u.marca} ${u.modelo}` : "la unidad"}: ${moneda(final)}${c.financiacion_ofrecida ? `. Financiación: ${c.financiacion_ofrecida}` : ""}. Quedo a disposición.` : `Hola ${nombre}, te escribe ${s.nombre} de NariAutos por tu consulta${u ? ` sobre ${u.marca} ${u.modelo}` : ""}.`;
  const seg = [...c.seguimientos_consulta].sort((a: any, b: any) => b.creado_en.localeCompare(a.creado_en));
  return (
    <>
      <Encabezado titulo={`Consulta de ${c.clientes.nombre}`} texto={`${etiqueta(c.tipo)} · ${etiqueta(c.canal)} · recibida el ${fechaHora(c.creado_en)}`}>
        <Insignia estado={c.estado}>{etiqueta(c.estado)}</Insignia><BotonLink href="/vendedor" variante="contorno" chico>Volver a la bandeja</BotonLink>
      </Encabezado>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Tarjeta titulo="Cliente y pedido">
            <dl className="grid grid-cols-2 gap-4">
              <Dato nombre="Teléfono"><span className="cifras">{c.clientes.telefono}</span></Dato><Dato nombre="Email">{c.clientes.email ?? "—"}</Dato>
              <Dato nombre="Unidad">{u ? `${u.marca} ${u.modelo} ${u.version ?? ""}` : "Sin unidad"}</Dato>
              <Dato nombre="Precio de lista">{u ? <span className="cifras">{moneda(u.precio)}</span> : "—"}</Dato>
            </dl>
            {c.mensaje && <p className="mt-4 rounded-md bg-fondo px-3 py-2 text-sm">«{c.mensaje}»</p>}
            {c.simulacion && <p className="cifras mt-3 rounded-md border border-dorado/40 bg-dorado/10 px-3 py-2 text-sm">Simulación adjunta: anticipo {c.simulacion.anticipo_pct}% ({moneda(c.simulacion.anticipo)}) y {c.simulacion.cuotas} cuotas de {moneda(c.simulacion.cuota)}.</p>}
            {c.estado === "perdida" && <p className="mt-3 text-sm text-error">Motivo de pérdida: {c.motivo_perdida}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <BotonLink href={linkWhatsApp(c.clientes.telefono, msj)} target="_blank" rel="noreferrer" chico>Escribir por WhatsApp</BotonLink>
              {c.clientes.email && <BotonLink href={linkEmail(c.clientes.email, "Tu consulta en NariAutos", msj)} variante="contorno" chico>Enviar email</BotonLink>}
            </div>
          </Tarjeta>
          {c.test_drives.map((t: any) => (
            <Tarjeta key={t.id} titulo="Test drive" accion={<Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia>}>
              <p className="text-sm">Pedido para el <strong className="cifras">{fecha(t.fecha)}</strong>, {etiqueta(t.franja).toLowerCase()}.</p>
              {["pendiente", "confirmado"].includes(t.estado) && abierta && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {t.estado === "pendiente" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "confirmar" }} variante="primario">Confirmar test drive</BotonAccion>}
                    {t.estado === "confirmado" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "realizado" }} variante="secundario">Marcar como realizado</BotonAccion>}
                    <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "cancelar" }} variante="peligro" confirmar="¿Cancelar este test drive?">Cancelar test drive</BotonAccion>
                  </div>
                  <FormAccion accion={gestionarTestDrive} ocultos={{ test: t.id, accion: "reprogramar" }} className="flex flex-wrap items-end gap-2">
                    <Entrada etiqueta="Nueva fecha" name="fecha" type="date" required defaultValue={t.fecha} />
                    <Selector etiqueta="Franja" name="franja" defaultValue={t.franja} opciones={[["manana", "Mañana"], ["mediodia", "Mediodía"], ["tarde", "Tarde"]]} />
                    <BotonEnviar variante="contorno">Reprogramar test drive</BotonEnviar>
                  </FormAccion>
                </div>
              )}
            </Tarjeta>
          ))}
          <Tarjeta titulo="Cotización" accion={c.precio_cotizado ? <BotonLink href={`/api/cotizacion/${c.id}`} variante="contorno" chico target="_blank">Descargar PDF</BotonLink> : undefined}>
            {c.precio_cotizado && <p className="cifras mb-4 rounded-md bg-fondo px-3 py-2 text-sm">Cotizado el {fechaHora(c.cotizada_en)}: {moneda(c.precio_cotizado)} − bonificación {moneda(c.bonificacion)} = <strong>{moneda(final)}</strong>{c.financiacion_ofrecida && <><br />Financiación: {c.financiacion_ofrecida}</>}</p>}
            {abierta ? (
              <FormAccion accion={responderCotizacion} ocultos={{ consulta: c.id }} className="grid gap-3 sm:grid-cols-2">
                <Entrada etiqueta="Precio cotizado (pesos)" name="precio" type="number" inputMode="numeric" min={1} required defaultValue={c.precio_cotizado ? Number(c.precio_cotizado) : u ? Number(u.precio) : ""} />
                <Entrada etiqueta="Bonificación (pesos)" name="bonificacion" type="number" inputMode="numeric" min={0} defaultValue={c.bonificacion ? Number(c.bonificacion) : 0} />
                <AreaTexto etiqueta="Opción de financiación" name="financiacion" maxLength={400} defaultValue={c.financiacion_ofrecida ?? (c.simulacion ? `Anticipo del ${c.simulacion.anticipo_pct}% y ${c.simulacion.cuotas} cuotas de ${moneda(c.simulacion.cuota)} (TNA ${c.simulacion.tna}%).` : "")} contenedor="sm:col-span-2" />
                <div className="sm:col-span-2"><BotonEnviar variante="primario">{c.precio_cotizado ? "Actualizar cotización" : "Responder cotización"}</BotonEnviar></div>
              </FormAccion>
            ) : <p className="text-sm text-medio">La consulta está cerrada.</p>}
          </Tarjeta>
        </div>
        <div className="space-y-5">
          <Tarjeta titulo="Seguimiento">
            {abierta && (
              <FormAccion accion={agregarSeguimiento} ocultos={{ consulta: c.id }} limpiar className="mb-4">
                <AreaTexto etiqueta="Nueva nota" name="nota" required maxLength={800} placeholder="Ej.: llamé, queda en confirmar el viernes." />
                <div className="mt-2"><BotonEnviar>Registrar seguimiento</BotonEnviar></div>
              </FormAccion>
            )}
            {seg.length === 0 ? <p className="text-sm text-medio">Todavía no hay notas. La primera nota registra el tiempo de primera respuesta.</p> : (
              <ol className="divide-y divide-borde/60">{seg.map((n: any) => <li key={n.id} className="py-2.5"><p className="text-sm">{n.nota}</p><p className="cifras text-xs text-medio">{fechaHora(n.creado_en)} · {n.empleados?.nombre ?? "Sistema"}</p></li>)}</ol>
            )}
          </Tarjeta>
          {abierta && (
            <Tarjeta titulo="Cerrar la consulta">
              <div className="space-y-4">
                <BotonAccion accion={cerrarConsulta} campos={{ consulta: c.id, resultado: "ganada" }} variante="primario" chico={false}
                  confirmar={u ? `¿Registrar la venta de ${u.marca} ${u.modelo}? La unidad quedará marcada como vendida.` : "¿Marcar la consulta como ganada?"}>Registrar venta (ganada)</BotonAccion>
                <FormAccion accion={cerrarConsulta} ocultos={{ consulta: c.id, resultado: "perdida" }} className="border-t border-borde/70 pt-4">
                  <Entrada etiqueta="Motivo de la pérdida" name="motivo" required maxLength={300} placeholder="Ej.: compró en otra concesionaria" />
                  <div className="mt-2"><BotonEnviar variante="peligro">Marcar como perdida</BotonEnviar></div>
                </FormAccion>
              </div>
            </Tarjeta>
          )}
        </div>
      </div>
    </>
  );
}
