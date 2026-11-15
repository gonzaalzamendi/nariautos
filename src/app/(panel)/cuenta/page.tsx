import { cambiarMiPin } from "@/lib/acciones/acceso";
import { exigir } from "@/lib/sesion";
import { Encabezado, Entrada, Tarjeta } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Cambiar mi PIN" };
export default async function Cuenta() {
  const s = await exigir();
  const pin = { type: "password", inputMode: "numeric" as const, pattern: "\\d{4}", maxLength: 4, required: true, autoComplete: "off", className: "max-w-40 cifras" };
  return (
    <>
      <Encabezado titulo="Cambiar mi PIN" texto={`${s.nombre}: elegí un PIN de 4 dígitos que solo vos conozcas.`} />
      <Tarjeta className="max-w-md">
        <FormAccion accion={cambiarMiPin} limpiar className="space-y-4">
          <Entrada etiqueta="PIN actual" name="actual" {...pin} />
          <Entrada etiqueta="PIN nuevo" name="nuevo" {...pin} />
          <Entrada etiqueta="Repetir el PIN nuevo" name="repetir" {...pin} />
          <BotonEnviar>Guardar PIN nuevo</BotonEnviar>
        </FormAccion>
      </Tarjeta>
    </>
  );
}
