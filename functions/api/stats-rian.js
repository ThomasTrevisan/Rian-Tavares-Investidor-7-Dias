// Cloudflare Pages Function — painel do RIAN (visao de captacao).
// Mostra SO cadastros: total, por origem, por dia e por horario + ritmo.
// NAO expoe conversao/taxa nem visitas (metrica interna nossa). Endpoint proprio,
// com chave propria, pra que esses dados nem trafeguem ate o painel do Rian.
//
// Chave real: env var Secret RIAN_PANEL_KEY (opcional). Sem ela, usa KEY_DEFAULT.

const KEY_DEFAULT = "oadv-rian-6q2w";
const LEAD_MATCH = "lp-o-ano-da-virada%";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const expected = env.RIAN_PANEL_KEY || KEY_DEFAULT;
  if (key !== expected) return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);

  const range = url.searchParams.get("range") || "total";
  const dayParam = url.searchParams.get("date") || "";
  const dc = rangeCond(range, dayParam);

  const q = async (sql, ...binds) => {
    try { const r = await env.DB.prepare(sql).bind(...binds).all(); return r.results || []; }
    catch (e) { return []; }
  };

  // So cadastros (nenhuma consulta de visita, nenhuma taxa).
  const lDay = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY d`, LEAD_MATCH);
  const lOri = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY s,m`, LEAD_MATCH);
  const hora = await q(`SELECT strftime('%H', datetime(created_at,'-3 hours')) h, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY h`, LEAD_MATCH);
  const lDayAll = await q("SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? GROUP BY d", LEAD_MATCH);

  const porDia = lDay
    .map(r => ({ dia: r.d, cadastros: r.c }))
    .sort((a, b) => (a.dia < b.dia ? 1 : -1))
    .slice(0, 30);

  const kOf = (s, m) => s + " / " + m;
  const mapOri = {};
  for (const r of lOri) mapOri[kOf(r.s, r.m)] = { origem: kOf(r.s, r.m), cadastros: r.c };
  const porOrigem = Object.values(mapOri).sort((a, b) => b.cadastros - a.cadastros);

  const totCad = lDay.reduce((a, b) => a + b.c, 0);
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

  const byDayAll = {}; for (const r of lDayAll) byDayAll[r.d] = r.c;
  const ontemD = new Date(Date.now() - 27 * 3600 * 1000).toISOString().slice(0, 10);
  const compDays = lDayAll.filter(r => r.d !== hoje);
  const media = compDays.length ? Math.round(compDays.reduce((a, b) => a + b.c, 0) / compDays.length) : 0;
  const pacing = { hoje: byDayAll[hoje] || 0, ontem: byDayAll[ontemD] || 0, media };

  const mapHora = {}; for (const r of hora) mapHora[r.h] = r.c;
  const porHora = []; for (let i = 0; i < 24; i++) { const hh = String(i).padStart(2, "0"); porHora.push({ hora: hh, c: mapHora[hh] || 0 }); }

  return json({ ok: true, range, hoje, totais: { cadastros: totCad }, pacing, porHora, porDia, porOrigem }, 200);
}

function rangeCond(range, date) {
  if (range === "hoje") return "AND date(created_at,'-3 hours') = date('now','-3 hours')";
  if (range === "ontem") return "AND date(created_at,'-3 hours') = date('now','-3 hours','-1 day')";
  if (range === "3d") return "AND date(created_at,'-3 hours') >= date('now','-3 hours','-2 days')";
  if (range === "7d") return "AND date(created_at,'-3 hours') >= date('now','-3 hours','-6 days')";
  if (range === "dia" && /^\d{4}-\d{2}-\d{2}$/.test(date || "")) return `AND date(created_at,'-3 hours') = '${date}'`;
  return "";
}

function json(o, st) {
  return new Response(JSON.stringify(o), {
    status: st || 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
