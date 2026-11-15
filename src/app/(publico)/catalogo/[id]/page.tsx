import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fotosDe, nombreUnidad, promocionesVigentes } from "@/lib/datos";
import { etiqueta, fecha, moneda, numero } from "@/lib/formato";
import { Dato, Insignia, Tarjeta } from "@/components/ui";
import { BotonComparar, BarraComparar } from "@/components/comparador";
import { Galeria, PanelContacto } from "./cliente";

export const dynamic = "force-dynamic";

async function unidad(id: string) {
  if (!/^\d+$/.test(id)) return null;
  return (await db().from("unidades").select("*, sucursales(id, nombre, localidad, direccion, telefono), fotos_unidad(id, url, orden)").eq("id", Number(id)).neq("estado", "vendida").maybeSingle()).data as any;
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const u = await unidad((await params).id);
  return { title: u ? nombreUnidad(u) : "Unidad no disponible" };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  const u = await unidad((await params).id);
  if (!u) notFound();
  const promos = (await promocionesVigentes()).filter((p) => p.promocion_unidad.some((x: any) => x.unidad_id === u.id));
  const manana = new Date(Date.now() + 21 * 3600e3).toISOString().slice(0, 10);
  return (
    <div className="pb-16">
      <nav aria-label="Ruta" className="mb-3 text-sm text-medio"><Link href="/catalogo" className="underline">Catálogo</Link> / {u.marca} {u.modelo}</nav>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Galeria fotos={fotosDe(u)} nombre={nombreUnidad(u)} />
          <Tarjeta titulo="Especificaciones">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Dato nombre="Marca">{u.marca}</Dato><Dato nombre="Modelo">{u.modelo}</Dato><Dato nombre="Versión">{u.version ?? "—"}</Dato>
              <Dato nombre="Año"><span className="cifras">{u.anio}</span></Dato><Dato nombre="Kilómetros"><span className="cifras">{u.km === 0 ? "0 km" : numero(u.km) + " km"}</span></Dato>
              <Dato nombre="Condición">{etiqueta(u.condicion)}</Dato><Dato nombre="Combustible">{etiqueta(u.combustible)}</Dato>
              <Dato nombre="Transmisión">{etiqueta(u.transmision)}</Dato><Dato nombre="Color">{u.color ?? "—"}</Dato>
            </dl>
            {u.descripcion && <p className="mt-4 border-t border-borde/70 pt-4 text-sm">{u.descripcion}</p>}
          </Tarjeta>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border border-borde/80 bg-white p-5 shadow-suave">
            <div className="flex flex-wrap gap-1.5"><Insignia tono={u.condicion === "0km" ? "info" : "neutro"}>{etiqueta(u.condicion)}</Insignia><Insignia estado={u.estado}>{etiqueta(u.estado)}</Insignia></div>
            <h1 className="mt-2 text-2xl leading-tight sm:text-3xl">{u.marca} {u.modelo}</h1>
            <p className="text-medio">{u.version}</p>
            <p className="cifras mt-3 text-3xl font-semibold text-dorado-texto">{moneda(u.precio)}</p>
            <p className="mt-3 text-sm">Disponible en <strong>{u.sucursales.nombre}</strong><br /><span className="text-medio">{u.sucursales.direccion}, {u.sucursales.localidad} · Tel. {u.sucursales.telefono}</span></p>
            {u.estado === "reservada" && <p className="mt-3 rounded-md border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta-texto">Esta unidad está reservada. Podés dejar tu consulta: si la reserva vence, te avisamos.</p>}
            {promos.map((p) => <p key={p.id} className="mt-3 rounded-md border border-dorado/40 bg-dorado/10 px-3 py-2 text-sm"><strong>{p.titulo}.</strong> Vigente hasta el {fecha(p.vigente_hasta)}.</p>)}
            <div className="mt-3"><BotonComparar id={u.id} /></div>
          </div>
          <PanelContacto unidadId={u.id} precio={Number(u.precio)} fechaMinima={manana} />
          <p className="text-sm text-medio">¿Tenés un usado? <Link href={`/tasacion?unidad=${u.id}`} className="text-acero underline">Tasalo online y entregalo como parte de pago</Link>.</p>
        </div>
      </div>
      <BarraComparar />
    </div>
  );
}
