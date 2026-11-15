"use client";
import { startTransition, useActionState } from "react";
import { buscarHistorial } from "@/lib/acciones/publico";
import { Entrada, claseBoton } from "@/components/ui";
import { Mensajes } from "@/components/formularios";
import { VistaHistorial } from "@/components/historial";

export function ConsultaHistorial() {
  const [estado, buscar, pendiente] = useActionState(buscarHistorial, {});
  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); startTransition(() => buscar(fd)); }}
        className="grid gap-3 rounded-lg border border-borde/80 bg-white p-4 shadow-suave sm:grid-cols-[1fr_1fr_auto] sm:items-start">
        <Entrada etiqueta="Patente" name="patente" required placeholder="AB123CD" className="uppercase" />
        <Entrada etiqueta="Código del vehículo" name="codigo_auto" required maxLength={4} placeholder="TC18" className="uppercase cifras" ayuda="2 letras y 2 números. Figura en la confirmación de tu turno." />
        <input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px]" />
        <button type="submit" disabled={pendiente} className={claseBoton("secundario") + " sm:mt-6"}>{pendiente ? "Buscando…" : "Ver historial"}</button>
        {estado.error && <div className="sm:col-span-3"><Mensajes estado={estado} /></div>}
      </form>
      {estado.datos && <VistaHistorial vehiculo={estado.datos.vehiculo} historial={estado.datos.historial} />}
    </div>
  );
}
