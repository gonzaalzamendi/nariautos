import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { puedeAcceder, MENU, INICIO } from "@/lib/permisos";
import { COOKIE_SESION, firmarSesion, leerToken } from "@/lib/token";
import { middleware } from "@/middleware";
import type { Rol, Sesion } from "@/lib/tipos";

const ROLES: Rol[] = ["vendedor", "asesor", "jefe_taller", "gerencia"];
const pedir = async (ruta: string, s?: Sesion) => {
  const req = new NextRequest(`https://nariautos.test${ruta}`, s ? { headers: { cookie: `${COOKIE_SESION}=${await firmarSesion(s)}` } } : undefined);
  return middleware(req);
};
const laura: Sesion = { id: 1, nombre: "Laura Méndez", rol: "vendedor", sucursalId: 3 };

describe("matriz de permisos", () => {
  it("cada rol solo accede a su panel", () => {
    for (const rol of ROLES) for (const otro of ROLES) expect(puedeAcceder(rol, INICIO[otro] + "/x")).toBe(rol === otro);
  });
  it("el menú de cada rol solo contiene rutas permitidas para ese rol", () => {
    for (const rol of ROLES) for (const item of MENU[rol]) expect(puedeAcceder(rol, item.href)).toBe(true);
  });
  it("la web pública no requiere sesión y los paneles sí", () => {
    for (const r of ["/", "/catalogo", "/catalogo/3", "/turnos", "/turnos/seguir", "/acceso"]) expect(puedeAcceder(null, r)).toBe(true);
    for (const r of ["/vendedor", "/asesor", "/taller", "/gerencia", "/cuenta", "/api/csv/turnos"]) expect(puedeAcceder(null, r)).toBe(false);
  });
});

describe("middleware", () => {
  it("un vendedor no puede entrar al panel de gerencia: es redirigido a su panel", async () => {
    const res = await pedir("/gerencia/empleados", laura);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/vendedor");
  });
  it("un vendedor tampoco puede exportar CSV ni abrir la agenda del taller", async () => {
    for (const r of ["/api/csv/empleados", "/asesor", "/taller/demorados"]) expect(new URL((await pedir(r, laura)).headers.get("location")!).pathname).toBe("/vendedor");
  });
  it("sin sesión, cualquier panel redirige a /acceso", async () => {
    for (const r of ["/vendedor", "/asesor/turnos/1", "/taller", "/gerencia", "/cuenta"]) {
      const res = await pedir(r);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/acceso");
    }
  });
  it("con el rol correcto deja pasar y renueva la cookie httpOnly", async () => {
    const res = await pedir("/vendedor/stock", laura);
    expect(res.headers.get("location")).toBeNull();
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toContain(COOKIE_SESION);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie.toLowerCase()).toContain("samesite=strict");
  });
  it("con el PIN vencido solo se puede entrar a cambiarlo", async () => {
    const vencido = { ...laura, cambiarPin: true };
    for (const r of ["/vendedor", "/vendedor/unidades"]) expect(new URL((await pedir(r, vencido)).headers.get("location")!).pathname).toBe("/cuenta");
    expect((await pedir("/cuenta", vencido)).headers.get("location")).toBeNull();
  });
  it("una cookie adulterada no sirve como sesión", async () => {
    const token = await firmarSesion(laura);
    const [c, p, f] = token.split(".");
    const falso = [c, Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, "base64url").toString()), rol: "gerencia" })).toString("base64url"), f].join(".");
    expect(await leerToken(falso)).toBeNull();
    expect((await leerToken(token))?.rol).toBe("vendedor");
  });
});
