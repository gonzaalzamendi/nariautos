"use client";
import { useMemo, useState } from "react";
import { agendarTestDrive, pedirCotizacion } from "@/lib/acciones/publico";
import { cuotaFrances, moneda } from "@/lib/formato";
import { AreaTexto, Entrada, Selector } from "@/components/ui";
import { BotonEnviar, FormAccion } from "@/components/formularios";

export function Galeria({ fotos, nombre }: { fotos: string[]; nombre: string }) {
  const lista = fotos.length ? fotos : ["/placeholder?v=1"];
  const [i, setI] = useState(0);
  return (
    <div>
      <img src={lista[i]} alt={`${nombre}, foto ${i + 1} de ${lista.length}`} width={960} height={600} className="aspect-[16/10] w-full rounded-lg border border-borde/80 bg-fondo object-cover" />
      {lista.length > 1 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {lista.map((f, n) => (
            <li key={f}>
              <button type="button" onClick={() => setI(n)} aria-label={`Ver foto ${n + 1}`} aria-current={n === i}
                className={`block overflow-hidden rounded-md border-2 ${n === i ? "border-dorado" : "border-transparent hover:border-borde"}`}>
                <img src={f} alt="" width={128} height={80} className="h-16 w-24 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const TNA = 45; // tasa orientativa
function Contacto() {
  return (
    <>
      <Entrada etiqueta="Nombre y apellido" name="nombre" required autoComplete="name" />
      <Entrada etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" required autoComplete="tel" ayuda="Con código de área, sin 0 ni 15. Ej.: 2494501234" />
      <Entrada etiqueta="Email (opcional)" name="email" type="email" autoComplete="email" />
    </>
  );
}

export function PanelContacto({ unidadId, precio, fechaMinima }: { unidadId: number; precio: number; fechaMinima: string }) {
  const [pestana, setPestana] = useState<"cotizacion" | "test">("cotizacion");
  const [anticipo, setAnticipo] = useState(40);
  const [cuotas, setCuotas] = useState(24);
  const [adjuntar, setAdjuntar] = useState(true);
  const sim = useMemo(() => {
    const monto = precio * (1 - anticipo / 100);
    return { anticipo_pct: anticipo, anticipo: Math.round(precio * anticipo / 100), financiado: Math.round(monto), cuotas, tna: TNA, cuota: Math.round(cuotaFrances(monto, cuotas, TNA)) };
  }, [precio, anticipo, cuotas]);
  const tab = (id: "cotizacion" | "test", texto: string) => (
    <button type="button" role="tab" aria-selected={pestana === id} onClick={() => setPestana(id)}
      className={`min-h-11 flex-1 border-b-2 px-2 text-sm font-medium ${pestana === id ? "border-dorado text-marino" : "border-transparent text-medio hover:text-marino"}`}>{texto}</button>
  );
  return (
    <>
      <section className="rounded-lg border border-borde/80 bg-white p-5 shadow-suave" aria-labelledby="t-sim">
        <h2 id="t-sim" className="text-lg">Simulador de financiación</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="s-ant" className="mb-1 flex justify-between text-sm font-medium"><span>Anticipo</span><span className="cifras">{anticipo}% · {moneda(sim.anticipo)}</span></label>
            <input id="s-ant" type="range" min={20} max={80} step={5} value={anticipo} onChange={(e) => setAnticipo(Number(e.target.value))} className="h-11 w-full accent-[#2c4a6e]" />
          </div>
          <Selector etiqueta="Cantidad de cuotas" name="s-cuotas" value={cuotas} onChange={(e) => setCuotas(Number(e.target.value))} opciones={[12, 24, 36, 48, 60].map((c) => [c, `${c} cuotas`] as const)} />
          <dl className="grid grid-cols-2 gap-3 rounded-md bg-fondo p-3 text-sm">
            <div><dt className="text-medio">Monto a financiar</dt><dd className="cifras font-medium">{moneda(sim.financiado)}</dd></div>
            <div><dt className="text-medio">Cuota estimada</dt><dd className="cifras text-lg font-semibold text-marino">{moneda(sim.cuota)}</dd></div>
          </dl>
          <p className="text-xs text-medio">Cálculo orientativo con tasa nominal anual del {TNA}% (sistema francés). No constituye una oferta: el vendedor confirma las condiciones.</p>
        </div>
      </section>
      <section className="rounded-lg border border-borde/80 bg-white shadow-suave">
        <div role="tablist" aria-label="Tipo de solicitud" className="flex border-b border-borde/70">{tab("cotizacion", "Pedir cotización")}{tab("test", "Agendar test drive")}</div>
        <div className="p-5" role="tabpanel">
          {pestana === "cotizacion" ? (
            <FormAccion key="c" accion={pedirCotizacion} limpiar className="space-y-3" ocultos={{ unidad: unidadId, simulacion: adjuntar ? JSON.stringify(sim) : "" }}>
              <Contacto />
              <AreaTexto etiqueta="Mensaje (opcional)" name="mensaje" maxLength={600} placeholder="Ej.: quiero entregar mi usado como parte de pago." />
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={adjuntar} onChange={(e) => setAdjuntar(e.target.checked)} className="h-4 w-4 accent-[#2c4a6e]" />Adjuntar mi simulación ({sim.cuotas} cuotas de {moneda(sim.cuota)})</label>
              <BotonEnviar variante="primario" className="w-full">Pedir cotización</BotonEnviar>
            </FormAccion>
          ) : (
            <FormAccion key="t" accion={agendarTestDrive} limpiar className="space-y-3" ocultos={{ unidad: unidadId }}>
              <div className="grid grid-cols-2 gap-3">
                <Entrada etiqueta="Fecha" name="fecha" type="date" min={fechaMinima} required />
                <Entrada etiqueta="Horario" name="hora" type="time" min="09:00" max="18:00" step={900} required defaultValue="10:00" ayuda="Entre las 9 y las 18 h." />
              </div>
              <Contacto />
              <p className="text-xs text-medio">El test drive queda pendiente hasta que el vendedor lo confirme.</p>
              <BotonEnviar variante="primario" className="w-full">Agendar test drive</BotonEnviar>
            </FormAccion>
          )}
        </div>
      </section>
    </>
  );
}
