-- Índices sugeridos por el advisor de rendimiento de Supabase (claves foráneas sin índice)
create index if not exists empleados_sucursal_idx on empleados(sucursal_id);
create index if not exists mecanicos_sucursal_idx on mecanicos(sucursal_id);
create index if not exists sucursales_referencia_idx on sucursales(taller_referencia_id);
