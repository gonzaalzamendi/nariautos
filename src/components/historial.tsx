import { fecha, numero } from "@/lib/formato";
import { Vacio } from "./ui";

export function VistaHistorial({ vehiculo, historial }: { vehiculo: any; historial: any[] }) {
  return (
    <section className="rounded-lg border border-borde/80 bg-white p-5 shadow-suave">
      <h2 className="text-xl">{vehiculo.marca} {vehiculo.modelo} <span className="font-sans text-base font-normal text-medio">· {vehiculo.anio} · patente <span className="cifras">{vehiculo.patente}</span></span></h2>
      <p className="cifras text-sm text-medio">Último kilometraje registrado: {numero(vehiculo.km_actual)} km</p>
      {historial.length === 0 ? <div className="mt-4"><Vacio titulo="Todavía no hay services registrados" texto="Cuando el vehículo pase por nuestros talleres, cada trabajo queda guardado acá." /></div> : (
        <ol className="mt-4 divide-y divide-borde/60">
          {historial.map((h) => (
            <li key={h.id} className="grid gap-1 py-3 sm:grid-cols-[110px_1fr]">
              <p className="cifras text-sm font-medium">{fecha(h.fecha)}<br /><span className="font-normal text-medio">{numero(h.km)} km</span></p>
              <div><p className="font-medium">{h.servicio}</p>{h.trabajos && <p className="text-sm text-medio">{h.trabajos}</p>}<p className="text-xs text-medio">{h.sucursales?.nombre ?? "Taller NariAutos"}</p></div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
