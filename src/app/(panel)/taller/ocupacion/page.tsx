import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { diaSemana, fecha, fechaLarga, hora, hoyAR, sumarDias } from "@/lib/formato";
import { Encabezado, Tarjeta } from "@/components/ui";

export const metadata = { title: "Ocupación del taller" };
export default async function Ocupacion() {
  const s = await exigirSucursal("jefe_taller");
  let hoy = hoyAR(); while (diaSemana(hoy) === 0 || diaSemana(hoy) === 6) hoy = sumarDias(hoy, 1);
  const lunes = sumarDias(hoy, -((diaSemana(hoy) + 6) % 7));
  const [suc, turnos] = await Promise.all([
    leer<any>(db().from("sucursales").select("capacidad_boxes, taller_abre, taller_cierra, nombre").eq("id", s.sucursalId).single()),
    leer<any[]>(db().from("turnos").select("fecha, hora, duracion_min, estado, vehiculos(patente), servicios(nombre)").eq("sucursal_taller_id", s.sucursalId).gte("fecha", lunes).lte("fecha", sumarDias(lunes, 4)).not("estado", "in", "(cancelado,rechazado,ausente)").order("hora")),
  ]);
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
  const capacidad = suc.capacidad_boxes * (min(suc.taller_cierra) - min(suc.taller_abre));
  const dias = [0, 1, 2, 3, 4].map((i) => { const d = sumarDias(lunes, i), lista = turnos.filter((t) => t.fecha === d), usados = lista.reduce((a, t) => a + t.duracion_min, 0); return { d, lista, usados, pct: Math.round((usados / capacidad) * 100) }; });
  const delDia = dias.find((x) => x.d === hoy)!;
  const semana = Math.round((dias.reduce((a, x) => a + x.usados, 0) / (capacidad * 5)) * 100);
  const Barra = ({ pct }: { pct: number }) => (
    <div className="h-3 w-full overflow-hidden rounded-full bg-borde/50" role="img" aria-label={`${pct}% de ocupación`}><div className={`h-full rounded-full ${pct >= 90 ? "bg-error" : pct >= 70 ? "bg-alerta" : "bg-acero"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div>
  );
  return (
    <>
      <Encabezado titulo="Ocupación del taller" texto={`${suc.nombre}: ${suc.capacidad_boxes} boxes, de ${hora(suc.taller_abre)} a ${hora(suc.taller_cierra)} h. Se calcula sobre las horas de box reservadas.`} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Tarjeta titulo={`Hoy · ${fecha(hoy)}`}><p className="cifras text-4xl font-semibold text-marino">{delDia.pct}%</p><p className="cifras mb-3 text-sm text-medio">{delDia.lista.length} turnos · {Math.round(delDia.usados / 60 * 10) / 10} de {capacidad / 60} horas de box</p><Barra pct={delDia.pct} /></Tarjeta>
        <Tarjeta titulo={`Semana del ${fecha(lunes)}`}><p className="cifras text-4xl font-semibold text-marino">{semana}%</p><p className="cifras mb-3 text-sm text-medio">{turnos.length} turnos en la semana</p><Barra pct={semana} /></Tarjeta>
      </div>
      <Tarjeta titulo="Detalle por día" className="mt-5">
        <ul className="space-y-4">
          {dias.map((x) => (
            <li key={x.d}>
              <div className="mb-1 flex items-baseline justify-between gap-2"><p className="font-medium capitalize">{fechaLarga(x.d)}</p><p className="cifras text-sm">{x.pct}% · {x.lista.length} turnos</p></div>
              <Barra pct={x.pct} />
              {x.lista.length > 0 && <p className="cifras mt-1 text-xs text-medio">{x.lista.map((t) => `${hora(t.hora)} ${(t.vehiculos as any).patente}`).join(" · ")}</p>}
            </li>
          ))}
        </ul>
      </Tarjeta>
    </>
  );
}
