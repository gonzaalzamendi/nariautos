import Link from "next/link";
import { historialDePatente, vehiculosDeCliente } from "@/lib/datos";
import { normalizarPatente } from "@/lib/validaciones";
import { Encabezado, Tabla, Vacio, claseBoton, claseCampo } from "./ui";
import { VistaHistorial } from "./historial";

const esPatente = (t: string) => /^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3})$/.test(t);

/** Historial para asesor y jefe de taller: se busca por patente o por nombre del cliente. */
export async function HistorialInterno({ q, base }: { q?: string; base: string }) {
  const texto = (q ?? "").trim(), p = normalizarPatente(texto);
  const h = esPatente(p) ? await historialDePatente(p) : null;
  const vehiculos = texto && !h ? await vehiculosDeCliente(texto) : [];
  return (
    <>
      <Encabezado titulo="Historial de vehículos" texto="Services y trabajos realizados en cualquier taller de la red. Buscá por patente o por nombre del cliente." />
      <form className="mb-5 flex max-w-lg items-end gap-2" role="search">
        <div className="flex-1"><label htmlFor="q" className="mb-1 block text-sm font-medium">Patente o cliente</label>
          <input id="q" name="q" defaultValue={texto} required placeholder="AB123CD o Castro" className={claseCampo} /></div>
        <button type="submit" className={claseBoton("secundario")}>Buscar historial</button>
      </form>
      {!texto ? <Vacio titulo="Ingresá una patente o un nombre" texto="Por ejemplo AB123CD, o «Castro» para ver los vehículos de ese cliente." />
        : h ? <><p className="mb-3 text-sm">Titular: <strong>{h.vehiculo.clientes?.nombre ?? "—"}</strong> · <span className="cifras">{h.vehiculo.clientes?.telefono}</span> · código del vehículo <span className="cifras font-medium">{h.vehiculo.codigo_auto}</span></p><VistaHistorial vehiculo={h.vehiculo} historial={h.historial} /></>
        : vehiculos.length > 0 ? (
          <Tabla cabeceras={["Cliente", "Patente", "Vehículo", ""]}>
            {vehiculos.map((v) => <tr key={v.patente}><td>{v.clientes.nombre}<br /><span className="cifras text-xs text-medio">{v.clientes.telefono}</span></td><td className="cifras font-medium">{v.patente}</td><td>{v.marca} {v.modelo} {v.anio}</td>
              <td><Link href={`${base}?q=${v.patente}`} className={claseBoton("contorno", true)}>Ver historial</Link></td></tr>)}
          </Tabla>
        ) : <Vacio titulo={`No encontramos vehículos para «${texto}»`} texto="Revisá que la patente esté bien escrita o probá con el apellido del cliente. Los vehículos se registran al sacar su primer turno." />}
    </>
  );
}
