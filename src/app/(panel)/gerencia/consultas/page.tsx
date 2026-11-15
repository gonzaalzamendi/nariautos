import { db, leer } from "@/lib/db";
import { exigir } from "@/lib/sesion";
import { etiqueta, fechaHora, moneda } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Tabla } from "@/components/ui";

export const metadata = { title: "Consultas de la red" };
export default async function Consultas() {
  await exigir("gerencia");
  const cs = await leer<any[]>(db().from("consultas").select("*, clientes(nombre), unidades(marca, modelo), sucursales(nombre), empleados(nombre)").neq("tipo", "test_drive").order("creado_en", { ascending: false }).limit(200));
  const vieja = (c: any) => c.estado === "nueva" && Date.now() - new Date(c.creado_en).getTime() > 24 * 3600e3;
  return (
    <>
      <Encabezado titulo="Consultas de toda la red" texto="Solo lectura. El seguimiento lo hace el vendedor de cada sucursal."><BotonLink href="/api/csv/consultas" variante="contorno" download>Exportar a CSV</BotonLink></Encabezado>
      <Tabla cabeceras={["Recibida", "Sucursal", "Cliente", "Tipo y canal", "Unidad", "Vendedor", "Estado", "Cotizado"]}>
        {cs.map((c) => (
          <tr key={c.id} className={vieja(c) ? "bg-error/5" : undefined}>
            <td className="cifras whitespace-nowrap">{fechaHora(c.creado_en)}</td><td>{c.sucursales.nombre}</td><td>{c.clientes.nombre}</td>
            <td>{etiqueta(c.tipo)}<br /><span className="text-xs text-medio">{etiqueta(c.canal)}</span></td>
            <td>{c.unidades ? `${c.unidades.marca} ${c.unidades.modelo}` : "—"}</td><td>{c.empleados?.nombre ?? <span className="text-medio">Sin asignar</span>}</td>
            <td><Insignia estado={c.estado}>{etiqueta(c.estado)}</Insignia>{vieja(c) && <><br /><span className="text-xs font-medium text-error">Sin respuesta +24 h</span></>}{c.motivo_perdida && <><br /><span className="text-xs text-medio">{c.motivo_perdida}</span></>}</td>
            <td className="cifras whitespace-nowrap">{c.precio_cotizado ? moneda(Number(c.precio_cotizado) - Number(c.bonificacion ?? 0)) : "—"}</td>
          </tr>
        ))}
      </Tabla>
    </>
  );
}
