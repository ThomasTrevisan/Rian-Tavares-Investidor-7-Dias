// Cloudflare Pages Function — votos da página /japao (viagem de amigos, não faz parte do funil).
// GET devolve os votos de todos; POST salva os votos de uma pessoa.
// A tabela "japao_votos" é criada automaticamente no primeiro uso.

const PESSOAS = ["thomas", "arthur", "rodrigo", "bruno"];
const VALORES = ["q", "t", "p"];
const CREATE = "CREATE TABLE IF NOT EXISTS japao_votos (pessoa TEXT PRIMARY KEY, picks TEXT, updated_at TEXT)";

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ votos: {} });
  try {
    const { results } = await env.DB.prepare("SELECT pessoa, picks FROM japao_votos").all();
    const votos = {};
    for (const r of results || []) {
      try { votos[r.pessoa] = JSON.parse(r.picks || "{}"); } catch (e) { votos[r.pessoa] = {}; }
    }
    return json({ votos });
  } catch (e) {
    try { await env.DB.prepare(CREATE).run(); } catch (e2) {}
    return json({ votos: {} });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false }, 503);
  let b = {};
  try { b = await request.json(); } catch (e) { return json({ ok: false }, 400); }
  const pessoa = String(b.pessoa || "");
  if (!PESSOAS.includes(pessoa)) return json({ ok: false }, 400);

  const picks = {};
  for (const [k, v] of Object.entries(b.picks || {}).slice(0, 200)) {
    if (/^[a-z0-9-]{1,40}$/.test(k) && VALORES.includes(v)) picks[k] = v;
  }
  const row = [pessoa, JSON.stringify(picks), new Date().toISOString()];
  const sql = "INSERT INTO japao_votos (pessoa, picks, updated_at) VALUES (?,?,?) ON CONFLICT(pessoa) DO UPDATE SET picks = excluded.picks, updated_at = excluded.updated_at";
  try {
    await env.DB.prepare(sql).bind(...row).run();
  } catch (e) {
    try {
      await env.DB.prepare(CREATE).run();
      await env.DB.prepare(sql).bind(...row).run();
    } catch (e2) { return json({ ok: false }, 500); }
  }
  return json({ ok: true });
}

function json(o, st) {
  return new Response(JSON.stringify(o), {
    status: st || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
