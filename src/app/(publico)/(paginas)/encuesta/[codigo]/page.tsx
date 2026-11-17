import { db } from "@/lib/db";
import { enviarEncuesta } from "@/lib/acciones/publico";
import { AreaTexto, BotonLink, Encabezado, Vacio } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export const metadata = { title: "Encuesta de satisfacción" };
export const dynamic = "force-dynamic";

export default async function Encuesta({ params }: { params: Promise<{ codigo: string }> }) {
  const codigo = (await params).codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  const { data: t } = await db().from("turnos").select("id, estado, servicios(nombre), encuestas(id)").eq("codigo", codigo).maybeSingle() as any;
  const respondida = t && (Array.isArray(t.encuestas) ? t.encuestas.length > 0 : !!t.encuestas);
  return (
    <div className="mx-auto max-w-xl">
      <Encabezado titulo="¿Cómo fue tu experiencia en el taller?" texto={t ? `Turno ${codigo} · ${t.servicios?.nombre}` : undefined} />
      {!t || t.estado !== "entregado" ? <Vacio titulo="Esta encuesta todavía no está disponible" texto="Se habilita cuando retirás tu vehículo del taller."><BotonLink href="/turnos/seguir">Seguir mi turno</BotonLink></Vacio>
        : respondida ? <Vacio titulo="Ya recibimos tu opinión" texto="Gracias por ayudarnos a mejorar la atención."><BotonLink href="/">Volver al inicio</BotonLink></Vacio> : (
          <FormAccion accion={enviarEncuesta} ocultos={{ codigo }} className="space-y-4 rounded-lg border border-borde/80 bg-white p-5 shadow-suave">
            <fieldset><legend className="mb-2 text-sm font-medium">Puntaje general (1 = muy mala, 5 = excelente)</legend>
              <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="cifras flex h-12 w-12 cursor-pointer items-center justify-center rounded-md border border-borde text-lg font-medium has-checked:border-marino has-checked:bg-marino has-checked:text-white hover:border-acero">
                  <input type="radio" name="puntaje" value={n} required className="sr-only" />{n}</label>))}</div>
            </fieldset>
            <AreaTexto etiqueta="Comentario (opcional)" name="comentario" maxLength={600} />
            <BotonEnviar variante="primario">Enviar mi opinión</BotonEnviar>
          </FormAccion>
        )}
    </div>
  );
}
