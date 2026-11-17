import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { crearTestDrive, gestionarTestDrive } from "@/lib/acciones/ventas";
import { etiqueta, fecha, fechaLarga, hora, hoyAR, linkWhatsApp } from "@/lib/formato";
import { BotonEmail } from "@/components/email";
import { BotonLink, Encabezado, Entrada, Insignia, Selector, Tabla, Tarjeta, Vacio } from "@/components/ui";
import { BotonAccion, BotonEnviar, FormAccion } from "@/components/formularios";
import { CamposCliente } from "@/components/campos-cliente";

export const metadata = { title: "Test drives" };
export default async function TestDrives() {
  const s = await exigirSucursal("vendedor");
  const [tds, us] = await Promise.all([
    leer<any[]>(db().from("test_drives").select("*, consultas!inner(id, sucursal_id, canal, clientes(nombre, telefono, email)), unidades(marca, modelo, version)").eq("consultas.sucursal_id", s.sucursalId).order("fecha", { ascending: false }).order("hora")),
    leer<any[]>(db().from("unidades").select("id, marca, modelo, version").eq("sucursal_id", s.sucursalId).neq("estado", "vendida").order("marca").order("modelo")),
  ]);
  const aviso = (t: any) => `Hola ${t.consultas.clientes.nombre.split(" ")[0]}, te escribe ${s.nombre} de NariAutos. Tu test drive${t.unidades ? ` de ${t.unidades.marca} ${t.unidades.modelo}` : ""} ${t.estado === "confirmado" ? "quedó confirmado" : "está agendado"} para el ${fechaLarga(t.fecha)} a las ${hora(t.hora)} h.`;
  return (
    <>
      <Encabezado titulo="Test drives" texto="Todas las pruebas de manejo de tu sucursal: las que piden los clientes desde la web y las que agendás vos. El día y el horario se pueden ajustar libremente." />
      <Tarjeta titulo="Agendar un test drive" className="mb-5">
        <FormAccion accion={crearTestDrive} limpiar className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Selector etiqueta="Unidad" name="unidad" required vacio="Elegí una unidad" opciones={us.map((u) => [u.id, `${u.marca} ${u.modelo} ${u.version ?? ""}`] as const)} />
          <Entrada etiqueta="Fecha" name="fecha" type="date" min={hoyAR()} required />
          <Entrada etiqueta="Horario" name="hora" type="time" step={300} required defaultValue="10:00" />
          <CamposCliente />
          <div className="sm:col-span-2 lg:col-span-3"><BotonEnviar variante="primario">Agendar test drive</BotonEnviar></div>
        </FormAccion>
      </Tarjeta>
      {tds.length === 0 ? <Vacio titulo="No hay test drives pedidos" texto="Los clientes los piden desde la ficha de cada unidad, o los agendás con el formulario de arriba." /> : (
        <Tabla cabeceras={["Día y horario", "Cliente", "Unidad", "Estado", "Acciones"]}>
          {tds.map((t) => { const c = t.consultas.clientes, abierto = ["pendiente", "confirmado"].includes(t.estado); return (
            <tr key={t.id}>
              <td className="cifras whitespace-nowrap font-medium">{fecha(t.fecha)}<br />{hora(t.hora)} h</td>
              <td>{c.nombre}<br /><span className="cifras text-xs text-medio">{c.telefono}{c.email && <><br />{c.email}</>}<br />{etiqueta(t.consultas.canal)}</span></td>
              <td>{t.unidades ? `${t.unidades.marca} ${t.unidades.modelo}` : "—"}<br /><span className="text-xs text-medio">{t.unidades?.version}</span></td>
              <td><Insignia estado={t.estado}>{etiqueta(t.estado)}</Insignia></td>
              <td className="min-w-72">
                <div className="flex flex-wrap gap-1.5">
                  {t.estado === "pendiente" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "confirmar" }} variante="primario">Confirmar test drive</BotonAccion>}
                  {t.estado === "confirmado" && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "realizado" }} variante="secundario">Marcar como realizado</BotonAccion>}
                  {abierto && <BotonLink chico variante="contorno" target="_blank" rel="noreferrer" href={linkWhatsApp(c.telefono, aviso(t))}>Avisar por WhatsApp</BotonLink>}
                  {abierto && c.email && <BotonEmail email={c.email} asunto="Tu test drive en NariAutos" mensaje={aviso(t)} />}
                  {abierto && <BotonAccion accion={gestionarTestDrive} campos={{ test: t.id, accion: "cancelar" }} variante="peligro" confirmar={`¿Cancelar el test drive de ${c.nombre}?`}>Cancelar test drive</BotonAccion>}
                </div>
                {abierto && (
                  <details className="mt-1"><summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-medium text-acero">Cambiar día u horario</summary>
                    <FormAccion accion={gestionarTestDrive} ocultos={{ test: t.id, accion: "reprogramar" }} className="mt-2 flex flex-wrap items-end gap-2">
                      <Entrada etiqueta="Fecha" name="fecha" id={`f-${t.id}`} type="date" min={hoyAR()} required defaultValue={t.fecha} />
                      <Entrada etiqueta="Horario" name="hora" id={`h-${t.id}`} type="time" step={300} required defaultValue={hora(t.hora)} />
                      <BotonEnviar chico variante="contorno">Guardar nuevo horario</BotonEnviar>
                    </FormAccion>
                  </details>
                )}
              </td>
            </tr>); })}
        </Tabla>
      )}
    </>
  );
}
