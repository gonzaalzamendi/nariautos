-- Row Level Security en todas las tablas.
-- Anónimo: solo lectura de catálogo, fotos, promociones vigentes, sucursales y servicios.
-- Todo lo demás: únicamente el servidor (private.es_servidor()).
do $$
declare t text; cond text;
  publicas constant jsonb := '{
    "sucursales": "activa",
    "servicios": "activo",
    "unidades": "estado <> ''vendida''",
    "fotos_unidad": "true",
    "promociones": "activa and current_date between vigente_desde and vigente_hasta",
    "promocion_unidad": "true"}';
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to anon', t);
    cond := publicas ->> t;
    if cond is not null then
      execute format('create policy lectura on public.%I for select to anon using ((%s) or (select private.es_servidor()))', t, cond);
      execute format('create policy servidor_alta on public.%I for insert to anon with check ((select private.es_servidor()))', t);
      execute format('create policy servidor_cambio on public.%I for update to anon using ((select private.es_servidor())) with check ((select private.es_servidor()))', t);
      execute format('create policy servidor_baja on public.%I for delete to anon using ((select private.es_servidor()))', t);
    else
      execute format('create policy servidor on public.%I for all to anon using ((select private.es_servidor())) with check ((select private.es_servidor()))', t);
    end if;
  end loop;
  for t in select viewname from pg_views where schemaname = 'public' loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
  end loop;
end $$;
grant usage on all sequences in schema public to anon;
revoke execute on all functions in schema public from public, authenticated;
grant execute on all functions in schema public to anon;
