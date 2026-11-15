import { db } from "@/lib/db";

// Imagen neutra de reemplazo para unidades sin fotos reales (SVG generado, sin derechos de terceros).
const VISTAS = ["Vista lateral", "Vista frontal", "Interior"];
const esc = (s: string) => s.replace(/[<>&"]/g, "");

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams, id = Number(p.get("u")), v = Math.min(Math.max(Number(p.get("v")) || 1, 1), 3);
  const { data: u } = Number.isInteger(id) && id > 0 ? await db().from("unidades").select("marca, modelo, version, anio").eq("id", id).maybeSingle() : { data: null };
  const titulo = u ? esc(`${u.marca} ${u.modelo}`) : "NariAutos", sub = u ? esc(`${u.version ?? ""} · ${u.anio}`) : "";
  const fondo = ["#e9ecf1", "#e4e8ee", "#eceef2"][v - 1];
  const auto = v === 2
    ? `<g fill="none" stroke="#2c4a6e" stroke-width="5" stroke-linejoin="round"><path d="M230 250 l22 -62 q6 -16 24 -16 h88 q18 0 24 16 l22 62"/><rect x="212" y="250" width="216" height="62" rx="12"/><circle cx="252" cy="280" r="13"/><circle cx="388" cy="280" r="13"/><path d="M284 290 h72"/><path d="M228 312 v20 h34 v-20 M378 312 v20 h34 v-20"/></g>`
    : v === 3
    ? `<g fill="none" stroke="#2c4a6e" stroke-width="5" stroke-linejoin="round"><path d="M170 300 q150 -70 300 0"/><circle cx="270" cy="262" r="46"/><circle cx="270" cy="262" r="12"/><path d="M270 216 v34 M228 280 l32 -12 M312 280 l-32 -12"/><rect x="360" y="232" width="84" height="52" rx="6"/></g>`
    : `<g fill="none" stroke="#2c4a6e" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"><path d="M120 290 h-14 q-10 0 -10 -12 v-22 q0 -14 16 -18 l62 -14 l42 -40 q8 -8 22 -8 h112 q14 0 24 9 l44 39 l74 12 q22 4 22 24 v18 q0 12 -12 12 h-16"/><path d="M190 290 h196"/><circle cx="155" cy="290" r="33"/><circle cx="421" cy="290" r="33"/><path d="M186 224 h214 M290 178 v46"/></g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" role="img" aria-label="${titulo}">
<rect width="640" height="400" fill="${fondo}"/><rect y="336" width="640" height="64" fill="#0b1f3a"/>
<path d="M0 334 h640" stroke="#a8874e" stroke-width="3"/>${auto}
<text x="24" y="44" font-family="Georgia, serif" font-size="20" font-weight="600" fill="#0b1f3a">Nari<tspan fill="#a8874e">Autos</tspan></text>
<text x="616" y="44" text-anchor="end" font-family="Arial, sans-serif" font-size="13" fill="#6b7280">${VISTAS[v - 1]} · imagen ilustrativa</text>
<text x="24" y="366" font-family="Georgia, serif" font-size="22" font-weight="600" fill="#ffffff">${titulo}</text>
<text x="24" y="387" font-family="Arial, sans-serif" font-size="13" fill="#d1d5db">${sub}</text></svg>`;
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8", "cache-control": "public, max-age=86400, s-maxage=604800" } });
}
