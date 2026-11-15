import "server-only";
import { db } from "./db";
import type { Sesion } from "./tipos";

export type Alerta = { texto: string; href: string };
const contar = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
const cab = { count: "exact" as const, head: true };

/** Alertas internas (campanita) según el rol. */
export async function alertasDe(s: Sesion): Promise<Alerta[]> {
  const d = db(), a: Alerta[] = [], suc = s.sucursalId ?? 0;
  const agregar = (n: number, uno: string, varios: string, href: string) => { if (n > 0) a.push({ texto: n === 1 ? uno : varios.replace("#", String(n)), href }); };
  const en24 = new Date(Date.now() + 24 * 3600e3).toISOString(), hace24 = new Date(Date.now() - 24 * 3600e3).toISOString();
  if (s.rol === "vendedor") {
    const [nuevas, reservas, transf, tasac] = await Promise.all([
      contar(d.from("consultas").select("id", cab).eq("sucursal_id", suc).eq("estado", "nueva")),
      contar(d.from("reservas_unidad").select("id", cab).eq("vendedor_id", s.id).eq("estado", "activa").lt("vence_en", en24)),
      contar(d.from("transferencias_unidad").select("id", cab).eq("origen_id", suc).eq("estado", "solicitada")),
      contar(d.from("tasaciones").select("id", cab).eq("sucursal_id", suc).eq("estado", "pendiente")),
    ]);
    agregar(nuevas, "1 consulta nueva sin atender", "# consultas nuevas sin atender", "/vendedor");
    agregar(reservas, "1 reserva vence en menos de 24 h", "# reservas vencen en menos de 24 h", "/vendedor/unidades");
    agregar(transf, "1 pedido de transferencia para aprobar", "# pedidos de transferencia para aprobar", "/vendedor/stock");
    agregar(tasac, "1 tasación pendiente de respuesta", "# tasaciones pendientes de respuesta", "/vendedor/tasaciones");
  } else if (s.rol === "asesor") {
    const [deriv, solic, record] = await Promise.all([
      contar(d.from("turnos").select("id", cab).eq("sucursal_taller_id", suc).eq("estado", "solicitado").eq("derivado", true)),
      contar(d.from("turnos").select("id", cab).eq("sucursal_taller_id", suc).eq("estado", "solicitado").eq("derivado", false)),
      contar(d.from("notificaciones").select("id", cab).eq("sucursal_id", suc).eq("estado", "pendiente")),
    ]);
    agregar(deriv, "1 turno derivado entrante por confirmar", "# turnos derivados entrantes por confirmar", "/asesor?vista=pendientes");
    agregar(solic, "1 turno solicitado por confirmar", "# turnos solicitados por confirmar", "/asesor?vista=pendientes");
    agregar(record, "1 recordatorio pendiente de envío", "# recordatorios pendientes de envío", "/asesor/recordatorios");
  } else if (s.rol === "jefe_taller") {
    const [dem, pend] = await Promise.all([
      contar(d.from("v_ordenes").select("id", cab).eq("sucursal_taller_id", suc).eq("demorado", true).in("estado", ["en_reparacion", "espera_repuestos"])),
      contar(d.from("v_ordenes").select("id", cab).eq("sucursal_taller_id", suc).eq("estado", "pendiente")),
    ]);
    agregar(dem, "1 trabajo demorado", "# trabajos demorados", "/taller/demorados");
    agregar(pend, "1 orden pendiente de asignar", "# órdenes pendientes de asignar", "/taller");
  } else {
    const [transf, dem, viejas] = await Promise.all([
      contar(d.from("transferencias_unidad").select("id", cab).eq("estado", "solicitada")),
      contar(d.from("v_ordenes").select("id", cab).eq("demorado", true).in("estado", ["en_reparacion", "espera_repuestos"])),
      contar(d.from("consultas").select("id", cab).eq("estado", "nueva").lt("creado_en", hace24)),
    ]);
    agregar(transf, "1 transferencia de unidad por resolver", "# transferencias de unidades por resolver", "/gerencia/transferencias");
    agregar(dem, "1 trabajo demorado en la red", "# trabajos demorados en la red", "/gerencia");
    agregar(viejas, "1 consulta sin respuesta hace más de 24 h", "# consultas sin respuesta hace más de 24 h", "/gerencia/consultas");
  }
  return a;
}
