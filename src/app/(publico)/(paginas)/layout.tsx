/** Contenedor de las páginas internas de la web pública (la portada ocupa todo el ancho). */
export default function PaginasLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">{children}</div>;
}
