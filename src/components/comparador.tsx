"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const CLAVE = "nari_comparar";
const leer = (): number[] => { try { return JSON.parse(localStorage.getItem(CLAVE) ?? "[]"); } catch { return []; } };
const guardar = (ids: number[]) => { try { localStorage.setItem(CLAVE, JSON.stringify(ids)); } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event("nari-comparar")); };
function useLista() {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => { const f = () => setIds(leer()); f(); window.addEventListener("nari-comparar", f); return () => window.removeEventListener("nari-comparar", f); }, []);
  return ids;
}

export function BotonComparar({ id }: { id: number }) {
  const ids = useLista(), marcado = ids.includes(id), lleno = ids.length >= 3 && !marcado;
  return (
    <label className={`flex min-h-9 items-center gap-2 text-sm ${lleno ? "text-medio" : "cursor-pointer text-acero"}`}>
      <input type="checkbox" className="h-4 w-4 accent-[#2c4a6e]" checked={marcado} disabled={lleno}
        onChange={() => guardar(marcado ? ids.filter((i) => i !== id) : [...ids, id])} />
      {lleno ? "Comparador completo (3)" : marcado ? "En el comparador" : "Agregar al comparador"}
    </label>
  );
}

export function BarraComparar() {
  const ids = useLista();
  if (ids.length === 0) return null;
  return (
    <div className="no-imprimir fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-white/95 px-4 py-2.5 shadow-[0_-2px_8px_rgb(11_31_58/0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <p className="text-sm">{ids.length === 1 ? "1 unidad elegida. Sumá otra para comparar." : `${ids.length} unidades para comparar`}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => guardar([])} className="min-h-10 rounded-md px-3 text-sm text-medio hover:bg-fondo">Vaciar</button>
          {ids.length > 1 && <Link href={`/comparar?ids=${ids.join(",")}`} className="inline-flex min-h-10 items-center rounded-md bg-marino px-4 text-sm font-medium text-white hover:bg-acero">Comparar unidades</Link>}
        </div>
      </div>
    </div>
  );
}
