import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { guardarSucursal } from "@/lib/acciones/gerencia";
import { hora } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Selector, Tarjeta } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Sucursales" };
export default async function Sucursales() {
  await exigir("gerencia");
  const sucs = await leer<any[]>(db().from("sucursales").select("*").order("id"));
  const talleres = sucs.filter((s) => s.tiene_taller);
  const Form = ({ s }: { s?: any }) => { const k = s?.id ?? 0; return (
    <FormAccion accion={guardarSucursal} ocultos={{ id: s?.id }} limpiar={!s} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Entrada etiqueta="Nombre" name="nombre" id={`no-${k}`} required defaultValue={s?.nombre} />
      <Entrada etiqueta="Dirección" name="direccion" id={`di-${k}`} required defaultValue={s?.direccion} />
      <Entrada etiqueta="Localidad" name="localidad" id={`lo-${k}`} required defaultValue={s?.localidad} />
      <Entrada etiqueta="Teléfono" name="telefono" id={`te-${k}`} required defaultValue={s?.telefono} />
      <Entrada etiqueta="Horario de atención" name="horario_atencion" id={`ho-${k}`} required defaultValue={s?.horario_atencion} contenedor="sm:col-span-2" />
      <Selector etiqueta="¿Tiene taller?" name="tiene_taller" id={`tt-${k}`} required defaultValue={s ? (s.tiene_taller ? "si" : "no") : "no"} opciones={[["si", "Sí, taller propio"], ["no", "No, deriva a otro taller"]]} />
      <fieldset className="grid gap-3 rounded-md border border-borde p-3 sm:col-span-2 sm:grid-cols-3 lg:col-span-2"><legend className="px-1 text-xs font-medium text-medio">Si tiene taller</legend>
        <Entrada etiqueta="Boxes" name="capacidad_boxes" id={`cb-${k}`} type="number" min={1} max={30} defaultValue={s?.capacidad_boxes ?? ""} />
        <Entrada etiqueta="Abre" name="taller_abre" id={`ab-${k}`} type="time" step={1800} defaultValue={s?.taller_abre ? hora(s.taller_abre) : ""} />
        <Entrada etiqueta="Cierra" name="taller_cierra" id={`ci-${k}`} type="time" step={1800} defaultValue={s?.taller_cierra ? hora(s.taller_cierra) : ""} />
      </fieldset>
      <fieldset className="grid gap-3 rounded-md border border-borde p-3 sm:col-span-2 sm:grid-cols-2"><legend className="px-1 text-xs font-medium text-medio">Si no tiene taller</legend>
        <Selector etiqueta="Taller de referencia" name="taller_referencia_id" id={`tr-${k}`} defaultValue={s?.taller_referencia_id ?? ""} vacio="Elegí un taller" opciones={talleres.filter((t) => t.id !== s?.id).map((t) => [t.id, t.nombre] as const)} />
        <Entrada etiqueta="Distancia al taller (km)" name="km_a_referencia" id={`km-${k}`} type="number" min={0} step={0.1} defaultValue={s?.km_a_referencia ?? ""} />
      </fieldset>
      <div className="sm:col-span-2 lg:col-span-4"><BotonEnviar variante={s ? "secundario" : "primario"}>{s ? "Guardar cambios" : "Dar de alta la sucursal"}</BotonEnviar></div>
    </FormAccion>); };
  return (
    <>
      <Encabezado titulo="Sucursales" texto="Datos de contacto, taller propio y taller de referencia para derivar turnos. La base impide que la referencia apunte a una sucursal sin taller." />
      <div className="space-y-4">
        {sucs.map((s) => (
          <Tarjeta key={s.id}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg">{s.nombre}</h2><p className="text-sm text-medio">{s.direccion}, {s.localidad} · {s.telefono}</p></div>
              {s.tiene_taller ? <Insignia tono="exito">Taller · {s.capacidad_boxes} boxes · {hora(s.taller_abre)} a {hora(s.taller_cierra)} h</Insignia> : <Insignia>Sin taller · deriva a {sucs.find((x) => x.id === s.taller_referencia_id)?.nombre} ({String(s.km_a_referencia).replace(".", ",")} km)</Insignia>}</div>
            <details className="mt-2"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar sucursal</summary><div className="mt-3"><Form s={s} /></div></details>
          </Tarjeta>
        ))}
        <Tarjeta titulo="Nueva sucursal"><Form /></Tarjeta>
      </div>
    </>
  );
}
