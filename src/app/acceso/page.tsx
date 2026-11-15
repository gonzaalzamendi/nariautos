import Link from "next/link";
import { redirect } from "next/navigation";
import { db, leer } from "@/lib/db";
import { sesionActual } from "@/lib/sesion";
import { INICIO, NOMBRE_ROL } from "@/lib/permisos";
import { Logo } from "@/components/ui";
import { Terminal } from "./terminal";
import type { Rol } from "@/lib/tipos";

export const metadata = { title: "Acceso de empleados", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Acceso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const s = await sesionActual();
  if (s) redirect(INICIO[s.rol]);
  const { motivo } = await searchParams;
  const empleados = await leer<any[]>(db().from("empleados").select("id, nombre, rol, sucursales(nombre)").eq("activo", true).order("nombre"));
  return (
    <main id="contenido" className="flex min-h-dvh flex-col items-center bg-marino px-4 py-8">
      <Link href="/" aria-label="NariAutos, volver a la web"><Logo claro /></Link>
      <p className="mt-1 text-sm text-white/70">Acceso de empleados</p>
      {motivo === "inactividad" && <p role="status" className="mt-4 rounded-md bg-white/10 px-3 py-2 text-sm text-white">La sesión se cerró por 15 minutos de inactividad. Ingresá de nuevo para continuar.</p>}
      <div className="mt-6 w-full max-w-md rounded-lg bg-white p-5 shadow-suave">
        <Terminal empleados={empleados.map((e) => ({ id: e.id, nombre: e.nombre, detalle: `${NOMBRE_ROL[e.rol as Rol]} · ${e.sucursales?.nombre ?? "Toda la red"}` }))} />
      </div>
      <Link href="/" className="mt-6 text-sm text-white/80 underline hover:text-white">Volver a la web pública</Link>
    </main>
  );
}
