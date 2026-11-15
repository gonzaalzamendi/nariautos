import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { etiqueta, hoyAR, moneda, numero } from "@/lib/formato";
import { BotonLink, Encabezado, Selector, Tabla, Tarjeta, claseBoton } from "@/components/ui";
import { BotonImprimir } from "@/components/panel-cliente";
import { Barras } from "@/components/graficos";

export const metadata = { title: "Tablero de gerencia" };
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const suma = (f: any[], k: string) => f.reduce((a, x) => a + Number(x[k] ?? 0), 0);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

function Indicador({ nombre, valor, detalle }: { nombre: string; valor: string; detalle?: string }) {
  return <div className="rounded-lg border border-borde/80 bg-white p-4 shadow-suave"><p className="text-xs font-medium uppercase tracking-wide text-medio">{nombre}</p><p className="cifras mt-1 text-2xl font-semibold text-marino">{valor}</p>{detalle && <p className="cifras mt-0.5 text-xs text-medio">{detalle}</p>}</div>;
}

export default async function Tablero({ searchParams }: { searchParams: Promise<{ sucursal?: string; meses?: string }> }) {
  await exigir("gerencia");
  const sp = await searchParams, suc = /^\d+$/.test(sp.sucursal ?? "") ? Number(sp.sucursal) : null;
  const meses = [3, 6, 12].includes(Number(sp.meses)) ? Number(sp.meses) : 6;
  const hoy = hoyAR(), [a, m] = hoy.split("-").map(Number);
  const lista = Array.from({ length: meses }, (_, i) => new Date(Date.UTC(a, m - meses + i, 1)).toISOString().slice(0, 10));
  const desde = lista[0], hasta = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const v = (vista: string, col = "sucursal_id", fechaCol = "mes") => { let q = db().from(vista).select("*").gte(fechaCol, desde).lte(fechaCol, hasta); if (suc) q = q.eq(col, suc); return leer<any[]>(q); };
  const [sucs, ventas, stockTodo, consultas, turnos, deriv, ocup, dem, sat] = await Promise.all([
    leer<any[]>(db().from("sucursales").select("id, nombre, tiene_taller").order("id")),
    v("v_kpi_ventas"), leer<any[]>(db().from("v_kpi_stock").select("*")), v("v_kpi_consultas"), v("v_kpi_turnos"),
    v("v_kpi_derivaciones", "sucursal_origen_id"), v("v_kpi_ocupacion", "sucursal_id", "fecha"), v("v_kpi_demoras"), v("v_kpi_satisfaccion"),
  ]);
  const nombre = (id: number) => sucs.find((s) => s.id === id)?.nombre ?? "—";
  const stock = suc ? stockTodo.filter((s) => s.sucursal_id === suc) : stockTodo;
  const totConsultas = suma(consultas, "total"), ganadas = suma(consultas, "ganadas"), respondidas = suma(consultas, "respondidas");
  const totTurnos = suma(turnos, "total"), porEstado = (e: string) => suma(turnos.filter((t) => t.estado === e), "total");
  const validos = totTurnos - porEstado("cancelado") - porEstado("rechazado");
  const trabajos = suma(dem, "trabajos"), demorados = suma(dem, "demorados"), cantSat = suma(sat, "cantidad");
  const disponibles = suma(stock, "disponibles"), enStock = disponibles + suma(stock, "reservadas");
  const antig = enStock ? Math.round(stock.reduce((x, s) => x + s.antiguedad_prom_dias * (s.disponibles + s.reservadas), 0) / enStock) : 0;
  const ocupacion = pct(suma(ocup, "minutos_ocupados"), suma(ocup, "minutos_capacidad"));
  const conv = pct(ganadas, totConsultas), ausent = pct(porEstado("ausente"), validos);
  const s1 = (n: number | null, suf = "%") => (n == null ? "—" : numero(n, 1) + suf);
  const q = `?sucursal=${suc ?? ""}&meses=${meses}`;
  return (
    <>
      <Encabezado titulo="Tablero de indicadores" texto={`${suc ? nombre(suc) : "Toda la red"} · últimos ${meses} meses`}>
        <BotonImprimir>Exportar tablero a PDF</BotonImprimir>
      </Encabezado>
      <form className="no-imprimir mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-borde/80 bg-white p-3 shadow-suave" aria-label="Filtros del tablero">
        <Selector etiqueta="Sucursal" name="sucursal" defaultValue={suc ?? ""} vacio="Toda la red" opciones={sucs.map((s) => [s.id, s.nombre] as const)} contenedor="w-48" />
        <Selector etiqueta="Período" name="meses" defaultValue={meses} opciones={[[3, "Últimos 3 meses"], [6, "Últimos 6 meses"], [12, "Últimos 12 meses"]]} contenedor="w-48" />
        <button type="submit" className={claseBoton("secundario")}>Aplicar filtros</button>
      </form>

      <h2 className="mb-3 text-xl">Ventas</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador nombre="Unidades vendidas" valor={numero(suma(ventas, "unidades"))} detalle={`${meses} meses`} />
        <Indicador nombre="Monto vendido" valor={moneda(suma(ventas, "monto"))} />
        <Indicador nombre="Stock disponible" valor={numero(disponibles)} detalle={`${suma(stock, "reservadas")} reservadas · ${moneda(suma(stock, "valor_stock"))}`} />
        <Indicador nombre="Antigüedad del stock" valor={`${antig} días`} detalle={`${suma(stock, "mas_de_90_dias")} unidades con más de 90 días`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Unidades vendidas por mes"><Barras datos={lista.map((mes) => ({ nombre: `${MESES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(2, 4)}`, valor: suma(ventas.filter((x) => x.mes === mes), "unidades") }))} sufijo=" unidades" /></Tarjeta>
        <Tarjeta titulo="Unidades vendidas por sucursal"><Barras horizontal datos={sucs.filter((s) => !suc || s.id === suc).map((s) => ({ nombre: s.nombre, valor: suma(ventas.filter((x) => x.sucursal_id === s.id), "unidades") }))} sufijo=" unidades" /></Tarjeta>
        <Tarjeta titulo="Stock disponible por sucursal" className="lg:col-span-2"><Barras horizontal alto={160} datos={sucs.filter((s) => !suc || s.id === suc).map((s) => ({ nombre: s.nombre, valor: stockTodo.find((x) => x.sucursal_id === s.id)?.disponibles ?? 0 }))} sufijo=" unidades" /></Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-xl">Comercial</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador nombre="Consultas recibidas" valor={numero(totConsultas)} detalle={`${ganadas} ganadas · ${suma(consultas, "perdidas")} perdidas`} />
        <Indicador nombre="Conversión consulta → venta" valor={s1(conv)} detalle="Consultas ganadas sobre el total" />
        <Indicador nombre="Tiempo de primera respuesta" valor={respondidas ? `${numero(suma(consultas, "horas_respuesta") / respondidas, 1)} h` : "—"} detalle={`Promedio sobre ${respondidas} respondidas`} />
      </div>
      <div className="mt-4"><Tarjeta titulo="Consultas por canal"><Barras datos={["web", "whatsapp", "telefono", "presencial"].map((c) => ({ nombre: etiqueta(c), valor: suma(consultas.filter((x) => x.canal === c), "total") }))} sufijo=" consultas" /></Tarjeta></div>

      <h2 className="mb-3 mt-8 text-xl">Post-venta</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador nombre="Ocupación del taller" valor={s1(ocupacion)} detalle="Horas de box reservadas, días con turnos" />
        <Indicador nombre="Demora promedio" valor={demorados ? `${Math.round(suma(dem, "minutos_demora") / demorados)} min` : "0 min"} detalle="Sobre los trabajos demorados" />
        <Indicador nombre="Trabajos demorados" valor={`${demorados} de ${trabajos}`} detalle={s1(pct(demorados, trabajos))} />
        <Indicador nombre="Ausentismo" valor={s1(ausent)} detalle={`${porEstado("ausente")} turnos no presentados`} />
        <Indicador nombre="Satisfacción" valor={cantSat ? `${numero(suma(sat, "suma") / cantSat, 1)} / 5` : "—"} detalle={`${cantSat} encuestas`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Turnos por estado"><Barras horizontal resaltar="No se presentó" datos={["solicitado", "confirmado", "recibido", "en_reparacion", "listo", "entregado", "ausente", "cancelado", "rechazado"].map((e) => ({ nombre: etiqueta(e), valor: porEstado(e) })).filter((d) => d.valor > 0)} sufijo=" turnos" /></Tarjeta>
        <Tarjeta titulo="Turnos derivados por sucursal de origen"><Barras horizontal alto={160} datos={sucs.filter((s) => !s.tiene_taller && (!suc || s.id === suc)).map((s) => ({ nombre: s.nombre, valor: suma(deriv.filter((x) => x.sucursal_origen_id === s.id), "total") }))} sufijo=" turnos" />
          <p className="mt-2 text-xs text-medio">Turnos originados en sucursales sin taller y realizados en el taller de referencia u otro de la red.</p></Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-xl">Detalle por sucursal</h2>
      <Tabla cabeceras={["Sucursal", "Vendidas", "Monto vendido", "Stock disp.", "Consultas", "Conversión", "Turnos en su taller", "Derivados desde aquí"]}>
        {sucs.filter((s) => !suc || s.id === suc).map((s) => { const c = consultas.filter((x) => x.sucursal_id === s.id), ve = ventas.filter((x) => x.sucursal_id === s.id); return (
          <tr key={s.id} className="cifras"><td className="font-medium">{s.nombre}</td><td>{suma(ve, "unidades")}</td><td>{moneda(suma(ve, "monto"))}</td><td>{stockTodo.find((x) => x.sucursal_id === s.id)?.disponibles ?? 0}</td>
            <td>{suma(c, "total")}</td><td>{s1(pct(suma(c, "ganadas"), suma(c, "total")))}</td><td>{s.tiene_taller ? suma(turnos.filter((x) => x.sucursal_id === s.id), "total") : "Sin taller"}</td><td>{s.tiene_taller ? "—" : suma(deriv.filter((x) => x.sucursal_origen_id === s.id), "total")}</td></tr>); })}
      </Tabla>
      <div className="no-imprimir mt-4 flex flex-wrap gap-2">
        {[["ventas", "Ventas"], ["stock", "Stock"], ["consultas", "Consultas"], ["turnos", "Turnos"], ["derivaciones", "Derivaciones"], ["demoras", "Demoras"], ["encuestas", "Encuestas"]].map(([t, n]) => <BotonLink key={t} href={`/api/csv/${t}${q}`} variante="contorno" chico download>Exportar {n} (CSV)</BotonLink>)}
      </div>
    </>
  );
}
