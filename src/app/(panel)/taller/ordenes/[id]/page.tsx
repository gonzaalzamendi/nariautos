import { notFound } from "next/navigation";
import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { etiqueta, fecha, fechaHora, hora, moneda, numero } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Logo } from "@/components/ui";
import { BotonImprimir } from "@/components/panel-cliente";

export const metadata = { title: "Orden de trabajo" };
const tiempo = (m: number | null | undefined) => (m == null ? "" : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

/** Celda de la planilla: etiqueta arriba y valor (o renglón vacío para completar). */
function Celda({ n, v, ancho = "", alto = false }: { n: string; v?: React.ReactNode; ancho?: string; alto?: boolean }) {
  const vacio = v == null || v === "";
  return (
    <div className={`border-b border-r border-grafito/25 px-2.5 py-1.5 ${ancho}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-medio">{n}</p>
      <div className={`cifras text-[14px] ${alto ? "min-h-14" : "min-h-6"} ${vacio ? "text-medio/40" : "text-grafito"}`}>{vacio ? " " : v}</div>
    </div>
  );
}
function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 break-inside-avoid">
      <h2 className="border border-grafito/40 bg-marino px-2.5 py-1 font-sans text-xs font-semibold uppercase tracking-wider !text-white print:bg-white print:!text-marino">{titulo}</h2>
      <div className="border-l border-grafito/25">{children}</div>
    </section>
  );
}
/** Texto largo; si el mecánico todavía no lo completó, muestra renglones vacíos. */
function Renglones({ texto, cantidad = 3 }: { texto?: string | null; cantidad?: number }) {
  if (texto) return <p className="min-h-16 whitespace-pre-line border-b border-r border-grafito/25 px-2.5 py-2 text-[14px]">{texto}</p>;
  return <div className="border-r border-grafito/25">{Array.from({ length: cantidad }, (_, i) => <div key={i} className="h-8 border-b border-grafito/25" />)}</div>;
}

export default async function OrdenTrabajo({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSucursal("jefe_taller");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const o = (await db().from("v_ordenes").select("*").eq("id", id).eq("sucursal_taller_id", s.sucursalId).maybeSingle()).data as any;
  if (!o) notFound();
  const [t, repuestos] = await Promise.all([
    leer<any>(db().from("turnos").select("observaciones, canal_origen, vehiculos(anio, codigo_auto), clientes(nombre, telefono), servicios(nombre), taller:sucursales!turnos_sucursal_taller_id_fkey(nombre, direccion, localidad, telefono), origen:sucursales!turnos_sucursal_origen_id_fkey(nombre)").eq("id", o.turno_id).single()),
    leer<any[]>(db().from("repuestos_orden").select("id, cantidad, creado_en, repuestos(codigo, nombre, precio)").eq("orden_id", o.id).order("creado_en")),
  ]);
  const totalRep = repuestos.reduce((a, r) => a + r.cantidad * Number(r.repuestos.precio), 0);
  const filasRep = Math.max(4, repuestos.length + 1);
  const finalizada = ["terminada", "cerrada"].includes(o.estado);
  return (
    <>
      <div className="no-imprimir">
        <Encabezado titulo={`Orden de trabajo N.º ${o.id}`} texto="Planilla que completa el mecánico durante el trabajo. Los espacios vacíos son los datos que todavía no cargó.">
          <BotonImprimir>Imprimir planilla</BotonImprimir>
          <BotonLink href="/taller" variante="contorno">Volver a las órdenes</BotonLink>
        </Encabezado>
      </div>

      <article className="mx-auto max-w-4xl rounded-lg border border-borde/80 bg-white p-5 shadow-suave sm:p-8 print:max-w-none print:border-0 print:p-0 print:shadow-none" aria-label={`Planilla de la orden de trabajo ${o.id}`}>
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-dorado pb-4">
          <div>
            <Logo eslogan alto={56} />
            <p className="mt-1 text-xs text-medio">Taller {t.taller.nombre} · {t.taller.direccion}, {t.taller.localidad} · Tel. {t.taller.telefono}</p>
          </div>
          <div className="text-right">
            <p className="font-sans text-xs font-semibold uppercase tracking-wider text-medio">Orden de trabajo</p>
            <p className="cifras font-serif text-3xl font-semibold text-marino">N.º {String(o.id).padStart(5, "0")}</p>
            <div className="mt-1 flex justify-end gap-1">
              <Insignia estado={o.estado}>{o.estado === "cerrada" ? "Entregada" : o.estado === "terminada" ? "Finalizada" : o.estado === "pendiente" ? "Sin asignar" : etiqueta(o.estado)}</Insignia>
              {o.demorado && <Insignia tono="error">Demorada</Insignia>}
            </div>
          </div>
        </header>

        <Bloque titulo="Datos de la orden">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <Celda n="Fecha de apertura" v={fechaHora(o.abierta_en)} /><Celda n="Turno" v={`${fecha(o.fecha)} ${hora(o.hora)} h · ${o.codigo}`} />
            <Celda n="Origen" v={`${t.origen.nombre}${o.derivado ? " (derivado)" : ""}`} /><Celda n="Fecha de cierre" v={o.cerrada_en ? fechaHora(o.cerrada_en) : ""} />
          </div>
        </Bloque>

        <Bloque titulo="Cliente y vehículo">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <Celda n="Cliente" v={o.cliente} ancho="col-span-2" /><Celda n="Teléfono" v={t.clientes.telefono} /><Celda n="Código del vehículo" v={t.vehiculos.codigo_auto} />
            <Celda n="Patente" v={<strong>{o.patente}</strong>} /><Celda n="Marca y modelo" v={`${o.marca} ${o.modelo}`} /><Celda n="Año" v={t.vehiculos.anio} />
            <Celda n="Combustible al ingreso" v={o.combustible_nivel} />
            <Celda n="Km de ingreso" v={numero(o.km_ingreso)} /><Celda n="Km de egreso" v={o.km_egreso != null ? numero(o.km_egreso) : ""} />
            <Celda n="Servicio" v={o.servicio} ancho="col-span-2" />
          </div>
        </Bloque>

        <Bloque titulo="Recepción (asesor de servicio)">
          <div className="grid sm:grid-cols-2">
            <Celda n="Trabajos solicitados por el cliente" v={o.trabajos_solicitados} alto />
            <Celda n="Daños visibles al ingreso" v={o.danos_visibles} alto />
            <Celda n="Observaciones" v={[t.observaciones, o.observaciones].filter(Boolean).join(" · ")} ancho="sm:col-span-2" />
          </div>
        </Bloque>

        <Bloque titulo="Asignación y tiempos">
          <div className="grid grid-cols-2 sm:grid-cols-3">
            <Celda n="Mecánico asignado" v={o.mecanico} /><Celda n="Tiempo estimado" v={tiempo(o.minutos_estimados)} />
            <Celda n="Tiempo real" v={o.inicio_en ? <span className={o.demorado ? "font-semibold text-error" : ""}>{tiempo(o.minutos_reales)}{!o.fin_en && " (en curso)"}</span> : ""} />
            <Celda n="Inicio del trabajo" v={o.inicio_en ? fechaHora(o.inicio_en) : ""} /><Celda n="Fin del trabajo" v={o.fin_en ? fechaHora(o.fin_en) : ""} />
            <Celda n="Diferencia con lo estimado" v={o.inicio_en && o.minutos_estimados != null ? (o.minutos_reales - o.minutos_estimados > 0 ? <span className="font-semibold text-error">+{tiempo(o.minutos_reales - o.minutos_estimados)}</span> : "Dentro del tiempo") : ""} />
            <Celda n="Motivo de la demora" v={o.motivo_demora ?? ""} ancho="col-span-2 sm:col-span-3" />
          </div>
        </Bloque>

        <Bloque titulo="Trabajos realizados (completa el mecánico)">
          <Renglones texto={o.trabajos_realizados} cantidad={4} />
        </Bloque>

        <Bloque titulo="Repuestos utilizados">
          <div className="overflow-x-auto border-r border-grafito/25">
            <table className="w-full min-w-[480px] text-[13px]">
              <thead><tr className="border-b border-grafito/25 bg-fondo text-left text-[11px] uppercase tracking-wide text-medio">
                <th className="w-24 px-2.5 py-1.5 font-medium">Código</th><th className="px-2.5 py-1.5 font-medium">Descripción</th>
                <th className="w-16 px-2.5 py-1.5 text-right font-medium">Cant.</th><th className="w-28 px-2.5 py-1.5 text-right font-medium">Precio unit.</th><th className="w-28 px-2.5 py-1.5 text-right font-medium">Subtotal</th>
              </tr></thead>
              <tbody className="cifras">
                {Array.from({ length: filasRep }, (_, i) => { const r = repuestos[i]; return (
                  <tr key={i} className="h-8 border-b border-grafito/25">
                    <td className="px-2.5">{r?.repuestos.codigo}</td><td className="px-2.5">{r?.repuestos.nombre}</td><td className="px-2.5 text-right">{r?.cantidad}</td>
                    <td className="px-2.5 text-right">{r ? moneda(r.repuestos.precio) : ""}</td><td className="px-2.5 text-right">{r ? moneda(r.cantidad * Number(r.repuestos.precio)) : ""}</td>
                  </tr>); })}
                <tr className="border-b border-grafito/25 font-semibold"><td colSpan={4} className="px-2.5 py-1.5 text-right">Total repuestos</td><td className="px-2.5 py-1.5 text-right">{repuestos.length ? moneda(totalRep) : ""}</td></tr>
              </tbody>
            </table>
          </div>
        </Bloque>

        <Bloque titulo="Control final">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {["Prueba de ruta", "Niveles de fluidos", "Luces y tablero", "Limpieza del vehículo"].map((c) => (
              <Celda key={c} n={c} v={finalizada ? "Realizado ✓" : ""} />
            ))}
          </div>
        </Bloque>

        <section className="mt-10 grid break-inside-avoid grid-cols-3 gap-6 text-center text-xs text-medio">
          {[["Mecánico", o.mecanico], ["Jefe de taller", s.nombre], ["Cliente (conformidad)", o.estado === "cerrada" ? o.cliente : null]].map(([rol, nombre]) => (
            <div key={rol}><div className="flex h-12 items-end justify-center border-b border-grafito/60 pb-1 text-[13px] text-grafito">{nombre}</div><p className="mt-1">Firma y aclaración · {rol}</p></div>
          ))}
        </section>
        <p className="mt-6 text-[11px] text-medio">NariAutos · Orden de trabajo generada por el sistema el {fechaHora(new Date().toISOString())}.</p>
      </article>
    </>
  );
}
