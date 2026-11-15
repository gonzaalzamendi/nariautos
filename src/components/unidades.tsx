import Link from "next/link";
import { MapPin } from "lucide-react";
import { etiqueta, moneda, numero } from "@/lib/formato";
import { Insignia } from "./ui";
import { BotonComparar } from "./comparador";

export function TarjetaUnidad({ u, foto, promo }: { u: any; foto?: string; promo?: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-borde/80 bg-white shadow-suave">
      <Link href={`/catalogo/${u.id}`} className="block" aria-label={`Ver ficha de ${u.marca} ${u.modelo} ${u.version ?? ""}`}>
        <img src={foto ?? `/placeholder?u=${u.id}&v=1`} alt="" width={640} height={400} loading="lazy" className="aspect-[16/10] w-full bg-fondo object-cover" />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Insignia tono={u.condicion === "0km" ? "info" : "neutro"}>{etiqueta(u.condicion)}</Insignia>
          {u.estado === "reservada" && <Insignia estado="reservada">Reservada</Insignia>}
          {promo && <Insignia tono="dorado">En promoción</Insignia>}
        </div>
        <h3 className="text-lg leading-snug"><Link href={`/catalogo/${u.id}`} className="hover:underline">{u.marca} {u.modelo}</Link></h3>
        <p className="-mt-1.5 text-sm text-medio">{u.version ?? "—"}</p>
        <p className="cifras text-sm text-grafito">{u.anio} · {u.km === 0 ? "0 km" : `${numero(u.km)} km`} · {etiqueta(u.combustible)} · {etiqueta(u.transmision)}</p>
        <p className="cifras mt-auto pt-1 text-xl font-semibold text-dorado-texto">{moneda(u.precio)}</p>
        <p className="flex items-center gap-1 text-sm text-medio"><MapPin size={14} aria-hidden="true" />{u.sucursales?.nombre} · {u.sucursales?.localidad}</p>
        <BotonComparar id={u.id} />
      </div>
    </article>
  );
}
