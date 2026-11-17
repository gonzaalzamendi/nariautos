import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";

export const claseCampo =
  "block w-full min-h-11 rounded-md border border-borde bg-white px-3 py-2 text-[15px] text-grafito placeholder:text-medio/70 focus:border-acero focus:outline-2 focus:outline-acero/30 disabled:bg-fondo disabled:text-medio";

const VARIANTES = {
  primario: "bg-dorado text-marino hover:bg-[#b89759] border border-dorado font-semibold",
  secundario: "bg-marino text-white hover:bg-acero border border-marino font-medium",
  contorno: "bg-white text-marino hover:bg-fondo border border-borde font-medium",
  peligro: "bg-white text-error hover:bg-red-50 border border-error/50 font-medium",
  sutil: "bg-transparent text-acero hover:bg-acero/10 border border-transparent font-medium",
};
export type Variante = keyof typeof VARIANTES;
export const claseBoton = (v: Variante = "secundario", chico = false) =>
  clsx("inline-flex items-center justify-center gap-2 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap",
    chico ? "min-h-9 px-3 text-sm" : "min-h-11 px-4 text-[15px]", VARIANTES[v]);

export function BotonLink({ href, children, variante = "secundario", chico, className, ...r }: { href: string; children: ReactNode; variante?: Variante; chico?: boolean; className?: string; target?: string; rel?: string; download?: boolean }) {
  const externo = /^(https?:|mailto:|tel:)/.test(href) || href.startsWith("/api/");
  const cls = clsx(claseBoton(variante, chico), className);
  return externo ? <a href={href} className={cls} {...r}>{children}</a> : <Link href={href} className={cls}>{children}</Link>;
}

export function Campo({ etiqueta, id, ayuda, children, className }: { etiqueta: string; id: string; ayuda?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-grafito">{etiqueta}</label>
      {children}
      {ayuda && <p className="mt-1 text-xs text-medio">{ayuda}</p>}
    </div>
  );
}
type PI = React.InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string; name: string; contenedor?: string };
export function Entrada({ etiqueta, ayuda, contenedor, id, ...p }: PI) {
  const i = id ?? `c-${p.name}`;
  return <Campo etiqueta={etiqueta} id={i} ayuda={ayuda} className={contenedor}><input id={i} {...p} className={clsx(claseCampo, p.className)} /></Campo>;
}
type PS = React.SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; ayuda?: string; name: string; contenedor?: string; opciones: readonly (readonly [string | number, string])[]; vacio?: string };
export function Selector({ etiqueta, ayuda, contenedor, opciones, vacio, id, ...p }: PS) {
  const i = id ?? `c-${p.name}`;
  return (
    <Campo etiqueta={etiqueta} id={i} ayuda={ayuda} className={contenedor}>
      <select id={i} {...p} className={clsx(claseCampo, p.className)}>
        {vacio !== undefined && <option value="">{vacio}</option>}
        {opciones.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </Campo>
  );
}
type PT = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; ayuda?: string; name: string; contenedor?: string };
export function AreaTexto({ etiqueta, ayuda, contenedor, id, ...p }: PT) {
  const i = id ?? `c-${p.name}`;
  return <Campo etiqueta={etiqueta} id={i} ayuda={ayuda} className={contenedor}><textarea id={i} rows={3} {...p} className={clsx(claseCampo, p.className)} /></Campo>;
}

export function Tarjeta({ children, className, titulo, accion }: { children: ReactNode; className?: string; titulo?: string; accion?: ReactNode }) {
  return (
    <section className={clsx("rounded-lg border border-borde/80 bg-white shadow-suave", className)}>
      {titulo && <header className="flex flex-wrap items-center justify-between gap-2 border-b border-borde/70 px-4 py-3 sm:px-5"><h2 className="text-lg">{titulo}</h2>{accion}</header>}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const TONOS: Record<string, string> = {
  neutro: "bg-fondo text-grafito border-borde",
  info: "bg-acero/10 text-acero border-acero/30",
  exito: "bg-exito/10 text-exito border-exito/30",
  alerta: "bg-alerta/10 text-alerta-texto border-alerta/40",
  error: "bg-error/10 text-error border-error/30",
  dorado: "bg-dorado/15 text-dorado-texto border-dorado/40",
};
const TONO_ESTADO: Record<string, string> = {
  solicitado: "alerta", nueva: "alerta", pendiente: "alerta", solicitada: "alerta", reservada: "alerta", espera_repuestos: "alerta",
  confirmado: "info", en_seguimiento: "info", cotizada: "info", test_drive_agendado: "info", asignada: "info", recibido: "info", en_reparacion: "info", activa: "info",
  listo: "exito", entregado: "exito", ganada: "exito", disponible: "exito", terminada: "exito", aprobada: "exito", respondida: "exito", enviada: "exito", realizado: "exito", concretada: "exito",
  cancelado: "neutro", vendida: "neutro", cerrada: "neutro", vencida: "neutro", cancelada: "neutro",
  rechazado: "error", perdida: "error", ausente: "error", rechazada: "error",
};
export function Insignia({ children, tono, estado }: { children: ReactNode; tono?: keyof typeof TONOS; estado?: string }) {
  const t = tono ?? (estado ? TONO_ESTADO[estado] : undefined) ?? "neutro";
  return <span className={clsx("inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONOS[t])}>{children}</span>;
}

export function Vacio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-borde bg-white px-4 py-10 text-center">
      <p className="titulo text-lg">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-medio">{texto}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Encabezado({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl sm:text-[28px]">{titulo}</h1>{texto && <p className="mt-1 max-w-2xl text-sm text-medio">{texto}</p>}</div>
      {children && <div className="no-imprimir flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-borde/80 bg-white shadow-suave">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-borde bg-fondo text-xs uppercase tracking-wide text-medio">
          <tr>{cabeceras.map((c) => <th key={c} scope="col" className="px-3 py-2.5 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-borde/60 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return <div><dt className="text-xs uppercase tracking-wide text-medio">{nombre}</dt><dd className="mt-0.5 text-[15px]">{children}</dd></div>;
}

/**
 * Logo de NariAutos (imagen). `claro`: para fondos azul marino. `eslogan`: agrega «Conducí tus sueños».
 * Proporciones: 900×231 sin eslogan y 900×273 con eslogan.
 */
export function Logo({ claro, eslogan, alto = 40, className }: { claro?: boolean; eslogan?: boolean; alto?: number; className?: string }) {
  const archivo = `/marca/logo${eslogan ? "-eslogan" : ""}${claro ? "" : "-oscuro"}.png`;
  const ancho = Math.round(alto * (eslogan ? 900 / 273 : 900 / 231));
  return <img src={archivo} alt={eslogan ? "NariAutos · Conducí tus sueños" : "NariAutos"} width={ancho} height={alto} className={clsx("block h-auto max-w-full", className)} style={{ height: alto, width: "auto" }} />;
}

export function Esqueleto({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Cargando">
      <div className="h-8 w-56 animate-pulse rounded bg-borde/60" />
      {Array.from({ length: filas }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-borde/40" />)}
    </div>
  );
}
