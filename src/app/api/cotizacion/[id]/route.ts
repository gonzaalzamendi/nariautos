import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { db } from "@/lib/db";
import { sesionActual } from "@/lib/sesion";
import { etiqueta, fechaHora, moneda, numero } from "@/lib/formato";

// Cotización en PDF con la marca NariAutos (vendedor de la sucursal o gerencia).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await sesionActual();
  if (!s || !["vendedor", "gerencia"].includes(s.rol)) return new Response("No autorizado", { status: 403 });
  const id = Number((await params).id);
  const { data: c } = Number.isInteger(id) ? await db().from("consultas").select("*, clientes(nombre, telefono, email), unidades(*), sucursales(nombre, direccion, localidad, telefono), empleados(nombre)").eq("id", id).maybeSingle() as any : { data: null };
  if (!c || (s.rol === "vendedor" && c.sucursal_id !== s.sucursalId)) return new Response("Cotización no encontrada", { status: 404 });
  if (!c.precio_cotizado) return new Response("Esta consulta todavía no tiene una cotización cargada", { status: 409 });

  const pdf = await PDFDocument.create(), pag = pdf.addPage([595, 842]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold), sans = await pdf.embedFont(StandardFonts.Helvetica), negr = await pdf.embedFont(StandardFonts.HelveticaBold);
  const marino = rgb(0.043, 0.122, 0.227), dorado = rgb(0.659, 0.529, 0.306), gris = rgb(0.42, 0.45, 0.5), grafito = rgb(0.12, 0.16, 0.2);
  const limpio = (t: unknown) => String(t ?? "").replace(/[^\x20-\x7E -ÿ$]/g, " ");
  let y = 0;
  const txt = (t: unknown, x: number, yy: number, o: { f?: any; s?: number; c?: any } = {}) => pag.drawText(limpio(t), { x, y: yy, font: o.f ?? sans, size: o.s ?? 11, color: o.c ?? grafito });
  const der = (t: string, yy: number, o: { f?: any; s?: number; c?: any } = {}) => txt(t, 545 - (o.f ?? sans).widthOfTextAtSize(limpio(t), o.s ?? 11), yy, o);
  const parrafo = (t: string, x: number, ancho: number, tam = 11) => {
    let linea = "";
    for (const p of limpio(t).split(/\s+/)) { const prueba = linea ? linea + " " + p : p; if (sans.widthOfTextAtSize(prueba, tam) > ancho && linea) { txt(linea, x, y, { s: tam }); y -= tam + 4; linea = p; } else linea = prueba; }
    if (linea) { txt(linea, x, y, { s: tam }); y -= tam + 4; }
  };

  pag.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: marino });
  pag.drawRectangle({ x: 0, y: 759, width: 595, height: 3, color: dorado });
  txt("Nari", 50, 792, { f: serif, s: 28, c: rgb(1, 1, 1) }); txt("Autos", 50 + serif.widthOfTextAtSize("Nari", 28), 792, { f: serif, s: 28, c: dorado });
  der(`Cotización N.º ${String(c.id).padStart(5, "0")}`, 802, { f: negr, s: 13, c: rgb(1, 1, 1) });
  der(fechaHora(c.cotizada_en ?? c.creado_en), 784, { s: 10, c: rgb(0.85, 0.87, 0.9) });

  y = 725;
  txt("CLIENTE", 50, y, { f: negr, s: 9, c: gris }); txt("SUCURSAL", 310, y, { f: negr, s: 9, c: gris }); y -= 17;
  txt(c.clientes.nombre, 50, y, { f: negr, s: 12 }); txt(`NariAutos ${c.sucursales.nombre}`, 310, y, { f: negr, s: 12 }); y -= 15;
  txt(`Tel. ${c.clientes.telefono}`, 50, y, { s: 10 }); txt(`${c.sucursales.direccion}, ${c.sucursales.localidad}`, 310, y, { s: 10 }); y -= 14;
  txt(c.clientes.email ?? "", 50, y, { s: 10 }); txt(`Tel. ${c.sucursales.telefono}`, 310, y, { s: 10 }); y -= 14;
  txt(`Asesor comercial: ${c.empleados?.nombre ?? "NariAutos"}`, 310, y, { s: 10 });

  y -= 34; const u = c.unidades;
  txt("UNIDAD COTIZADA", 50, y, { f: negr, s: 9, c: gris }); y -= 22;
  txt(u ? `${u.marca} ${u.modelo}` : "Unidad a definir", 50, y, { f: serif, s: 20, c: marino }); y -= 18;
  if (u) { txt(`${u.version ?? ""}  ·  ${u.anio}  ·  ${u.km === 0 ? "0 km" : numero(u.km) + " km"}  ·  ${etiqueta(u.combustible)}  ·  ${etiqueta(u.transmision)}  ·  ${u.color ?? ""}`, 50, y, { s: 10, c: gris }); }
  y -= 30;
  const fila = (n: string, v: string, fuerte = false) => {
    if (fuerte) pag.drawRectangle({ x: 50, y: y - 9, width: 495, height: 30, color: rgb(0.96, 0.965, 0.972) });
    txt(n, 60, y, { f: fuerte ? negr : sans, s: fuerte ? 13 : 11 }); der(v, y, { f: fuerte ? negr : sans, s: fuerte ? 15 : 11, c: fuerte ? marino : grafito });
    y -= fuerte ? 34 : 22; pag.drawLine({ start: { x: 50, y: y + 12 }, end: { x: 545, y: y + 12 }, thickness: 0.5, color: rgb(0.82, 0.84, 0.86) });
  };
  pag.drawLine({ start: { x: 50, y: y + 16 }, end: { x: 545, y: y + 16 }, thickness: 0.5, color: rgb(0.82, 0.84, 0.86) });
  fila("Precio de lista", moneda(c.precio_cotizado));
  fila("Bonificación", `- ${moneda(c.bonificacion ?? 0)}`);
  y -= 4; fila("Precio final", moneda(Number(c.precio_cotizado) - Number(c.bonificacion ?? 0)), true);

  if (c.financiacion_ofrecida) { y -= 8; txt("FINANCIACIÓN", 50, y, { f: negr, s: 9, c: gris }); y -= 17; parrafo(c.financiacion_ofrecida, 50, 495); }
  if (c.simulacion) { y -= 6; txt("SIMULACIÓN ORIENTATIVA DEL CLIENTE", 50, y, { f: negr, s: 9, c: gris }); y -= 17;
    parrafo(`Anticipo del ${c.simulacion.anticipo_pct}% (${moneda(c.simulacion.anticipo)}), saldo de ${moneda(c.simulacion.financiado)} en ${c.simulacion.cuotas} cuotas de ${moneda(c.simulacion.cuota)} con TNA del ${c.simulacion.tna}%.`, 50, 495); }

  y = 120; pag.drawLine({ start: { x: 50, y: y + 14 }, end: { x: 545, y: y + 14 }, thickness: 1, color: dorado });
  parrafo("Cotización válida por 7 días corridos desde su emisión y sujeta a disponibilidad de la unidad. Los valores de financiación son orientativos y dependen de la aprobación crediticia. No incluye gastos de patentamiento ni transferencia, salvo indicación expresa.", 50, 495, 9);
  txt("NariAutos · Concesionaria y taller de post-venta", 50, 50, { s: 9, c: gris });

  return new Response(Buffer.from(await pdf.save()), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="cotizacion-nariautos-${c.id}.pdf"`, "cache-control": "no-store" } });
}
