// Cloudflare Pages Function — recebe o lead do formulario da LP.
// 1) Grava no banco proprio (Cloudflare D1, binding "DB") = fonte de verdade,
//    independente da Reportana.
// 2) Repassa pro webhook da Reportana (best-effort), URL em REPORTANA_WEBHOOK_URL.
// O lead so e considerado perdido se as DUAS coisas falharem.

export async function onRequestPost({ request, env }) {
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
    source: "lp-o-ano-da-virada",
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

  // 2) Repassa pra Reportana (best-effort)
  let reportanaOk = false;
  if (env.REPORTANA_WEBHOOK_URL) {
    try {
      const resp = await fetch(env.REPORTANA_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead)
      });
      reportanaOk = resp.ok;
    } catch (e) {}
  }

  // Sucesso se guardamos em algum lugar (local OU Reportana) = nao perde lead
  if (savedLocal || reportanaOk) {
    return json({ ok: true, savedLocal: savedLocal, reportanaOk: reportanaOk });
  }
  return json({ ok: false, error: "not_saved", savedLocal: savedLocal, reportanaOk: reportanaOk }, 502);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
