import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { resolverTransferencia, solicitarTransferencia } from "@/lib/acciones/ventas";
import { etiqueta, fechaHora, moneda, numero } from "@/lib/formato";
import { Encabezado, Entrada, Insignia, Tabla, Tarjeta, claseBoton, claseCampo } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Stock de la red" };
export default async function Stock({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await exigirSucursal("vendedor");
  const q = ((await searchParams).q ?? "").replace(/[%_,()]/g, "").trim();
  let cu = db().from("unidades").select("*, sucursales(nombre)").neq("estado", "vendida");
  if (q) cu = cu.or(`marca.ilike.%${q}%,modelo.ilike.%${q}%`);
  const [us, trs] = await Promise.all([
    leer<any[]>(cu.order("marca").order("modelo")),
    leer<any[]>(db().from("transferencias_unidad").select("*, unidades(marca, modelo, version), origen:sucursales!transferencias_unidad_origen_id_fkey(nombre), destino:sucursales!transferencias_unidad_destino_id_fkey(nombre), solicitante:empleados!transferencias_unidad_solicitada_por_fkey(nombre)")
      .or(`origen_id.eq.${s.sucursalId},destino_id.eq.${s.sucursalId}`).order("creado_en", { ascending: false }).limit(15)),
  ]);
  const pedidas = new Set(trs.filter((t) => t.estado === "solicitada").map((t) => t.unidad_id));
  return (
    <>
      <Encabezado titulo="Stock de toda la red" texto="Solo lectura. Si un cliente quiere una unidad de otra sucursal, pedí la transferencia." />
      {trs.length > 0 && (
        <Tarjeta titulo="Pedidos de transferencia" className="mb-5">
          <ul className="divide-y divide-borde/60">
            {trs.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><strong>{t.unidades.marca} {t.unidades.modelo}</strong> · {t.origen.nombre} → {t.destino.nombre}<br /><span className="cifras text-xs text-medio">Pedida por {t.solicitante?.nombre ?? "un empleado dado de baja"} el {fechaHora(t.creado_en)}{t.motivo && ` · ${t.motivo}`}</span></span>
                <span className="flex items-center gap-1.5"><Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia>
                  {t.estado === "solicitada" && t.origen_id === s.sucursalId && <>
                    <BotonAccion accion={resolverTransferencia} campos={{ transferencia: t.id, decision: "aprobada" }} variante="primario" confirmar={`¿Aprobar el envío de ${t.unidades.marca} ${t.unidades.modelo} a ${t.destino.nombre}?`}>Aprobar transferencia</BotonAccion>
                    <BotonAccion accion={resolverTransferencia} campos={{ transferencia: t.id, decision: "rechazada" }} variante="peligro">Rechazar pedido</BotonAccion></>}
                </span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}
      <form className="mb-4 flex max-w-md items-end gap-2" role="search">
        <div className="flex-1"><label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar por marca o modelo</label><input id="q" name="q" defaultValue={q} className={claseCampo} /></div>
        <button type="submit" className={claseBoton("secundario")}>Buscar unidades</button>
      </form>
      <Tabla cabeceras={["Unidad", "Sucursal", "Año · km", "Precio", "Estado", "Transferencia"]}>
        {us.map((u) => (
          <tr key={u.id}>
            <td className="font-medium">{u.marca} {u.modelo}<br /><span className="text-xs font-normal text-medio">{u.version} · {etiqueta(u.condicion)}</span></td>
            <td>{u.sucursales.nombre}{u.sucursal_id === s.sucursalId && <span className="text-xs text-medio"> (tu sucursal)</span>}</td>
            <td className="cifras whitespace-nowrap">{u.anio} · {numero(u.km)} km</td><td className="cifras whitespace-nowrap">{moneda(u.precio)}</td>
            <td><Insignia estado={u.estado}>{etiqueta(u.estado)}</Insignia></td>
            <td>{u.sucursal_id === s.sucursalId ? <span className="text-medio">—</span> : pedidas.has(u.id) ? <span className="text-sm text-medio">Pedido en curso</span> : u.estado !== "disponible" ? <span className="text-medio">No disponible</span> : (
              <details><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Pedir para mi sucursal</summary>
                <FormAccion accion={solicitarTransferencia} ocultos={{ unidad: u.id }} className="mt-2 w-56 space-y-2">
                  <Entrada etiqueta="Motivo (opcional)" name="motivo" maxLength={300} />
                  <BotonEnviar chico>Solicitar transferencia</BotonEnviar>
                </FormAccion></details>)}</td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
