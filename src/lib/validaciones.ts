import { z } from "zod";

export const normalizarPatente = (p: unknown) => String(p ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const texto = (max = 200) => z.string().trim().max(max);
export const zEntero = z.coerce.number().int();
export const zId = z.coerce.number().int().positive();
export const zFecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí una fecha válida.");
export const zHora = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Elegí un horario válido.");
export const zPatente = z.preprocess(normalizarPatente, z.string().regex(/^([A-Z]{2}\d{3}[A-Z]{2}|[A-Z]{3}\d{3})$/, "Revisá la patente: debe tener el formato AB123CD o ABC123."));
export const zTelefono = z.preprocess((v) => String(v ?? "").replace(/\D/g, ""), z.string().min(8, "Revisá el teléfono: ingresá el número con código de área, sin 0 ni 15.").max(13, "Revisá el teléfono: tiene demasiados dígitos."));
export const zEmailOpcional = z.preprocess((v) => (v == null || String(v).trim() === "" ? undefined : String(v).trim()), z.string().email("Revisá el email: falta el @ o el dominio.").optional());
export const zPin = z.string().regex(/^\d{4}$/, "El PIN debe tener exactamente 4 dígitos.");
export const zOpcional = (max = 1000) => z.preprocess((v) => (v == null || String(v).trim() === "" ? undefined : String(v).trim()), z.string().max(max).optional());

export const zContacto = z.object({
  nombre: texto(80).min(3, "Ingresá tu nombre y apellido."),
  telefono: zTelefono,
  email: zEmailOpcional,
});
export const zVehiculo = z.object({
  patente: zPatente,
  marca: texto(40).min(2, "Ingresá la marca del vehículo."),
  modelo: texto(40).min(1, "Ingresá el modelo del vehículo."),
  anio: zEntero.min(1960, "Revisá el año del vehículo.").max(new Date().getFullYear() + 1, "Revisá el año del vehículo."),
  km: zEntero.min(0, "Revisá los kilómetros.").max(2000000, "Revisá los kilómetros."),
});
export const zTurno = zContacto.merge(zVehiculo).extend({
  servicio: zId, taller: zId, origen: zId, fecha: zFecha, hora: zHora, observaciones: zOpcional(500),
});
export const zUnidad = z.object({
  marca: texto(40).min(2, "Ingresá la marca."), modelo: texto(40).min(1, "Ingresá el modelo."), version: zOpcional(60),
  anio: zEntero.min(1960, "Revisá el año.").max(new Date().getFullYear() + 1, "Revisá el año."),
  km: zEntero.min(0, "Revisá los kilómetros."),
  condicion: z.enum(["0km", "usado"]), precio: z.coerce.number().positive("Ingresá un precio mayor a cero."),
  combustible: z.enum(["nafta", "diesel", "hibrido", "electrico", "gnc"]), transmision: z.enum(["manual", "automatica"]),
  color: zOpcional(30), descripcion: zOpcional(1000),
});

/** Devuelve el primer mensaje de error de Zod en lenguaje claro. */
export function primerError(e: z.ZodError): string {
  const i = e.issues[0];
  return i.message && !/^(Required|Invalid|Expected|Too|String|Number)/.test(i.message) ? i.message : `Revisá el campo «${String(i.path[0] ?? "formulario")}»: falta completarlo o tiene un valor inválido.`;
}
export const objeto = (fd: FormData) => Object.fromEntries(fd.entries());
