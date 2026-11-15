import Link from "next/link";
import { Logo } from "@/components/ui";

const NAV = [
  ["/catalogo", "Catálogo"], ["/promociones", "Promociones"], ["/turnos", "Sacar turno de taller"], ["/turnos/seguir", "Seguir mi turno"],
  ["/historial", "Historial del vehículo"], ["/tasacion", "Tasá tu usado"], ["/sucursales", "Sucursales"],
] as const;

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-borde bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-3 lg:py-3">
          <Link href="/" aria-label="NariAutos, inicio"><Logo /></Link>
          <Link href="/turnos" className="inline-flex min-h-10 items-center rounded-md border border-dorado bg-dorado px-3 text-sm font-semibold text-marino hover:bg-[#b89759] lg:order-last">Sacar turno</Link>
          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex gap-1">{NAV.filter(([h]) => h !== "/turnos").map(([h, t]) => <li key={h}><Link href={h} className="flex min-h-10 items-center rounded px-2.5 text-sm text-grafito hover:bg-fondo hover:text-marino">{t}</Link></li>)}</ul>
          </nav>
        </div>
        <nav aria-label="Principal" className="lg:hidden">
          <ul className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 pb-1 pt-1">{NAV.filter(([h]) => h !== "/turnos").map(([h, t]) => <li key={h}><Link href={h} className="flex min-h-11 items-center whitespace-nowrap rounded px-2.5 text-sm text-grafito hover:bg-fondo">{t}</Link></li>)}</ul>
        </nav>
      </header>
      <main id="contenido" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="mt-8 border-t border-borde bg-marino text-white/80">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          <div><Logo claro /><p className="mt-2 max-w-xs">Concesionaria con cuatro sucursales y taller propio de post-venta en Tandil y Azul.</p></div>
          <ul className="space-y-1">{NAV.slice(0, 4).map(([h, t]) => <li key={h}><Link href={h} className="inline-flex min-h-8 items-center hover:text-white hover:underline">{t}</Link></li>)}</ul>
          <ul className="space-y-1">
            {NAV.slice(4).map(([h, t]) => <li key={h}><Link href={h} className="inline-flex min-h-8 items-center hover:text-white hover:underline">{t}</Link></li>)}
            <li><Link href="/acceso" className="inline-flex min-h-8 items-center text-white/55 hover:text-white hover:underline">Acceso empleados</Link></li>
          </ul>
        </div>
        <p className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/55">NariAutos · Prototipo académico · Sistemas de Información Gerencial · FCE – UNICEN</p>
      </footer>
    </div>
  );
}
