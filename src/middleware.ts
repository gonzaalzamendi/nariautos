import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, firmarSesion, leerToken, opcionesCookie } from "@/lib/token";
import { INICIO, rolesDeRuta } from "@/lib/permisos";

// Capa 2 de permisos: bloquea las rutas no permitidas para el rol y renueva la sesión (15 min de inactividad).
export async function middleware(req: NextRequest) {
  const ruta = req.nextUrl.pathname;
  const roles = rolesDeRuta(ruta);
  const sesion = await leerToken(req.cookies.get(COOKIE_SESION)?.value);

  if (roles) {
    if (!sesion) {
      const url = new URL("/acceso", req.url);
      if (req.cookies.has(COOKIE_SESION)) url.searchParams.set("motivo", "inactividad");
      return NextResponse.redirect(url);
    }
    if (!roles.includes(sesion.rol)) return NextResponse.redirect(new URL(INICIO[sesion.rol], req.url));
  }
  const res = NextResponse.next();
  if (sesion && roles) res.cookies.set(COOKIE_SESION, await firmarSesion(sesion), opcionesCookie);
  return res;
}
export const config = { matcher: ["/vendedor/:path*", "/asesor/:path*", "/taller/:path*", "/gerencia/:path*", "/cuenta/:path*", "/api/cotizacion/:path*", "/api/csv/:path*"] };
