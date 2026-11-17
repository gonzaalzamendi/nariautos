import Link from "next/link";
import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { cancelarReserva, reservarUnidad } from "@/lib/acciones/ventas";
import { etiqueta, fechaHora, moneda, numero } from "@/lib/formato";
import { BotonLink, Encabezado, Entrada, Insignia, Tabla, Vacio } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Mis unidades" };
export default async function Unidades() {
  const s = await exigirSucursal("vendedor");
  await db().rpc("mantenimiento"); // vence reservas de más de 72 h
  const us = await leer<any[]>(db().from("unidades").select("*, reservas_unidad(id, cliente_nombre, vence_en, estado)").eq("sucursal_id", s.sucursalId).neq("estado", "vendida").order("estado").order("marca").order("modelo"));
  return (
    <>
      <Encabezado titulo="Unidades de mi sucursal" texto="Unidades en venta de tu sucursal. Podés verlas y reservarlas por 72 h; el alta y la edición las hace Gerencia." />
      {us.length === 0 ? <Vacio titulo="Tu sucursal no tiene unidades en venta" texto="Cuando Gerencia cargue unidades en tu sucursal, las vas a ver acá. También podés pedir unidades de otras sucursales desde «Stock de la red»."><BotonLink href="/vendedor/stock">Ver stock de la red</BotonLink></Vacio> : (
        <Tabla cabeceras={["Unidad", "Año · km", "Precio", "Estado", "Acciones"]}>
          {us.map((u) => {
            const r = u.reservas_unidad.find((x: any) => x.estado === "activa");
            const porVencer = r && new Date(r.vence_en).getTime() - Date.now() < 24 * 3600e3;
            return (
              <tr key={u.id}>
                <td><Link href={`/vendedor/unidades/${u.id}`} className="font-medium text-marino underline">{u.marca} {u.modelo}</Link><br /><span className="text-xs text-medio">{u.version} · {etiqueta(u.condicion)}</span></td>
                <td className="cifras whitespace-nowrap">{u.anio} · {numero(u.km)} km</td>
                <td className="cifras whitespace-nowrap">{moneda(u.precio)}</td>
                <td><Insignia estado={u.estado}>{etiqueta(u.estado)}</Insignia>
                  {r && <p className={`cifras mt-1 text-xs ${porVencer ? "font-medium text-error" : "text-medio"}`}>{r.cliente_nombre}<br />Vence el {fechaHora(r.vence_en)}{porVencer && " · por vencer"}</p>}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    <BotonLink href={`/vendedor/unidades/${u.id}`} variante="contorno" chico>Ver unidad</BotonLink>
                    {r && <BotonAccion accion={cancelarReserva} campos={{ reserva: r.id }} confirmar={`¿Cancelar la reserva de ${r.cliente_nombre}?`}>Cancelar reserva</BotonAccion>}
                  </div>
                  {u.estado === "disponible" && (
                    <details className="mt-2"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Reservar por 72 h</summary>
                      <FormAccion accion={reservarUnidad} ocultos={{ unidad: u.id }} className="mt-2 w-60 space-y-2">
                        <Entrada etiqueta="Cliente que reserva" name="cliente_nombre" required autoComplete="off" />
                        <Entrada etiqueta="Teléfono (opcional)" name="cliente_telefono" type="tel" autoComplete="off" />
                        <BotonEnviar chico>Reservar unidad</BotonEnviar>
                      </FormAccion>
                    </details>
                  )}
                </td>
              </tr>
            );
          })}
        </Tabla>
      )}
    </>
  );
}
