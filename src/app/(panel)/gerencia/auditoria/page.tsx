import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { fechaHora } from "@/lib/formato";
import { BotonLink, Encabezado, Tabla, claseBoton, claseCampo } from "@/components/ui";

export const metadata = { title: "Auditoría" };
export default async function Auditoria({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await exigir("gerencia");
  const q = ((await searchParams).q ?? "").replace(/[%_,()]/g, "").trim();
  let c = db().from("auditoria").select("*");
  if (q) c = c.or(`accion.ilike.%${q}%,empleado_nombre.ilike.%${q}%,entidad.ilike.%${q}%`);
  const [filas, intentos] = await Promise.all([
    leer<any[]>(c.order("creado_en", { ascending: false }).limit(200)),
    leer<any[]>(db().from("intentos_acceso").select("*, empleados(nombre)").eq("exitoso", false).order("creado_en", { ascending: false }).limit(10)),
  ]);
  return (
    <>
      <Encabezado titulo="Registro de auditoría" texto="Quién hizo qué y cuándo: cambios de estado y acciones sensibles."><BotonLink href="/api/csv/auditoria" variante="contorno" download>Exportar a CSV</BotonLink></Encabezado>
      <form className="mb-4 flex max-w-md items-end gap-2" role="search">
        <div className="flex-1"><label htmlFor="q" className="mb-1 block text-sm font-medium">Buscar por acción, empleado o entidad</label><input id="q" name="q" defaultValue={q} className={claseCampo} /></div>
        <button type="submit" className={claseBoton("secundario")}>Buscar registros</button>
      </form>
      <Tabla cabeceras={["Fecha y hora", "Quién", "Acción", "Entidad", "Detalle"]}>
        {filas.map((f) => (
          <tr key={f.id}><td className="cifras whitespace-nowrap">{fechaHora(f.creado_en)}</td><td>{f.empleado_nombre}</td><td className="font-medium">{f.accion}</td>
            <td>{f.entidad}{f.entidad_id && <span className="cifras text-medio"> #{f.entidad_id}</span>}</td>
            <td className="max-w-xs break-words text-xs text-medio">{f.detalle ? Object.entries(f.detalle).map(([k, v]) => `${k}: ${v}`).join(" · ") : "—"}</td></tr>
        ))}
        {filas.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-medio">No hay registros que coincidan con la búsqueda.</td></tr>}
      </Tabla>
      {intentos.length > 0 && <>
        <h2 className="mb-2 mt-6 text-xl">Últimos intentos de acceso fallidos</h2>
        <Tabla cabeceras={["Fecha y hora", "Empleado", "IP"]}>{intentos.map((i) => <tr key={i.id}><td className="cifras">{fechaHora(i.creado_en)}</td><td>{i.empleados?.nombre}</td><td className="cifras">{i.ip ?? "—"}</td></tr>)}</Tabla></>}
    </>
  );
}
