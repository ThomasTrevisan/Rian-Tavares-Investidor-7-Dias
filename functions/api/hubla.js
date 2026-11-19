// Cloudflare Pages Function: recebe o webhook da Hubla do Rian (vendas e reembolsos) e guarda no D1 (tabela hubla_vendas).
// POST /api/hubla?key=...  O repo é público, então a chave NÃO fica aqui: o código só guarda o SHA-256 dela.
// A chave de verdade fica no webhook cadastrado na Hubla e numa cópia local do Thomas (~/.config/rian-hubla/webhook-key).
// Se um dia existir o Secret HUBLA_WEBHOOK_KEY no Cloudflare, ele vale no lugar do hash.
// Guardamos só o necessário pro cruzamento com as inscrições (e-mail e telefone ficam no D1, que não é público, como na tabela leads).
// GET /api/hubla?key=...&ultimos=5 mostra os últimos eventos recebidos, sem e-mail e telefone (pra conferir o formato).
// Criado em 19/11/2026 para cruzar comprador da Black com o anúncio de captação (ver /api/compradores-black).

const KEY_SHA256 = "69d8b02418f4cb44e8826106cb83d292a97418b773ae2f2e88f2cce9ec06b1f2";

async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function autorizado(url, env) {
  const k = url.searchParams.get("key") || "";
  if (!k) return false;
  if (env.HUBLA_WEBHOOK_KEY) return k === env.HUBLA_WEBHOOK_KEY;
  return (await sha256(k)) === KEY_SHA256;
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  if (!(await autorizado(url, env))) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);
  const txt = await request.text();
  if (txt.length > 200000) return json({ ok: false, error: "grande_demais" }, 413);
  let b = null;
  try { b = JSON.parse(txt); } catch (e) { return json({ ok: false, error: "json" }, 400); }
  const lista = Array.isArray(b) ? b : [b];
  await garantirTabela(env);
  let n = 0;
  for (const ev of lista.slice(0, 500)) {
    const v = extrair(ev || {});
    if (!v.id) continue;
    try {
      await env.DB.prepare(
        `INSERT INTO hubla_vendas (id, recebido_em, tipo, pago_em, produto, oferta, valor, parcela, de, email, telefone, origem, raw)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET tipo=excluded.tipo, recebido_em=excluded.recebido_em, raw=excluded.raw`
      ).bind(v.id, new Date().toISOString(), v.tipo, v.pagoEm, v.produto, v.oferta, v.valor, v.parcela, v.de,
             v.email, v.telefone, url.searchParams.get("origem") || "webhook", v.raw).run();
      n++;
    } catch (err) {}
  }
  return json({ ok: true, recebidos: n });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!(await autorizado(url, env))) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);
  await garantirTabela(env);
  const lim = Math.min(50, Number(url.searchParams.get("ultimos") || 5));
  const r = await env.DB.prepare(
    "SELECT recebido_em, tipo, pago_em, produto, oferta, valor, parcela, de, origem, (email <> '') tem_email, (telefone <> '') tem_tel, raw FROM hubla_vendas ORDER BY recebido_em DESC LIMIT ?"
  ).bind(lim).all();
  const tot = await env.DB.prepare("SELECT tipo, COUNT(*) n FROM hubla_vendas GROUP BY tipo").all();
  return json({ ok: true, totais: tot.results || [], eventos: r.results || [] });
}

// Formato do webhook v2 da Hubla (o mesmo que chega no log da Thaize):
// { type: "invoice.payment_succeeded", event: { invoice: { id, orderId, amount: { subtotal }, payer: { email, phone } }, user: {...}, products: [{ id, name }] } }
function extrair(d) {
  const ev = d.event || {};
  const inv = ev.invoice || {};
  const p0 = (ev.products || [])[0] || ev.product || {};
  const pay = inv.payer || {};
  const us = ev.user || {};
  const nome = String(p0.name || "");
  let parcela = 1, de = 1;
  const m = nome.match(/ - (\d+) de (\d+)\s*$/);
  if (m) { parcela = Number(m[1]); de = Number(m[2]); }
  const amount = inv.amount || {};
  const valor = Number(amount.subtotal != null ? amount.subtotal : (amount.totalCents != null ? amount.totalCents / 100 : 0)) || 0;
  // sem dado pessoal no raw: tira payer, user e qualquer e-mail/telefone
  const limpo = JSON.stringify(d, (k, v) => (/^(payer|user|email|phone|document|address|name)$/i.test(k) && typeof v !== "number" ? undefined : v));
  return {
    id: String(inv.id || inv.orderId || ""),
    tipo: String(d.type || ""),
    pagoEm: String(inv.paidAt || inv.updatedAt || inv.createdAt || ""),
    produto: nome,
    oferta: String(p0.offerId || (p0.offers && p0.offers[0] && p0.offers[0].id) || inv.offerId || ""),
    valor,
    parcela,
    de,
    email: String(pay.email || us.email || "").trim().toLowerCase(),
    telefone: String(pay.phone || us.phone || "").replace(/\D/g, ""),
    raw: limpo.slice(0, 3000),
  };
}

async function garantirTabela(env) {
  if (globalThis.__hublaTab) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS hubla_vendas (id TEXT PRIMARY KEY, recebido_em TEXT, tipo TEXT, pago_em TEXT, produto TEXT, oferta TEXT, valor REAL, parcela INTEGER, de INTEGER, email TEXT, telefone TEXT, origem TEXT, raw TEXT)"
  ).run();
  globalThis.__hublaTab = true;
}

function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
