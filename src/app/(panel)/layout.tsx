import Link from "next/link";
import { Bell } from "lucide-react";
import { exigir } from "@/lib/sesion";
import { db } from "@/lib/db";
import { alertasDe } from "@/lib/alertas";
import { INICIO, MENU, NOMBRE_ROL } from "@/lib/permisos";
import { MINUTOS_INACTIVIDAD } from "@/lib/token";
import { cerrarSesion } from "@/lib/acciones/acceso";
import { Logo } from "@/components/ui";
import { Inactividad, NavPanel } from "@/components/panel-cliente";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await exigir();
  const [alertas, suc] = await Promise.all([
    alertasDe(s),
    s.sucursalId ? db().from("sucursales").select("nombre").eq("id", s.sucursalId).single().then((r) => r.data?.nombre as string) : Promise.resolve("Toda la red"),
  ]);
  return (
    <div className="min-h-dvh">
      <header className="no-imprimir bg-marino text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5">
          <Link href={INICIO[s.rol]} aria-label="NariAutos, inicio del panel"><Logo claro /></Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium">{s.nombre}</p>
              <p className="text-xs text-white/70">{NOMBRE_ROL[s.rol]} · {suc}</p>
            </div>
            <details className="relative">
              <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md hover:bg-white/10 [&::-webkit-details-marker]:hidden" aria-label={`Alertas: ${alertas.length}`}>
                <Bell size={20} aria-hidden="true" />
                {alertas.length > 0 && <span className="cifras absolute right-1 top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-dorado px-1 text-[11px] font-semibold text-marino">{alertas.length}</span>}
              </summary>
              <div className="absolute right-0 z-30 mt-1 w-72 rounded-md border border-borde bg-white p-2 text-grafito shadow-lg">
                <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-medio">Alertas</p>
                {alertas.length === 0 ? <p className="px-2 py-2 text-sm text-medio">Estás al día: no hay alertas pendientes.</p> : (
                  <ul>{alertas.map((a) => <li key={a.texto}><Link href={a.href} className="block rounded px-2 py-2 text-sm hover:bg-fondo">{a.texto}</Link></li>)}</ul>
                )}
              </div>
            </details>
            <Link href="/cuenta" className="hidden min-h-11 items-center rounded-md px-2 text-sm text-white/85 hover:bg-white/10 sm:flex">Cambiar PIN</Link>
            <form action={cerrarSesion}>
              <button type="submit" className="min-h-11 rounded-md border border-white/40 px-3 text-sm font-medium hover:bg-white/10">Cerrar sesión</button>
            </form>
          </div>
          <p className="w-full text-xs text-white/75 sm:hidden">{s.nombre} · {NOMBRE_ROL[s.rol]} · {suc} · <Link href="/cuenta" className="underline">Cambiar PIN</Link></p>
        </div>
      </header>
      <NavPanel items={MENU[s.rol]} />
      <main id="contenido" className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      <Inactividad minutos={MINUTOS_INACTIVIDAD} />
    </div>
  );
}
