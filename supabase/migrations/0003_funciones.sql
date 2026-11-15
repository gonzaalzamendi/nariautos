-- Reglas de negocio en la base: validaciones de taller, agenda sin sobreturno, PIN y mantenimiento.
-- Todas las funciones son SECURITY INVOKER: solo funcionan para el servidor porque dependen de RLS.

create or replace function hoy_ar() returns date language sql stable set search_path = '' as
$$ select (now() at time zone 'America/Argentina/Buenos_Aires')::date $$;

-- 1) El taller de referencia siempre debe ser una sucursal con taller
create or replace function validar_sucursal() returns trigger language plpgsql set search_path = public as $$
begin
  if not new.tiene_taller then
    if not exists (select 1 from sucursales where id = new.taller_referencia_id and tiene_taller) then
      raise exception 'NARI: El taller de referencia debe ser una sucursal con taller.';
    end if;
    if exists (select 1 from sucursales where taller_referencia_id = new.id) then
      raise exception 'NARI: Otras sucursales derivan a este taller. Cambiá primero su taller de referencia.';
    end if;
  end if;
  return new;
end $$;
create trigger sucursales_validar before insert or update on sucursales for each row execute function validar_sucursal();

-- 2) Ningún turno puede realizarse en una sucursal sin taller
create or replace function validar_turno() returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from sucursales where id = new.sucursal_taller_id and tiene_taller) then
    raise exception 'NARI: La sucursal elegida no tiene taller. Elegí un taller de la red.';
  end if;
  return new;
end $$;
create trigger turnos_validar before insert or update of sucursal_taller_id on turnos for each row execute function validar_turno();

-- 3) Agenda compartida: franjas de 30 minutos según horario, duración y boxes
create or replace function disponibilidad_taller(p_taller int, p_fecha date, p_duracion int, p_excluir int default null)
returns table (hora time, libres int) language sql stable set search_path = public as $$
  select g.h::time as hora,
         (s.capacidad_boxes - (select count(*) from turnos t
            where t.sucursal_taller_id = s.id and t.fecha = p_fecha
              and t.estado not in ('cancelado','rechazado','ausente')
              and (p_excluir is null or t.id <> p_excluir)
              and t.hora < g.h::time + make_interval(mins => p_duracion)
              and t.hora + make_interval(mins => t.duracion_min) > g.h::time))::int as libres
  from sucursales s,
       generate_series(p_fecha + s.taller_abre, p_fecha + s.taller_cierra - make_interval(mins => p_duracion), interval '30 minutes') g(h)
  where s.id = p_taller and s.tiene_taller and extract(isodow from p_fecha) between 1 and 5
    and p_fecha >= hoy_ar()
  order by 1;
$$;

-- Verificación con bloqueo: impide el sobreturno aunque dos reservas lleguen a la vez
create or replace function verificar_cupo(p_taller int, p_fecha date, p_hora time, p_duracion int, p_excluir int default null)
returns void language plpgsql set search_path = public as $$
declare v_libres int;
begin
  perform pg_advisory_xact_lock(p_taller, (p_fecha - date '2000-01-01'));
  if not exists (select 1 from sucursales where id = p_taller and tiene_taller) then
    raise exception 'NARI: La sucursal elegida no tiene taller. Elegí un taller de la red.';
  end if;
  select d.libres into v_libres from disponibilidad_taller(p_taller, p_fecha, p_duracion, p_excluir) d where d.hora = p_hora;
  if v_libres is null then
    raise exception 'NARI: Ese día u horario está fuera de la atención del taller. Elegí otro horario.';
  end if;
  if v_libres <= 0 then
    raise exception 'NARI: Ese horario ya no tiene lugar. Elegí otro horario disponible.';
  end if;
end $$;

create or replace function generar_codigo_turno() returns text language plpgsql set search_path = public as $$
declare v text; abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  loop
    select string_agg(substr(abc, 1 + floor(random() * length(abc))::int, 1), '') into v from generate_series(1, 6);
    exit when not exists (select 1 from turnos where codigo = v);
  end loop;
  return v;
end $$;

create or replace function reservar_turno(
  p_servicio int, p_taller int, p_origen int, p_canal text, p_fecha date, p_hora time,
  p_patente text, p_marca text, p_modelo text, p_anio int, p_km int,
  p_nombre text, p_telefono text, p_email text default null,
  p_observaciones text default null, p_empleado int default null)
returns turnos language plpgsql set search_path = public as $$
declare v_dur int; v_cliente int; v_vehiculo int; v_turno turnos;
begin
  select duracion_min into v_dur from servicios where id = p_servicio and activo;
  if v_dur is null then raise exception 'NARI: El servicio elegido no está disponible.'; end if;
  perform verificar_cupo(p_taller, p_fecha, p_hora, v_dur);

  select id into v_cliente from clientes where telefono = p_telefono order by id limit 1;
  if v_cliente is null then
    insert into clientes (nombre, telefono, email) values (p_nombre, p_telefono, nullif(p_email, '')) returning id into v_cliente;
  else
    update clientes set nombre = p_nombre, email = coalesce(nullif(p_email, ''), email) where id = v_cliente;
  end if;

  insert into vehiculos (patente, marca, modelo, anio, km_actual, cliente_id)
  values (upper(p_patente), p_marca, p_modelo, p_anio, p_km, v_cliente)
  on conflict (patente) do update set km_actual = greatest(vehiculos.km_actual, excluded.km_actual), cliente_id = excluded.cliente_id
  returning id into v_vehiculo;

  insert into turnos (codigo, servicio_id, vehiculo_id, cliente_id, sucursal_origen_id, sucursal_taller_id, canal_origen, fecha, hora, duracion_min, observaciones, creado_por)
  values (generar_codigo_turno(), p_servicio, v_vehiculo, v_cliente, p_origen, p_taller, p_canal, p_fecha, p_hora, v_dur, nullif(p_observaciones, ''), p_empleado)
  returning * into v_turno;

  insert into eventos_turno (turno_id, estado, detalle, empleado_id)
  values (v_turno.id, 'solicitado', case when v_turno.derivado then 'Turno derivado desde otra sucursal' else 'Turno solicitado' end, p_empleado);
  return v_turno;
end $$;

create or replace function reprogramar_turno(p_turno int, p_fecha date, p_hora time, p_empleado int default null)
returns turnos language plpgsql set search_path = public as $$
declare v turnos;
begin
  select * into v from turnos where id = p_turno for update;
  if v.id is null or v.estado not in ('solicitado','confirmado') then
    raise exception 'NARI: Este turno ya no se puede reprogramar.';
  end if;
  perform verificar_cupo(v.sucursal_taller_id, p_fecha, p_hora, v.duracion_min, v.id);
  update turnos set fecha = p_fecha, hora = p_hora where id = p_turno returning * into v;
  insert into eventos_turno (turno_id, estado, detalle, empleado_id)
  values (p_turno, v.estado, 'Reprogramado para el ' || to_char(p_fecha, 'DD/MM/YYYY') || ' a las ' || to_char(p_hora, 'HH24:MI'), p_empleado);
  return v;
end $$;

-- 4) Acceso con PIN: hash bcrypt, registro de intentos y bloqueo de 5 minutos tras 5 fallos
create or replace function verificar_pin(p_empleado int, p_pin text, p_ip text default null)
returns jsonb language plpgsql set search_path = public, extensions as $$
declare e empleados;
begin
  select * into e from empleados where id = p_empleado and activo for update;
  if e.id is null then return jsonb_build_object('ok', false, 'motivo', 'invalido'); end if;
  if e.bloqueado_hasta is not null and e.bloqueado_hasta > now() then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'hasta', e.bloqueado_hasta);
  end if;
  if e.pin_hash = crypt(p_pin, e.pin_hash) then
    update empleados set intentos_fallidos = 0, bloqueado_hasta = null where id = e.id;
    insert into intentos_acceso (empleado_id, exitoso, ip) values (e.id, true, p_ip);
    return jsonb_build_object('ok', true, 'id', e.id, 'nombre', e.nombre, 'rol', e.rol, 'sucursal_id', e.sucursal_id);
  end if;
  insert into intentos_acceso (empleado_id, exitoso, ip) values (e.id, false, p_ip);
  if e.intentos_fallidos + 1 >= 5 then
    update empleados set intentos_fallidos = 0, bloqueado_hasta = now() + interval '5 minutes' where id = e.id;
    return jsonb_build_object('ok', false, 'motivo', 'bloqueado', 'hasta', now() + interval '5 minutes');
  end if;
  update empleados set intentos_fallidos = intentos_fallidos + 1 where id = e.id;
  return jsonb_build_object('ok', false, 'motivo', 'pin', 'restantes', 5 - (e.intentos_fallidos + 1));
end $$;

create or replace function hash_pin(p_pin text) returns text language sql set search_path = extensions as
$$ select crypt(p_pin, gen_salt('bf', 10)) $$;

-- 5) Mantenimiento automático: reservas vencidas, ausentes y cola de recordatorios
create or replace function mantenimiento() returns void language plpgsql set search_path = public as $$
begin
  with v as (update reservas_unidad set estado = 'vencida' where estado = 'activa' and vence_en < now() returning unidad_id)
  update unidades u set estado = 'disponible' from v where u.id = v.unidad_id and u.estado = 'reservada';

  with a as (update turnos set estado = 'ausente' where estado in ('solicitado','confirmado') and fecha < hoy_ar() returning id)
  insert into eventos_turno (turno_id, estado, detalle) select id, 'ausente', 'El cliente no se presentó' from a;

  insert into notificaciones (tipo, turno_id, vehiculo_id, cliente_id, sucursal_id, mensaje, clave, programada_para)
  select 'recordatorio_turno', t.id, t.vehiculo_id, t.cliente_id, t.sucursal_taller_id,
         'Hola ' || split_part(c.nombre, ' ', 1) || ', te recordamos tu turno en NariAutos ' || s.nombre || ' el ' || to_char(t.fecha, 'DD/MM')
           || ' a las ' || to_char(t.hora, 'HH24:MI') || ' para tu vehículo patente ' || v.patente || '. Código de turno: ' || t.codigo || '.',
         'turno-' || t.id, t.fecha - 1
  from turnos t join clientes c on c.id = t.cliente_id join vehiculos v on v.id = t.vehiculo_id join sucursales s on s.id = t.sucursal_taller_id
  where t.estado in ('solicitado','confirmado') and t.fecha between hoy_ar() and hoy_ar() + 1
  on conflict (clave) do nothing;

  insert into notificaciones (tipo, vehiculo_id, cliente_id, sucursal_id, mensaje, clave)
  select 'recordatorio_service', v.id, v.cliente_id, u.sucursal_id,
         'Hola ' || split_part(c.nombre, ' ', 1) || ', tu vehículo patente ' || v.patente || ' hizo su último service el ' || to_char(u.fecha, 'DD/MM/YYYY')
           || ' con ' || u.km || ' km. Ya corresponde el próximo. Podés sacar turno en la web de NariAutos.',
         'service-' || v.id || '-' || to_char(hoy_ar(), 'YYYY')
  from vehiculos v join clientes c on c.id = v.cliente_id
  join lateral (select h.fecha, h.km, h.sucursal_id from historial_service h where h.vehiculo_id = v.id order by h.fecha desc limit 1) u on true
  where u.sucursal_id is not null and (u.fecha < hoy_ar() - interval '6 months' or v.km_actual - u.km >= 10000)
    and not exists (select 1 from turnos t where t.vehiculo_id = v.id and t.estado in ('solicitado','confirmado','recibido','en_reparacion','listo'))
  on conflict (clave) do nothing;
end $$;
