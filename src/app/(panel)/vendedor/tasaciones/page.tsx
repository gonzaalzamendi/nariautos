import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { responderTasacion } from "@/lib/acciones/ventas";
import { etiqueta, fechaHora, linkWhatsApp, moneda, numero } from "@/lib/formato";
import { AreaTexto, BotonLink, Encabezado, Entrada, Insignia, Tarjeta, Vacio } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Tasaciones" };
export default async function Tasaciones() {
  const s = await exigirSucursal("vendedor");
  const ts = await leer<any[]>(db().from("tasaciones").select("*, clientes(nombre, telefono), unidades(marca, modelo)").eq("sucursal_id", s.sucursalId).order("estado").order("creado_en", { ascending: false }));
  return (
    <>
      <Encabezado titulo="Tasaciones de usados" texto="Solicitudes de clientes que quieren entregar su usado como parte de pago." />
      {ts.length === 0 ? <Vacio titulo="No hay tasaciones solicitadas" texto="Los clientes las piden desde «Tasá tu usado» en la web." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {ts.map((t) => (
            <Tarjeta key={t.id} titulo={`${t.marca} ${t.modelo} ${t.anio}`} accion={<Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia>}>
              <p className="cifras text-sm">{numero(t.km)} km · estado {etiqueta(t.estado_general).toLowerCase()} · pedida el {fechaHora(t.creado_en)}</p>
              <p className="text-sm">{t.clientes.nombre} · <span className="cifras">{t.clientes.telefono}</span>{t.unidades && <> · le interesa: {t.unidades.marca} {t.unidades.modelo}</>}</p>
              {t.comentarios && <p className="mt-2 rounded-md bg-fondo px-3 py-2 text-sm">«{t.comentarios}»</p>}
              {t.fotos?.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">{t.fotos.map((f: string, i: number) => <li key={i}><a href={f} target="_blank" rel="noreferrer"><img src={f} alt={`Foto ${i + 1} del usado`} className="h-20 w-28 rounded-md border border-borde object-cover" /></a></li>)}</ul>}
              {t.estado === "respondida" ? (
                <div className="mt-3 border-t border-borde/70 pt-3 text-sm"><p>Valor estimado: <strong className="cifras">{moneda(t.valor_estimado)}</strong></p>{t.respuesta && <p className="text-medio">{t.respuesta}</p>}
                  <div className="mt-2"><BotonLink chico target="_blank" rel="noreferrer" href={linkWhatsApp(t.clientes.telefono, `Hola ${t.clientes.nombre.split(" ")[0]}, te escribe ${s.nombre} de NariAutos. Estimamos tu ${t.marca} ${t.modelo} ${t.anio} en ${moneda(t.valor_estimado)}, sujeto a revisión presencial. ${t.respuesta ?? ""}`)}>Avisar por WhatsApp</BotonLink></div></div>
              ) : (
                <FormAccion accion={responderTasacion} ocultos={{ tasacion: t.id }} className="mt-3 space-y-3 border-t border-borde/70 pt-3">
                  <Entrada etiqueta="Valor estimado (pesos)" name="valor" type="number" inputMode="decimal" min={0.01} step="any" required />
                  <AreaTexto etiqueta="Comentario para el cliente (opcional)" name="respuesta" maxLength={500} />
                  <BotonEnviar variante="primario">Responder tasación</BotonEnviar>
                </FormAccion>
              )}
            </Tarjeta>
          ))}
        </div>
      )}
    </>
  );
}
