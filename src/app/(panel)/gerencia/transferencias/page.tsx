import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { resolverTransferencia } from "@/lib/acciones/ventas";
import { etiqueta, fechaHora } from "@/lib/formato";
import { Encabezado, Insignia, Tabla, Vacio } from "@/components/ui";
import { BotonAccion } from "@/components/formularios";

export const metadata = { title: "Transferencias" };
export default async function Transferencias() {
  await exigir("gerencia");
  const ts = await leer<any[]>(db().from("transferencias_unidad").select("*, unidades(marca, modelo, version), origen:sucursales!transferencias_unidad_origen_id_fkey(nombre), destino:sucursales!transferencias_unidad_destino_id_fkey(nombre), solicitante:empleados!transferencias_unidad_solicitada_por_fkey(nombre)").order("creado_en", { ascending: false }).limit(100));
  return (
    <>
      <Encabezado titulo="Transferencias entre sucursales" texto="Pedidos de los vendedores para aprovechar el stock unificado." />
      {ts.length === 0 ? <Vacio titulo="No hay pedidos de transferencia" texto="Los vendedores los cargan desde «Stock de la red»." /> : (
        <Tabla cabeceras={["Pedido", "Unidad", "Origen → destino", "Solicitó", "Estado", "Acciones"]}>
          {ts.map((t) => (
            <tr key={t.id}>
              <td className="cifras whitespace-nowrap">{fechaHora(t.creado_en)}</td><td className="font-medium">{t.unidades.marca} {t.unidades.modelo}<br /><span className="text-xs font-normal text-medio">{t.unidades.version}</span></td>
              <td>{t.origen.nombre} → {t.destino.nombre}</td><td>{t.solicitante?.nombre ?? <span className="text-medio">Empleado dado de baja</span>}{t.motivo && <><br /><span className="text-xs text-medio">{t.motivo}</span></>}</td>
              <td><Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia></td>
              <td>{t.estado === "solicitada" ? <div className="flex flex-wrap gap-1.5">
                <BotonAccion accion={resolverTransferencia} campos={{ transferencia: t.id, decision: "aprobada" }} variante="primario" confirmar={`¿Aprobar el envío de ${t.unidades.marca} ${t.unidades.modelo} a ${t.destino.nombre}?`}>Aprobar transferencia</BotonAccion>
                <BotonAccion accion={resolverTransferencia} campos={{ transferencia: t.id, decision: "rechazada" }} variante="peligro">Rechazar pedido</BotonAccion></div> : <span className="cifras text-xs text-medio">{fechaHora(t.resuelta_en)}</span>}</td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
