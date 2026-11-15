import { cambiarMiPin } from "@/lib/acciones/acceso";
import { sesionObligatoria } from "@/lib/sesion";
import { db } from "@/lib/db";
import { fecha } from "@/lib/formato";
import { Encabezado, Entrada, Tarjeta } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Cambiar mi PIN" };
export default async function Cuenta() {
  const s = await sesionObligatoria();
  const { data: e } = await db().from("empleados").select("usuario, pin_cambiado_en").eq("id", s.id).single();
  const vence = e ? new Date(new Date(e.pin_cambiado_en).setMonth(new Date(e.pin_cambiado_en).getMonth() + 3)).toISOString().slice(0, 10) : null;
  const pin = { type: "password", inputMode: "numeric" as const, pattern: "\\d{4}", maxLength: 4, required: true, autoComplete: "off", className: "max-w-40 cifras" };
  return (
    <>
      <Encabezado titulo="Cambiar mi PIN" texto={`${s.nombre} · usuario ${e?.usuario}. Elegí un PIN de 4 dígitos que solo vos conozcas.`} />
      {s.cambiarPin && <p role="alert" className="mb-4 max-w-md rounded-md border border-alerta/40 bg-alerta/10 px-3 py-2 text-sm text-alerta-texto">Tu PIN tiene más de 3 meses. Para seguir usando el sistema tenés que cambiarlo ahora.</p>}
      <Tarjeta className="max-w-md">
        <FormAccion accion={cambiarMiPin} limpiar className="space-y-4">
          <Entrada etiqueta="PIN actual" name="actual" {...pin} />
          <Entrada etiqueta="PIN nuevo" name="nuevo" {...pin} />
          <Entrada etiqueta="Repetir el PIN nuevo" name="repetir" {...pin} />
          <BotonEnviar>Guardar PIN nuevo</BotonEnviar>
        </FormAccion>
        <p className="mt-4 text-xs text-medio">{s.rol === "gerencia" ? "El PIN de Gerencia no tiene vencimiento." : !s.cambiarPin && vence ? `El PIN se renueva cada 3 meses. El actual vence el ${fecha(vence)}.` : "El PIN se renueva cada 3 meses."}</p>
      </Tarjeta>
    </>
  );
}
