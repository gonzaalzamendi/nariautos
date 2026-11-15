import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import type { Sesion } from "./tipos";

export const COOKIE_SESION = "nari_sesion";
export const MINUTOS_INACTIVIDAD = 15;

const clave = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("Falta SESSION_SECRET");
  return new TextEncoder().encode(s);
};

export async function firmarSesion(s: Sesion): Promise<string> {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt()
    .setExpirationTime(`${MINUTOS_INACTIVIDAD}m`).sign(clave());
}
export async function leerToken(token: string | undefined): Promise<Sesion | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    const { id, nombre, rol, sucursalId, cambiarPin } = payload as any;
    if (typeof id !== "number" || typeof rol !== "string") return null;
    return { id, nombre, rol: rol as Sesion["rol"], sucursalId: sucursalId ?? null, ...(cambiarPin ? { cambiarPin: true } : {}) };
  } catch { return null; }
}
export const opcionesCookie = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const,
  path: "/", maxAge: MINUTOS_INACTIVIDAD * 60,
};
