import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { etiqueta, fecha, fechaHora, hora } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Tabla, Vacio } from "@/components/ui";
import { TiempoReal } from "@/components/panel-cliente";

export const metadata = { title: "Órdenes en proceso" };
const tiempo = (m: number | null) => (m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
const ESTADO: Record<string, string> = { pendiente: "Sin asignar", terminada: "Lista para retirar" };

/** Todas las órdenes vigentes (no entregadas) del taller, de cualquier día. */
export default async function EnProceso() {
  const s = await exigirSucursal("jefe_taller");
  const ordenes = await leer<any[]>(db().from("v_ordenes").select("*").eq("sucursal_taller_id", s.sucursalId).neq("estado", "cerrada").order("abierta_en"));
  return (
    <>
      <Encabezado titulo="Órdenes en proceso" texto="Órdenes de trabajo vigentes del taller, de cualquier día, hasta que el asesor entrega el vehículo."><TiempoReal /></Encabezado>
      {ordenes.length === 0 ? <Vacio titulo="No hay órdenes vigentes" texto="Cuando el asesor recibe un vehículo se genera su orden de trabajo y aparece acá." /> : (
        <Tabla cabeceras={["Orden", "Vehículo", "Servicio", "Mecánico", "Tiempo", "Estado", ""]}>
          {ordenes.map((o) => (
            <tr key={o.id} className={o.demorado && o.estado !== "terminada" ? "bg-error/5" : undefined}>
              <td className="cifras whitespace-nowrap"><strong>OT {o.id}</strong><br /><span className="text-xs text-medio">Abierta {fechaHora(o.abierta_en)}</span></td>
              <td><span className="cifras font-medium">{o.patente}</span><br /><span className="text-xs text-medio">{o.marca} {o.modelo} · turno {fecha(o.fecha).slice(0, 5)} {hora(o.hora)} h</span></td>
              <td>{o.servicio}</td>
              <td>{o.mecanico ?? <span className="text-medio">Sin asignar</span>}</td>
              <td className={`cifras whitespace-nowrap ${o.demorado ? "font-medium text-error" : ""}`}>{tiempo(o.minutos_reales)} / {tiempo(o.minutos_estimados)}</td>
              <td><div className="flex flex-wrap gap-1"><Insignia estado={o.estado}>{ESTADO[o.estado] ?? etiqueta(o.estado)}</Insignia>{o.demorado && o.estado !== "terminada" && <Insignia tono="error">Demorada</Insignia>}</div></td>
              <td><BotonLink href={`/taller/ordenes/${o.id}`} variante="contorno" chico>Ver orden de trabajo</BotonLink></td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
