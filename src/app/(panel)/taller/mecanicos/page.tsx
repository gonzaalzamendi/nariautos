import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { alternarMecanico, guardarMecanico } from "@/lib/acciones/taller";
import { Encabezado, Entrada, Insignia, Tabla, Tarjeta } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Mecánicos" };
export default async function Mecanicos() {
  const s = await exigirSucursal("jefe_taller");
  const [mecs, ordenes] = await Promise.all([
    leer<any[]>(db().from("mecanicos").select("*").eq("sucursal_id", s.sucursalId).order("activo", { ascending: false }).order("nombre")),
    leer<any[]>(db().from("v_ordenes").select("mecanico_id, estado").eq("sucursal_taller_id", s.sucursalId).in("estado", ["asignada", "en_reparacion", "espera_repuestos"])),
  ]);
  const Form = ({ m }: { m?: any }) => (
    <FormAccion accion={guardarMecanico} ocultos={{ id: m?.id }} limpiar={!m} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <Entrada etiqueta="Nombre y apellido" name="nombre" id={`mn-${m?.id ?? 0}`} required defaultValue={m?.nombre} autoComplete="off" />
      <Entrada etiqueta="Especialidad" name="especialidad" id={`me-${m?.id ?? 0}`} defaultValue={m?.especialidad ?? ""} placeholder="Ej.: Mecánica general" />
      <div><BotonEnviar variante={m ? "secundario" : "primario"}>{m ? "Guardar cambios" : "Agregar mecánico"}</BotonEnviar></div>
    </FormAccion>
  );
  return (
    <>
      <Encabezado titulo="Mecánicos" texto="Equipo de tu taller. Los mecánicos no ingresan al sistema: son los nombres a los que les asignás los trabajos." />
      <Tarjeta titulo="Nuevo mecánico" className="mb-5"><Form /></Tarjeta>
      <Tabla cabeceras={["Mecánico", "Especialidad", "Trabajos en curso", "Estado", "Acciones"]}>
        {mecs.map((m) => (
          <tr key={m.id}>
            <td className="font-medium">{m.nombre}</td><td>{m.especialidad ?? "—"}</td><td className="cifras">{ordenes.filter((o) => o.mecanico_id === m.id).length}</td>
            <td><Insignia tono={m.activo ? "exito" : "neutro"}>{m.activo ? "Activo" : "Inactivo"}</Insignia></td>
            <td className="min-w-64"><BotonAccion accion={alternarMecanico} campos={{ mecanico: m.id }} variante={m.activo ? "peligro" : "contorno"} confirmar={m.activo ? `¿Dar de baja a ${m.nombre}? No va a aparecer para asignarle trabajos.` : undefined}>{m.activo ? "Dar de baja" : "Reactivar mecánico"}</BotonAccion>
              <details className="mt-1"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar datos</summary><div className="mt-2 rounded-md border border-borde p-3"><Form m={m} /></div></details></td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
