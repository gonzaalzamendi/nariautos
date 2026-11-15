import { historialDePatente } from "@/lib/datos";
import { normalizarPatente } from "@/lib/validaciones";
import { Encabezado, Vacio, claseBoton, claseCampo } from "./ui";
import { VistaHistorial } from "./historial";

export async function HistorialInterno({ patente }: { patente?: string }) {
  const p = normalizarPatente(patente);
  const h = p ? await historialDePatente(p) : null;
  return (
    <>
      <Encabezado titulo="Historial por patente" texto="Services y trabajos realizados en cualquier taller de la red." />
      <form className="mb-5 flex max-w-md items-end gap-2" role="search">
        <div className="flex-1"><label htmlFor="patente" className="mb-1 block text-sm font-medium">Patente</label>
          <input id="patente" name="patente" defaultValue={p} required placeholder="AB123CD" className={claseCampo + " uppercase"} /></div>
        <button type="submit" className={claseBoton("secundario")}>Buscar historial</button>
      </form>
      {!p ? <Vacio titulo="Ingresá una patente" texto="Por ejemplo AB123CD, uno de los vehículos de prueba." />
        : !h ? <Vacio titulo={`No hay un vehículo registrado con la patente ${p}`} texto="Revisá que esté bien escrita. Los vehículos se registran al sacar su primer turno." />
        : <><p className="mb-3 text-sm">Titular: <strong>{h.vehiculo.clientes?.nombre ?? "—"}</strong> · <span className="cifras">{h.vehiculo.clientes?.telefono}</span></p><VistaHistorial vehiculo={h.vehiculo} historial={h.historial} /></>}
    </>
  );
}
