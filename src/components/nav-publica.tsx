"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_PUBLICA } from "@/lib/nav-publica";

/** Menú principal de la web pública: el enlace activo se marca con un subrayado dorado. */
export function NavPublica({ movil }: { movil?: boolean }) {
  const ruta = usePathname();
  const activo = (h: string) => (h === "/" ? ruta === "/" : ruta === h || (ruta.startsWith(h + "/") && !(h === "/turnos" && ruta.startsWith("/turnos/seguir"))));
  return (
    <ul className={clsx("flex", movil ? "mx-auto max-w-6xl gap-1 overflow-x-auto px-2 pb-1" : "gap-0.5")}>
      {NAV_PUBLICA.map(([h, t]) => (
        <li key={h}>
          <Link href={h} aria-current={activo(h) ? "page" : undefined}
            className={clsx("relative flex min-h-11 items-center whitespace-nowrap px-2.5 text-sm transition-colors",
              activo(h) ? "font-semibold text-dorado after:absolute after:inset-x-2.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-dorado" : "text-white/85 hover:text-white")}>
            {t}
          </Link>
        </li>
      ))}
    </ul>
  );
}
