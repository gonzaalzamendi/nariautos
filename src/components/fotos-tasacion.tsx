"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { reducirImagen } from "./fotos";

export const VISTAS_TASACION = ["Frente", "Costado izquierdo", "Costado derecho", "Atrás", "Interior"] as const;

/** Cinco fotos obligatorias, una por vista. Se reducen en el navegador antes de enviarse. */
export function FotosTasacion() {
  const [fotos, setFotos] = useState<(string | null)[]>(VISTAS_TASACION.map(() => null));
  const [error, setError] = useState("");
  const faltan = fotos.filter((f) => !f).length;
  const caja = useRef<HTMLFieldSetElement>(null);
  useEffect(() => { // al enviarse la tasación, el formulario se limpia y las fotos también
    const form = caja.current?.closest("form"), limpiar = () => setFotos(VISTAS_TASACION.map(() => null));
    form?.addEventListener("reset", limpiar);
    return () => form?.removeEventListener("reset", limpiar);
  }, []);
  return (
    <fieldset ref={caja}>
      <legend className="mb-1 text-sm font-medium">Fotos del vehículo (obligatorias)</legend>
      <p className="mb-3 text-xs text-medio">Subí una foto de cada vista: frente, los dos costados, atrás e interior. Con buena luz y el auto completo en la imagen.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {VISTAS_TASACION.map((v, i) => {
          const f = fotos[i], id = `foto-${i}`;
          return (
            <li key={v}>
              {f ? (
                <div className="relative">
                  <img src={f} alt={`Foto: ${v}`} className="aspect-[4/3] w-full rounded-md border border-borde object-cover" />
                  <input type="hidden" name="foto" value={f} />
                  <button type="button" onClick={() => setFotos((x) => x.map((y, n) => (n === i ? null : y)))} aria-label={`Quitar la foto: ${v}`}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-borde bg-white text-grafito shadow-suave"><X size={14} aria-hidden="true" /></button>
                  <p className="mt-1 text-center text-xs font-medium text-exito">{v} ✓</p>
                </div>
              ) : (
                <label htmlFor={id} className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-borde bg-fondo px-2 text-center text-xs text-medio hover:border-acero focus-within:border-acero">
                  <Camera size={22} aria-hidden="true" className="text-acero" />
                  <span className="font-medium text-grafito">{v}</span>
                  <span>Agregar foto</span>
                  <input id={id} type="file" accept="image/*" capture="environment" className="sr-only"
                    onChange={async (e) => {
                      const archivo = e.target.files?.[0]; e.target.value = ""; setError("");
                      if (!archivo) return;
                      try { const d = await reducirImagen(archivo, 1000, 0.7); setFotos((x) => x.map((y, n) => (n === i ? d : y))); }
                      catch { setError("No pudimos leer esa imagen. Probá con una foto en formato JPG o PNG."); }
                    }} />
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm text-error">{error}</p>}
      {/* Validación del navegador: impide enviar el formulario sin las cinco fotos */}
      <input type="text" required value={faltan ? "" : "ok"} onChange={() => {}} tabIndex={-1} aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0"
        onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity(`Faltan ${faltan} ${faltan === 1 ? "foto" : "fotos"}: subí frente, costados, atrás e interior.`)} onInput={(e) => (e.target as HTMLInputElement).setCustomValidity("")} />
      <p className={`mt-2 text-xs ${faltan ? "text-medio" : "text-exito"}`}>{faltan ? `Faltan ${faltan} de 5 fotos.` : "Las 5 fotos están cargadas."}</p>
    </fieldset>
  );
}
