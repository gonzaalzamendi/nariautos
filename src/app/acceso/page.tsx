import Link from "next/link";
import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/sesion";
import { INICIO } from "@/lib/permisos";
import { ingresar } from "@/lib/acciones/acceso";
import { Entrada, Logo } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Acceso de empleados", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Acceso({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const s = await sesionActual();
  if (s) redirect(s.cambiarPin ? "/cuenta" : INICIO[s.rol]);
  const { motivo } = await searchParams;
  return (
    <main id="contenido" className="flex min-h-dvh flex-col items-center bg-marino px-4 py-10">
      <Link href="/" title="Volver a la web"><Logo claro eslogan alto={80} /></Link>
      <p className="mt-1 text-sm text-white/70">Acceso de empleados</p>
      {motivo === "inactividad" && <p role="status" className="mt-4 max-w-sm rounded-md bg-white/10 px-3 py-2 text-sm text-white">La sesión se cerró por 15 minutos de inactividad. Ingresá de nuevo para continuar.</p>}
      <div className="mt-6 w-full max-w-sm rounded-lg bg-white p-6 shadow-suave">
        <h1 className="text-xl">Ingresar al sistema</h1>
        <FormAccion accion={ingresar} className="mt-4 space-y-4">
          <Entrada etiqueta="Usuario" name="usuario" required autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="nombre.apellido" />
          <Entrada etiqueta="PIN de 4 dígitos" name="pin" type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="current-password" className="cifras tracking-[0.4em]" />
          <BotonEnviar className="w-full">Ingresar al sistema</BotonEnviar>
        </FormAccion>
        <p className="mt-4 text-xs text-medio">Tras 5 intentos fallidos el acceso se bloquea 5 minutos. Si olvidaste tu PIN, pedile a Gerencia que te asigne uno nuevo.</p>
      </div>
      <Link href="/" className="mt-6 text-sm text-white/80 underline hover:text-white">Volver a la web pública</Link>
    </main>
  );
}
