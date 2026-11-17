-- Permite que Gerencia elimine empleados: el historial se conserva y la referencia al empleado queda vacía.
alter table reservas_unidad alter column vendedor_id drop not null;
alter table transferencias_unidad alter column solicitada_por drop not null;

do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tabla, c.conname, a.attname as columna
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.empleados'::regclass and c.confdeltype = 'a' -- «no action»
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
    execute format('alter table %s add constraint %I foreign key (%I) references empleados(id) on delete set null', r.tabla, r.conname, r.columna);
  end loop;
end $$;
