export type Rol = "vendedor" | "asesor" | "jefe_taller" | "gerencia";
export type Sesion = { id: number; nombre: string; rol: Rol; sucursalId: number | null; cambiarPin?: boolean };
export type Estado = { ok?: boolean; error?: string; mensaje?: string; datos?: any };
