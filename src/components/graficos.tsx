"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Punto = { nombre: string; valor: number; detalle?: string };
const fmt = (n: number, sufijo = "") => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(n) + sufijo;

/** Barras de una sola serie (un solo tono): el título de la tarjeta nombra la serie. */
export function Barras({ datos, horizontal, sufijo = "", resaltar, alto = 240 }: { datos: Punto[]; horizontal?: boolean; sufijo?: string; resaltar?: string; alto?: number }) {
  if (datos.length === 0 || datos.every((d) => d.valor === 0)) return <p className="flex items-center justify-center rounded-md border border-dashed border-borde text-sm text-medio" style={{ height: alto }}>Sin datos en el período elegido</p>;
  const eje = { fontSize: 12, fill: "#6b7280" };
  return (
    <div style={{ height: horizontal ? Math.max(alto, datos.length * 40) : alto }} className="cifras">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="0" vertical={!!horizontal} horizontal={!horizontal} />
          {horizontal ? <><XAxis type="number" tick={eje} axisLine={false} tickLine={false} allowDecimals={false} /><YAxis type="category" dataKey="nombre" tick={{ ...eje, fill: "#1f2933" }} width={118} axisLine={false} tickLine={false} /></>
            : <><XAxis dataKey="nombre" tick={eje} axisLine={{ stroke: "#d1d5db" }} tickLine={false} interval={0} /><YAxis tick={eje} axisLine={false} tickLine={false} width={34} allowDecimals={false} /></>}
          <Tooltip cursor={{ fill: "#0b1f3a0d" }} formatter={(v: any) => [fmt(Number(v), sufijo), ""]} separator=""
            contentStyle={{ borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, boxShadow: "0 1px 6px rgb(11 31 58 / 0.08)" }} labelStyle={{ color: "#1f2933", fontWeight: 600 }} itemStyle={{ color: "#1f2933" }} />
          <Bar dataKey="valor" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
            {datos.map((d) => <Cell key={d.nombre} fill={resaltar && d.nombre === resaltar ? "#b42318" : "#2c4a6e"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
