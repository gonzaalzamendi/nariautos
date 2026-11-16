"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";

// URL pública del chatbot de Dify (Publicar > Incrustar en sitios web). Sin ella, el botón no se muestra.
// La API key de Dify nunca se usa en el navegador: el chat corre dentro del iframe de Dify.
const URL_CHAT = process.env.NEXT_PUBLIC_DIFY_CHAT_URL?.trim() ?? "";
const urlValida = /^https:\/\/[^\s"'<>]+$/.test(URL_CHAT);

export function ChatNari() {
  const [abierto, setAbierto] = useState(false);
  const [cargado, setCargado] = useState(false); // el iframe se crea recién al primer clic y conserva la conversación
  const [subir, setSubir] = useState(false); // deja lugar a la barra del comparador
  const boton = useRef<HTMLButtonElement>(null), cerrar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const leer = () => { try { setSubir(JSON.parse(localStorage.getItem("nari_comparar") ?? "[]").length > 0); } catch { setSubir(false); } };
    leer(); window.addEventListener("nari-comparar", leer);
    return () => window.removeEventListener("nari-comparar", leer);
  }, []);
  useEffect(() => {
    if (!abierto) return;
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") cerrarChat(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  if (!urlValida) return null;
  const abrirChat = () => { setCargado(true); setAbierto(true); };
  const cerrarChat = () => { setAbierto(false); requestAnimationFrame(() => boton.current?.focus()); };

  return (
    <div className="no-imprimir">
      <button ref={boton} type="button" onClick={abrirChat} aria-label="Abrir chat con Nari" aria-haspopup="dialog" aria-expanded={abierto}
        style={{ bottom: subir ? 88 : 24 }}
        className={`group fixed right-6 z-40 rounded-full ${abierto ? "hidden" : "block"}`}>
        {/* Flota el contenido, no el botón: el área de clic queda quieta */}
        <span className="nari-flote flex flex-col items-center gap-1.5 sm:flex-row-reverse sm:gap-3">
          <span className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dorado bg-marino text-white shadow-lg transition-colors group-hover:bg-acero">
            <span className="nari-pulso absolute -inset-0.5 rounded-full border-2 border-dorado" aria-hidden="true" />
            <MessageCircle size={28} aria-hidden="true" />
          </span>
          <span className="rounded-full border border-dorado/60 bg-white px-3 py-1 text-sm font-semibold text-marino shadow-suave" aria-hidden="true">Consulta a Nari</span>
        </span>
      </button>

      {cargado && (
        <div role="dialog" aria-label="Chat con Nari, asistente de NariAutos" aria-modal="false" hidden={!abierto}
          className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-2xl sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-48px)] sm:w-[400px] sm:rounded-lg sm:border sm:border-borde">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-dorado bg-marino py-2 pl-4 pr-2 text-white">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold"><MessageCircle size={20} aria-hidden="true" />Consulta a Nari</p>
            <button ref={cerrar} type="button" onClick={cerrarChat} aria-label="Cerrar chat" className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-white">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <iframe src={URL_CHAT} title="Chat con Nari" allow="microphone; clipboard-write" className="min-h-0 w-full flex-1 border-0" />
        </div>
      )}
    </div>
  );
}
