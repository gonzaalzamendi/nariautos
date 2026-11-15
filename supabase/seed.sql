-- Datos de prueba de NariAutos. Se puede volver a ejecutar: limpia y recarga todo.
truncate sucursales, empleados, mecanicos, clientes, vehiculos, unidades, fotos_unidad, promociones, promocion_unidad,
  consultas, seguimientos_consulta, test_drives, servicios, turnos, eventos_turno, ordenes_trabajo, asignaciones,
  historial_service, notificaciones, encuestas, tasaciones, reservas_unidad, transferencias_unidad, auditoria,
  intentos_acceso, solicitudes_publicas, repuestos, repuestos_orden restart identity cascade;

-- n-ésimo día hábil respecto de hoy (0 = hoy o el próximo lunes si es fin de semana)
create or replace function pg_temp.habil(n int) returns date language plpgsql as $$
declare d date := hoy_ar(); paso int := sign(n); k int := abs(n);
begin
  while extract(isodow from d) > 5 loop d := d + 1; end loop;
  while k > 0 loop
    d := d + paso;
    if extract(isodow from d) <= 5 then k := k - 1; end if;
  end loop;
  return d;
end $$;
create or replace function pg_temp.ts(d date, h time) returns timestamptz language sql as
$$ select (d + h) at time zone 'America/Argentina/Buenos_Aires' $$;

insert into sucursales (nombre, direccion, localidad, telefono, email, horario_atencion, lat, lng, tiene_taller, capacidad_boxes, taller_abre, taller_cierra) values
 ('Casa Central', 'Av. Colón 1250', 'Tandil', '0249 442-1000', 'casacentral@nariautos.example', 'Lunes a viernes de 8:30 a 18:30 · Sábados de 9 a 13', -37.3217, -59.1332, true, 4, '08:00', '17:00'),
 ('Sucursal 2', 'Av. Mitre 1480', 'Azul', '02281 43-2000', 'sucursal2@nariautos.example', 'Lunes a viernes de 8:30 a 18:30 · Sábados de 9 a 13', -36.7770, -59.8585, true, 3, '08:00', '17:00');
insert into sucursales (nombre, direccion, localidad, telefono, email, horario_atencion, lat, lng, tiene_taller, taller_referencia_id, km_a_referencia) values
 ('Sucursal 3', 'Av. Espora 890', 'Tandil', '0249 442-3000', 'sucursal3@nariautos.example', 'Lunes a viernes de 9 a 18 · Sábados de 9 a 13', -37.3398, -59.1105, false, 1, 4.2),
 ('Sucursal 4', 'Ruta Nacional 3 km 299', 'Azul', '02281 43-4000', 'sucursal4@nariautos.example', 'Lunes a viernes de 9 a 18 · Sábados de 9 a 13', -36.8102, -59.8801, false, 2, 6.5);

insert into empleados (nombre, usuario, rol, sucursal_id, pin_hash) values
 ('Laura Méndez', 'laura.mendez', 'vendedor', 3, hash_pin('1111')),
 ('Martín Ríos', 'martin.rios', 'asesor', 1, hash_pin('2222')),
 ('Carlos Duarte', 'carlos.duarte', 'jefe_taller', 1, hash_pin('3333')),
 ('Sofía Herrera', 'sofia.herrera', 'gerencia', null, hash_pin('4444')),
 ('Diego Paz', 'diego.paz', 'vendedor', 1, hash_pin('5555')),
 ('Valeria Sosa', 'valeria.sosa', 'vendedor', 2, hash_pin('6666')),
 ('Nicolás Ferreyra', 'nicolas.ferreyra', 'vendedor', 4, hash_pin('7777')),
 ('Paula Giménez', 'paula.gimenez', 'asesor', 2, hash_pin('8888')),
 ('Hugo Benítez', 'hugo.benitez', 'jefe_taller', 2, hash_pin('9999'));
-- Hugo tiene el PIN vencido (más de 3 meses): sirve para mostrar el cambio obligatorio
update empleados set pin_cambiado_en = now() - interval '100 days' where usuario = 'hugo.benitez';

insert into mecanicos (nombre, sucursal_id, especialidad) values
 ('Jorge Acosta', 1, 'Mecánica general'), ('Emiliano Vera', 1, 'Frenos y suspensión'), ('Tomás Leiva', 1, 'Electricidad y diagnóstico'),
 ('Ramiro Ojeda', 2, 'Mecánica general'), ('Fabián Coria', 2, 'Tren delantero');

insert into servicios (nombre, descripcion, duracion_min, precio_orientativo) values
 ('Service de 10.000 km', 'Cambio de aceite y filtro, control de niveles y puntos de seguridad.', 90, 185000),
 ('Service de 20.000 km', 'Aceite, filtros de aceite, aire y habitáculo, control general.', 120, 260000),
 ('Service de 40.000 km', 'Service mayor: filtros, bujías, líquido de frenos y revisión completa.', 180, 420000),
 ('Frenos', 'Revisión y cambio de pastillas, rectificado de discos si corresponde.', 120, 230000),
 ('Diagnóstico computarizado', 'Lectura de códigos de falla e informe técnico.', 60, 75000),
 ('Alineación y balanceo', 'Alineación de tren delantero y balanceo de las cuatro ruedas.', 60, 68000),
 ('Cambio de batería', 'Control del sistema de carga y reemplazo de batería.', 30, 45000),
 ('Aire acondicionado', 'Control de presión, carga de gas y limpieza del circuito.', 90, 140000);
insert into servicios (nombre, descripcion, duracion_min, precio_orientativo, requiere_descripcion) values
 ('Otro servicio', 'Un problema distinto a los servicios listados. Contanos brevemente qué le pasa al vehículo.', 60, 0, true);

insert into unidades (sucursal_id, marca, modelo, version, anio, km, condicion, precio, combustible, transmision, color, fecha_ingreso, estado, fecha_venta, vendedor_id)
select s, ma, mo, ve, an, km, co, pr * 1000000, cb, tr, cl, hoy_ar() - di, es, case when dv is null then null else hoy_ar() - dv end,
       case when dv is null then null else (array[5,6,1,7])[s] end
from (values
 (1,'Toyota','Hilux','SRV 2.8 4x4 AT',2026,0,'0km',68.5,'diesel','automatica','Blanco',20,'disponible',null),
 (1,'Toyota','Corolla','XEI 2.0 CVT',2026,0,'0km',42.9,'nafta','automatica','Gris plata',35,'disponible',null),
 (1,'Toyota','Corolla Cross','SEG Hybrid',2026,0,'0km',54.2,'hibrido','automatica','Azul',12,'disponible',null),
 (1,'Volkswagen','Amarok','Highline V6',2025,0,'0km',79.9,'diesel','automatica','Negro',95,'disponible',null),
 (1,'Volkswagen','Polo','Track 1.6 MT',2026,0,'0km',27.4,'nafta','manual','Rojo',8,'disponible',null),
 (1,'Ford','Ranger','XLT 3.0 V6',2026,0,'0km',72.3,'diesel','automatica','Gris',41,'reservada',null),
 (1,'Peugeot','208','Allure 1.6 AT',2025,0,'0km',31.8,'nafta','automatica','Blanco',110,'disponible',null),
 (1,'Chevrolet','Tracker','LTZ 1.2T AT',2026,0,'0km',39.5,'nafta','automatica','Gris oscuro',27,'disponible',null),
 (1,'Toyota','Etios','XLS 1.5 MT',2021,58000,'usado',19.8,'nafta','manual','Blanco',64,'disponible',null),
 (1,'Volkswagen','Vento','Highline 1.4 TSI',2020,72000,'usado',29.5,'nafta','automatica','Negro',48,'disponible',null),
 (1,'Ford','EcoSport','Titanium 2.0',2019,89000,'usado',22.4,'nafta','manual','Azul',130,'disponible',null),
 (1,'Renault','Duster','Iconic 1.3T 4x4',2023,31000,'usado',33.9,'nafta','manual','Naranja',15,'disponible',null),
 (2,'Fiat','Cronos','Precision 1.3 CVT',2026,0,'0km',28.7,'nafta','automatica','Gris',18,'disponible',null),
 (2,'Fiat','Toro','Volcano 2.0 4x4',2026,0,'0km',58.4,'diesel','automatica','Blanco',52,'disponible',null),
 (2,'Chevrolet','Onix','Premier 1.0T AT',2026,0,'0km',30.9,'nafta','automatica','Rojo',9,'disponible',null),
 (2,'Chevrolet','S10','High Country 2.8',2025,0,'0km',74.6,'diesel','automatica','Negro',101,'disponible',null),
 (2,'Renault','Kangoo','Stepway 1.6',2026,0,'0km',34.2,'nafta','manual','Gris',30,'disponible',null),
 (2,'Nissan','Frontier','PRO-4X 2.3 AT',2026,0,'0km',70.1,'diesel','automatica','Gris',22,'reservada',null),
 (2,'Toyota','Yaris','XLS 1.5 CVT',2022,41000,'usado',27.9,'nafta','automatica','Blanco',75,'disponible',null),
 (2,'Volkswagen','T-Cross','Comfortline 1.6',2021,62000,'usado',31.5,'nafta','automatica','Gris',39,'disponible',null),
 (2,'Peugeot','2008','Feline 1.6 THP',2020,78000,'usado',28.3,'nafta','automatica','Blanco',118,'disponible',null),
 (2,'Ford','Ka','SEL 1.5 MT',2019,95000,'usado',16.5,'nafta','manual','Rojo',55,'disponible',null),
 (3,'Toyota','Hilux','DX 2.4 4x2 MT',2026,0,'0km',49.8,'diesel','manual','Blanco',14,'disponible',null),
 (3,'Toyota','Yaris','S 1.5 CVT',2026,0,'0km',33.6,'nafta','automatica','Gris plata',33,'disponible',null),
 (3,'Volkswagen','Nivus','Highline 200 TSI',2026,0,'0km',41.2,'nafta','automatica','Azul',6,'disponible',null),
 (3,'Volkswagen','Taos','Comfortline 250 TSI',2025,0,'0km',52.7,'nafta','automatica','Blanco',88,'disponible',null),
 (3,'Jeep','Renegade','Longitude 1.3T AT',2026,0,'0km',44.9,'nafta','automatica','Verde',25,'disponible',null),
 (3,'Citroën','C3','Feel Pack 1.6',2026,0,'0km',26.3,'nafta','manual','Rojo',44,'disponible',null),
 (3,'Chevrolet','Cruze','LT 1.4T AT',2021,54000,'usado',28.9,'nafta','automatica','Gris',60,'disponible',null),
 (3,'Honda','HR-V','EXL 1.8 CVT',2020,69000,'usado',34.5,'nafta','automatica','Negro',19,'reservada',null),
 (3,'Fiat','Strada','Volcano 1.3 CD',2022,47000,'usado',26.8,'nafta','manual','Blanco',99,'disponible',null),
 (3,'Renault','Sandero','Stepway Intens',2019,88000,'usado',18.9,'nafta','manual','Gris',140,'disponible',null),
 (4,'Peugeot','Partner','Confort 1.6 HDI',2026,0,'0km',36.4,'diesel','manual','Blanco',16,'disponible',null),
 (4,'Renault','Alaskan','Iconic 2.3 4x4',2025,0,'0km',66.9,'diesel','automatica','Gris',105,'disponible',null),
 (4,'Fiat','Pulse','Impetus 1.0T CVT',2026,0,'0km',35.8,'nafta','automatica','Azul',11,'disponible',null),
 (4,'Ford','Territory','Titanium 1.8T',2026,0,'0km',57.3,'nafta','automatica','Blanco',29,'disponible',null),
 (4,'Toyota','SW4','SRX 2.8 4x4 AT',2022,65000,'usado',71.5,'diesel','automatica','Negro',50,'disponible',null),
 (4,'Volkswagen','Gol Trend','Trendline 1.6',2018,112000,'usado',14.2,'gnc','manual','Gris',124,'disponible',null),
 (4,'Chevrolet','Spin','LTZ 1.8 7 asientos',2021,73000,'usado',23.6,'nafta','manual','Gris',37,'disponible',null),
 (4,'Nissan','Kicks','Advance 1.6 CVT',2022,44000,'usado',32.7,'nafta','automatica','Rojo',21,'disponible',null),
 -- vendidas (historial de ventas de los últimos meses)
 (1,'Toyota','Hilux','SR 2.8 4x4',2026,0,'0km',59.9,'diesel','manual','Gris',160,'vendida',140),
 (1,'Volkswagen','Polo','Comfortline',2025,0,'0km',29.8,'nafta','automatica','Blanco',150,'vendida',112),
 (1,'Ford','Focus','SE Plus 2.0',2018,98000,'usado',19.5,'nafta','manual','Gris',120,'vendida',85),
 (1,'Toyota','Corolla','SEG 2.0 CVT',2026,0,'0km',47.5,'nafta','automatica','Negro',90,'vendida',51),
 (1,'Chevrolet','Tracker','Premier',2025,0,'0km',41.9,'nafta','automatica','Azul',70,'vendida',24),
 (1,'Peugeot','308','Allure 1.6',2019,81000,'usado',21.7,'nafta','manual','Blanco',40,'vendida',6),
 (2,'Fiat','Cronos','Drive 1.3 MT',2025,0,'0km',24.9,'nafta','manual','Rojo',170,'vendida',128),
 (2,'Chevrolet','S10','LTZ 2.8 4x4',2025,0,'0km',64.8,'diesel','automatica','Blanco',130,'vendida',72),
 (2,'Renault','Logan','Zen 1.6',2020,67000,'usado',17.8,'nafta','manual','Gris',95,'vendida',38),
 (2,'Fiat','Toro','Freedom 1.3T',2026,0,'0km',49.7,'nafta','automatica','Gris',45,'vendida',10),
 (3,'Volkswagen','Nivus','Comfortline',2025,0,'0km',37.9,'nafta','automatica','Gris',145,'vendida',101),
 (3,'Toyota','Yaris','XS 1.5 MT',2025,0,'0km',29.4,'nafta','manual','Blanco',85,'vendida',44),
 (3,'Jeep','Compass','Sport 1.3T',2021,59000,'usado',38.6,'nafta','automatica','Negro',50,'vendida',13),
 (4,'Renault','Kwid','Outsider 1.0',2025,0,'0km',21.3,'nafta','manual','Naranja',115,'vendida',63),
 (4,'Ford','Ranger','XL 2.0T 4x2',2024,38000,'usado',45.2,'diesel','manual','Blanco',60,'vendida',17)
) as u(s, ma, mo, ve, an, km, co, pr, cb, tr, cl, di, es, dv);
update unidades set precio_venta = precio * 0.97, descripcion = case when condicion = '0km'
  then 'Unidad 0 km con garantía oficial de fábrica, entrega inmediata y gestoría incluida.'
  else 'Usado seleccionado, con service al día, revisión de 120 puntos en nuestro taller y garantía NariAutos por 6 meses.' end where true;
update unidades set precio_venta = null where estado <> 'vendida';

insert into fotos_unidad (unidad_id, url, orden)
select u.id, '/placeholder?u=' || u.id || '&v=' || n, n from unidades u, generate_series(1, 3) n;

insert into promociones (sucursal_id, titulo, descripcion, vigente_desde, vigente_hasta) values
 (null, 'Tasa 0% en 12 cuotas para 0 km seleccionados', 'Financiá hasta el 40% del valor de la unidad en 12 cuotas fijas sin interés. Válido para toda la red NariAutos.', hoy_ar() - 10, hoy_ar() + 35),
 (3, 'Bonificación en usados seleccionados', 'Llevate tu usado con transferencia bonificada y primer service sin cargo en nuestro taller de Casa Central.', hoy_ar() - 5, hoy_ar() + 25),
 (1, 'Tomamos tu usado al mejor valor', 'Tasación online en 24 horas y entrega de tu usado como parte de pago de cualquier pick-up 0 km.', hoy_ar() - 20, hoy_ar() + 40);
insert into promocion_unidad values (1,2),(1,5),(1,13),(1,15),(1,24),(1,35),(2,29),(2,31),(2,32),(3,1),(3,4),(3,6);

insert into clientes (nombre, telefono, email) values
 ('Ana Belén Castro','2494501101','ana.castro@correo.example'),('Julián Pereyra','2494501102','julian.pereyra@correo.example'),
 ('Marta Iglesias','2494501103',null),('Roberto Funes','2494501104','roberto.funes@correo.example'),
 ('Camila Roldán','2494501105','camila.roldan@correo.example'),('Esteban Luna','2494501106',null),
 ('Graciela Molina','2494501107','graciela.molina@correo.example'),('Facundo Arias','2494501108','facundo.arias@correo.example'),
 ('Lucía Barrios','2494501109','lucia.barrios@correo.example'),('Oscar Medina','2494501110',null),
 ('Patricia Vega','2281501111','patricia.vega@correo.example'),('Hernán Quiroga','2281501112','hernan.quiroga@correo.example'),
 ('Silvia Navarro','2281501113',null),('Gustavo Peralta','2281501114','gustavo.peralta@correo.example'),
 ('Florencia Rey','2281501115','florencia.rey@correo.example'),('Mariano Sanz','2281501116',null),
 ('Daniela Ponce','2494501117','daniela.ponce@correo.example'),('Ignacio Bravo','2494501118','ignacio.bravo@correo.example'),
 ('Norma Aguirre','2494501119',null),('Pablo Cardozo','2281501120','pablo.cardozo@correo.example'),
 ('Verónica Lagos','2281501121','veronica.lagos@correo.example'),('Sergio Maidana','2494501122',null),
 ('Carolina Ibáñez','2494501123','carolina.ibanez@correo.example'),('Matías Godoy','2494501124','matias.godoy@correo.example'),
 ('Elena Farías','2281501125',null),('Rodrigo Campos','2281501126','rodrigo.campos@correo.example'),
 ('Agustina Leal','2494501127','agustina.leal@correo.example'),('Walter Núñez','2494501128',null),
 ('Mónica Salas','2281501129','monica.salas@correo.example'),('Leandro Toledo','2494501130','leandro.toledo@correo.example');

-- Teléfonos genéricos para los datos precargados (se repiten a propósito)
update clientes set telefono = (array['2281500249','2494284826','2494374413','2494009763'])[1 + (id - 1) % 4] where true;
update sucursales set telefono = (array['2494284826','2281500249','2494374413','2494009763'])[id] where true;

insert into vehiculos (patente, marca, modelo, anio, km_actual, cliente_id) values
 ('AB123CD','Toyota','Corolla',2018,92000,1),('AC456EF','Volkswagen','Gol Trend',2019,78000,2),('AD789GH','Ford','Ranger',2020,110000,3),
 ('AE012IJ','Chevrolet','Onix',2021,54000,4),('AF345KL','Fiat','Cronos',2022,41000,5),('AA678MN','Renault','Sandero',2017,128000,6),
 ('AG901OP','Toyota','Hilux',2023,63000,7),('AB234QR','Peugeot','208',2018,87000,8),('AH567ST','Volkswagen','Amarok',2024,29000,9),
 ('AC890UV','Ford','Ka',2019,69000,10),('AD123WX','Chevrolet','Tracker',2020,58000,11),('AE456YZ','Fiat','Toro',2021,74000,12),
 ('AF789AB','Renault','Duster',2022,39000,13),('OPQ456','Volkswagen','Suran',2015,143000,14),('AG012CD','Toyota','Etios',2023,22000,15),
 ('AB345EF','Nissan','Kicks',2018,95000,16),('AC678GH','Jeep','Renegade',2019,81000,17),('AD901IJ','Citroën','C3',2020,52000,18),
 ('AE234KL','Honda','HR-V',2021,47000,19),('NRS789','Chevrolet','Corsa',2014,165000,20),('AF567MN','Toyota','Yaris',2022,33000,21),
 ('AH890OP','Ford','Territory',2024,18000,22);

-- Código de vehículo conocido para la demostración del historial
update vehiculos set codigo_auto = 'TC18' where patente = 'AB123CD';

-- 30 turnos: (código, servicio, vehículo, origen, taller, canal, día hábil relativo, hora, estado)
insert into turnos (codigo, servicio_id, vehiculo_id, cliente_id, sucursal_origen_id, sucursal_taller_id, canal_origen, fecha, hora, duracion_min, estado, creado_por, creado_en)
select x.cod, x.srv, x.veh, v.cliente_id, x.ori, x.tal, x.can, pg_temp.habil(x.dia), x.hora::time, s.duracion_min, x.est,
       case when x.can = 'web' then null when x.ori = 3 then 1 when x.ori = 4 then 7 when x.tal = 1 then 2 else 8 end,
       pg_temp.ts(pg_temp.habil(x.dia - 4), '10:00')
from (values
 ('DEMO01',1,1,1,1,'web',-42,'08:00','entregado'),('DEMO02',4,2,3,1,'presencial',-38,'09:00','entregado'),
 ('DEMO03',2,3,1,1,'telefono',-33,'08:30','entregado'),('DEMO04',6,4,2,2,'web',-30,'10:00','entregado'),
 ('DEMO05',3,5,4,2,'presencial',-27,'08:00','entregado'),('DEMO06',5,6,1,1,'whatsapp',-24,'11:00','entregado'),
 ('DEMO07',1,7,3,1,'presencial',-20,'08:00','entregado'),('DEMO08',8,8,2,2,'web',-17,'09:30','entregado'),
 ('DEMO09',2,9,1,1,'web',-13,'08:00','entregado'),('DEMO10',4,10,4,2,'telefono',-10,'10:00','entregado'),
 ('DEMO11',1,11,2,2,'web',-7,'08:00','entregado'),('DEMO12',6,12,3,1,'presencial',-4,'14:00','entregado'),
 ('DEMO13',5,13,1,1,'web',-15,'15:00','ausente'),('DEMO14',1,14,4,2,'whatsapp',-6,'11:00','ausente'),
 ('DEMO15',7,15,1,1,'web',-9,'12:00','cancelado'),('DEMO16',6,16,2,2,'web',3,'09:00','cancelado'),
 ('DEMO17',3,17,1,1,'telefono',-2,'08:00','rechazado'),
 ('DEMO18',2,18,1,1,'web',0,'08:00','recibido'),('DEMO19',4,19,3,1,'presencial',0,'08:30','recibido'),
 ('DEMO20',3,20,1,1,'telefono',-1,'08:00','en_reparacion'),('DEMO21',1,21,2,2,'web',0,'08:00','en_reparacion'),
 ('DEMO22',8,22,3,1,'presencial',-1,'10:00','en_reparacion'),
 ('DEMO23',6,1,1,1,'web',-1,'13:00','listo'),('DEMO24',5,4,4,2,'presencial',-1,'14:00','listo'),
 ('DEMO25',1,2,1,1,'web',1,'09:00','confirmado'),('DEMO26',2,5,3,1,'presencial',1,'10:00','confirmado'),
 ('DEMO27',4,9,2,2,'whatsapp',2,'08:00','confirmado'),
 ('DEMO28',1,13,3,1,'presencial',2,'09:00','solicitado'),('DEMO29',6,10,4,2,'presencial',3,'11:00','solicitado'),
 ('DEMO30',5,16,1,1,'web',4,'15:00','solicitado')
) as x(cod, srv, veh, ori, tal, can, dia, hora, est)
join vehiculos v on v.id = x.veh join servicios s on s.id = x.srv;

insert into eventos_turno (turno_id, estado, detalle, creado_en)
select t.id, e.estado, e.detalle, t.creado_en + (e.n || ' hours')::interval
from turnos t join lateral (values
  (0,'solicitado', case when t.derivado then 'Turno derivado desde otra sucursal' else 'Turno solicitado' end),
  (2,'confirmado','Turno confirmado por el asesor'), (96,'recibido','Vehículo recibido en el taller'),
  (97,'en_reparacion','Trabajo iniciado'), (100,'listo','Vehículo listo para retirar'), (104,'entregado','Vehículo entregado')
) e(n, estado, detalle) on array_position(array['solicitado','confirmado','recibido','en_reparacion','listo','entregado'], e.estado)
     <= coalesce(array_position(array['solicitado','confirmado','recibido','en_reparacion','listo','entregado'], t.estado), 2)
where t.estado not in ('cancelado','rechazado') or e.n = 0;
insert into eventos_turno (turno_id, estado, detalle) select id, estado,
  case estado when 'cancelado' then 'Cancelado por el cliente' when 'rechazado' then 'Rechazado: sin repuestos para la fecha pedida' else 'El cliente no se presentó' end
from turnos where estado in ('cancelado','rechazado','ausente');

-- Órdenes de trabajo de los turnos ingresados
insert into ordenes_trabajo (turno_id, km_ingreso, combustible_nivel, observaciones, danos_visibles, trabajos_solicitados, estado, km_egreso, trabajos_realizados, abierta_en, cerrada_en)
select t.id, v.km_actual - 150, (array['1/4','1/2','3/4','lleno'])[1 + t.id % 4], 'Cliente solicita revisar ruido leve en tren delantero.',
       case when t.id % 3 = 0 then 'Rayón en paragolpes trasero.' else 'Sin daños visibles.' end, s.nombre,
       case t.codigo when 'DEMO18' then 'pendiente' when 'DEMO19' then 'asignada' when 'DEMO20' then 'en_reparacion' when 'DEMO21' then 'en_reparacion'
         when 'DEMO22' then 'espera_repuestos' when 'DEMO23' then 'terminada' when 'DEMO24' then 'terminada' else 'cerrada' end,
       case when t.estado = 'entregado' then v.km_actual - 140 end,
       case when t.estado in ('entregado','listo') then s.nombre || ' realizado según plan de mantenimiento. Control de niveles y prueba de ruta.' end,
       pg_temp.ts(t.fecha, t.hora), case when t.estado = 'entregado' then pg_temp.ts(t.fecha, t.hora) + interval '7 hours' end
from turnos t join vehiculos v on v.id = t.vehiculo_id join servicios s on s.id = t.servicio_id
where t.estado in ('recibido','en_reparacion','listo','entregado');

insert into asignaciones (orden_id, mecanico_id, minutos_estimados, inicio_en, fin_en, motivo_demora)
select o.id, case when t.sucursal_taller_id = 1 then 1 + o.id % 3 else 4 + o.id % 2 end, t.duracion_min,
       case when o.estado <> 'asignada' then o.abierta_en + interval '20 minutes' end,
       case when o.estado in ('cerrada','terminada') then o.abierta_en + interval '20 minutes' + (t.duracion_min * (case when o.id % 4 = 0 then 1.5 else 0.9 end) || ' minutes')::interval end,
       case when o.estado in ('cerrada','terminada') and o.id % 4 = 0 then 'Demora en la entrega de repuestos del proveedor.' end
from ordenes_trabajo o join turnos t on t.id = o.turno_id where o.estado <> 'pendiente';

-- Historial de services: los entregados más services anteriores de 15 vehículos
insert into historial_service (vehiculo_id, turno_id, sucursal_id, fecha, km, servicio, trabajos)
select t.vehiculo_id, t.id, t.sucursal_taller_id, t.fecha, o.km_egreso, s.nombre, o.trabajos_realizados
from turnos t join ordenes_trabajo o on o.turno_id = t.id join servicios s on s.id = t.servicio_id where t.estado = 'entregado';
insert into historial_service (vehiculo_id, sucursal_id, fecha, km, servicio, trabajos)
select v.id, 1 + v.id % 2, hoy_ar() - (200 + n * 190 + v.id * 3), greatest(v.km_actual - n * 10000 - 4000, 1000),
       (array['Service de 10.000 km','Service de 20.000 km','Frenos'])[n], 'Cambio de aceite y filtros. Control de frenos, luces y niveles.'
from vehiculos v, generate_series(1, 3) n where v.id <= 15 and (n < 3 or v.id % 2 = 0);

insert into encuestas (turno_id, puntaje, comentario, creado_en)
select t.id, x.p, x.c, pg_temp.ts(t.fecha + 1, '12:00') from (values
 ('DEMO01',5,'Excelente atención, me avisaron por WhatsApp cuando estaba listo.'),('DEMO02',4,'Muy buen trabajo, la derivación desde la Sucursal 3 fue sencilla.'),
 ('DEMO03',5,null),('DEMO04',3,'El trabajo bien, pero demoró más de lo previsto.'),('DEMO05',4,'Conforme.'),
 ('DEMO07',5,'Rápidos y prolijos.'),('DEMO09',4,null),('DEMO10',2,'Tuve que esperar bastante para retirar el auto.'),('DEMO11',5,'Todo perfecto.')
) x(cod, p, c) join turnos t on t.codigo = x.cod;

-- 25 consultas: (tipo, canal, estado, sucursal, unidad, cliente, días atrás, horas hasta 1ª respuesta, motivo de pérdida)
insert into consultas (tipo, canal, estado, sucursal_id, vendedor_id, unidad_id, cliente_id, mensaje, creado_en, primera_respuesta_en, cerrada_en, motivo_perdida, precio_cotizado, bonificacion, financiacion_ofrecida, cotizada_en)
select x.tipo, x.canal, x.est, x.suc, case when x.est = 'nueva' then null else (array[5,6,1,7])[x.suc] end, x.uni, x.cli,
  case x.tipo when 'cotizacion' then 'Quisiera recibir una cotización de esta unidad y conocer las opciones de financiación.'
    when 'test_drive' then 'Me gustaría agendar una prueba de manejo.' else 'Consulta por disponibilidad y formas de pago.' end,
  now() - (x.dias || ' days')::interval - interval '3 hours',
  case when x.hr is not null then now() - (x.dias || ' days')::interval - interval '3 hours' + (x.hr || ' hours')::interval end,
  case when x.est in ('ganada','perdida') then now() - (greatest(x.dias - 6, 0) || ' days')::interval end, x.motivo,
  case when x.est in ('cotizada','ganada') then u.precio end, case when x.est in ('cotizada','ganada') then u.precio * 0.03 end,
  case when x.est in ('cotizada','ganada') then 'Anticipo del 40% y saldo en 24 cuotas fijas.' end,
  case when x.est in ('cotizada','ganada') then now() - (x.dias || ' days')::interval + interval '5 hours' end
from (values
 ('cotizacion','web','nueva',3,23,23,0,null,null),('test_drive','web','nueva',3,25,24,1,null,null),('general','whatsapp','nueva',3,null,25,2,null,null),
 ('cotizacion','web','nueva',1,1,26,0,null,null),('cotizacion','whatsapp','nueva',2,13,27,3,null,null),
 ('cotizacion','telefono','en_seguimiento',3,27,28,4,2,null),('general','presencial','en_seguimiento',3,29,29,6,1,null),
 ('cotizacion','web','en_seguimiento',1,3,30,5,6,null),('test_drive','whatsapp','en_seguimiento',4,35,17,7,3,null),
 ('cotizacion','web','cotizada',3,24,18,8,4,null),('cotizacion','whatsapp','cotizada',3,31,19,10,1,null),
 ('cotizacion','whatsapp','cotizada',2,14,20,9,12,null),('cotizacion','web','cotizada',4,36,21,12,5,null),
 ('test_drive','web','test_drive_agendado',3,26,22,3,2,null),('test_drive','telefono','test_drive_agendado',1,8,23,4,1,null),
 ('test_drive','web','test_drive_agendado',2,15,24,2,7,null),
 ('cotizacion','presencial','ganada',3,53,1,16,1,null),('cotizacion','web','ganada',1,46,2,9,3,null),
 ('cotizacion','whatsapp','ganada',2,50,11,14,2,null),('test_drive','web','ganada',4,55,12,20,4,null),
 ('cotizacion','telefono','ganada',1,45,3,28,2,null),
 ('cotizacion','web','perdida',3,28,4,22,30,'Compró en otra concesionaria'),('general','whatsapp','perdida',2,22,13,18,26,'No respondió a los contactos'),
 ('cotizacion','web','perdida',1,10,5,25,8,'Precio fuera de su presupuesto'),('cotizacion','whatsapp','perdida',4,38,14,30,5,'No consiguió financiación')
) as x(tipo, canal, est, suc, uni, cli, dias, hr, motivo) left join unidades u on u.id = x.uni;

insert into seguimientos_consulta (consulta_id, empleado_id, nota, creado_en)
select c.id, c.vendedor_id, 'Se contactó al cliente y se envió información de la unidad.', c.primera_respuesta_en from consultas c where c.primera_respuesta_en is not null;
insert into test_drives (consulta_id, unidad_id, fecha, hora, estado)
select c.id, c.unidad_id, pg_temp.habil(2 + c.id % 3), (array['10:00','11:30','16:00'])[1 + c.id % 3]::time,
       case when c.estado = 'test_drive_agendado' then 'confirmado' when c.estado = 'ganada' then 'realizado' else 'pendiente' end
from consultas c where c.tipo = 'test_drive';

insert into reservas_unidad (unidad_id, vendedor_id, cliente_nombre, cliente_telefono, vence_en, creado_en) values
 (6, 5, 'Rodrigo Campos', '2494284826', now() + interval '40 hours', now() - interval '32 hours'),
 (18, 6, 'Mónica Salas', '2281500249', now() + interval '60 hours', now() - interval '12 hours'),
 (30, 1, 'Daniela Ponce', '2494374413', now() + interval '9 hours', now() - interval '63 hours');
insert into transferencias_unidad (unidad_id, origen_id, destino_id, solicitada_por, motivo) values
 (9, 1, 3, 1, 'Cliente de Sucursal 3 interesado en verla esta semana.');
insert into tasaciones (cliente_id, sucursal_id, unidad_interes_id, marca, modelo, anio, km, estado_general, comentarios) values
 (27, 3, 25, 'Volkswagen', 'Fox', 2016, 118000, 'muy_bueno', 'Único dueño, services oficiales.'),
 (28, 1, 1, 'Toyota', 'Hilux', 2017, 190000, 'bueno', 'Uso rural, cubiertas nuevas.');
insert into auditoria (empleado_id, empleado_nombre, accion, entidad, entidad_id, detalle, creado_en) values
 (4, 'Sofía Herrera', 'Carga inicial de datos', 'sistema', null, '{"origen":"seed"}', now() - interval '1 day');

insert into repuestos (sucursal_id, codigo, nombre, stock, stock_minimo, precio)
select s, c, n, case when s = 1 then st else greatest(st - 3, 0) end, mi, pr from generate_series(1, 2) s, (values
 ('FA-1001','Filtro de aceite',18,6,14500),('FA-1002','Filtro de aire',12,5,19800),('FH-1003','Filtro de habitáculo',9,4,17200),
 ('AC-2001','Aceite sintético 5W30 (litro)',64,20,13900),('PF-3001','Juego de pastillas de freno delanteras',7,4,68500),
 ('DF-3002','Disco de freno delantero',3,4,92000),('BJ-4001','Bujía de iridio',22,8,11800),('BT-5001','Batería 12V 65Ah',2,3,168000),
 ('LF-6001','Líquido de frenos DOT4 (500 ml)',10,4,9800),('GA-7001','Gas refrigerante R134a (lata)',5,3,21500)
) r(c, n, st, mi, pr);

select mantenimiento();
