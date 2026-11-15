"use client";
export default function ErrorGeneral({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl">No pudimos cargar esta pantalla</h1>
      <p className="text-medio">Puede ser un problema momentáneo de conexión. Tus datos no se perdieron.</p>
      <button onClick={reset} className="min-h-11 rounded-md border border-marino bg-marino px-4 font-medium text-white hover:bg-acero">Reintentar la carga</button>
    </main>
  );
}
