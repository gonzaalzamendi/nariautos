import { db } from "@/lib/db";
import { sesionActual, auditar } from "@/lib/sesion";

// Exportación a CSV (solo Gerencia). Lista cerrada de tablas y columnas: nunca se exporta pin_hash.
const TABLAS: Record<string, { fuente: string; columnas: string; orden?: string }> = {
  ventas: { fuente: "unidades", columnas: "id, marca, modelo, version, anio, condicion, precio, precio_venta, fecha_venta, sucursales(nombre)", orden: "fecha_venta" },
  stock: { fuente: "unidades", columnas: "id, marca, modelo, version, anio, km, condicion, precio, estado, fecha_ingreso, sucursales(nombre)", orden: "fecha_ingreso" },
  consultas: { fuente: "consultas", columnas: "id, tipo, canal, estado, motivo_perdida, precio_cotizado, bonificacion, creado_en, primera_respuesta_en, cerrada_en, sucursales(nombre), clientes(nombre)", orden: "creado_en" },
  turnos: { fuente: "turnos", columnas: "id, codigo, fecha, hora, estado, canal_origen, derivado, duracion_min, servicios(nombre), vehiculos(patente)", orden: "fecha" },
  derivaciones: { fuente: "v_kpi_derivaciones", columnas: "*", orden: "mes" },
  demoras: { fuente: "v_ordenes", columnas: "id, fecha, patente, servicio, mecanico, minutos_estimados, minutos_reales, demorado, motivo_demora, estado", orden: "fecha" },
  encuestas: { fuente: "encuestas", columnas: "id, puntaje, comentario, creado_en, turnos(codigo)", orden: "creado_en" },
  empleados: { fuente: "empleados", columnas: "id, nombre, rol, activo, creado_en, sucursales(nombre)", orden: "nombre" },
  auditoria: { fuente: "auditoria", columnas: "id, creado_en, empleado_nombre, accion, entidad, entidad_id, detalle", orden: "creado_en" },
  unidades: { fuente: "unidades", columnas: "id, marca, modelo, version, anio, km, condicion, precio, estado, fecha_ingreso, fecha_venta, sucursales(nombre)", orden: "id" },
};
const celda = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") { const vals = Object.values(v as object); v = vals.length === 1 ? vals[0] : JSON.stringify(v); }
  let s = String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas al abrir en planillas
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request, { params }: { params: Promise<{ tabla: string }> }) {
  const s = await sesionActual();
  if (!s || s.rol !== "gerencia") return new Response("No autorizado", { status: 403 });
  const nombre = (await params).tabla, t = TABLAS[nombre];
  if (!t) return new Response("Tabla no disponible", { status: 404 });
  const suc = new URL(req.url).searchParams.get("sucursal");
  let q = db().from(t.fuente).select(t.columnas).limit(5000);
  if (nombre === "ventas") q = q.eq("estado", "vendida");
  if (nombre === "stock") q = q.neq("estado", "vendida");
  if (nombre === "demoras") q = q.eq("demorado", true);
  if (suc && /^\d+$/.test(suc)) {
    if (["unidades", "consultas"].includes(t.fuente)) q = q.eq("sucursal_id", Number(suc));
    if (t.fuente === "turnos" || t.fuente === "v_ordenes") q = q.eq("sucursal_taller_id", Number(suc));
  }
  const { data, error } = await q.order(t.orden ?? "id", { ascending: false });
  if (error) return new Response("No pudimos generar el archivo", { status: 500 });
  const filas = (data ?? []) as any[], cab = filas[0] ? Object.keys(filas[0]) : [];
  const csv = "﻿" + [cab.join(";"), ...filas.map((f) => cab.map((c) => celda(f[c])).join(";"))].join("\r\n");
  await auditar(s, "Exportación a CSV", nombre, null, { filas: filas.length });
  return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="nariautos-${nombre}.csv"`, "cache-control": "no-store" } });
}
