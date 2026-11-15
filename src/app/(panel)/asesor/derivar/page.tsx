import { exigirSucursal } from "@/lib/sesion";
import { servicios, sucursales } from "@/lib/datos";
import { derivarTurno } from "@/lib/acciones/ventas";
import { Encabezado } from "@/components/ui";
import { AsistenteTurno } from "@/components/turnos";

export const metadata = { title: "Nuevo turno" };
export default async function Nuevo() {
  const s = await exigirSucursal("asesor");
  const [srv, sucs] = await Promise.all([servicios(), sucursales()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Nuevo turno" texto="Cargá el turno de un cliente que llama o se acerca al taller. Queda reservado en la agenda compartida." />
      <AsistenteTurno servicios={srv} sucursales={sucs} modo="empleado" origenFijo={s.sucursalId} reservar={derivarTurno} />
    </div>
  );
}
