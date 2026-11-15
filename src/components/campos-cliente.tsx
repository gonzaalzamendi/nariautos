"use client";
import { useEffect, useRef, useState } from "react";
import { buscarRegistrados } from "@/lib/acciones/ventas";
import { Entrada, claseBoton } from "./ui";

/** Nombre, teléfono y email con autocompletado opcional desde los clientes ya registrados. */
export function CamposCliente() {
  const [d, setD] = useState({ nombre: "", telefono: "", email: "" });
  const [sugeridos, setSugeridos] = useState<any[]>([]);
  const [oculto, setOculto] = useState(false);
  useEffect(() => {
    if (oculto || d.nombre.trim().length < 3) { setSugeridos([]); return; }
    const t = setTimeout(() => { buscarRegistrados({ texto: d.nombre }).then((r) => setSugeridos(r.clientes.filter((c) => c.nombre !== d.nombre || c.telefono !== d.telefono))); }, 350);
    return () => clearTimeout(t);
  }, [d.nombre, d.telefono, oculto]);
  // Al limpiar el formulario (alta exitosa) también se vacían estos campos
  const ancla = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const form = ancla.current?.closest("form"), limpiar = () => { setD({ nombre: "", telefono: "", email: "" }); setSugeridos([]); };
    form?.addEventListener("reset", limpiar);
    return () => form?.removeEventListener("reset", limpiar);
  }, []);
  const campo = (k: keyof typeof d) => ({ name: k, value: d[k], onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setOculto(false); setD((x) => ({ ...x, [k]: e.target.value })); } });
  return (
    <>
      <span ref={ancla} hidden />
      <Entrada etiqueta="Nombre y apellido del cliente" {...campo("nombre")} required autoComplete="off" />
      <Entrada etiqueta="Teléfono" {...campo("telefono")} type="tel" inputMode="tel" required autoComplete="off" ayuda="Con código de área, sin 0 ni 15." />
      {sugeridos.length > 0 && (
        <div className="rounded-md border border-acero/30 bg-acero/5 p-3 text-sm sm:col-span-2" role="status">
          <p className="mb-2">Clientes ya registrados con ese nombre. Podés completar con sus datos o seguir cargando a mano.</p>
          <ul className="flex flex-wrap gap-2">
            {sugeridos.map((c) => <li key={c.id}><button type="button" className={claseBoton("contorno", true)} onClick={() => { setD({ nombre: c.nombre, telefono: c.telefono, email: c.email ?? "" }); setOculto(true); }}>Completar: {c.nombre} · {c.telefono}</button></li>)}
            <li><button type="button" className={claseBoton("sutil", true)} onClick={() => setOculto(true)}>No usar sugerencias</button></li>
          </ul>
        </div>
      )}
      <Entrada etiqueta="Email (opcional)" {...campo("email")} type="email" autoComplete="off" />
    </>
  );
}
