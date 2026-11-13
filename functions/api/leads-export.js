// Cloudflare Pages Function: exporta os leads em CSV (mesmo modelo do /api/leads-export da Thaize).
// Este repo é público, então a chave NÃO fica no código: vem do Secret LEADS_EXPORT_KEY do Cloudflare Pages
// (enquanto ele não existir, vale a senha do time do /plano, Secret PLANO_SENHA). Sem Secret, ninguém exporta.
//   /api/leads-export?key=...                      -> leads da Black do Rian (source lp-black-rian-2026...)
//   ?source=lp-o-ano-da-virada                     -> outra captação
//   ?desde=2026-10-27                              -> data de cadastro, horário de Brasília
//   ?formato=json                                  -> padrão: csv
// Leads de teste (source com "teste") ficam fora.

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const chave = env.LEADS_EXPORT_KEY || env.PLANO_SENHA;
  if (!chave || (url.searchParams.get("key") || "") !== chave) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!env.DB) return new Response("no_db", { status: 200 });

  const source = url.searchParams.get("source") || "lp-black-rian-2026";
  const desde = url.searchParams.get("desde") || "";
  const formato = (url.searchParams.get("formato") || "csv").toLowerCase();

  let sql = `SELECT datetime(created_at, '-3 hours') AS cadastro, name, email, phone, source,
                    utm_source, utm_medium, utm_campaign, utm_content
               FROM leads
              WHERE source LIKE ? AND source NOT LIKE '%teste%'`;
  const args = [`${source}%`];
  if (desde) { sql += ` AND date(datetime(created_at, '-3 hours')) >= ?`; args.push(desde); }
  sql += ` ORDER BY created_at ASC`;

  let linhas;
  try {
    const r = await env.DB.prepare(sql).bind(...args).all();
    linhas = r.results || [];
  } catch (e) {
    return new Response("erro: " + (e && e.message), { status: 200 });
  }

  // deduplica por e-mail (ou telefone, quando não tem e-mail), ficando com o cadastro mais antigo
  const vistos = new Set();
  const unicos = [];
  for (const l of linhas) {
    const em = String(l.email || "").trim().toLowerCase();
    const k = em || String(l.phone || "").replace(/\D/g, "");
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    unicos.push({ ...l, email: em });
  }

  if (formato === "json") {
    return new Response(JSON.stringify({ total: unicos.length, leads: unicos }, null, 2), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
    });
  }

  const col = ["cadastro", "name", "email", "phone", "source", "utm_source", "utm_medium", "utm_campaign", "utm_content"];
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  // BOM no começo pro Excel abrir os acentos certos
  const csv = "﻿" + [col.join(","), ...unicos.map(l => col.map(c => esc(l[c])).join(","))].join("\n");
  const nome = `leads-${source}-${new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store"
    }
  });
}
