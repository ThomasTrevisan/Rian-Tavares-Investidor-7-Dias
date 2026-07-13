// Cloudflare Pages Function — registra um acesso (pageview) da LP no D1.
// Alimenta o painel (/painel-oadv). Guarda a UTM pra saber a origem do acesso.
// A tabela "visits" e criada automaticamente no primeiro acesso.

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false }, 200);

  let b = {};
  try { b = await request.json(); } catch (e) {}

  const row = [
    new Date().toISOString(),
    s(b.page), s(b.utm_source), s(b.utm_medium),
    s(b.utm_campaign), s(b.utm_content), s(b.utm_term), s(b.ref)
  ];
  const sql = "INSERT INTO visits (created_at, page, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref) VALUES (?,?,?,?,?,?,?,?)";

  try {
    await env.DB.prepare(sql).bind(...row).run();
  } catch (e) {
    // tabela ainda nao existe: cria e tenta de novo
    try {
      await env.DB.prepare(
        "CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, page TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT, utm_content TEXT, utm_term TEXT, ref TEXT)"
      ).run();
      await env.DB.prepare(sql).bind(...row).run();
    } catch (e2) {}
  }

  return json({ ok: true }, 200);
}

function s(v) { return String(v == null ? "" : v).slice(0, 300); }

function json(o, st) {
  return new Response(JSON.stringify(o), {
    status: st || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
