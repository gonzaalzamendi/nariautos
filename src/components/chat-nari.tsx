"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

/**
 * Botón flotante del chatbot «Nari» (solo web pública).
 * El chat de Dify se incrusta por iframe con la URL pública de la app publicada:
 * en el navegador nunca se usa la API key de Dify.
 */
const URL_CHAT = process.env.NEXT_PUBLIC_DIFY_CHAT_URL ?? "";
const urlValida = (u: string) => { try { const x = new URL(u); return x.protocol === "https:"; } catch { return false; } };

export function ChatNari() {
  const [abierto, setAbierto] = useState(false);
  const [usado, setUsado] = useState(false); // el iframe se monta recién al primer clic y se conserva al cerrar
  const boton = useRef<HTMLButtonElement>(null);
  const cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbierto(false); requestAnimationFrame(() => boton.current?.focus()); } };
    window.addEventListener("keydown", tecla);
    const bloquear = window.matchMedia("(max-width: 639px)").matches;
    if (bloquear) document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", tecla); document.body.style.overflow = ""; };
  }, [abierto]);

  if (!urlValida(URL_CHAT)) return null;

  const alternar = () => {
    setUsado(true);
    setAbierto((a) => { if (a) requestAnimationFrame(() => boton.current?.focus()); return !a; });
  };

  return (
    <div className="no-imprimir">
      {usado && (
        <section id="chat-nari" role="dialog" aria-label="Chat con Nari, asistente de NariAutos" hidden={!abierto}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-auto sm:bottom-[112px] sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-136px)] sm:w-[400px] sm:rounded-lg sm:border sm:border-borde sm:shadow-[0_8px_32px_rgb(11_31_58/0.18)]">
          <header className="flex items-center justify-between gap-3 border-b-2 border-dorado bg-marino px-4 py-3 text-white">
            <div>
              <p className="font-serif text-lg font-semibold leading-tight">Consulta a Nari</p>
              <p className="text-xs text-white/70">Asistente virtual de NariAutos</p>
            </div>
            <button ref={cerrar} type="button" onClick={() => { setAbierto(false); boton.current?.focus(); }} aria-label="Cerrar el chat"
              className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10"><X size={22} aria-hidden="true" /></button>
          </header>
          <iframe src={URL_CHAT} title="Chat con Nari" allow="microphone" className="h-full w-full flex-1 border-0" />
        </section>
      )}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-1.5 sm:flex-row sm:gap-3 ${abierto ? "max-sm:hidden" : ""}`}>
        <span aria-hidden="true" className="rounded-full border border-dorado/50 bg-white px-3 py-1 text-xs font-semibold text-marino shadow-suave sm:text-sm">Consulta a Nari</span>
        <div className="nari-flote relative">
          {!abierto && <span aria-hidden="true" className="nari-pulso pointer-events-none absolute inset-0 rounded-full border-2 border-dorado" />}
          <button ref={boton} type="button" onClick={alternar} aria-label={abierto ? "Cerrar chat con Nari" : "Abrir chat con Nari"}
            aria-expanded={abierto} aria-controls="chat-nari"
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dorado bg-marino text-white shadow-[0_4px_14px_rgb(11_31_58/0.35)] transition-transform hover:scale-105 focus-visible:outline-offset-4">
            {abierto ? <X size={28} aria-hidden="true" /> : <MessageCircle size={28} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </div>
  );
}
