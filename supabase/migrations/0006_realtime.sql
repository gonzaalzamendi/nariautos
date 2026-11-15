-- Tiempo real: cada cambio en turnos u órdenes emite un aviso por Supabase Realtime (Broadcast)
-- sin datos personales; los paneles abiertos se actualizan al recibirlo.
create or replace function private.avisar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    perform realtime.send(jsonb_build_object('tabla', tg_table_name, 'op', tg_op), 'cambio', 'nariautos-taller', false);
  exception when others then null; -- un fallo del aviso nunca debe impedir la operación
  end;
  return null;
end $$;
revoke all on function private.avisar_cambio() from public, anon, authenticated;
create trigger turnos_aviso after insert or update or delete on turnos for each statement execute function private.avisar_cambio();
create trigger ordenes_aviso after insert or update or delete on ordenes_trabajo for each statement execute function private.avisar_cambio();
create trigger asignaciones_aviso after insert or update or delete on asignaciones for each statement execute function private.avisar_cambio();
