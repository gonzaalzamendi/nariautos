"use client";
import { startTransition, useActionState } from "react";
import { registrarAviso } from "@/lib/acciones/taller";
import { linkWhatsApp } from "@/lib/formato";
import { BotonEmail } from "./email";
import { claseBoton } from "./ui";
import { Mensajes } from "./formularios";

/** Abre WhatsApp o el correo con el mensaje prearmado y registra el aviso en el historial. */
export function BotonesAviso({ telefono, email, mensaje, turno, notificacion }: { telefono: string; email?: string | null; mensaje: string; turno?: number; notificacion?: number }) {
  const [estado, enviar, pendiente] = useActionState(registrarAviso, {});
  const texto = mensaje.replace("{SITIO}", typeof window === "undefined" ? "" : window.location.origin);
  const registrar = (canal: "whatsapp" | "email") => {
    const fd = new FormData(); fd.set("canal", canal); fd.set("mensaje", texto);
    if (turno) fd.set("turno", String(turno)); if (notificacion) fd.set("notificacion", String(notificacion));
    startTransition(() => enviar(fd));
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pendiente} onClick={() => { window.open(linkWhatsApp(telefono, texto), "_blank", "noopener"); registrar("whatsapp"); }} className={claseBoton("secundario", true)}>Avisar por WhatsApp</button>
        {email && <BotonEmail email={email} asunto="Tu vehículo en NariAutos" mensaje={texto} deshabilitado={pendiente} alUsar={() => registrar("email")} />}
      </div>
      {(estado.error || estado.mensaje) && <div className="mt-2"><Mensajes estado={estado} /></div>}
    </div>
  );
}

