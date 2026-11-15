"use client";
import { startTransition, useActionState, useEffect, useState } from "react";
import { ingresar } from "@/lib/acciones/acceso";
import { Mensajes } from "@/components/formularios";

type Emp = { id: number; nombre: string; detalle: string };

export function Terminal({ empleados }: { empleados: Emp[] }) {
  const [elegido, setElegido] = useState<Emp | null>(null);
  const [pin, setPin] = useState("");
  const [estado, enviar, pendiente] = useActionState(ingresar, {});
  const [visto, setVisto] = useState(estado);

  useEffect(() => { if (estado !== visto && estado.error) setPin(""); }, [estado, visto]);
  useEffect(() => {
    if (!elegido) return;
    const tecla = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 4 ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") document.getElementById("btn-ingresar")?.click();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [elegido]);

  const entrar = () => {
    if (!elegido || pin.length !== 4) return;
    const fd = new FormData(); fd.set("empleado", String(elegido.id)); fd.set("pin", pin);
    setVisto(estado);
    startTransition(() => enviar(fd));
  };

  if (!elegido) {
    return (
      <div>
        <h1 className="text-xl">Elegí tu nombre</h1>
        <ul className="mt-3 space-y-2">
          {empleados.map((e) => (
            <li key={e.id}>
              <button type="button" onClick={() => { setElegido(e); setPin(""); }}
                className="flex min-h-14 w-full flex-col items-start rounded-md border border-borde px-4 py-2 text-left hover:border-acero hover:bg-fondo">
                <span className="font-medium text-marino">{e.nombre}</span>
                <span className="text-xs text-medio">{e.detalle}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const error = estado !== visto || !pendiente ? estado : {};
  return (
    <div>
      <button type="button" onClick={() => setElegido(null)} className="min-h-9 text-sm text-acero underline">Cambiar de usuario</button>
      <h1 className="mt-1 text-xl">{elegido.nombre}</h1>
      <p className="text-xs text-medio">{elegido.detalle}</p>
      <p id="pin-ayuda" className="mt-4 text-sm font-medium">Ingresá tu PIN de 4 dígitos</p>
      <div className="mt-2 flex justify-center gap-3" role="status" aria-label={`${pin.length} de 4 dígitos ingresados`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-4 w-4 rounded-full border-2 border-marino ${i < pin.length ? "bg-marino" : "bg-white"}`} />)}
      </div>
      <div className="mx-auto mt-4 grid max-w-72 grid-cols-3 gap-2" aria-describedby="pin-ayuda">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
          <button key={n} type="button" onClick={() => setPin((p) => (p.length < 4 ? p + n : p))}
            className="cifras h-16 rounded-md border border-borde bg-white text-2xl font-medium text-marino hover:bg-fondo active:bg-borde/50">{n}</button>
        ))}
        <button type="button" onClick={() => setPin("")} className="h-16 rounded-md border border-borde text-sm font-medium text-medio hover:bg-fondo">Borrar todo</button>
        <button type="button" onClick={() => setPin((p) => (p.length < 4 ? p + "0" : p))} className="cifras h-16 rounded-md border border-borde text-2xl font-medium text-marino hover:bg-fondo">0</button>
        <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Borrar el último dígito" className="h-16 rounded-md border border-borde text-xl text-medio hover:bg-fondo">←</button>
      </div>
      <button id="btn-ingresar" type="button" onClick={entrar} disabled={pin.length !== 4 || pendiente}
        className="mt-4 min-h-12 w-full rounded-md bg-marino font-semibold text-white hover:bg-acero disabled:opacity-50">
        {pendiente ? "Verificando…" : "Ingresar al sistema"}
      </button>
      <div className="mt-3"><Mensajes estado={error} /></div>
    </div>
  );
}
