-- Vistas (security_invoker: respetan RLS) para el taller y los indicadores de gerencia

create view v_ordenes with (security_invoker = true) as
select o.id, o.turno_id, o.estado, o.km_ingreso, o.combustible_nivel, o.observaciones, o.danos_visibles, o.trabajos_solicitados,
       o.trabajos_realizados, o.km_egreso, o.abierta_en, o.cerrada_en,
       t.codigo, t.fecha, t.hora, t.sucursal_taller_id, t.sucursal_origen_id, t.derivado, t.estado as turno_estado,
       s.nombre as servicio, s.duracion_min, v.patente, v.marca, v.modelo, c.nombre as cliente,
       a.id as asignacion_id, a.mecanico_id, m.nombre as mecanico, a.minutos_estimados, a.inicio_en, a.fin_en, a.motivo_demora,
       case when a.inicio_en is null then null else round(extract(epoch from (coalesce(a.fin_en, now()) - a.inicio_en)) / 60)::int end as minutos_reales,
       coalesce(a.inicio_en is not null and extract(epoch from (coalesce(a.fin_en, now()) - a.inicio_en)) / 60 > a.minutos_estimados, false) as demorado
from ordenes_trabajo o
join turnos t on t.id = o.turno_id
join servicios s on s.id = t.servicio_id
join vehiculos v on v.id = t.vehiculo_id
join clientes c on c.id = t.cliente_id
left join asignaciones a on a.orden_id = o.id
left join mecanicos m on m.id = a.mecanico_id;

create view v_kpi_ventas with (security_invoker = true) as
select sucursal_id, date_trunc('month', fecha_venta)::date as mes, count(*)::int as unidades, sum(coalesce(precio_venta, precio)) as monto
from unidades where estado = 'vendida' and fecha_venta is not null group by 1, 2;

create view v_kpi_stock with (security_invoker = true) as
select sucursal_id,
       count(*) filter (where estado = 'disponible')::int as disponibles,
       count(*) filter (where estado = 'reservada')::int as reservadas,
       coalesce(round(avg(current_date - fecha_ingreso) filter (where estado <> 'vendida')), 0)::int as antiguedad_prom_dias,
       count(*) filter (where estado <> 'vendida' and current_date - fecha_ingreso > 90)::int as mas_de_90_dias,
       coalesce(sum(precio) filter (where estado <> 'vendida'), 0) as valor_stock
from unidades group by 1;

create view v_kpi_consultas with (security_invoker = true) as
select sucursal_id, date_trunc('month', creado_en)::date as mes, canal,
       count(*)::int as total,
       count(*) filter (where estado = 'ganada')::int as ganadas,
       count(*) filter (where estado = 'perdida')::int as perdidas,
       count(primera_respuesta_en)::int as respondidas,
       coalesce(sum(extract(epoch from (primera_respuesta_en - creado_en)) / 3600), 0)::numeric(12,2) as horas_respuesta
from consultas group by 1, 2, 3;

create view v_kpi_turnos with (security_invoker = true) as
select sucursal_taller_id as sucursal_id, date_trunc('month', fecha)::date as mes, estado, count(*)::int as total
from turnos group by 1, 2, 3;

create view v_kpi_derivaciones with (security_invoker = true) as
select sucursal_origen_id, sucursal_taller_id, date_trunc('month', fecha)::date as mes, count(*)::int as total
from turnos where derivado group by 1, 2, 3;

create view v_kpi_ocupacion with (security_invoker = true) as
select t.sucursal_taller_id as sucursal_id, t.fecha,
       sum(t.duracion_min)::int as minutos_ocupados,
       (max(s.capacidad_boxes) * extract(epoch from (max(s.taller_cierra) - max(s.taller_abre))) / 60)::int as minutos_capacidad
from turnos t join sucursales s on s.id = t.sucursal_taller_id
where t.estado not in ('cancelado','rechazado','ausente') group by 1, 2;

create view v_kpi_demoras with (security_invoker = true) as
select sucursal_taller_id as sucursal_id, date_trunc('month', fecha)::date as mes,
       count(*) filter (where inicio_en is not null)::int as trabajos,
       count(*) filter (where demorado)::int as demorados,
       coalesce(sum(greatest(minutos_reales - minutos_estimados, 0)) filter (where demorado), 0)::int as minutos_demora
from v_ordenes group by 1, 2;

create view v_kpi_satisfaccion with (security_invoker = true) as
select t.sucursal_taller_id as sucursal_id, date_trunc('month', e.creado_en)::date as mes,
       count(*)::int as cantidad, sum(e.puntaje)::int as suma
from encuestas e join turnos t on t.id = e.turno_id group by 1, 2;
