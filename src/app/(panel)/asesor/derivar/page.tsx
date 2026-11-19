import { exigirAsesor } from "@/lib/sesion";
import { servicios, sucursales } from "@/lib/datos";
import { derivarTurno } from "@/lib/acciones/ventas";
import { Encabezado } from "@/components/ui";
import { AsistenteTurno } from "@/components/turnos";

export const metadata = { title: "Nuevo turno" };
export default async function Nuevo() {
  const s = await exigirAsesor();
  const [srv, sucs] = await Promise.all([servicios(), sucursales()]);
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Nuevo turno" texto="Cargá el turno de un cliente que llama, escribe o se acerca. Al terminar podés enviarle los datos por WhatsApp o email." />
      <AsistenteTurno servicios={srv} sucursales={sucs} modo="empleado" tallerFijo={s.sucursalId} origenFijo={s.origenId} reservar={derivarTurno} />
    </div>
  );
}
