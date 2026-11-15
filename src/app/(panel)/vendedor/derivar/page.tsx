import { exigirSucursal } from "@/lib/sesion";
import { servicios, sucursales } from "@/lib/datos";
import { derivarTurno } from "@/lib/acciones/ventas";
import { Encabezado } from "@/components/ui";
import { AsistenteTurno } from "@/components/turnos";

export const metadata = { title: "Derivar a taller" };
export default async function Derivar() {
  const s = await exigirSucursal("vendedor");
  const [srv, sucs] = await Promise.all([servicios(), sucursales()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Derivar a taller" texto="Reservá el turno del cliente en la agenda compartida. Aparece al instante en la agenda del asesor del taller." />
      <AsistenteTurno servicios={srv} sucursales={sucs} modo="empleado" origenFijo={s.sucursalId} reservar={derivarTurno} />
    </div>
  );
}
