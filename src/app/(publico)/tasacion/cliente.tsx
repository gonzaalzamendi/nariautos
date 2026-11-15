"use client";
import { solicitarTasacion } from "@/lib/acciones/publico";
import { AreaTexto, Entrada, Selector } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";
import { SelectorFotos } from "@/components/fotos";

export function FormTasacion({ sucursales, unidad }: { sucursales: (readonly [number, string])[]; unidad: any }) {
  return (
    <FormAccion accion={solicitarTasacion} limpiar ocultos={{ unidad_interes: unidad?.id }} className="space-y-5 rounded-lg border border-borde/80 bg-white p-5 shadow-suave">
      {unidad && <p className="rounded-md bg-fondo px-3 py-2 text-sm">Como parte de pago de: <strong>{unidad.marca} {unidad.modelo} {unidad.version}</strong></p>}
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="titulo mb-2 text-lg">Tu usado</legend>
        <Entrada etiqueta="Marca" name="marca" required /><Entrada etiqueta="Modelo" name="modelo" required />
        <Entrada etiqueta="Año" name="anio" type="number" inputMode="numeric" min={1980} max={2030} required />
        <Entrada etiqueta="Kilómetros" name="km" type="number" inputMode="numeric" min={0} required />
        <Selector etiqueta="Estado general" name="estado_general" required opciones={[["excelente", "Excelente"], ["muy_bueno", "Muy bueno"], ["bueno", "Bueno"], ["regular", "Regular"]]} defaultValue="muy_bueno" />
        <Selector etiqueta="Sucursal donde querés que lo vean" name="sucursal" required opciones={sucursales} defaultValue={unidad?.sucursal_id} />
        <AreaTexto etiqueta="Comentarios (opcional)" name="comentarios" maxLength={600} placeholder="Dueños anteriores, services, detalles a tener en cuenta." contenedor="sm:col-span-2" />
        <div className="sm:col-span-2"><SelectorFotos maximo={3} etiqueta="Fotos del vehículo (opcional)" /></div>
      </fieldset>
      <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="titulo mb-2 text-lg">Tus datos</legend>
        <Entrada etiqueta="Nombre y apellido" name="nombre" required autoComplete="name" />
        <Entrada etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" required autoComplete="tel" ayuda="Con código de área, sin 0 ni 15." />
        <Entrada etiqueta="Email (opcional)" name="email" type="email" autoComplete="email" />
      </fieldset>
      <BotonEnviar variante="primario">Solicitar tasación</BotonEnviar>
    </FormAccion>
  );
}
