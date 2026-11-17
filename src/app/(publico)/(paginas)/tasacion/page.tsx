import { sucursales } from "@/lib/datos";
import { db } from "@/lib/db";
import { Encabezado } from "@/components/ui";
import { FormTasacion } from "./cliente";

export const metadata = { title: "Tasá tu usado" };
export const dynamic = "force-dynamic";

export default async function Tasacion({ searchParams }: { searchParams: Promise<{ unidad?: string }> }) {
  const { unidad } = await searchParams;
  const sucs = await sucursales();
  const u = unidad && /^\d+$/.test(unidad) ? (await db().from("unidades").select("id, marca, modelo, version, sucursal_id").eq("id", Number(unidad)).neq("estado", "vendida").maybeSingle()).data : null;
  return (
    <div className="mx-auto max-w-2xl">
      <Encabezado titulo="Tasá tu usado" texto="Contanos cómo es tu vehículo y sumá hasta 3 fotos. Un vendedor te responde con un valor estimado para entregarlo como parte de pago." />
      <FormTasacion sucursales={sucs.map((s) => [s.id, `${s.nombre} · ${s.localidad}`] as const)} unidad={u} />
    </div>
  );
}
