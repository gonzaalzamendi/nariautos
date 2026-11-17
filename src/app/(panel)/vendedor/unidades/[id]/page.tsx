import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { SEL_UNIDAD, fotosDe } from "@/lib/datos";
import { etiqueta, fecha, fechaHora, moneda, numero } from "@/lib/formato";
import { BotonLink, Dato, Encabezado, Insignia, Tarjeta } from "@/components/ui";

export const metadata = { title: "Unidad" };
/** Vista de solo lectura: el vendedor no modifica unidades (lo hace Gerencia). */
export default async function Unidad({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSucursal("vendedor");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const u = (await db().from("unidades").select(SEL_UNIDAD + ", reservas_unidad(cliente_nombre, vence_en, estado)").eq("id", id).eq("sucursal_id", s.sucursalId).neq("estado", "vendida").maybeSingle()).data as any;
  if (!u) notFound();
  const r = u.reservas_unidad?.find((x: any) => x.estado === "activa");
  return (
    <>
      <Encabezado titulo={`${u.marca} ${u.modelo}`} texto={`${u.version ?? ""} · Solo lectura: para corregir datos o fotos, pedíselo a Gerencia.`}>
        <BotonLink href={`/catalogo/${u.id}`} variante="contorno" chico target="_blank">Ver ficha pública</BotonLink>
        <BotonLink href="/vendedor/unidades" variante="contorno" chico>Volver a mis unidades</BotonLink>
      </Encabezado>
      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Tarjeta titulo="Fotos">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{fotosDe(u).map((f) => <li key={f}><img src={f} alt="" className="aspect-[16/10] w-full rounded-md border border-borde object-cover" /></li>)}</ul>
        </Tarjeta>
        <Tarjeta titulo="Datos de la unidad" accion={<Insignia estado={u.estado}>{etiqueta(u.estado)}</Insignia>}>
          <dl className="grid grid-cols-2 gap-4">
            <Dato nombre="Precio"><span className="cifras font-semibold text-dorado-texto">{moneda(u.precio)}</span></Dato><Dato nombre="Condición">{etiqueta(u.condicion)}</Dato>
            <Dato nombre="Año"><span className="cifras">{u.anio}</span></Dato><Dato nombre="Kilómetros"><span className="cifras">{numero(u.km)} km</span></Dato>
            <Dato nombre="Combustible">{etiqueta(u.combustible)}</Dato><Dato nombre="Transmisión">{etiqueta(u.transmision)}</Dato>
            <Dato nombre="Color">{u.color ?? "—"}</Dato><Dato nombre="Ingreso al stock"><span className="cifras">{fecha(u.fecha_ingreso)}</span></Dato>
          </dl>
          {u.descripcion && <p className="mt-4 border-t border-borde/70 pt-4 text-sm">{u.descripcion}</p>}
          {r && <p className="cifras mt-4 rounded-md border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta-texto">Reservada para {r.cliente_nombre} hasta el {fechaHora(r.vence_en)}.</p>}
        </Tarjeta>
      </div>
    </>
  );
}
