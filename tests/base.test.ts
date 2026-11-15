import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!, clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };
const servidor = createClient(url, clave, { ...opciones, global: { headers: { "x-nari-server": process.env.SUPABASE_SERVER_SECRET! } } });
const anonimo = createClient(url, clave, opciones);

// Fecha hábil lejana (fuera del rango que ofrece la web) para no chocar con datos reales
function diaHabil(desdeDias: number): string {
  const d = new Date(Date.now() + desdeDias * 86400000);
  while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const turnos: number[] = [], patentes: string[] = [], telefonos: string[] = [];
let n = 0;
function reservar(taller: number, origen: number, fecha: string, hora: string, servicio = 6) {
  const i = ++n, patente = `ZZ${String(900 + i)}TT`, telefono = `29999${String(10000 + i)}`;
  patentes.push(patente); telefonos.push(telefono);
  return servidor.rpc("reservar_turno", { p_servicio: servicio, p_taller: taller, p_origen: origen, p_canal: "presencial", p_fecha: fecha, p_hora: hora,
    p_patente: patente, p_marca: "Prueba", p_modelo: "Test", p_anio: 2020, p_km: 1000, p_nombre: `Cliente Prueba ${i}`, p_telefono: telefono })
    .then((r) => { if (r.data?.id) turnos.push(r.data.id); return r; });
}

afterAll(async () => {
  if (turnos.length) await servidor.from("turnos").delete().in("id", turnos);
  if (patentes.length) await servidor.from("vehiculos").delete().in("patente", patentes);
  if (telefonos.length) await servidor.from("clientes").delete().in("telefono", telefonos);
  await servidor.from("empleados").delete().eq("nombre", "Empleado de Prueba");
});

describe("seguridad de la base (RLS)", () => {
  it("el rol anónimo solo lee catálogo, sucursales y servicios", async () => {
    expect((await anonimo.from("unidades").select("id")).data!.length).toBeGreaterThan(0);
    expect((await anonimo.from("sucursales").select("id")).data!.length).toBe(4);
    expect((await anonimo.from("unidades").select("id").eq("estado", "vendida")).data).toEqual([]);
    for (const tabla of ["empleados", "clientes", "turnos", "consultas", "vehiculos", "auditoria", "historial_service"])
      expect((await anonimo.from(tabla).select("*")).data ?? [], tabla).toEqual([]);
  });
  it("el rol anónimo no puede escribir ni ejecutar las funciones sensibles", async () => {
    expect((await anonimo.from("unidades").update({ precio: 1 }).eq("id", 1).select()).data ?? []).toEqual([]);
    expect((await anonimo.from("consultas").insert({ tipo: "general", canal: "web", sucursal_id: 1, cliente_id: 1 })).error).not.toBeNull();
    const r = await anonimo.rpc("verificar_pin", { p_empleado: 4, p_pin: "4444" });
    expect(r.data?.ok ?? false).toBe(false);
  });
  it("el PIN no se guarda en texto plano", async () => {
    const { data } = await servidor.from("empleados").select("pin_hash").eq("id", 1).single();
    expect(data!.pin_hash).toMatch(/^\$2[aby]\$/);
    expect(data!.pin_hash).not.toContain("1111");
  });
});

describe("login con PIN y bloqueo", () => {
  it("un PIN correcto devuelve rol y sucursal", async () => {
    const { data } = await servidor.rpc("verificar_pin", { p_empleado: 1, p_pin: "1111" });
    expect(data).toMatchObject({ ok: true, rol: "vendedor", sucursal_id: 3, nombre: "Laura Méndez" });
  });
  it("tras 5 intentos fallidos bloquea 5 minutos, incluso con el PIN correcto, y registra cada intento", async () => {
    const { data: hash } = await servidor.rpc("hash_pin", { p_pin: "8642" });
    const { data: e } = await servidor.from("empleados").insert({ nombre: "Empleado de Prueba", rol: "vendedor", sucursal_id: 1, pin_hash: hash }).select("id").single();
    for (let i = 1; i <= 4; i++) {
      const { data } = await servidor.rpc("verificar_pin", { p_empleado: e!.id, p_pin: "0000" });
      expect(data).toMatchObject({ ok: false, motivo: "pin", restantes: 5 - i });
    }
    const quinto = (await servidor.rpc("verificar_pin", { p_empleado: e!.id, p_pin: "0000" })).data;
    expect(quinto).toMatchObject({ ok: false, motivo: "bloqueado" });
    const minutos = (new Date(quinto.hasta).getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThan(4); expect(minutos).toBeLessThanOrEqual(5.1);
    expect((await servidor.rpc("verificar_pin", { p_empleado: e!.id, p_pin: "8642" })).data).toMatchObject({ ok: false, motivo: "bloqueado" });
    const { count } = await servidor.from("intentos_acceso").select("id", { count: "exact", head: true }).eq("empleado_id", e!.id).eq("exitoso", false);
    expect(count).toBe(5);
  });
});

describe("agenda compartida sin sobreturno", () => {
  it("no permite superar la capacidad de boxes de un horario (Sucursal 2: 3 boxes)", async () => {
    const fecha = diaHabil(60);
    for (let i = 0; i < 3; i++) expect((await reservar(2, 2, fecha, "10:00")).error).toBeNull();
    const cuarto = await reservar(2, 2, fecha, "10:00");
    expect(cuarto.error?.message).toContain("ya no tiene lugar");
    const solapado = await reservar(2, 2, fecha, "10:30"); // 60 min: se pisa con los de las 10:00
    expect(solapado.error?.message).toContain("ya no tiene lugar");
    expect((await reservar(2, 2, fecha, "11:00")).error).toBeNull();
    const { data: disp } = await servidor.rpc("disponibilidad_taller", { p_taller: 2, p_fecha: fecha, p_duracion: 60 });
    expect(disp.find((d: any) => d.hora === "10:00:00").libres).toBe(0);
  });
  it("con reservas simultáneas solo entran tantas como boxes (bloqueo en la base)", async () => {
    const fecha = diaHabil(67);
    const r = await Promise.all(Array.from({ length: 7 }, () => reservar(1, 1, fecha, "09:00")));
    expect(r.filter((x) => !x.error).length).toBe(4); // Casa Central: 4 boxes
    expect(r.filter((x) => x.error).every((x) => x.error!.message.includes("ya no tiene lugar"))).toBe(true);
  });
  it("rechaza fines de semana y horarios fuera de la atención del taller", async () => {
    const d = new Date(Date.now() + 60 * 86400000); while (d.getUTCDay() !== 6) d.setUTCDate(d.getUTCDate() + 1);
    expect((await reservar(1, 1, d.toISOString().slice(0, 10), "10:00")).error?.message).toContain("fuera de la atención");
    expect((await reservar(1, 1, diaHabil(60), "20:00")).error?.message).toContain("fuera de la atención");
  });
});

describe("sucursales sin taller y derivación", () => {
  it("no se puede crear un turno en una sucursal sin taller (función y trigger)", async () => {
    expect((await reservar(3, 3, diaHabil(60), "10:00")).error?.message).toContain("no tiene taller");
    const { data: t } = await servidor.from("turnos").select("servicio_id, vehiculo_id, cliente_id").limit(1).single();
    const directo = await servidor.from("turnos").insert({ ...t, codigo: "ZZTEST", sucursal_origen_id: 3, sucursal_taller_id: 3, canal_origen: "web", fecha: diaHabil(60), hora: "10:00", duracion_min: 60 });
    expect(directo.error?.message).toContain("no tiene taller");
    const cambio = await servidor.from("turnos").update({ sucursal_taller_id: 4 }).eq("codigo", "DEMO25").select();
    expect(cambio.error?.message).toContain("no tiene taller");
  });
  it("el taller de referencia no puede ser una sucursal sin taller", async () => {
    const r = await servidor.from("sucursales").update({ taller_referencia_id: 4 }).eq("id", 3).select();
    expect(r.error?.message).toContain("taller de referencia");
  });
  it("un turno derivado desde Sucursal 3 aparece al instante en la agenda de Casa Central", async () => {
    const fecha = diaHabil(74);
    const { data: turno, error } = await reservar(1, 3, fecha, "08:00");
    expect(error).toBeNull();
    expect(turno).toMatchObject({ derivado: true, sucursal_origen_id: 3, sucursal_taller_id: 1, estado: "solicitado" });
    expect(turno.codigo).toMatch(/^[A-Z0-9]{6}$/);
    const { data: agenda } = await servidor.from("turnos").select("id, derivado, origen:sucursales!turnos_sucursal_origen_id_fkey(nombre)").eq("sucursal_taller_id", 1).eq("fecha", fecha);
    expect(agenda).toHaveLength(1);
    expect((agenda![0] as any).origen.nombre).toBe("Sucursal 3");
    const { data: ev } = await servidor.from("eventos_turno").select("detalle").eq("turno_id", turno.id);
    expect(ev![0].detalle).toContain("derivado");
  });
});
