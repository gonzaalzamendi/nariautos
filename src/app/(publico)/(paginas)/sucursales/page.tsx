import { Clock, MapPin, Phone } from "lucide-react";
import { sucursales } from "@/lib/datos";
import { hora } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia } from "@/components/ui";

export const metadata = { title: "Sucursales" };
export const dynamic = "force-dynamic";

export default async function Sucursales() {
  const sucs = await sucursales();
  return (
    <>
      <Encabezado titulo="Sucursales" texto="Cuatro puntos de venta y dos talleres de post-venta. Las sucursales sin taller derivan tu turno al taller más cercano de la red." />
      <ul className="grid gap-4 md:grid-cols-2">
        {sucs.map((s) => (
          <li key={s.id} className="rounded-lg border border-borde/80 bg-white p-5 shadow-suave">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl">{s.nombre}</h2>
              <div className="flex gap-1.5"><Insignia tono="info">Ventas</Insignia>{s.tiene_taller ? <Insignia tono="exito">Taller propio</Insignia> : <Insignia>Sin taller</Insignia>}</div></div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-acero" aria-hidden="true" /><span>{s.direccion}, {s.localidad} · <a className="text-acero underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`}>Ver en el mapa</a></span></li>
              <li className="flex gap-2"><Phone size={16} className="mt-0.5 shrink-0 text-acero" aria-hidden="true" /><a href={`tel:${s.telefono.replace(/\D/g, "")}`} className="underline">{s.telefono}</a></li>
              <li className="flex gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-acero" aria-hidden="true" /><span>Ventas: {s.horario_atencion}{s.tiene_taller && <><br />Taller: lunes a viernes de {hora(s.taller_abre)} a {hora(s.taller_cierra)} · {s.capacidad_boxes} boxes</>}</span></li>
            </ul>
            {!s.tiene_taller && <p className="mt-3 rounded-md bg-fondo px-3 py-2 text-sm">Los turnos de taller se realizan en <strong>{s.referencia?.nombre}</strong> ({s.referencia?.direccion}, {s.referencia?.localidad}), a {String(s.distancias[s.taller_referencia_id]).replace(".", ",")} km.</p>}
            <div className="mt-4 flex flex-wrap gap-2"><BotonLink href={`/catalogo?sucursal=${s.id}`} variante="contorno" chico>Ver unidades de esta sucursal</BotonLink><BotonLink href={`/turnos?sucursal=${s.id}`} chico>Solicitar turno de taller</BotonLink></div>
          </li>
        ))}
      </ul>
    </>
  );
}
