import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { asignarMecanico, moverOrden } from "@/lib/acciones/taller";
import { fecha, hora } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Selector, Vacio } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";
import { TiempoReal } from "@/components/panel-cliente";

export const metadata = { title: "Órdenes de trabajo" };
const COLUMNAS = [["pendiente", "Pendiente de asignar"], ["asignada", "Asignada"], ["en_reparacion", "En reparación"], ["espera_repuestos", "En espera de repuestos"], ["terminada", "Terminada"]] as const;
const tiempo = (m: number | null) => (m == null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

export default async function Kanban() {
  const s = await exigirSucursal("jefe_taller");
  const [ordenes, mecanicos] = await Promise.all([
    leer<any[]>(db().from("v_ordenes").select("*").eq("sucursal_taller_id", s.sucursalId).neq("estado", "cerrada").order("abierta_en")),
    leer<any[]>(db().from("mecanicos").select("*").eq("sucursal_id", s.sucursalId).eq("activo", true).order("nombre")),
  ]);
  const carga = (id: number) => ordenes.filter((o) => o.mecanico_id === id && ["asignada", "en_reparacion", "espera_repuestos"].includes(o.estado));
  const opciones = mecanicos.map((m) => { const c = carga(m.id); return [m.id, `${m.nombre} · ${c.length} en curso (${tiempo(c.reduce((a, o) => a + (o.minutos_estimados ?? 0), 0))})`] as const; });
  return (
    <>
      <Encabezado titulo="Órdenes de trabajo" texto="Asigná cada trabajo y movelo según avanza. Los que superan el tiempo estimado se marcan en rojo."><TiempoReal /></Encabezado>
      <section aria-label="Carga de trabajo por mecánico" className="mb-5 grid gap-3 sm:grid-cols-3">
        {mecanicos.map((m) => { const c = carga(m.id); return (
          <div key={m.id} className="rounded-lg border border-borde/80 bg-white p-3 shadow-suave">
            <p className="font-medium">{m.nombre}</p><p className="text-xs text-medio">{m.especialidad}</p>
            <p className="cifras mt-1 text-sm">{c.length === 0 ? "Sin trabajos en curso" : `${c.length} ${c.length === 1 ? "trabajo" : "trabajos"} · ${tiempo(c.reduce((a, o) => a + (o.minutos_estimados ?? 0), 0))} estimados`}</p>
          </div>); })}
      </section>
      {ordenes.length === 0 ? <Vacio titulo="No hay órdenes de trabajo abiertas" texto="Las órdenes se generan cuando el asesor recibe un vehículo en el taller." /> : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {COLUMNAS.map(([estado, titulo]) => { const lista = ordenes.filter((o) => o.estado === estado); return (
            <section key={estado} aria-label={titulo} className="w-72 shrink-0 rounded-lg bg-borde/30 p-2 lg:w-auto lg:flex-1 lg:min-w-56">
              <h2 className="mb-2 flex items-center justify-between px-1 font-sans text-sm font-semibold text-grafito">{titulo}<span className="cifras rounded-full bg-white px-2 text-xs font-medium text-medio">{lista.length}</span></h2>
              <ul className="space-y-2">
                {lista.map((o) => (
                  <li key={o.id} className={`rounded-md border bg-white p-3 text-sm shadow-suave ${o.demorado && estado !== "terminada" ? "border-error border-l-4" : "border-borde"}`}>
                    <p className="flex items-center justify-between gap-2"><span className="cifras font-semibold text-marino">{o.patente}</span><span className="cifras text-xs text-medio">OT {o.id}</span></p>
                    <p>{o.marca} {o.modelo}</p><p className="font-medium">{o.servicio}</p>
                    <p className="cifras text-xs text-medio">Turno {fecha(o.fecha).slice(0, 5)} {hora(o.hora)} h{o.derivado && " · derivado"}</p>
                    {o.mecanico && <p className="mt-1.5 text-xs">Mecánico: <strong>{o.mecanico}</strong></p>}
                    {o.minutos_estimados != null && <p className={`cifras text-xs ${o.demorado ? "font-semibold text-error" : "text-medio"}`}>Estimado {tiempo(o.minutos_estimados)} · Real {tiempo(o.minutos_reales)}</p>}
                    {o.demorado && <div className="mt-1"><Insignia tono="error">Demorado</Insignia></div>}
                    <div className="mt-2 space-y-2 border-t border-borde/60 pt-2">
                      {["pendiente", "asignada"].includes(estado) && (
                        <details open={estado === "pendiente"}><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">{estado === "pendiente" ? "Asignar mecánico" : "Cambiar asignación"}</summary>
                          <FormAccion accion={asignarMecanico} ocultos={{ orden: o.id }} className="mt-1 space-y-2">
                            <Selector etiqueta="Mecánico" name="mecanico" id={`m-${o.id}`} required defaultValue={o.mecanico_id ?? ""} vacio="Elegí un mecánico" opciones={opciones} />
                            <Entrada etiqueta="Tiempo estimado (min)" name="minutos" id={`t-${o.id}`} type="number" inputMode="numeric" min={15} step={15} required defaultValue={o.minutos_estimados ?? o.duracion_min} />
                            <BotonEnviar chico variante="primario">Asignar mecánico</BotonEnviar>
                          </FormAccion></details>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {["asignada", "espera_repuestos"].includes(estado) && <BotonAccion accion={moverOrden} campos={{ orden: o.id, estado: "en_reparacion" }} variante="secundario">{estado === "asignada" ? "Iniciar trabajo" : "Retomar trabajo"}</BotonAccion>}
                        {estado === "en_reparacion" && <BotonAccion accion={moverOrden} campos={{ orden: o.id, estado: "espera_repuestos" }}>Esperar repuestos</BotonAccion>}
                      </div>
                      {["en_reparacion", "espera_repuestos"].includes(estado) && (
                        <FormAccion accion={moverOrden} ocultos={{ orden: o.id, estado: "terminada" }} className="space-y-2">
                          {o.demorado && !o.motivo_demora && <Entrada etiqueta="Motivo de la demora" name="motivo" id={`d-${o.id}`} required maxLength={300} />}
                          <BotonEnviar chico variante="primario">Terminar trabajo</BotonEnviar>
                        </FormAccion>
                      )}
                      {estado === "terminada" && <p className="text-xs text-medio">Listo para retirar. El asesor entrega el vehículo y cierra la orden.</p>}
                    </div>
                  </li>
                ))}
                {lista.length === 0 && <li className="px-1 py-3 text-xs text-medio">Sin órdenes</li>}
              </ul>
            </section>); })}
        </div>
      )}
    </>
  );
}
