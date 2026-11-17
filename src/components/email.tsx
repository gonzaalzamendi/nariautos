"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Mail } from "lucide-react";
import clsx from "clsx";
import { linkEmail, linkGmail, linkOutlook } from "@/lib/formato";
import { claseBoton } from "./ui";

/**
 * Botón «Avisar por email». Antes abría solo un enlace mailto:, que no hace nada si la computadora
 * no tiene un programa de correo configurado (el caso típico de quien usa Gmail u Outlook en el navegador).
 * Ahora ofrece redactar el mensaje en Gmail u Outlook web, en el programa de correo, o copiarlo.
 */
export function BotonEmail({ email, asunto, mensaje, texto = "Avisar por email", alUsar, deshabilitado }: {
  email: string; asunto: string; mensaje: string; texto?: string; alUsar?: () => void; deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const cuerpo = mensaje.replace("{SITIO}", typeof window === "undefined" ? "" : window.location.origin);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!caja.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", fuera); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [abierto]);
  const abrir = (url: string, pestana = true) => {
    if (pestana) window.open(url, "_blank", "noopener"); else window.location.href = url;
    setAbierto(false); alUsar?.();
  };
  const opcion = "flex w-full min-h-10 items-center gap-2 rounded px-3 text-left text-sm hover:bg-fondo";
  return (
    <div ref={caja} className="relative inline-block">
      <button type="button" disabled={deshabilitado} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} aria-haspopup="menu" className={claseBoton("contorno", true)}>
        <Mail size={15} aria-hidden="true" />{texto}<ChevronDown size={14} aria-hidden="true" />
      </button>
      {abierto && (
        <div role="menu" className="absolute left-0 z-30 mt-1 w-64 rounded-md border border-borde bg-white p-1 text-grafito shadow-lg">
          <p className="truncate px-3 py-1.5 text-xs text-medio">Para: {email}</p>
          <button type="button" role="menuitem" className={opcion} onClick={() => abrir(linkGmail(email, asunto, cuerpo))}>Redactar en Gmail</button>
          <button type="button" role="menuitem" className={opcion} onClick={() => abrir(linkOutlook(email, asunto, cuerpo))}>Redactar en Outlook</button>
          <button type="button" role="menuitem" className={opcion} onClick={() => abrir(linkEmail(email, asunto, cuerpo), false)}>Abrir mi programa de correo</button>
          <button type="button" role="menuitem" className={clsx(opcion, "border-t border-borde/70")}
            onClick={async () => { try { await navigator.clipboard.writeText(`${email}\n${asunto}\n\n${cuerpo}`); setCopiado(true); setTimeout(() => setCopiado(false), 2500); alUsar?.(); } catch { /* sin portapapeles */ } }}>
            <Copy size={14} aria-hidden="true" />{copiado ? "Copiado: pegalo en tu correo" : "Copiar destinatario y mensaje"}
          </button>
        </div>
      )}
    </div>
  );
}
