import Link from "next/link";
import { db, leer } from "@/lib/db";
import { exigirSucursal } from "@/lib/sesion";
import { etiqueta, hace } from "@/lib/formato";
import { BotonLink, Encabezado, Insignia, Tabla, Vacio } from "@/components/ui";

export const metadata = { title: "Consultas" };
const FILTROS = [["abiertas", "Abiertas"], ["nueva", "Nuevas"], ["en_seguimiento", "En seguimiento"], ["cotizada", "Cotizadas"], ["ganada", "Ganadas"], ["perdida", "Perdidas"]];

export default async function Bandeja({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const s = await exigirSucursal("vendedor");
  const filtro = (await searchParams).estado ?? "abiertas";
  let q = db().from("consultas").select("*, clientes(nombre, telefono), unidades(marca, modelo, version)").eq("sucursal_id", s.sucursalId).neq("tipo", "test_drive");
  q = filtro === "abiertas" ? q.not("estado", "in", "(ganada,perdida)") : q.eq("estado", filtro);
  const consultas = await leer<any[]>(q.order("creado_en", { ascending: false }));
  const atrasada = (c: any) => c.estado === "nueva" && Date.now() - new Date(c.creado_en).getTime() > 24 * 3600e3;
  return (
    <>
      <Encabezado titulo="Bandeja de consultas" texto="Cotizaciones y consultas de tu sucursal, de todos los canales. Los test drives tienen su propia sección."><BotonLink href="/vendedor/consultas/nueva" variante="primario">Cargar consulta</BotonLink></Encabezado>
      <nav aria-label="Filtrar por estado" className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {FILTROS.map(([v, t]) => <Link key={v} href={`/vendedor?estado=${v}`} aria-current={filtro === v ? "true" : undefined}
          className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full border px-3 text-sm ${filtro === v ? "border-marino bg-marino text-white" : "border-borde bg-white hover:border-acero"}`}>{t}</Link>)}
      </nav>
      {consultas.length === 0 ? (
        <Vacio titulo="No hay consultas en este estado" texto="Cuando un cliente pida una cotización desde la web aparece acá. También podés cargar las que llegan por teléfono, WhatsApp o en el salón.">
          <BotonLink href="/vendedor/consultas/nueva">Cargar consulta</BotonLink></Vacio>
      ) : (
        <Tabla cabeceras={["Cliente", "Tipo y canal", "Unidad", "Estado", "Recibida", ""]}>
          {consultas.map((c) => (
            <tr key={c.id} className={atrasada(c) ? "bg-error/5" : undefined}>
              <td><Link href={`/vendedor/consultas/${c.id}`} className="font-medium text-marino underline">{c.clientes.nombre}</Link><br /><span className="cifras text-xs text-medio">{c.clientes.telefono}</span></td>
              <td>{etiqueta(c.tipo)}<br /><span className="text-xs text-medio">{etiqueta(c.canal)}</span></td>
              <td>{c.unidades ? `${c.unidades.marca} ${c.unidades.modelo}` : <span className="text-medio">Sin unidad</span>}</td>
              <td><Insignia estado={c.estado}>{etiqueta(c.estado)}</Insignia>{atrasada(c) && <><br /><span className="mt-1 inline-block text-xs font-medium text-error">Sin respuesta hace más de 24 h</span></>}</td>
              <td className="cifras whitespace-nowrap text-medio">{hace(c.creado_en)}</td>
              <td><BotonLink href={`/vendedor/consultas/${c.id}`} variante="contorno" chico>Abrir consulta</BotonLink></td>
            </tr>
          ))}
        </Tabla>
      )}
    </>
  );
}
