"use client";
import { eliminarEmpleado } from "@/lib/acciones/gerencia";
import { BotonAccion } from "./formularios";

/** Elimina al empleado y recarga la lista con el aviso arriba (la fila del empleado desaparece). */
export function BotonEliminarEmpleado({ id, nombre, usuario }: { id: number; nombre: string; usuario: string }) {
  return (
    <BotonAccion variante="peligro" campos={{ empleado: id }}
      confirmar={`¿Eliminar definitivamente a ${nombre} (${usuario})? No se puede deshacer. Su historial de consultas, turnos y auditoría se conserva sin su nombre.`}
      accion={async (previo, fd) => {
        const r = await eliminarEmpleado(previo, fd);
        if (r.ok) window.location.assign(`/gerencia/empleados?eliminado=${encodeURIComponent(r.datos.nombre)}`);
        return r;
      }}>Eliminar empleado</BotonAccion>
  );
}
