// Cloudflare Pages Function: compradores da Black do Rian por anúncio de captação (19/11/2026).
// GET /api/compradores-black?key=...  (mesma chave do /api/stats-black interno)
// Casa cada venda paga da Black (tabela hubla_vendas, alimentada pelo webhook /api/hubla) com a inscrição MAIS ANTIGA
// da captação (leads lp-black-rian-2026*, sem teste) pelo e-mail ou pelo telefone. Depois soma por anúncio (utm_content
// do cadastro pago) e por origem orgânica (utm_source). Só devolve contagens e valores, nenhum e-mail ou telefone.
// Venda parcelada conta uma vez (parcela 1) e o valor vira o total (valor da parcela x número de parcelas).
// Venda reembolsada sai da conta.

const KEY_DEFAULT = "black-rian-5ec060";
const PAGO = ["pago", "paid", "cpc"];

function telKey(p) {
  let d = String(p || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d.length >= 10 ? d.slice(0, 2) + d.slice(-8) : "";
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const KEY = env.PANEL_KEY_BLACK_RIAN || KEY_DEFAULT;
  if ((url.searchParams.get("key") || "") !== KEY) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);

  let vendas = [];
  try {
    const r = await env.DB.prepare(
      `SELECT id, tipo, pago_em, produto, valor, parcela, de, email, telefone FROM hubla_vendas
        WHERE (produto LIKE '%Black Friday%' OR produto LIKE '%Invista para Prosperar%')`
    ).all();
    vendas = r.results || [];
  } catch (e) {
    return json({ ok: true, semTabela: true, vendas: 0 });
  }
  const reembolsadas = new Set(vendas.filter((v) => /refund|chargeback/i.test(v.tipo)).map((v) => v.id));
  const pagas = vendas.filter((v) => /payment_succeeded|paid|aprovad/i.test(v.tipo) && Number(v.parcela || 1) === 1 && !reembolsadas.has(v.id));

  const lr = await env.DB.prepare(
    `SELECT created_at, email, phone, utm_source, utm_medium, utm_campaign, utm_content FROM leads
      WHERE source LIKE 'lp-black-rian-2026%' AND source NOT LIKE '%teste%' ORDER BY created_at ASC`
  ).all();
  const leads = lr.results || [];

  const porEmail = new Map(), porTel = new Map();
  const leadsPorAnuncio = new Map(), leadsPorOrigem = new Map();
  for (const l of leads) {
    const e = String(l.email || "").trim().toLowerCase();
    const t = telKey(l.phone);
    if (e && !porEmail.has(e)) porEmail.set(e, l);
    if (t && !porTel.has(t)) porTel.set(t, l);
  }
  // leads únicos (primeiro cadastro de cada pessoa) por anúncio/origem, pra taxa de conversão
  const vistos = new Set();
  for (const l of leads) {
    const k = String(l.email || "").trim().toLowerCase() || telKey(l.phone);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    const g = grupo(l);
    const m = g.tipo === "pago" ? leadsPorAnuncio : leadsPorOrigem;
    m.set(g.nome, (m.get(g.nome) || 0) + 1);
  }

  const anuncios = new Map(), origens = new Map();
  let casadas = 0, semCadastro = 0, fatTotal = 0;
  for (const v of pagas) {
    const total = Number(v.valor || 0) * (Number(v.de || 1) > 1 ? Number(v.de) : 1);
    fatTotal += total;
    const l = porEmail.get(String(v.email || "").trim().toLowerCase()) || porTel.get(telKey(v.telefone));
    if (!l) { semCadastro++; continue; }
    casadas++;
    const g = grupo(l);
    const m = g.tipo === "pago" ? anuncios : origens;
    const o = m.get(g.nome) || { nome: g.nome, campanha: g.campanha, compradores: 0, faturamento: 0 };
    o.compradores++; o.faturamento += total;
    m.set(g.nome, o);
  }
  const fmt = (m, leadsMap) => [...m.values()].map((o) => {
    const ld = leadsMap.get(o.nome) || 0;
    return { ...o, faturamento: Math.round(o.faturamento * 100) / 100, leads: ld, conversao: ld ? Math.round((o.compradores / ld) * 1000) / 10 : null };
  }).sort((a, b) => b.compradores - a.compradores || b.faturamento - a.faturamento);

  return json({
    ok: true,
    atualizadoEm: new Date().toISOString(),
    vendasPagas: pagas.length,
    reembolsadas: reembolsadas.size,
    faturamentoTotal: Math.round(fatTotal * 100) / 100,
    casadasComCadastro: casadas,
    semCadastroNaCaptacao: semCadastro,
    ultimaVenda: pagas.map((v) => v.pago_em).sort().pop() || null,
    porAnuncio: fmt(anuncios, leadsPorAnuncio),
    porOrigemOrganica: fmt(origens, leadsPorOrigem),
  });
}

function grupo(l) {
  const md = String(l.utm_medium || "").toLowerCase();
  if (PAGO.includes(md)) return { tipo: "pago", nome: String(l.utm_content || "").trim() || "(pago sem anúncio)", campanha: String(l.utm_campaign || "") };
  return { tipo: "organico", nome: (String(l.utm_source || "").trim() || "direto").toLowerCase(), campanha: "" };
}

function json(o, s) {
  return new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}
