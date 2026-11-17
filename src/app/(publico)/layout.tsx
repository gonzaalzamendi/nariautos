import Link from "next/link";
import { Logo } from "@/components/ui";
import { ChatNari } from "@/components/chat-nari";
import { NavPublica } from "@/components/nav-publica";
import { NAV_PUBLICA } from "@/lib/nav-publica";

const PIE = [...NAV_PUBLICA.slice(1), ["/turnos", "Sacar turno de taller"]] as const;

export default function PublicoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-marino shadow-[0_1px_0_rgb(255_255_255/0.06)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5">
          <Link href="/" aria-label="NariAutos, inicio" className="shrink-0"><Logo claro /></Link>
          <nav aria-label="Principal" className="hidden lg:block"><NavPublica /></nav>
          <Link href="/turnos" className="inline-flex min-h-10 shrink-0 items-center rounded-full border border-dorado bg-dorado px-4 text-sm font-semibold text-marino hover:bg-[#b89759]">Sacar turno</Link>
        </div>
        <nav aria-label="Principal" className="border-t border-white/10 lg:hidden"><NavPublica movil /></nav>
      </header>
      <main id="contenido" className="w-full flex-1">{children}</main>
      <footer className="bg-marino text-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 border-b border-white/10 px-4 py-8">
          <div className="flex items-center gap-5">
            <Logo claro />
            <span className="hidden h-10 w-px bg-dorado/60 sm:block" aria-hidden="true" />
            <p className="hidden max-w-xs text-sm sm:block">Concesionaria con cuatro sucursales y taller propio de post-venta en Tandil y Azul.</p>
          </div>
          <p className="font-serif text-xl italic text-white">
            Tu próximo auto, más cerca.
            <svg viewBox="0 0 220 12" className="mt-1 block h-3 w-full text-dorado" aria-hidden="true"><path d="M2 9 C 70 1, 150 1, 218 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </p>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-5">
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {PIE.map(([h, t]) => <li key={h}><Link href={h} className="inline-flex min-h-9 items-center hover:text-white hover:underline">{t}</Link></li>)}
            <li><Link href="/acceso" className="inline-flex min-h-9 items-center text-white/55 hover:text-white hover:underline">Acceso empleados</Link></li>
          </ul>
        </div>
        <p className="border-t border-white/10 px-4 py-3 text-center text-xs text-white/55">NariAutos · Prototipo académico · Sistemas de Información Gerencial · FCE – UNICEN</p>
      </footer>
      <ChatNari />
    </div>
  );
}
