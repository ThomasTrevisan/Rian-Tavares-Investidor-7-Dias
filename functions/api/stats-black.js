// Cloudflare Pages Function — painel da Black dos Investimentos 2026 do Rian (/painel-black). Clone do /api/stats-black da Thaize.
// Mesma logica do /api/stats (O Ponto da Virada), com os filtros da Black:
// visitas da LP /black, cadastros com source "lp-black-2026", chegada na
// pagina de obrigado e cliques no botao do grupo de abertura.
// Filtro de periodo via ?range= ( hoje | ontem | 3d | 7d | dia | total ).
// Datas em horario de Brasilia (-3h). Protegido por chave: /api/stats-black?key=...

const KEY_DEFAULT = "black-rian-5ec060";
const KEY_THAIZE_DEFAULT = "black-rian-ver-618fcb";
const LEAD_MATCH = "lp-black-rian-2026%";
const PAGE_MATCH = "/black%";
const OBG_PAGE = "/obrigado-black/";
const GRUPO_PAGE = "/obrigado-black/#grupo";
// 1o dia de captacao: o painel conta visitas e cadastros so a partir daqui
const TRACK_START = "2026-10-26";
// painel zerado em 20/10 (Thomas): tudo antes disso foi teste dele. Horario em UTC (created_at e gravado em UTC).
// visitas, conversao, teste A/B e clique no grupo contam a partir daqui (zerados de novo pelo Thomas em 20/10, testes do time).
// Cadastros totais continuam desde ZERO_UTC.
const CONV_START_UTC = "2026-10-26T03:00:00";
const ZERO_UTC = "2026-10-26T03:00:00";
// teste B x C: a B mantem todos os dados desde CONV_START_UTC; a C foi zerada em 21/10 18h12 (Brasilia)
// porque o Thomas testou nela antes disso. Cadastros totais nao mudam.
const C_START_UTC = "2026-10-26T03:00:00";
// teste B x D (foto nova de fundo na B): as duas contam a partir daqui, mesma janela
const D_START_UTC = "2026-10-26T03:00:00";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") || "";
  const KEY_FULL = env.PANEL_KEY_BLACK_RIAN || KEY_DEFAULT;
  const KEY_THAIZE = env.PANEL_KEY_BLACK_RIAN_VER || KEY_THAIZE_DEFAULT;
  let restricted;
  if (key === KEY_FULL) restricted = false;         // painel interno: ve tudo
  else if (key === KEY_THAIZE) restricted = true;    // painel da Thaize: sem conversao
  else return json({ ok: false, error: "unauthorized" }, 401);
  if (!env.DB) return json({ ok: false, error: "no_db" }, 200);

  const range = url.searchParams.get("range") || "total";
  const dayParam = url.searchParams.get("date") || "";
  // tudo antes da abertura da captacao e teste: fica fora do painel
  const dc = rangeCond(range, dayParam) + ` AND created_at >= '${ZERO_UTC}'`;

  // se o banco recusar a leitura (ex.: limite diario do D1), avisa em vez de mostrar zero
  let erroDb = "", linhasLidas = 0;
  // indices por data: cada consulta le so o periodo da Black, nao o historico inteiro (criados 1x por instancia)
  if (!globalThis.__idxBlack) {
    try {
      await env.DB.batch([
        env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at)"),
        env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at)"),
      ]);
      globalThis.__idxBlack = true;
    } catch (e) {}
  }
  const q = async (sql, ...binds) => {
    try { const r = await env.DB.prepare(sql).bind(...binds).all(); linhasLidas += (r.meta && r.meta.rows_read) || 0; return r.results || []; }
    catch (e) { erroDb = String(e && e.message || e); return []; }
  };

  // cadastros: desde ZERO_UTC | visitas e taxas: desde CONV_START_UTC
  const dcv = dc + ` AND created_at >= '${CONV_START_UTC}'`;
  const vDay = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM visits WHERE page LIKE ? ${dcv} GROUP BY d`, PAGE_MATCH);
  const lDay = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY d`, LEAD_MATCH);
  const lDayC = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? ${dcv} GROUP BY d`, LEAD_MATCH);
  const vOri = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM visits WHERE page LIKE ? ${dcv} GROUP BY s,m`, PAGE_MATCH);
  const lOri = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY s,m`, LEAD_MATCH);
  const lOriC = await q(`SELECT COALESCE(NULLIF(utm_source,''),'direto') s, COALESCE(NULLIF(utm_medium,''),'-') m, COUNT(*) c FROM leads WHERE source LIKE ? ${dcv} GROUP BY s,m`, LEAD_MATCH);
  const lCamp = await q(`SELECT COALESCE(NULLIF(utm_campaign,''),'(sem campanha)') cp, COALESCE(NULLIF(utm_content,''),'(sem anuncio)') ct, COUNT(*) c FROM leads WHERE source LIKE ? AND lower(utm_medium) IN ('pago','paid','cpc') ${dc} GROUP BY cp,ct ORDER BY c DESC LIMIT 40`, LEAD_MATCH);
  // leads por dia separados em pago e organico (sempre o historico todo da captacao)
  const lDayTipo = await q(`SELECT date(created_at,'-3 hours') d, CASE WHEN lower(utm_medium) IN ('pago','paid','cpc') THEN 'pago' ELSE 'organico' END t, COUNT(*) c FROM leads WHERE source LIKE ? AND created_at >= '${ZERO_UTC}' GROUP BY d, t`, LEAD_MATCH);
  const lDayAll = await q(`SELECT date(created_at,'-3 hours') d, COUNT(*) c FROM leads WHERE source LIKE ? AND created_at >= '${ZERO_UTC}' GROUP BY d`, LEAD_MATCH);
  const hora = await q(`SELECT strftime('%H', datetime(created_at,'-3 hours')) h, COUNT(*) c FROM leads WHERE source LIKE ? ${dc} GROUP BY h`, LEAD_MATCH);
  const funil = await q(`SELECT page p, COUNT(*) c FROM visits WHERE page IN (?,?) ${dcv} GROUP BY p`, OBG_PAGE, GRUPO_PAGE);
  const TIPO = `CASE WHEN lower(utm_medium) IN ('pago','paid','cpc') THEN 'pago' ELSE 'organico' END`;
  const vVar = await q(`SELECT page p, ${TIPO} t, COUNT(*) c FROM visits WHERE page LIKE ? ${dcv} GROUP BY p, t`, PAGE_MATCH);
  const lVar = await q(`SELECT source p, ${TIPO} t, COUNT(*) c FROM leads WHERE source LIKE ? ${dcv} GROUP BY p, t`, LEAD_MATCH);
  const dbc = ` AND created_at >= '${D_START_UTC}'`;
  const vVarC = await q(`SELECT page p, ${TIPO} t, COUNT(*) c FROM visits WHERE page LIKE ? ${dc}${dbc} GROUP BY p, t`, PAGE_MATCH);
  const lVarC = await q(`SELECT source p, ${TIPO} t, COUNT(*) c FROM leads WHERE source LIKE ? ${dc}${dbc} GROUP BY p, t`, LEAD_MATCH);

  if (erroDb) return json({ ok: false, error: /limit/i.test(erroDb) ? "limite_d1" : "erro_db", detalhe: erroDb.slice(0, 200) }, 200);

  // por dia
  const mapDay = {};
  for (const r of vDay) mapDay[r.d] = { dia: r.d, visitas: r.c, cadastros: 0 };
  for (const r of lDay) (mapDay[r.d] = mapDay[r.d] || { dia: r.d, visitas: 0, cadastros: 0 }).cadastros = r.c;
  const porDia = Object.values(mapDay)
    .sort((a, b) => (a.dia < b.dia ? 1 : -1))
    .slice(0, 30)
    .map(o => ({ ...o, taxa: o.visitas ? round1(((lDayC.find(r => r.d === o.dia) || {}).c || 0) / o.visitas * 100) : null }));

  // por origem
  const kOf = (s, m) => s + " / " + m;
  const mapOri = {};
  for (const r of vOri) mapOri[kOf(r.s, r.m)] = { origem: kOf(r.s, r.m), visitas: r.c, cadastros: 0 };
  for (const r of lOri) (mapOri[kOf(r.s, r.m)] = mapOri[kOf(r.s, r.m)] || { origem: kOf(r.s, r.m), visitas: 0, cadastros: 0 }).cadastros = r.c;
  const cadC = {}; for (const r of lOriC) cadC[kOf(r.s, r.m)] = r.c;
  const porOrigem = Object.values(mapOri)
    .map(o => ({ ...o, cadConv: cadC[o.origem] || 0, taxa: o.visitas ? round1((cadC[o.origem] || 0) / o.visitas * 100) : null }))
    .sort((a, b) => b.cadastros - a.cadastros || b.visitas - a.visitas);

  // teste de LP. Teste 1 (A x B) acabou: B venceu. Agora: B = modelo novo (#b, -b) x C = modelo Speak Journey (#c, -c),
  // B com todos os dados desde CONV_START_UTC, C so desde C_START_UTC. O que nao tem marca fica fora da comparacao.
  const varOf = (t, isLead) => { const m = isLead ? /-([bc])$/i.exec(t) : /#([bc])$/i.exec(t); return m ? m[1].toUpperCase() : null; };
  const nv = () => ({ visitas: 0, cadastros: 0, visPago: 0, cadPago: 0, visOrg: 0, cadOrg: 0 });
  const mapVar = { B: { versao: "B · página longa", ...nv() }, C: { versao: "C · 1 dobra", ...nv() } };
  for (const r of vVarC) { const k = varOf(r.p, false); if (k) { mapVar[k].visitas += r.c; mapVar[k][r.t === "pago" ? "visPago" : "visOrg"] += r.c; } }
  for (const r of lVarC) { const k = varOf(r.p, true); if (k) { mapVar[k].cadastros += r.c; mapVar[k][r.t === "pago" ? "cadPago" : "cadOrg"] += r.c; } }
  const tx = (c, v) => v ? round1(c / v * 100) : null;
  const porVariante = Object.values(mapVar).map(o => ({ ...o, taxa: tx(o.cadastros, o.visitas), taxaPago: tx(o.cadPago, o.visPago), taxaOrg: tx(o.cadOrg, o.visOrg) }));
  const testeDesde = { B: D_START_UTC, C: D_START_UTC };

  // cadastros pagos por campanha e anuncio (utm_campaign / utm_content)
  const porAnuncio = lCamp.map(r => ({ campanha: r.cp, anuncio: r.ct, cadastros: r.c }));

  const totVis = vDay.reduce((a, b) => a + b.c, 0);
  const totCad = lDay.reduce((a, b) => a + b.c, 0);
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

  // Conversao da LP: so o periodo em que visita E cadastro sao contados juntos
  const convCad = lVar.reduce((a, b) => a + b.c, 0);
  const convVis = vVar.reduce((a, b) => a + b.c, 0);
  const convLP = convVis ? round1(convCad / convVis * 100) : null;

  // depois do cadastro: chegou na obrigado e clicou pra entrar no grupo
  const fm = {}; for (const r of funil) fm[r.p] = r.c;
  const obrigado = fm[OBG_PAGE] || 0, grupo = fm[GRUPO_PAGE] || 0;
  // taxa de clique no grupo so no periodo em que os cliques foram contados (depois da volta do banco)
  const grupoConv = grupo;
  const pos = { obrigado, grupo, grupoConv, cadConv: convCad, taxaGrupo: convCad ? round1(grupoConv / convCad * 100) : null };

  // ritmo de cadastros (dia a dia, historico completo, independente do filtro)
  const byDayAll = {}; for (const r of lDayAll) byDayAll[r.d] = r.c;
  const ontemD = new Date(Date.now() - 27 * 3600 * 1000).toISOString().slice(0, 10);
  const compDays = lDayAll.filter(r => r.d !== hoje);
  const media = compDays.length ? Math.round(compDays.reduce((a, b) => a + b.c, 0) / compDays.length) : 0;
  const pacing = { hoje: byDayAll[hoje] || 0, ontem: byDayAll[ontemD] || 0, media };

  // cadastros por horario (respeita o filtro de periodo)
  const mapHora = {}; for (const r of hora) mapHora[r.h] = r.c;
  const porHora = []; for (let i = 0; i < 24; i++) { const hh = String(i).padStart(2, "0"); porHora.push({ hora: hh, c: mapHora[hh] || 0 }); }

  const mapTipo = {};
  for (const r of lDayTipo) { const o = mapTipo[r.d] = mapTipo[r.d] || { dia: r.d, organico: 0, pago: 0 }; o[r.t] = r.c; }
  const porDiaTipo = Object.values(mapTipo).sort((a, b) => (a.dia < b.dia ? 1 : -1)).map(o => ({ ...o, total: o.organico + o.pago }));

  const totais = { visitas: totVis, cadastros: totCad, taxa: convLP, convCad, convVis };

  // grupo de WhatsApp (Sendhook do Sendflow, tabela sendflow_events): cruza o telefone de quem entrou com o das inscrições.
  // Chave do telefone = DDD + últimos 8 dígitos (ignora o 55 e o 9 a mais, que às vezes vem e às vezes não).
  const grupoWa = restricted ? null : await grupoWhats(env, ZERO_UTC);

  // painel da Thaize: remove tudo que e conversao (nem chega no navegador dela)
  if (restricted) {
    totais.taxa = null; totais.visitas = null; delete totais.convCad; delete totais.convVis;
    porDia.forEach(o => { o.taxa = null; o.visitas = null; });
    porOrigem.forEach(o => { o.taxa = null; o.visitas = null; });
    pos.taxaGrupo = null; pos.obrigado = null; pos.grupo = null; pos.grupoConv = null; pos.cadConv = null;
    porVariante.forEach(o => { o.taxa = null; o.visitas = null; o.taxaPago = null; o.taxaOrg = null; o.visPago = null; o.visOrg = null; });
  }

  return json({ ok: true, restricted, range, hoje, totais, pos, pacing, porHora, porDia, porOrigem, porAnuncio, porVariante, testeDesde, porDiaTipo, grupo: grupoWa, linhasLidas }, 200);
}

function chaveTel(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (!d || /^0+$/.test(d)) return "";   // número de teste do Sendflow
  if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
  if (d.length < 10) return "";
  return d.slice(0, 2) + d.slice(-8);
}

// lê a tabela do Sendflow sem derrubar o painel se ela ainda não existir
async function grupoWhats(env, desde) {
  const all = async (sql, ...b) => { try { const r = await env.DB.prepare(sql).bind(...b).all(); return r.results || []; } catch (e) { return null; } };
  const evAll = await all(`SELECT date(created_at,'-3 hours') d, evento, telefone, created_at FROM sendflow_events WHERE created_at >= ? AND evento IN ('entrada','saida') AND telefone <> ''`, desde);
  if (evAll === null) return { ativo: false };
  const ev = evAll.filter(e => chaveTel(e.telefone));
  // alertas do Sendflow (últimas 72h): conta banida, restrita ou deslogada, grupo suspenso, bloqueio de crescimento,
  // campanha sem conta, falha de disparo. Ignora os testes (Campanha Natal / campaignId AAAA...)
  const alertas = (await all(`SELECT created_at, evento, grupo, campanha FROM sendflow_events WHERE created_at >= datetime('now','-3 days') AND evento NOT IN ('entrada','saida','metricas','outro')
    AND (evento LIKE '%ban%' OR evento LIKE '%restrict%' OR evento LIKE '%logout%' OR evento LIKE '%logged%' OR evento LIKE '%disconnect%' OR evento LIKE '%suspen%' OR evento LIKE '%block%' OR evento LIKE '%growth%' OR evento LIKE '%without%' OR evento LIKE '%no_account%' OR evento LIKE '%fail%' OR evento LIKE '%error%')
    AND raw NOT LIKE '%AAAAAAAAAAAAAAAAAAAA%' AND campanha <> 'Campanha Natal' ORDER BY id DESC LIMIT 10`)) || [];
  // último snapshot de "Métricas da campanha" (ignora o de teste do Sendflow, com campaignId AAAA...)
  const met = await all(`SELECT created_at, raw FROM sendflow_events WHERE evento = 'metricas' AND raw NOT LIKE '%AAAAAAAAAAAAAAAAAAAA%' ORDER BY id DESC LIMIT 1`) || [];
  let metricas = null;
  if (met.length) { try { const m = JSON.parse(met[0].raw).data || {}; metricas = { em: met[0].created_at, participantes: m.participantsAmount, cliques: m.clicksTotalCount, entradas: m.inputAmount, saidas: m.outputAmount, grupos: m.groupsTotalAmount, gruposCheios: m.groupsFullAmount }; } catch (e) {} }
  // o Sendhook só manda eventos daqui pra frente: a taxa compara só as inscrições feitas depois do 1º evento recebido
  // (com o histórico importado, os eventos antigos entram na tabela e o início recua sozinho)
  const inicio = ev.length ? ev.reduce((m, e) => e.created_at < m ? e.created_at : m, ev[0].created_at) : null;
  const leads = inicio ? (await all(`SELECT date(created_at,'-3 hours') d, phone FROM leads WHERE source LIKE 'lp-black-rian-2026%' AND created_at >= ?`, inicio) || []) : [];
  const entrou = new Set(), saiu = new Set(), porDia = {};
  const dia = d => (porDia[d] = porDia[d] || { dia: d, inscritos: 0, inscritosNoGrupo: 0, entradas: 0, saidas: 0 });
  for (const e of ev) {
    const k = chaveTel(e.telefone); if (!k) continue;
    if (e.evento === "entrada") { if (!entrou.has(k)) dia(e.d).entradas++; entrou.add(k); }
    else { if (!saiu.has(k)) dia(e.d).saidas++; saiu.add(k); }
  }
  let comTel = 0, noGrupo = 0;
  for (const l of leads) {
    const k = chaveTel(l.phone); if (!k) continue;
    comTel++; dia(l.d).inscritos++;
    if (entrou.has(k)) { noGrupo++; dia(l.d).inscritosNoGrupo++; }
  }
  let ficaram = 0; for (const k of entrou) if (!saiu.has(k)) ficaram++;
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : null;
  const ultimo = ev.length ? ev.reduce((m, e) => e.created_at > m ? e.created_at : m, "") : null;
  return {
    ativo: true, eventos: ev.length, ultimoEvento: ultimo, desde: inicio, metricas, alertas,
    entraram: entrou.size, sairam: saiu.size, ficaram,
    inscritosComTelefone: comTel, inscritosNoGrupo: noGrupo, taxaEntrada: pct(noGrupo, comTel),
    taxaSaida: pct(saiu.size, entrou.size),
    porDia: Object.values(porDia).map(o => ({ ...o, taxa: pct(o.inscritosNoGrupo, o.inscritos) })).sort((a, b) => a.dia < b.dia ? 1 : -1)
  };
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
