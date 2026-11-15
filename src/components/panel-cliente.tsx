"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { createClient } from "@supabase/supabase-js";
import { cerrarPorInactividad } from "@/lib/acciones/acceso";

export function NavPanel({ items }: { items: { href: string; texto: string }[] }) {
  const ruta = usePathname();
  const activo = (h: string) => (items[0].href === h ? ruta === h || /\/(consultas|turnos)\//.test(ruta) && ruta.startsWith(h) : ruta.startsWith(h));
  return (
    <nav aria-label="Secciones del panel" className="no-imprimir border-b border-borde bg-white">
      <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} aria-current={activo(i.href) ? "page" : undefined}
              className={clsx("flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm", activo(i.href) ? "border-dorado font-semibold text-marino" : "border-transparent text-medio hover:text-marino")}>
              {i.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Cierra la sesión tras 15 minutos sin actividad en la pantalla. */
export function Inactividad({ minutos }: { minutos: number }) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    const reiniciar = () => { clearTimeout(t.current); t.current = setTimeout(() => { void cerrarPorInactividad(); }, minutos * 60000); };
    const eventos = ["pointerdown", "keydown", "scroll", "visibilitychange"];
    eventos.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }));
    reiniciar();
    return () => { clearTimeout(t.current); eventos.forEach((e) => window.removeEventListener(e, reiniciar)); };
  }, [minutos]);
  return null;
}

/** Actualiza la pantalla cuando cambia un turno u orden (Supabase Realtime) y, como respaldo, cada 30 s. */
export function TiempoReal() {
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let pendiente: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => { clearTimeout(pendiente); pendiente = setTimeout(() => router.refresh(), 300); };
    const sb = url && clave ? createClient(url, clave, { auth: { persistSession: false } }) : null;
    const canal = sb?.channel("nariautos-taller").on("broadcast", { event: "cambio" }, refrescar).subscribe();
    const reloj = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000);
    return () => { clearInterval(reloj); clearTimeout(pendiente); if (canal) void sb?.removeChannel(canal); };
  }, [router]);
  return <span className="inline-flex items-center gap-1.5 text-xs text-medio"><span className="h-2 w-2 rounded-full bg-exito" aria-hidden="true" />Actualización en tiempo real</span>;
}

export function BotonImprimir({ children }: { children: React.ReactNode }) {
  return <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-md border border-borde bg-white px-4 text-[15px] font-medium text-marino hover:bg-fondo">{children}</button>;
}
