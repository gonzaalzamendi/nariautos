import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { etiqueta, fecha, fechaHora } from "@/lib/formato";
import { Encabezado, Insignia, Tarjeta, Vacio } from "@/components/ui";
import { BotonesAviso } from "@/components/taller-cliente";

export const metadata = { title: "Recordatorios" };
export default async function Recordatorios() {
  const s = await exigirSucursal("asesor");
  await db().rpc("mantenimiento"); // genera la cola: turnos de las próximas 24 h y próximos services
  const sel = "*, clientes(nombre, telefono, email), vehiculos(patente)";
  const [pend, env] = await Promise.all([
    leer<any[]>(db().from("notificaciones").select(sel).eq("sucursal_id", s.sucursalId).eq("estado", "pendiente").order("programada_para")),
    leer<any[]>(db().from("notificaciones").select(sel).eq("sucursal_id", s.sucursalId).eq("estado", "enviada").order("enviada_en", { ascending: false }).limit(15)),
  ]);
  return (
    <>
      <Encabezado titulo="Recordatorios" texto="Cola automática: turnos de las próximas 24 horas, próximos services según fecha y kilómetros, y encuestas de satisfacción." />
      {pend.length === 0 ? <Vacio titulo="No hay recordatorios pendientes" texto="La cola se arma sola: vuelve a llenarse el día anterior a cada turno y cuando a un vehículo le corresponde el próximo service." /> : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {pend.map((n) => (
            <li key={n.id}><Tarjeta>
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium">{n.clientes.nombre} <span className="cifras font-normal text-medio">· {n.vehiculos?.patente}</span></p><Insignia tono={n.tipo === "recordatorio_turno" ? "alerta" : n.tipo === "encuesta" ? "dorado" : "info"}>{etiqueta(n.tipo)}</Insignia></div>
              <p className="my-3 rounded-md bg-fondo px-3 py-2 text-sm">{n.mensaje.replace("{SITIO}", "nuestra web")}</p>
              <p className="cifras mb-2 text-xs text-medio">Programado para el {fecha(n.programada_para)}</p>
              <BotonesAviso telefono={n.clientes.telefono} email={n.clientes.email} mensaje={n.mensaje} notificacion={n.id} />
            </Tarjeta></li>
          ))}
        </ul>
      )}
      {env.length > 0 && <Tarjeta titulo="Últimos avisos enviados" className="mt-6">
        <ul className="divide-y divide-borde/60">{env.map((n) => <li key={n.id} className="py-2 text-sm"><span className="cifras text-xs text-medio">{fechaHora(n.enviada_en)} · {n.canal === "whatsapp" ? "WhatsApp" : "Email"} · {etiqueta(n.tipo)}</span><br />{n.clientes.nombre}: {n.mensaje.replace("{SITIO}", "nuestra web")}</li>)}</ul>
      </Tarjeta>}
    </>
  );
}
