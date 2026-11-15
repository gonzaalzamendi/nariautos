import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { guardarRepuesto, ingresarStock, usarRepuesto } from "@/lib/acciones/taller";
import { fechaHora, moneda } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Selector, Tabla, Tarjeta, Vacio } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Repuestos" };
export default async function Repuestos() {
  const s = await exigirSucursal("jefe_taller");
  const [reps, ordenes, usos] = await Promise.all([
    leer<any[]>(db().from("repuestos").select("*").eq("sucursal_id", s.sucursalId).eq("activo", true).order("nombre")),
    leer<any[]>(db().from("v_ordenes").select("id, patente, marca, modelo, servicio, estado").eq("sucursal_taller_id", s.sucursalId).neq("estado", "cerrada").order("abierta_en")),
    leer<any[]>(db().from("repuestos_orden").select("id, cantidad, creado_en, orden_id, repuestos!inner(nombre, codigo, sucursal_id)").eq("repuestos.sucursal_id", s.sucursalId).order("creado_en", { ascending: false }).limit(15)),
  ]);
  const bajos = reps.filter((r) => r.stock <= r.stock_minimo), espera = ordenes.filter((o) => o.estado === "espera_repuestos");
  const Form = ({ r }: { r?: any }) => { const k = r?.id ?? 0; return (
    <FormAccion accion={guardarRepuesto} ocultos={{ id: r?.id }} limpiar={!r} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
      <Entrada etiqueta="Código" name="codigo" id={`rc-${k}`} required defaultValue={r?.codigo} className="uppercase" />
      <Entrada etiqueta="Repuesto" name="nombre" id={`rn-${k}`} required defaultValue={r?.nombre} contenedor="lg:col-span-2" />
      <Entrada etiqueta="Stock" name="stock" id={`rs-${k}`} type="number" inputMode="numeric" min={0} required defaultValue={r?.stock ?? 0} />
      <Entrada etiqueta="Stock mínimo" name="stock_minimo" id={`rm-${k}`} type="number" inputMode="numeric" min={0} required defaultValue={r?.stock_minimo ?? 0} />
      <Entrada etiqueta="Precio ($)" name="precio" id={`rp-${k}`} type="number" inputMode="numeric" min={0} step={100} required defaultValue={r ? Number(r.precio) : ""} />
      <div className="lg:col-span-6"><BotonEnviar variante={r ? "secundario" : "primario"}>{r ? "Guardar cambios" : "Agregar repuesto"}</BotonEnviar></div>
    </FormAccion>); };
  return (
    <>
      <Encabezado titulo="Repuestos" texto="Inventario de tu taller. Cargá los repuestos que usa cada orden: se descuentan del stock y avisa cuando hay que reponer." />
      {(bajos.length > 0 || espera.length > 0) && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {bajos.length > 0 && <p role="status" className="rounded-md border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta-texto"><strong>{bajos.length === 1 ? "1 repuesto para reponer" : `${bajos.length} repuestos para reponer`}:</strong> {bajos.map((b) => `${b.nombre} (${b.stock})`).join(", ")}.</p>}
          {espera.length > 0 && <p role="status" className="rounded-md border border-acero/30 bg-acero/5 px-3 py-2 text-sm"><strong>{espera.length === 1 ? "1 orden en espera de repuestos" : `${espera.length} órdenes en espera de repuestos`}:</strong> {espera.map((o) => `OT ${o.id} · ${o.patente}`).join(", ")}.</p>}
        </div>
      )}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Tarjeta titulo="Usar repuesto en una orden">
          {ordenes.length === 0 || reps.length === 0 ? <p className="text-sm text-medio">Necesitás al menos una orden abierta y un repuesto cargado.</p> : (
            <FormAccion accion={usarRepuesto} limpiar className="grid gap-3 sm:grid-cols-2">
              <Selector etiqueta="Orden de trabajo" name="orden" required vacio="Elegí una orden" opciones={ordenes.map((o) => [o.id, `OT ${o.id} · ${o.patente} · ${o.servicio}`] as const)} contenedor="sm:col-span-2" />
              <Selector etiqueta="Repuesto" name="repuesto" required vacio="Elegí un repuesto" opciones={reps.map((r) => [r.id, `${r.nombre} (quedan ${r.stock})`] as const)} />
              <Entrada etiqueta="Cantidad" name="cantidad" type="number" inputMode="numeric" min={1} required defaultValue={1} />
              <div className="sm:col-span-2"><BotonEnviar variante="primario">Cargar repuesto a la orden</BotonEnviar></div>
            </FormAccion>
          )}
        </Tarjeta>
        <Tarjeta titulo="Últimos repuestos usados">
          {usos.length === 0 ? <p className="text-sm text-medio">Todavía no se cargaron repuestos a ninguna orden.</p> : (
            <ul className="divide-y divide-borde/60">{usos.map((u) => <li key={u.id} className="py-2 text-sm"><span className="cifras font-medium">{u.cantidad} ×</span> {u.repuestos.nombre} <span className="text-medio">· OT {u.orden_id}</span><br /><span className="cifras text-xs text-medio">{fechaHora(u.creado_en)}</span></li>)}</ul>
          )}
        </Tarjeta>
      </div>
      <Tarjeta titulo="Nuevo repuesto" className="mb-5"><Form /></Tarjeta>
      {reps.length === 0 ? <Vacio titulo="El inventario está vacío" texto="Agregá el primer repuesto con el formulario de arriba." /> : (
        <Tabla cabeceras={["Código", "Repuesto", "Stock", "Mínimo", "Precio", "Acciones"]}>
          {reps.map((r) => (
            <tr key={r.id} className={r.stock <= r.stock_minimo ? "bg-alerta/5" : undefined}>
              <td className="cifras whitespace-nowrap">{r.codigo}</td><td className="font-medium">{r.nombre}</td>
              <td className="cifras">{r.stock}{r.stock <= r.stock_minimo && <><br /><Insignia tono="alerta">Reponer</Insignia></>}</td>
              <td className="cifras">{r.stock_minimo}</td><td className="cifras whitespace-nowrap">{moneda(r.precio)}</td>
              <td className="min-w-72">
                <FormAccion accion={ingresarStock} ocultos={{ repuesto: r.id }} limpiar className="flex items-end gap-2">
                  <Entrada etiqueta="Ingreso de stock" name="cantidad" id={`in-${r.id}`} type="number" inputMode="numeric" min={1} required contenedor="w-32" />
                  <BotonEnviar chico variante="contorno">Sumar al stock</BotonEnviar>
                </FormAccion>
                <details className="mt-1"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar repuesto</summary><div className="mt-2 rounded-md border border-borde p-3"><Form r={r} /></div></details>
              </td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
