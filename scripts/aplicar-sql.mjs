// Aplica archivos SQL mediante la función temporal public._instalar (solo instalación inicial).
// Uso: node scripts/aplicar-sql.mjs supabase/migrations/0002_esquema.sql [...]
import { readFileSync } from "node:fs";
import { config } from "dotenv";
config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
for (const archivo of process.argv.slice(2)) {
  const r = await fetch(`${url}/rest/v1/rpc/_instalar`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json", "x-nari-server": process.env.SUPABASE_SERVER_SECRET },
    body: JSON.stringify({ p_sql: readFileSync(archivo, "utf8") }),
  });
  console.log(archivo, r.status, (await r.text()).slice(0, 600));
  if (!r.ok) process.exit(1);
}
