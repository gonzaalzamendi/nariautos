import type { Rol } from "./tipos";

// Capa 1 (menú) y capa 2 (middleware) leen esta misma tabla.
export const INICIO: Record<Rol, string> = { vendedor: "/vendedor", asesor: "/asesor", jefe_taller: "/taller", gerencia: "/gerencia" };
export const NOMBRE_ROL: Record<Rol, string> = { vendedor: "Vendedor", asesor: "Asesor de servicio", jefe_taller: "Jefe de taller", gerencia: "Gerencia" };

const ZONAS: { prefijo: string; roles: Rol[] }[] = [
  { prefijo: "/vendedor", roles: ["vendedor"] },
  { prefijo: "/asesor", roles: ["asesor"] },
  { prefijo: "/taller", roles: ["jefe_taller"] },
  { prefijo: "/gerencia", roles: ["gerencia"] },
  { prefijo: "/cuenta", roles: ["vendedor", "asesor", "jefe_taller", "gerencia"] },
  { prefijo: "/api/cotizacion", roles: ["vendedor", "gerencia"] },
  { prefijo: "/api/csv", roles: ["gerencia"] },
];

/** Roles que pueden abrir la ruta, o null si es pública. */
export function rolesDeRuta(ruta: string): Rol[] | null {
  const z = ZONAS.find((z) => ruta === z.prefijo || ruta.startsWith(z.prefijo + "/"));
  return z ? z.roles : null;
}
export function puedeAcceder(rol: Rol | null, ruta: string): boolean {
  const roles = rolesDeRuta(ruta);
  return roles === null || (rol !== null && roles.includes(rol));
}

export const MENU: Record<Rol, { href: string; texto: string }[]> = {
  vendedor: [
    { href: "/vendedor", texto: "Consultas" },
    { href: "/vendedor/test-drives", texto: "Test drives" },
    { href: "/vendedor/unidades", texto: "Mis unidades" },
    { href: "/vendedor/stock", texto: "Stock de la red" },
    { href: "/vendedor/promociones", texto: "Promociones" },
    { href: "/vendedor/tasaciones", texto: "Tasaciones" },
  ],
  asesor: [
    { href: "/asesor", texto: "Agenda" },
    { href: "/asesor/recordatorios", texto: "Recordatorios" },
    { href: "/asesor/historial", texto: "Historial" },
    { href: "/asesor/derivar", texto: "Nuevo turno" },
  ],
  jefe_taller: [
    { href: "/taller", texto: "Órdenes de trabajo" },
    { href: "/taller/en-proceso", texto: "Órdenes en proceso" },
    { href: "/taller/agenda", texto: "Agenda" },
    { href: "/taller/demorados", texto: "Demorados" },
    { href: "/taller/repuestos", texto: "Repuestos" },
    { href: "/taller/mecanicos", texto: "Mecánicos" },
    { href: "/taller/historial", texto: "Historial" },
  ],
  gerencia: [
    { href: "/gerencia", texto: "Tablero" },
    { href: "/gerencia/consultas", texto: "Consultas" },
    { href: "/gerencia/unidades", texto: "Stock" },
    { href: "/gerencia/promociones", texto: "Promociones" },
    { href: "/gerencia/transferencias", texto: "Transferencias" },
    { href: "/gerencia/empleados", texto: "Empleados" },
    { href: "/gerencia/sucursales", texto: "Sucursales" },
    { href: "/gerencia/servicios", texto: "Servicios" },
    { href: "/gerencia/auditoria", texto: "Auditoría" },
  ],
};
