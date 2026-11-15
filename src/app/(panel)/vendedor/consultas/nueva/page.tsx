import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { crearConsultaManual } from "@/lib/acciones/ventas";
import { AreaTexto, BotonLink, Encabezado, Entrada, Selector, Tarjeta } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Cargar consulta" };
export default async function Nueva() {
  await exigirSucursal("vendedor");
  const us = await leer<any[]>(db().from("unidades").select("id, marca, modelo, version, sucursales(nombre)").neq("estado", "vendida").order("marca").order("modelo"));
  return (
    <>
      <Encabezado titulo="Cargar consulta" texto="Registrá las consultas que llegan por teléfono, WhatsApp, redes o en el salón, para que ninguna se pierda."><BotonLink href="/vendedor" variante="contorno">Volver a la bandeja</BotonLink></Encabezado>
      <Tarjeta className="max-w-3xl">
        <FormAccion accion={crearConsultaManual} className="grid gap-3 sm:grid-cols-2">
          <Selector etiqueta="Canal" name="canal" required opciones={[["telefono", "Teléfono"], ["whatsapp", "WhatsApp"], ["redes", "Redes sociales"], ["presencial", "Presencial"]]} />
          <Selector etiqueta="Tipo de consulta" name="tipo" required opciones={[["cotizacion", "Cotización"], ["test_drive", "Test drive"], ["general", "Consulta general"]]} />
          <Entrada etiqueta="Nombre y apellido del cliente" name="nombre" required autoComplete="off" />
          <Entrada etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" required autoComplete="off" ayuda="Con código de área, sin 0 ni 15." />
          <Entrada etiqueta="Email (opcional)" name="email" type="email" autoComplete="off" />
          <Selector etiqueta="Unidad de interés (opcional)" name="unidad" vacio="Sin unidad definida" opciones={us.map((u) => [u.id, `${u.marca} ${u.modelo} ${u.version ?? ""} · ${u.sucursales?.nombre}`] as const)} />
          <AreaTexto etiqueta="Qué consultó" name="mensaje" maxLength={600} contenedor="sm:col-span-2" />
          <div className="sm:col-span-2"><BotonEnviar variante="primario">Guardar consulta</BotonEnviar></div>
        </FormAccion>
      </Tarjeta>
    </>
  );
}
