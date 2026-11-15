"use client";
import { useState } from "react";

/** Reduce una imagen en el navegador a JPEG (máx. `lado` px) y la devuelve como data URL. */
export async function reducirImagen(archivo: File, lado = 1100, calidad = 0.72): Promise<string> {
  const img = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * escala); c.height = Math.round(img.height * escala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", calidad);
}

export function SelectorFotos({ maximo, nombre = "foto", etiqueta }: { maximo: number; nombre?: string; etiqueta: string }) {
  const [fotos, setFotos] = useState<string[]>([]);
  const [error, setError] = useState("");
  return (
    <div>
      <label htmlFor={`f-${nombre}`} className="mb-1 block text-sm font-medium">{etiqueta}</label>
      <input id={`f-${nombre}`} type="file" accept="image/*" multiple disabled={fotos.length >= maximo}
        className="block w-full text-sm file:mr-3 file:min-h-11 file:rounded-md file:border file:border-borde file:bg-white file:px-3 file:font-medium file:text-marino"
        onChange={async (e) => {
          setError("");
          try {
            const nuevas = await Promise.all([...(e.target.files ?? [])].slice(0, maximo - fotos.length).map((f) => reducirImagen(f)));
            setFotos((f) => [...f, ...nuevas]);
          } catch { setError("No pudimos leer esa imagen. Probá con una foto en formato JPG o PNG."); }
          e.target.value = "";
        }} />
      <p className="mt-1 text-xs text-medio">Hasta {maximo} fotos. Se reducen automáticamente antes de enviarse.</p>
      {error && <p role="alert" className="mt-1 text-sm text-error">{error}</p>}
      {fotos.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <li key={i} className="relative">
              <img src={f} alt={`Foto ${i + 1}`} className="h-20 w-28 rounded-md border border-borde object-cover" />
              <input type="hidden" name={nombre} value={f} />
              <button type="button" onClick={() => setFotos((x) => x.filter((_, n) => n !== i))} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-borde bg-white text-sm" aria-label={`Quitar foto ${i + 1}`}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
