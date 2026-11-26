"use client";
import { eliminarUnidad } from "@/lib/acciones/ventas";
import { BotonAccion } from "./formularios";

/** Elimina la unidad y vuelve al stock con el aviso arriba. */
export function BotonEliminarUnidad({ id, nombre, chico }: { id: number; nombre: string; chico?: boolean }) {
  return (
    <BotonAccion variante="peligro" chico={chico} campos={{ unidad: id }}
      confirmar={`¿Eliminar definitivamente ${nombre} del stock? Se borran también sus fotos, reservas y transferencias. No se puede deshacer.`}
      accion={async (previo, fd) => {
        const r = await eliminarUnidad(previo, fd);
        if (r.ok) window.location.assign(`/gerencia/unidades?eliminada=${encodeURIComponent(r.datos.nombre)}`);
        return r;
      }}>Eliminar unidad</BotonAccion>
  );
}
