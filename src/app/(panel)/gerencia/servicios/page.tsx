import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { alternarServicio, guardarServicio } from "@/lib/acciones/gerencia";
import { moneda } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Tabla, Tarjeta } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Servicios de taller" };
export default async function Servicios() {
  await exigir("gerencia");
  const srv = await leer<any[]>(db().from("servicios").select("*").order("id"));
  const Form = ({ v }: { v?: any }) => { const k = v?.id ?? 0; return (
    <FormAccion accion={guardarServicio} ocultos={{ id: v?.id }} limpiar={!v} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <Entrada etiqueta="Nombre" name="nombre" id={`sn-${k}`} required defaultValue={v?.nombre} />
      <Entrada etiqueta="Descripción" name="descripcion" id={`sd-${k}`} defaultValue={v?.descripcion ?? ""} contenedor="lg:col-span-2" />
      <Entrada etiqueta="Duración (min)" name="duracion_min" id={`sm-${k}`} type="number" min={30} step={30} required defaultValue={v?.duracion_min ?? 60} ayuda="Múltiplos de 30" />
      <Entrada etiqueta="Precio orientativo ($)" name="precio_orientativo" id={`sp-${k}`} type="number" inputMode="decimal" min={0} step="any" required defaultValue={v ? Number(v.precio_orientativo) : ""} />
      <div className="lg:col-span-5"><BotonEnviar variante={v ? "secundario" : "primario"}>{v ? "Guardar cambios" : "Agregar servicio"}</BotonEnviar></div>
    </FormAccion>); };
  return (
    <>
      <Encabezado titulo="Servicios de taller" texto="La duración define cuántas franjas ocupa cada turno en la agenda compartida." />
      <Tarjeta titulo="Nuevo servicio" className="mb-5"><Form /></Tarjeta>
      <Tabla cabeceras={["Servicio", "Duración", "Precio orientativo", "Estado", "Acciones"]}>
        {srv.map((v) => (
          <tr key={v.id}>
            <td><strong>{v.nombre}</strong><br /><span className="text-xs text-medio">{v.descripcion}</span></td><td className="cifras whitespace-nowrap">{v.duracion_min} min</td><td className="cifras whitespace-nowrap">{moneda(v.precio_orientativo)}</td>
            <td><Insignia tono={v.activo ? "exito" : "neutro"}>{v.activo ? "Activo" : "Inactivo"}</Insignia></td>
            <td className="min-w-64"><BotonAccion accion={alternarServicio} campos={{ servicio: v.id }}>{v.activo ? "Desactivar servicio" : "Reactivar servicio"}</BotonAccion>
              <details className="mt-1"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar servicio</summary><div className="mt-2 rounded-md border border-borde p-3"><Form v={v} /></div></details></td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
