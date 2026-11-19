import { exigirAsesor } from "@/lib/sesion";
import { HistorialInterno } from "@/components/historial-interno";
export const metadata = { title: "Historial de vehículos" };
export default async function Pagina({ searchParams }: { searchParams: Promise<{ q?: string; patente?: string }> }) {
  await exigirAsesor();
  const sp = await searchParams;
  return <HistorialInterno q={sp.q ?? sp.patente} base="/asesor/historial" />;
}
