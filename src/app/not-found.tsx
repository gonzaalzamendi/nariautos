import { BotonLink, Logo } from "@/components/ui";
export default function NoEncontrada() {
  return (
    <main id="contenido" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo eslogan alto={70} />
      <h1 className="text-2xl">No encontramos esta página</h1>
      <p className="text-medio">Puede que el enlace haya cambiado o que la unidad ya no esté publicada.</p>
      <div className="flex gap-2"><BotonLink href="/">Volver al inicio</BotonLink><BotonLink href="/catalogo" variante="contorno">Ver el catálogo</BotonLink></div>
    </main>
  );
}
