import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { alternarEmpleado, cambiarPinEmpleado, guardarEmpleado } from "@/lib/acciones/gerencia";
import { etiqueta, fechaHora } from "@/lib/formato";
import { BotonLink, Encabezado, Entrada, Insignia, Selector, Tabla, Tarjeta } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Empleados" };
const ROLES = [["vendedor", "Vendedor"], ["asesor", "Asesor de servicio"], ["jefe_taller", "Jefe de taller"], ["gerencia", "Gerencia"]] as const;
const PIN = { type: "password", inputMode: "numeric" as const, pattern: "\\d{4}", maxLength: 4, autoComplete: "new-password", className: "cifras" };

export default async function Empleados() {
  const s = await exigir("gerencia");
  const [es, sucs, mecs] = await Promise.all([
    leer<any[]>(db().from("empleados").select("id, nombre, usuario, rol, sucursal_id, activo, bloqueado_hasta, pin_cambiado_en, sucursales(nombre)").order("activo", { ascending: false }).order("nombre")),
    leer<any[]>(db().from("sucursales").select("id, nombre").order("id")),
    leer<any[]>(db().from("mecanicos").select("*, sucursales(nombre)").order("sucursal_id").order("nombre")),
  ]);
  const opSuc = sucs.map((x) => [x.id, x.nombre] as const);
  const Form = ({ e }: { e?: any }) => (
    <FormAccion accion={guardarEmpleado} ocultos={{ id: e?.id }} limpiar={!e} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <Entrada etiqueta="Nombre y apellido" name="nombre" id={`n-${e?.id ?? 0}`} required defaultValue={e?.nombre} autoComplete="off" />
      <Entrada etiqueta="Usuario" name="usuario" id={`u-${e?.id ?? 0}`} required defaultValue={e?.usuario} autoComplete="off" autoCapitalize="none" placeholder="nombre.apellido" />
      <Selector etiqueta="Rol" name="rol" id={`r-${e?.id ?? 0}`} required defaultValue={e?.rol ?? "vendedor"} opciones={ROLES} />
      <Selector etiqueta="Sucursal" name="sucursal" id={`s-${e?.id ?? 0}`} defaultValue={e?.sucursal_id ?? ""} vacio="Toda la red (solo gerencia)" opciones={opSuc} />
      {!e && <Entrada etiqueta="PIN inicial (4 dígitos)" name="pin" id="pin-nuevo" required {...PIN} />}
      <div><BotonEnviar variante={e ? "secundario" : "primario"}>{e ? "Guardar cambios" : "Dar de alta al empleado"}</BotonEnviar></div>
    </FormAccion>
  );
  return (
    <>
      <Encabezado titulo="Empleados" texto="Alta, usuario, rol, sucursal y PIN. El PIN se guarda cifrado y vence cada 3 meses (salvo Gerencia)."><BotonLink href="/api/csv/empleados" variante="contorno" download>Exportar a CSV</BotonLink></Encabezado>
      <Tarjeta titulo="Nuevo empleado" className="mb-5"><Form /></Tarjeta>
      <Tabla cabeceras={["Empleado", "Rol", "Sucursal", "Estado", "Acciones"]}>
        {es.map((e) => { const bloq = e.bloqueado_hasta && new Date(e.bloqueado_hasta) > new Date(); return (
          <tr key={e.id}>
            <td className="font-medium">{e.nombre}<br /><span className="cifras text-xs font-normal text-medio">{e.usuario}</span></td><td>{etiqueta(e.rol)}</td><td>{e.sucursales?.nombre ?? "Toda la red"}</td>
            <td><Insignia tono={e.activo ? "exito" : "neutro"}>{e.activo ? "Activo" : "Inactivo"}</Insignia>{bloq && <><br /><span className="cifras text-xs text-error">Bloqueado hasta {fechaHora(e.bloqueado_hasta).slice(-5)} h</span></>}{e.rol !== "gerencia" && Date.now() - new Date(e.pin_cambiado_en).getTime() > 91 * 864e5 && <><br /><span className="text-xs text-alerta-texto">PIN vencido: debe cambiarlo al ingresar</span></>}</td>
            <td className="min-w-72">
              <details><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Editar datos y PIN</summary>
                <div className="mt-2 space-y-4 rounded-md border border-borde p-3">
                  <Form e={e} />
                  <FormAccion accion={cambiarPinEmpleado} ocultos={{ empleado: e.id }} limpiar className="flex items-end gap-2 border-t border-borde/70 pt-3">
                    <Entrada etiqueta="PIN nuevo" name="pin" id={`p-${e.id}`} required {...PIN} contenedor="w-32" /><BotonEnviar variante="contorno">Cambiar PIN</BotonEnviar>
                  </FormAccion>
                  {e.id !== s.id && <BotonAccion accion={alternarEmpleado} campos={{ empleado: e.id }} variante={e.activo ? "peligro" : "contorno"} confirmar={e.activo ? `¿Desactivar a ${e.nombre}? No va a poder ingresar al sistema.` : undefined}>{e.activo ? "Desactivar empleado" : "Reactivar empleado"}</BotonAccion>}
                </div></details>
            </td>
          </tr>); })}
      </Tabla>
      <Tarjeta titulo="Mecánicos (registros asignables, sin acceso al sistema)" className="mt-5">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{mecs.map((m) => <li key={m.id} className="text-sm"><strong>{m.nombre}</strong> · {m.sucursales.nombre}<br /><span className="text-xs text-medio">{m.especialidad}</span></li>)}</ul>
      </Tarjeta>
    </>
  );
}
