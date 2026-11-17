import { alternarPromocion, eliminarFoto, guardarPromocion, guardarUnidad, subirFotos } from "@/lib/acciones/ventas";
import { fotoSrc } from "@/lib/datos";
import { fecha, hoyAR, sumarDias } from "@/lib/formato";
import { AreaTexto, Entrada, Insignia, Selector, Tarjeta, Vacio } from "./ui";
import { BotonAccion, BotonEnviar, FormAccion } from "./formularios";
import { SelectorFotos } from "./fotos";

export function FormUnidad({ u, sucursales }: { u?: any; sucursales?: (readonly [number, string])[] }) {
  return (
    <FormAccion accion={guardarUnidad} ocultos={{ id: u?.id }} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sucursales && <Selector etiqueta="Sucursal" name="sucursal" required defaultValue={u?.sucursal_id ?? ""} vacio="Elegí una sucursal" opciones={sucursales} />}
      <Entrada etiqueta="Marca" name="marca" required defaultValue={u?.marca} />
      <Entrada etiqueta="Modelo" name="modelo" required defaultValue={u?.modelo} />
      <Entrada etiqueta="Versión" name="version" defaultValue={u?.version ?? ""} />
      <Entrada etiqueta="Año" name="anio" type="number" inputMode="numeric" min={1960} max={2030} required defaultValue={u?.anio ?? new Date().getFullYear()} />
      <Selector etiqueta="Condición" name="condicion" required defaultValue={u?.condicion ?? "0km"} opciones={[["0km", "0 km"], ["usado", "Usado"]]} />
      <Entrada etiqueta="Kilómetros" name="km" type="number" inputMode="numeric" min={0} required defaultValue={u?.km ?? 0} ayuda="En unidades 0 km se guarda 0." />
      <Entrada etiqueta="Precio (pesos)" name="precio" type="number" inputMode="decimal" min={0.01} step="any" required defaultValue={u ? Number(u.precio) : ""} />
      <Selector etiqueta="Combustible" name="combustible" required defaultValue={u?.combustible ?? "nafta"} opciones={[["nafta", "Nafta"], ["diesel", "Diésel"], ["hibrido", "Híbrido"], ["electrico", "Eléctrico"], ["gnc", "GNC"]]} />
      <Selector etiqueta="Transmisión" name="transmision" required defaultValue={u?.transmision ?? "manual"} opciones={[["manual", "Manual"], ["automatica", "Automática"]]} />
      <Entrada etiqueta="Color" name="color" defaultValue={u?.color ?? ""} />
      <AreaTexto etiqueta="Descripción" name="descripcion" maxLength={1000} defaultValue={u?.descripcion ?? ""} contenedor="sm:col-span-2 lg:col-span-3" />
      <div className="sm:col-span-2 lg:col-span-3"><BotonEnviar variante="primario">{u ? "Guardar cambios" : "Dar de alta la unidad"}</BotonEnviar></div>
    </FormAccion>
  );
}

export function GestorFotos({ u }: { u: any }) {
  const fotos = [...(u.fotos_unidad ?? [])].sort((a: any, b: any) => a.orden - b.orden);
  return (
    <Tarjeta titulo="Fotos">
      <ul className="flex flex-wrap gap-3">
        {fotos.map((f: any) => (
          <li key={f.id} className="w-36">
            <img src={fotoSrc(f)} alt="" className="aspect-[16/10] w-full rounded-md border border-borde object-cover" />
            {f.url?.startsWith("/placeholder") ? <p className="mt-1 text-xs text-medio">Imagen ilustrativa</p>
              : <div className="mt-1"><BotonAccion accion={eliminarFoto} campos={{ foto: f.id }} variante="peligro" confirmar="¿Eliminar esta foto de la unidad?">Eliminar foto</BotonAccion></div>}
          </li>
        ))}
      </ul>
      <FormAccion accion={subirFotos} ocultos={{ unidad: u.id }} limpiar className="mt-4 space-y-3 border-t border-borde/70 pt-4">
        <SelectorFotos maximo={4} etiqueta="Subir fotos reales" />
        <BotonEnviar>Subir fotos</BotonEnviar>
      </FormAccion>
    </Tarjeta>
  );
}

function FormPromo({ p, unidades, sucursales }: { p?: any; unidades: any[]; sucursales?: (readonly [number, string])[] }) {
  const marcadas = new Set((p?.promocion_unidad ?? []).map((x: any) => x.unidad_id));
  return (
    <FormAccion accion={guardarPromocion} ocultos={{ id: p?.id }} limpiar={!p} className="grid gap-3 sm:grid-cols-2">
      <Entrada etiqueta="Título" name="titulo" required maxLength={90} defaultValue={p?.titulo} contenedor="sm:col-span-2" />
      <AreaTexto etiqueta="Descripción" name="descripcion" required maxLength={500} defaultValue={p?.descripcion} contenedor="sm:col-span-2" />
      <Entrada etiqueta="Vigente desde" name="vigente_desde" type="date" required defaultValue={p?.vigente_desde ?? hoyAR()} />
      <Entrada etiqueta="Vigente hasta" name="vigente_hasta" type="date" required defaultValue={p?.vigente_hasta ?? sumarDias(hoyAR(), 30)} />
      {sucursales && <Selector etiqueta="Alcance" name="sucursal" defaultValue={p?.sucursal_id ?? ""} vacio="Toda la red" opciones={sucursales} />}
      <fieldset className="sm:col-span-2"><legend className="mb-1 text-sm font-medium">Unidades asociadas</legend>
        <div className="grid max-h-48 gap-x-4 overflow-y-auto rounded-md border border-borde p-2 sm:grid-cols-2">
          {unidades.map((u) => (
            <label key={u.id} className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" name="unidades" value={u.id} defaultChecked={marcadas.has(u.id)} className="h-4 w-4 accent-[#2c4a6e]" />{u.marca} {u.modelo} {u.version} · {u.sucursales?.nombre}</label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2"><BotonEnviar variante={p ? "secundario" : "primario"}>{p ? "Guardar cambios" : "Publicar promoción"}</BotonEnviar></div>
    </FormAccion>
  );
}

export function GestionPromociones({ promos, unidades, sucursales }: { promos: any[]; unidades: any[]; sucursales?: (readonly [number, string])[] }) {
  const hoy = hoyAR();
  return (
    <div className="space-y-5">
      <Tarjeta titulo="Nueva promoción"><FormPromo unidades={unidades} sucursales={sucursales} /></Tarjeta>
      {promos.length === 0 ? <Vacio titulo="Todavía no hay promociones" texto="Cargá la primera con el formulario de arriba: se publica en la web al instante." /> : promos.map((p) => {
        const vigente = p.activa && p.vigente_desde <= hoy && p.vigente_hasta >= hoy;
        return (
          <Tarjeta key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="text-lg">{p.titulo}</h2><p className="text-sm text-medio">{p.sucursales?.nombre ?? "Toda la red"} · del {fecha(p.vigente_desde)} al {fecha(p.vigente_hasta)} · {p.promocion_unidad.length} unidades</p></div>
              <div className="flex items-center gap-2"><Insignia tono={vigente ? "exito" : "neutro"}>{vigente ? "Publicada" : p.activa ? "Fuera de vigencia" : "Pausada"}</Insignia>
                <BotonAccion accion={alternarPromocion} campos={{ promocion: p.id }}>{p.activa ? "Pausar promoción" : "Volver a publicar"}</BotonAccion></div>
            </div>
            <details className="mt-3"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar promoción</summary>
              <div className="mt-3"><FormPromo p={p} unidades={unidades} sucursales={sucursales} /></div></details>
          </Tarjeta>
        );
      })}
    </div>
  );
}
