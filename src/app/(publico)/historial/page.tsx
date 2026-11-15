import { Encabezado } from "@/components/ui";
import { ConsultaHistorial } from "./cliente";
export const metadata = { title: "Historial del vehículo" };
export default function Historial() {
  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado titulo="Historial del vehículo" texto="Services realizados, fechas, kilómetros y trabajos. Para proteger tus datos pedimos la patente y un segundo dato." />
      <ConsultaHistorial />
    </div>
  );
}
