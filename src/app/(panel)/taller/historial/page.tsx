import { exigirSucursal } from "@/lib/sesion";
import { HistorialInterno } from "@/components/historial-interno";
export const metadata = { title: "Historial por patente" };
export default async function Pagina({ searchParams }: { searchParams: Promise<{ patente?: string }> }) {
  await exigirSucursal("jefe_taller");
  return <HistorialInterno patente={(await searchParams).patente} />;
}
