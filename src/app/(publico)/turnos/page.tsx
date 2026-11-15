import { servicios, sucursales } from "@/lib/datos";
import { reservarTurnoWeb } from "@/lib/acciones/publico";
import { Encabezado } from "@/components/ui";
import { AsistenteTurno } from "@/components/turnos";

export const metadata = { title: "Sacar turno de taller" };
export const dynamic = "force-dynamic";

export default async function Turnos({ searchParams }: { searchParams: Promise<{ sucursal?: string }> }) {
  const [srv, sucs, sp] = await Promise.all([servicios(), sucursales(), searchParams]);
  const inicial = sucs.find((s) => String(s.id) === sp.sucursal)?.id;
  return (
    <div className="mx-auto max-w-3xl">
      <Encabezado titulo="Sacar turno de taller" texto="Sin registro ni contraseña. Al terminar recibís un código para seguir tu turno." />
      <AsistenteTurno servicios={srv} sucursales={sucs} modo="cliente" sucursalInicial={inicial} reservar={reservarTurnoWeb} />
    </div>
  );
}
