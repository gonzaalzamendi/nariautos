"use client";
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";
import type { Estado } from "@/lib/tipos";
import { claseBoton, type Variante } from "./ui";

export type Accion = (previo: Estado, fd: FormData) => Promise<Estado>;
const Pendiente = createContext(false);

export function Mensajes({ estado }: { estado: Estado }) {
  if (estado.error) return <p role="alert" className="rounded-md border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">{estado.error}</p>;
  if (estado.mensaje) return <p role="status" className="rounded-md border border-exito/30 bg-exito/5 px-3 py-2 text-sm text-exito">{estado.mensaje}</p>;
  return null;
}

/** Formulario conectado a una acción del servidor: conserva lo escrito si hay error y muestra el resultado. */
export function FormAccion({ accion, children, className, limpiar, confirmar, ocultos, alTerminar }: {
  accion: Accion; children: ReactNode; className?: string; limpiar?: boolean; confirmar?: string;
  ocultos?: Record<string, string | number | null | undefined>; alTerminar?: (e: Estado) => void;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  const ref = useRef<HTMLFormElement>(null);
  const cb = useRef(alTerminar); cb.current = alTerminar;
  useEffect(() => {
    if (estado.ok) { if (limpiar) ref.current?.reset(); cb.current?.(estado); }
  }, [estado, limpiar]);
  return (
    <form ref={ref} className={className} noValidate={false}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => enviar(fd));
      }}>
      {ocultos && Object.entries(ocultos).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ?? ""} />)}
      {/* Campo trampa anti-spam: las personas no lo ven ni lo completan */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>No completar<input type="text" name="sitio_web" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Pendiente.Provider value={pendiente}>{children}</Pendiente.Provider>
      {(estado.error || estado.mensaje) && <div className="mt-3"><Mensajes estado={estado} /></div>}
    </form>
  );
}

export function BotonEnviar({ children, variante = "secundario", chico, className }: { children: ReactNode; variante?: Variante; chico?: boolean; className?: string }) {
  const pendiente = useContext(Pendiente);
  return (
    <button type="submit" disabled={pendiente} aria-busy={pendiente} className={clsx(claseBoton(variante, chico), className)}>
      {pendiente && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  );
}

/** Botón de una sola acción (confirmar, aprobar, eliminar…) con campos ocultos. */
export function BotonAccion({ accion, campos, children, variante = "contorno", chico = true, confirmar }: {
  accion: Accion; campos: Record<string, string | number | null | undefined>; children: ReactNode; variante?: Variante; chico?: boolean; confirmar?: string;
}) {
  return (
    <FormAccion accion={accion} ocultos={campos} confirmar={confirmar} className="inline-block">
      <BotonEnviar variante={variante} chico={chico}>{children}</BotonEnviar>
    </FormAccion>
  );
}
