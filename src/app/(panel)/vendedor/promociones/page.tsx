import { exigirSucursal } from "@/lib/sesion";
import { promocionesVigentes } from "@/lib/datos";
import { db, leer } from "@/lib/db";
import { fecha } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta, Vacio } from "@/components/ui";

export const metadata = { title: "Promociones vigentes" };
export default async function Promos() {
  const s = await exigirSucursal("vendedor");
  const promos = await promocionesVigentes(s.sucursalId);
  const ids = [...new Set(promos.flatMap((p) => p.promocion_unidad.map((x: any) => x.unidad_id)))];
  const us = ids.length ? await leer<any[]>(db().from("unidades").select("id, marca, modelo, version, sucursales(nombre)").in("id", ids)) : [];
  return (
    <>
      <Encabezado titulo="Promociones vigentes" texto="Promociones de toda la red y de tu sucursal para ofrecer a los clientes. Las carga y modifica Gerencia." />
      {promos.length === 0 ? <Vacio titulo="Hoy no hay promociones vigentes" texto="Cuando Gerencia publique una promoción para la red o para tu sucursal, la vas a ver acá." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {promos.map((p) => { const lista = us.filter((u) => p.promocion_unidad.some((x: any) => x.unidad_id === u.id)); return (
            <Tarjeta key={p.id}>
              <Insignia tono="dorado">{p.sucursales?.nombre ?? "Toda la red"}</Insignia>
              <h2 className="mt-2 text-lg">{p.titulo}</h2>
              <p className="mt-1 text-sm">{p.descripcion}</p>
              <p className="cifras mt-2 text-xs text-medio">Vigente del {fecha(p.vigente_desde)} al {fecha(p.vigente_hasta)}</p>
              {lista.length > 0 && <ul className="mt-3 border-t border-borde/70 pt-3 text-sm">{lista.map((u) => <li key={u.id}>{u.marca} {u.modelo} {u.version} <span className="text-medio">· {u.sucursales?.nombre}</span></li>)}</ul>}
            </Tarjeta>); })}
        </div>
      )}
    </>
  );
}
