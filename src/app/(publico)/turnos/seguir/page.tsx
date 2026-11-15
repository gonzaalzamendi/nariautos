import { Encabezado } from "@/components/ui";
import { Seguimiento } from "./cliente";
export const metadata = { title: "Seguir mi turno" };
export default function Seguir() {
  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado titulo="Seguir mi turno" texto="Ingresá la patente y el código que recibiste al reservar. Así nadie más puede ver tus datos." />
      <Seguimiento />
    </div>
  );
}
