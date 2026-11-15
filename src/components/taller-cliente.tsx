"use client";
import { useState } from "react";
import { reprogramarTurnoAsesor } from "@/lib/acciones/taller";
import { BotonEnviar, FormAccion } from "./formularios";
import { SelectorHorario } from "./turnos";
export { BotonesAviso } from "./avisos";

export function ReprogramarAsesor({ turno, taller, servicio }: { turno: number; taller: number; servicio: number }) {
  const [h, setH] = useState<{ fecha: string; hora: string } | null>(null);
  return (
    <FormAccion accion={reprogramarTurnoAsesor} ocultos={{ turno, fecha: h?.fecha, hora: h?.hora }} alTerminar={() => setH(null)}>
      <SelectorHorario taller={taller} servicio={servicio} valor={h} onChange={setH} />
      <div className="mt-3"><BotonEnviar variante="contorno">Reprogramar turno</BotonEnviar></div>
    </FormAccion>
  );
}
