"use client";
import { startTransition, useActionState, useState } from "react";
import { reprogramarTurnoAsesor, registrarAviso } from "@/lib/acciones/taller";
import { linkEmail, linkWhatsApp } from "@/lib/formato";
import { claseBoton } from "./ui";
import { BotonEnviar, FormAccion, Mensajes } from "./formularios";
import { SelectorHorario } from "./turnos";

/** Abre WhatsApp o el correo con el mensaje prearmado y registra el aviso en el historial. */
export function BotonesAviso({ telefono, email, mensaje, turno, notificacion }: { telefono: string; email?: string | null; mensaje: string; turno?: number; notificacion?: number }) {
  const [estado, enviar, pendiente] = useActionState(registrarAviso, {});
  const texto = mensaje.replace("{SITIO}", typeof window === "undefined" ? "" : window.location.origin);
  const avisar = (canal: "whatsapp" | "email") => {
    window.open(canal === "whatsapp" ? linkWhatsApp(telefono, texto) : linkEmail(email!, "Tu vehículo en NariAutos", texto), "_blank", "noopener");
    const fd = new FormData(); fd.set("canal", canal); fd.set("mensaje", texto);
    if (turno) fd.set("turno", String(turno)); if (notificacion) fd.set("notificacion", String(notificacion));
    startTransition(() => enviar(fd));
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pendiente} onClick={() => avisar("whatsapp")} className={claseBoton("secundario", true)}>Avisar por WhatsApp</button>
        {email && <button type="button" disabled={pendiente} onClick={() => avisar("email")} className={claseBoton("contorno", true)}>Avisar por email</button>}
      </div>
      {(estado.error || estado.mensaje) && <div className="mt-2"><Mensajes estado={estado} /></div>}
    </div>
  );
}

export function ReprogramarAsesor({ turno, taller, servicio }: { turno: number; taller: number; servicio: number }) {
  const [h, setH] = useState<{ fecha: string; hora: string } | null>(null);
  return (
    <FormAccion accion={reprogramarTurnoAsesor} ocultos={{ turno, fecha: h?.fecha, hora: h?.hora }} alTerminar={() => setH(null)}>
      <SelectorHorario taller={taller} servicio={servicio} valor={h} onChange={setH} />
      <div className="mt-3"><BotonEnviar variante="contorno">Reprogramar turno</BotonEnviar></div>
    </FormAccion>
  );
}
