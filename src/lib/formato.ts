export const ZONA = "America/Argentina/Buenos_Aires";

export const moneda = (n: number | string | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n));
export const numero = (n: number | string | null | undefined, dec = 0) =>
  n == null ? "—" : new Intl.NumberFormat("es-AR", { maximumFractionDigits: dec }).format(Number(n));

/** 'YYYY-MM-DD' → '15/11/2026' (sin corrimientos de zona horaria). */
export function fecha(f: string | null | undefined): string {
  if (!f) return "—";
  const [a, m, d] = f.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
export function fechaLarga(f: string): string {
  const [a, m, d] = f.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(a, m - 1, d)));
}
export const hora = (h: string | null | undefined) => (h ? h.slice(0, 5) : "—");
export function fechaHora(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZONA, hour12: false }).format(new Date(ts));
}
/** Fecha de hoy en Argentina como 'YYYY-MM-DD'. */
export function hoyAR(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
}
export function sumarDias(f: string, n: number): string {
  const [a, m, d] = f.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + n)).toISOString().slice(0, 10);
}
export const diaSemana = (f: string) => { const [a, m, d] = f.split("-").map(Number); return new Date(Date.UTC(a, m - 1, d)).getUTCDay(); };

export function distanciaKm(a: { lat: number | string | null; lng: number | string | null }, b: { lat: number | string | null; lng: number | string | null }): number | null {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const r = (x: number) => (x * Math.PI) / 180, [la1, lo1, la2, lo2] = [Number(a.lat), Number(a.lng), Number(b.lat), Number(b.lng)];
  const h = Math.sin(r(la2 - la1) / 2) ** 2 + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.sin(r(lo2 - lo1) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)) * 1.25 * 10) / 10; // factor 1,25: recorrido por ruta aproximado
}

export const ETIQUETA: Record<string, string> = {
  // turnos
  solicitado: "Solicitado", confirmado: "Confirmado", recibido: "Recibido", en_reparacion: "En reparación", listo: "Listo para retirar",
  entregado: "Entregado", cancelado: "Cancelado", rechazado: "Rechazado", ausente: "No se presentó",
  // consultas
  nueva: "Nueva", en_seguimiento: "En seguimiento", cotizada: "Cotizada", test_drive_agendado: "Test drive agendado", ganada: "Ganada", perdida: "Perdida",
  cotizacion: "Cotización", test_drive: "Test drive", general: "Consulta general",
  web: "Web", telefono: "Teléfono", whatsapp: "WhatsApp", presencial: "Presencial",
  // unidades
  disponible: "Disponible", reservada: "Reservada", vendida: "Vendida", "0km": "0 km", usado: "Usado",
  nafta: "Nafta", diesel: "Diésel", hibrido: "Híbrido", electrico: "Eléctrico", gnc: "GNC", manual: "Manual", automatica: "Automática",
  // órdenes
  pendiente: "Pendiente de asignar", asignada: "Asignada", espera_repuestos: "En espera de repuestos", terminada: "Terminada", cerrada: "Cerrada",
  realizado: "Realizado",
  activa: "Activa", vencida: "Vencida", cancelada: "Cancelada", concretada: "Concretada", solicitada: "Solicitada", aprobada: "Aprobada", rechazada: "Rechazada",
  respondida: "Respondida", enviada: "Enviada", excelente: "Excelente", muy_bueno: "Muy bueno", bueno: "Bueno", regular: "Regular",
  recordatorio_turno: "Recordatorio de turno", recordatorio_service: "Próximo service", estado: "Aviso de estado", encuesta: "Encuesta",
  vendedor: "Vendedor", asesor: "Asesor de servicio", jefe_taller: "Jefe de taller", gerencia: "Gerencia",
};
export const etiqueta = (c: string | null | undefined) => (c ? ETIQUETA[c] ?? c : "—");

export const linkWhatsApp = (telefono: string, mensaje: string) => `https://wa.me/549${telefono.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(mensaje)}`;
export const linkEmail = (email: string, asunto: string, mensaje: string) => `mailto:${email}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(mensaje)}`;

/** Cuota mensual por sistema francés. tasa: TNA en %. */
export function cuotaFrances(monto: number, cuotas: number, tna: number): number {
  const i = tna / 100 / 12;
  return i === 0 ? monto / cuotas : (monto * i) / (1 - Math.pow(1 + i, -cuotas));
}

export function hace(ts: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 60000));
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  const d = Math.round(min / 1440);
  return d === 1 ? "hace 1 día" : `hace ${d} días`;
}
