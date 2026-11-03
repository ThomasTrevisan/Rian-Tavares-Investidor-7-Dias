// Cloudflare Pages Function — recebe o Sendhook do Sendflow (entradas e saídas dos grupos de WhatsApp em tempo real).
// POST /api/sendflow?key=...   O corpo vem do Sendflow; guardamos o evento inteiro (raw) e extraímos
// evento (entrada/saída), telefone, grupo e campanha. O /api/stats-black cruza o telefone com as inscrições.
// GET /api/sendflow?key=...&ultimos=5 mostra os últimos eventos recebidos (pra conferir o formato).
// Clone do /api/sendflow da Thaize. O repo do Rian é público: a chave fica só no Secret SENDFLOW_KEY do Cloudflare.

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (!env.SENDFLOW_KEY || (url.searchParams.get("key") || "") !== env.SENDFLOW_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);
  const txt = await request.text();
  let b = null; try { b = JSON.parse(txt); } catch (e) {}
  const lista = Array.isArray(b) ? b : (b && Array.isArray(b.events) ? b.events : [b || {}]);
  await garantirTabela(env);
  let n = 0;
  for (const ev of lista) {
    const e = extrair(ev || {});
    try {
      await env.DB.prepare("INSERT INTO sendflow_events (created_at, evento, telefone, grupo, campanha, raw) VALUES (?,?,?,?,?,?)")
        .bind(new Date().toISOString(), e.evento, e.telefone, e.grupo, e.campanha, (b ? JSON.stringify(ev) : txt).slice(0, 4000)).run();
      n++;
    } catch (err) {}
  }
  return json({ ok: true, recebidos: n });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.SENDFLOW_KEY || (url.searchParams.get("key") || "") !== env.SENDFLOW_KEY) return json({ ok: false, error: "unauthorized" }, 401);
  await garantirTabela(env);
  const lim = Math.min(50, Number(url.searchParams.get("ultimos") || 5));
  const r = await env.DB.prepare("SELECT created_at, evento, telefone, grupo, campanha, raw FROM sendflow_events ORDER BY id DESC LIMIT ?").bind(lim).all();
  return json({ ok: true, eventos: r.results || [] });
}

async function garantirTabela(env) {
  if (globalThis.__sfTab) return;
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS sendflow_events (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, evento TEXT, telefone TEXT, grupo TEXT, campanha TEXT, raw TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_sf_created ON sendflow_events(created_at)").run();
  globalThis.__sfTab = true;
}

// procura os campos em qualquer nível do JSON, pelo nome da chave
function achar(o, testa, profundidade = 0) {
  if (!o || typeof o !== "object" || profundidade > 5) return "";
  for (const [k, v] of Object.entries(o)) if (testa(k.toLowerCase()) && (typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim();
  for (const v of Object.values(o)) { const r = achar(v, testa, profundidade + 1); if (r) return r; }
  return "";
}
// nome de um objeto ("group": {"name": ...}) ou texto direto ("groupName": "...", "grupo": "...")
function nomeDe(o, re, profundidade = 0) {
  if (!o || typeof o !== "object" || profundidade > 5) return "";
  for (const [k, v] of Object.entries(o)) {
    const kl = k.toLowerCase();
    if (!re.test(kl) || /id$|_id|count|total/.test(kl)) continue;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") { const n = achar(v, k2 => /^(name|nome|title|titulo|subject)$/.test(k2)); if (n) return n; }
  }
  for (const v of Object.values(o)) { const r = nomeDe(v, re, profundidade + 1); if (r) return r; }
  return "";
}
function extrair(o) {
  // formato do Sendhook (visto nos testes de 26/10): { event: "group.updated.members.added", data: { number, groupName, campaignName, ... } }
  const nome = String(o.event || o.type || "").toLowerCase();
  let evento = "outro";
  if (/members\.(added|joined|join)$/.test(nome)) evento = "entrada";
  else if (/members\.(removed|left|leave|kicked|exited)$/.test(nome)) evento = "saida";
  else if (nome === "campaign.metrics") evento = "metricas";
  else if (nome) evento = nome.slice(0, 60);
  const d = o.data || o;
  let tel = String(d.number || d.phone || "").replace(/\D/g, "");
  if (!tel && evento !== "metricas" && evento !== "outro") tel = achar(o, k => /phone|telefone|number|numero|participant/.test(k) && !/group|count|total|amount/.test(k)).replace(/\D/g, "");
  if (/^0+$/.test(tel)) tel = "";   // eventos de teste do Sendflow vêm com 0000000000000
  const grupo = String(d.groupName || "").trim() || nomeDe(o, /group|grupo/);
  const campanha = String(d.campaignName || "").trim() || nomeDe(o, /campaign|campanha/) || String(d.campaignId || "");
  return { evento, telefone: tel.length >= 10 ? tel : "", grupo, campanha };
}

function json(o, st) {
  return new Response(JSON.stringify(o), { status: st || 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
