import Link from "next/link";
import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { fecha, hoyAR, sumarDias } from "@/lib/formato";
import { Encabezado } from "@/components/ui";
import { TiempoReal } from "@/components/panel-cliente";
import { PlanillaAgenda, type FilaAgenda } from "@/components/agenda-taller";

export const metadata = { title: "Agenda del taller" };
const PERIODOS = [["semana", "Semana", 7], ["mes", "Mes", 30], ["90", "90 días", 90]] as const;

export default async function Agenda({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const s = await exigirSucursal("jefe_taller");
  const { periodo } = await searchParams;
  const p = PERIODOS.find(([id]) => id === periodo) ?? PERIODOS[0];
  const desde = hoyAR(), hasta = sumarDias(desde, p[2] - 1);
  const turnos = await leer<any[]>(db().from("turnos")
    .select("id, codigo, fecha, hora, duracion_min, estado, derivado, observaciones, vehiculos(patente, marca, modelo, anio), clientes(nombre, telefono, email), servicios(nombre), origen:sucursales!turnos_sucursal_origen_id_fkey(nombre), ordenes_trabajo(id, trabajos_solicitados, asignaciones(mecanicos(nombre)))")
    .eq("sucursal_taller_id", s.sucursalId).gte("fecha", desde).lte("fecha", hasta).not("estado", "in", "(cancelado,rechazado,ausente)")
    .order("fecha").order("hora"));
  const filas: FilaAgenda[] = turnos.map((t) => {
    const o = Array.isArray(t.ordenes_trabajo) ? t.ordenes_trabajo[0] : t.ordenes_trabajo;
    const a = o && (Array.isArray(o.asignaciones) ? o.asignaciones[0] : o.asignaciones);
    return {
      id: t.id, codigo: t.codigo, fecha: t.fecha, hora: t.hora.slice(0, 5), duracion: t.duracion_min, estado: t.estado,
      vehiculo: `${t.vehiculos.marca} ${t.vehiculos.modelo}`, patente: t.vehiculos.patente, anio: t.vehiculos.anio,
      cliente: t.clientes.nombre, telefono: t.clientes.telefono, email: t.clientes.email,
      mecanico: a?.mecanicos?.nombre ?? null, servicio: t.servicios.nombre,
      problema: [o?.trabajos_solicitados, t.observaciones].filter((x, i, l) => x && l.indexOf(x) === i).join(" · ") || null,
      orden: o?.id ?? null, origen: t.derivado ? t.origen?.nombre : null,
    };
  });
  return (
    <>
      <Encabezado titulo="Agenda del taller" texto={`Turnos del ${fecha(desde)} al ${fecha(hasta)}. Tocá un turno para ver el problema y el contacto del cliente.`}><TiempoReal /></Encabezado>
      <nav aria-label="Período" className="mb-4 flex gap-1.5">
        {PERIODOS.map(([id, texto]) => (
          <Link key={id} href={`/taller/agenda?periodo=${id}`} aria-current={p[0] === id ? "true" : undefined}
            className={`inline-flex min-h-10 items-center rounded-md border px-4 text-sm ${p[0] === id ? "border-marino bg-marino text-white" : "border-borde bg-white hover:border-acero"}`}>{texto}</Link>
        ))}
      </nav>
      <PlanillaAgenda filas={filas} />
    </>
  );
}
