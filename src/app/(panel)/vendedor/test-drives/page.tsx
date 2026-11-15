import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { gestionarTestDrive } from "@/lib/acciones/ventas";
import { etiqueta, fecha } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Tabla, Vacio } from "@/components/ui";
import { BotonAccion } from "@/components/formularios";

export const metadata = { title: "Test drives" };
export default async function TestDrives() {
  const s = await exigirSucursal("vendedor");
  const tds = await leer<any[]>(db().from("test_drives").select("*, consultas!inner(id, sucursal_id, estado, clientes(nombre, telefono)), unidades(marca, modelo)").eq("consultas.sucursal_id", s.sucursalId).order("fecha", { ascending: false }));
  return (
    <>
      <Encabezado titulo="Test drives" texto="Pedidos de prueba de manejo de tu sucursal. Los pendientes esperan tu confirmación." />
      {tds.length === 0 ? <Vacio titulo="No hay test drives pedidos" texto="Los clientes los agendan desde la ficha de cada unidad." /> : (
        <Tabla cabeceras={["Fecha y franja", "Cliente", "Unidad", "Estado", "Acciones"]}>
          {tds.map((t) => (
            <tr key={t.id}>
              <td className="cifras whitespace-nowrap">{fecha(t.fecha)}<br /><span className="text-xs text-medio">{etiqueta(t.franja)}</span></td>
              <td>{t.consultas.clientes.nombre}<br /><span className="cifras text-xs text-medio">{t.consultas.clientes.telefono}</span></td>
              <td>{t.unidades ? `${t.unidades.marca} ${t.unidades.modelo}` : "—"}</td>
              <td><Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia></td>
              <td><div className="flex flex-wrap gap-1.5">
                {t.estado === "pendiente" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "confirmar" }} variante="primario">Confirmar test drive</BotonAccion>}
                {t.estado === "confirmado" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "realizado" }}>Marcar como realizado</BotonAccion>}
                <BotonLink href={`/vendedor/consultas/${t.consultas.id}`} variante="sutil" chico>Abrir consulta</BotonLink>
              </div></td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
