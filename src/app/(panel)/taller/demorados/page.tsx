import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { guardarMotivoDemora } from "@/lib/acciones/taller";
import { etiqueta, fecha } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Tabla, Vacio } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Trabajos demorados" };
export default async function Demorados() {
  const s = await exigirSucursal("jefe_taller");
  const dem = await leer<any[]>(db().from("v_ordenes").select("*").eq("sucursal_taller_id", s.sucursalId).eq("demorado", true).order("abierta_en", { ascending: false }).limit(40));
  const enCurso = dem.filter((o) => ["en_reparacion", "espera_repuestos"].includes(o.estado));
  return (
    <>
      <Encabezado titulo="Trabajos demorados" texto={`Trabajos que superaron el tiempo estimado. ${enCurso.length === 0 ? "Hoy no hay ninguno en curso." : enCurso.length === 1 ? "Hay 1 en curso." : `Hay ${enCurso.length} en curso.`} El motivo es obligatorio.`} />
      {dem.length === 0 ? <Vacio titulo="No hay trabajos demorados" texto="Cuando un trabajo supera su tiempo estimado aparece acá automáticamente." /> : (
        <Tabla cabeceras={["Orden", "Vehículo y servicio", "Mecánico", "Estimado / real", "Estado", "Motivo de la demora"]}>
          {dem.map((o) => (
            <tr key={o.id} className={enCurso.includes(o) ? "bg-error/5" : undefined}>
              <td className="cifras whitespace-nowrap">OT {o.id}<br /><span className="text-xs text-medio">{fecha(o.fecha)}</span></td>
              <td><span className="cifras font-medium">{o.patente}</span> · {o.marca} {o.modelo}<br /><span className="text-xs text-medio">{o.servicio}</span></td>
              <td>{o.mecanico}</td>
              <td className="cifras whitespace-nowrap">{o.minutos_estimados} min / <strong className="text-error">{o.minutos_reales} min</strong><br /><span className="text-xs text-error">+{o.minutos_reales - o.minutos_estimados} min</span></td>
              <td><Insignia estado={o.estado}>{etiqueta(o.estado)}</Insignia></td>
              <td className="min-w-64">
                {o.motivo_demora ? <p>{o.motivo_demora}</p> : <p className="mb-1 text-xs font-medium text-error">Falta cargar el motivo</p>}
                {o.estado !== "cerrada" && (
                  <FormAccion accion={guardarMotivoDemora} ocultos={{ orden: o.id }} className="mt-1 flex items-end gap-2">
                    <Entrada etiqueta={o.motivo_demora ? "Corregir motivo" : "Motivo"} name="motivo" id={`mot-${o.id}`} required maxLength={300} contenedor="flex-1" />
                    <BotonEnviar chico>Guardar motivo</BotonEnviar>
                  </FormAccion>
                )}
              </td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
