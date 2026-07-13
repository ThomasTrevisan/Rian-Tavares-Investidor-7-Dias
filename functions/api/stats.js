// Cloudflare Pages Function — agrega visitas (tabela "visits") e cadastros
// (tabela "leads") por dia, por origem (UTM) e por versao da pagina.
// Filtro de periodo via ?range=  ( hoje | ontem | 3d | 7d | total | dia ). Padrao: total.
// Datas em horario de Brasilia (-3h). Protegido por chave: /api/stats?key=...
//
// ATENCAO: o repo do Rian e PUBLICO, entao a KEY_DEFAULT abaixo NAO protege nada
// sozinha. A protecao real vem da env var Secret PANEL_KEY no Cloudflare Pages.
// Setar PANEL_KEY e OBRIGATORIO aqui.

const KEY_DEFAULT = "oadv-painel-9k4x7r2m"; // senha padrao do painel (troca depois via env.PANEL_KEY, opcional)
const LEAD_MATCH = "lp-o-ano-da-virada%";
const PAGE_MATCH = "%o-ano-da-virada%";
const TRACK_START = "2026-07-13T12:51:30.000Z"; // instante exato em que a conversao passou a contar (relogio Cloudflare/D1, UTC)
const TRACK_START_LABEL = "13/07 às 09h51"; // rotulo amigavel (Brasilia) do TRACK_START

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const expected = env.PANEL_KEY || KEY_DEFAULT;
  if (key !== expected) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);

  const range = url.searchParams.get("range") || "total";
  const dayParam = url.searchParams.get("date") || "";
  const dc = rangeCond(range, dayParam); // fragmento SQL fixo (data validada)

  const q = async (sql, ...binds) => {
    try { const r = await env.DB.prepare(sql).bind(...binds).all(); return r.results || []; }
    catch (e) { return []; }
  };

  const vDay = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM visits WHERE page LIKE ? ${dc} GROUP BY d`, PAGE_MATCH);
  const lDay = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY d`, LEAD_MATCH);
  const vOri = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM visits WHERE page LIKE ? ${dc} GROUP BY s,m`, PAGE_MATCH);
  const lOri = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY s,m`, LEAD_MATCH);
  const vPage = await q(`SELECT page p, COUNT(*) c FROM visits WHERE page LIKE ? ${dc} GROUP BY p`, PAGE_MATCH);
  const lPage = await q(`SELECT source p, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY p`, LEAD_MATCH);
  const lDayAll = await q("SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? GROUP BY d", LEAD_MATCH);
  const hora = await q(`SELECT strftime('%H', datetime(created_at,'-3 hours')) h, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY h`, LEAD_MATCH);

  // por dia
  const mapDay = {};
  for (const r of vDay) mapDay[r.d] = { dia: r.d, visitas: r.c, cadastros: 0 };
  for (const r of lDay) (mapDay[r.d] = mapDay[r.d] || { dia: r.d, visitas: 0, cadastros: 0 }).cadastros = r.c;
  const porDia = Object.values(mapDay)
    .sort((a, b) => (a.dia < b.dia ? 1 : -1))
    .slice(0, 30)
    .map(o => ({ ...o, taxa: o.visitas ? round1(o.cadastros / o.visitas * 100) : null }));

  // por origem
  const kOf = (s, m) => s + " / " + m;
  const mapOri = {};
  for (const r of vOri) mapOri[kOf(r.s, r.m)] = { origem: kOf(r.s, r.m), visitas: r.c, cadastros: 0 };
  for (const r of lOri) (mapOri[kOf(r.s, r.m)] = mapOri[kOf(r.s, r.m)] || { origem: kOf(r.s, r.m), visitas: 0, cadastros: 0 }).cadastros = r.c;
  const porOrigem = Object.values(mapOri)
    .map(o => ({ ...o, taxa: o.visitas ? round1(o.cadastros / o.visitas * 100) : null }))
    .sort((a, b) => b.cadastros - a.cadastros || b.visitas - a.visitas);

  // por versao (A oficial x B variante) — detecta o sufixo "-b" no path/source
  const verKey = t => (/-b$/i.test(String(t == null ? "" : t).replace(/\/+$/, "")) ? "B" : "A");
  const mapVer = { A: { versao: "A (oficial)", visitas: 0, cadastros: 0 }, B: { versao: "B (variante)", visitas: 0, cadastros: 0 } };
  for (const r of vPage) mapVer[verKey(r.p)].visitas += r.c;
  for (const r of lPage) mapVer[verKey(r.p)].cadastros += r.c;
  const porVersao = Object.values(mapVer).map(o => ({ ...o, taxa: o.visitas ? round1(o.cadastros / o.visitas * 100) : null }));

  const totVis = vDay.reduce((a, b) => a + b.c, 0);
  const totCad = lDay.reduce((a, b) => a + b.c, 0);
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

  // Conversao da LP: conta visita E cadastro juntos a partir de TRACK_START (instante
  // exato em que o contador entrou no ar). Antes disso nao havia visita pareada, entao
  // contar aquele periodo so inflaria a taxa. Respeita tambem o filtro de periodo (dc).
  const cvRow = await q(`SELECT COUNT(*) c FROM visits WHERE page LIKE ? AND created_at >= ? ${dc}`, PAGE_MATCH, TRACK_START);
  const ccRow = await q(`SELECT COUNT(*) c FROM leads WHERE source LIKE ? AND created_at >= ? ${dc}`, LEAD_MATCH, TRACK_START);
  const convVis = (cvRow[0] && cvRow[0].c) || 0;
  const convCad = (ccRow[0] && ccRow[0].c) || 0;
  const convLP = convVis ? round1(convCad / convVis * 100) : null;

  // ritmo de cadastros (dia a dia, historico completo, independente do filtro)
  const byDayAll = {}; for (const r of lDayAll) byDayAll[r.d] = r.c;
  const ontemD = new Date(Date.now() - 27 * 3600 * 1000).toISOString().slice(0, 10);
  const compDays = lDayAll.filter(r => r.d !== hoje);
  const media = compDays.length ? Math.round(compDays.reduce((a, b) => a + b.c, 0) / compDays.length) : 0;
  const pacing = { hoje: byDayAll[hoje] || 0, ontem: byDayAll[ontemD] || 0, media };

  // cadastros por horario (respeita o filtro de periodo)
  const mapHora = {}; for (const r of hora) mapHora[r.h] = r.c;
  const porHora = []; for (let i = 0; i < 24; i++) { const hh = String(i).padStart(2, "0"); porHora.push({ hora: hh, c: mapHora[hh] || 0 }); }

  return json({
    ok: true,
    range,
    hoje,
    trackStart: TRACK_START,
    trackStartLabel: TRACK_START_LABEL,
    totais: { visitas: totVis, cadastros: totCad, taxa: convLP, convCad, convVis },
    pacing, porHora, porDia, porOrigem, porVersao
  }, 200);
}

function rangeCond(range, date) {
  if (range === "hoje") return "AND date(created_at,'-3 hours') = date('now','-3 hours')";
  if (range === "ontem") return "AND date(created_at,'-3 hours') = date('now','-3 hours','-1 day')";
  if (range === "3d") return "AND date(created_at,'-3 hours') >= date('now','-3 hours','-2 days')";
  if (range === "7d") return "AND date(created_at,'-3 hours') >= date('now','-3 hours','-6 days')";
  if (range === "dia" && /^\d{4}-\d{2}-\d{2}$/.test(date || "")) return `AND date(created_at,'-3 hours') = '${date}'`;
  return ""; // total
}

function round1(n) { return Math.round(n * 10) / 10; }

function json(o, st) {
  return new Response(JSON.stringify(o), {
    status: st || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
