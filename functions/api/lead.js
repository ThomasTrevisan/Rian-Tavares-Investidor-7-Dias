// Cloudflare Pages Function — recebe o lead do formulario da LP.
// 1) Grava no banco proprio (Cloudflare D1, binding "DB") = fonte de verdade,
//    independente da Reportana.
// 2) Repassa pro webhook da Reportana (best-effort), URL em REPORTANA_WEBHOOK_URL.
// O lead so e considerado perdido se as DUAS coisas falharem.

const MANYCHAT_WA_ATIVO = false;
const MANYCHAT_FLUXO_BLACK = "content20261029015314_293326";
const MANYCHAT_API = "https://api.manychat.com/fb";
const SOURCE_TESTE = "lp-black-rian-teste";

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const lead = {
    name: String(body.name || "").trim(),
    email: String(body.email || "").trim(),
    phone: String(body.phone || body.telefone || "").trim(),
    source: String(body.source || "").trim() || "lp-o-ano-da-virada",
    url: String(body.url || ""),
    utm: String(body.utm || ""),
    utm_source: String(body.utm_source || ""),
    utm_medium: String(body.utm_medium || ""),
    utm_campaign: String(body.utm_campaign || ""),
    utm_content: String(body.utm_content || ""),
    utm_term: String(body.utm_term || "")
  };

  if (!lead.email && !lead.phone) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  // 1) Salva local no D1 (se o binding estiver configurado)
  let savedLocal = false;
  if (env.DB) {
    try {
      await env.DB.prepare(
        "INSERT INTO leads (created_at, name, email, phone, source, url, utm, utm_source, utm_medium, utm_campaign, utm_content, utm_term) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
      ).bind(
        new Date().toISOString(),
        lead.name, lead.email, lead.phone, lead.source, lead.url,
        lead.utm, lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content, lead.utm_term
      ).run();
      savedLocal = true;
    } catch (e) {
      // nao derruba o fluxo; segue pra Reportana
    }
  }

  // 2) Repassa pra Reportana (best-effort).
  // A Black (lp-black-*) NAO vai pra Reportana: o webhook ainda e o fluxo de julho (O Ano da Virada).
  // O lead da Black fica no D1 (fonte de verdade) e a Black usa o grupo do Sendflow.
  let reportanaOk = false;
  const ehBlack = /^lp-black/i.test(lead.source);
  if (env.REPORTANA_WEBHOOK_URL && !ehBlack) {
    try {
      const resp = await fetch(env.REPORTANA_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      });
      reportanaOk = resp.ok;
    } catch (e) {}
  }

  // 3) Black: dispara no WhatsApp o fluxo de onboarding do ManyChat.
  // So inscricao nova (quem ja estava inscrito nao recebe). Token na env var MANYCHAT_API_TOKEN (Secret, repo publico).
  // Desligado ate o teste com o numero do Thomas. Teste avulso: source "lp-black-rian-teste" + teste_whatsapp: true.
  let manychat = null;
  const ehTeste = lead.source === SOURCE_TESTE;
  const testeWa = ehTeste && body.teste_whatsapp === true;
  let jaInscrito = false;
  if (ehBlack && !ehTeste && lead.phone && env.DB) {
    try {
      const r = await env.DB.prepare(
        "SELECT count(*) AS n FROM leads WHERE source LIKE 'lp-black%' AND source != ? AND replace(replace(replace(phone,' ',''),'-',''),'+','') = ?"
      ).bind(SOURCE_TESTE, lead.phone.replace(/\D/g, "")).first();
      jaInscrito = r && r.n > 1; // > 1 porque a linha de agora ja foi gravada acima
    } catch (e) {}
  }
  if (env.MANYCHAT_API_TOKEN && lead.phone && ((MANYCHAT_WA_ATIVO && ehBlack && !ehTeste && !jaInscrito) || testeWa)) {
    const envio = dispararOnboarding(env.MANYCHAT_API_TOKEN, lead).catch(e => ({ ok: false, etapa: "rede", erro: String(e) }));
    if (testeWa) manychat = await envio;          // no teste espera, pra mostrar o resultado
    else if (waitUntil) waitUntil(envio);         // na LP nao atrasa o formulario
    else manychat = await envio;
  }

  // Sucesso se guardamos em algum lugar (local OU Reportana) = nao perde lead
  if (savedLocal || reportanaOk) {
    return json({ ok: true, savedLocal: savedLocal, reportanaOk: reportanaOk, manychat: manychat });
  }
  return json({ ok: false, error: "not_saved", savedLocal: savedLocal, reportanaOk: reportanaOk }, 502);
}

// Cria o contato de WhatsApp no ManyChat e manda o fluxo de onboarding.
// Devolve { ok, etapa, ... } pra dar pra ver no teste onde parou.
async function dispararOnboarding(token, lead) {
  const headers = { "Authorization": "Bearer " + token, "Content-Type": "application/json", "Accept": "application/json" };
  const wa = "+" + lead.phone.replace(/\D/g, "");

  // Quem ja era contato de WhatsApp no ManyChat volta "This WhatsApp ID already exists" e fica sem o fluxo:
  // a API nao busca contato pelo WhatsApp (testado no ManyChat da Thaize em 28/10/2026).
  const cria = await fetch(MANYCHAT_API + "/subscriber/createSubscriber", {
    method: "POST", headers,
    body: JSON.stringify({ first_name: lead.name || "", whatsapp_phone: wa, consent_phrase: "Inscricao na Black dos Investimentos pela pagina de captacao" })
  });
  const c = await cria.json().catch(() => ({}));
  if (c.status !== "success" || !c.data) {
    const erro = JSON.stringify(c.details || c.message || cria.status);
    return { ok: false, etapa: /already exists/.test(erro) ? "ja_existe" : "contato", erro };
  }
  const id = c.data.id;

  const envia = await fetch(MANYCHAT_API + "/sending/sendFlow", {
    method: "POST", headers, body: JSON.stringify({ subscriber_id: id, flow_ns: MANYCHAT_FLUXO_BLACK })
  });
  const e = await envia.json().catch(() => ({}));
  if (e.status === "success") return { ok: true, etapa: "enviado", subscriber_id: id };
  return { ok: false, etapa: "fluxo", subscriber_id: id, erro: e.message || e.details || envia.status };
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
