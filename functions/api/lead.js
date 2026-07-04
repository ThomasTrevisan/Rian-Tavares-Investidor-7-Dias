// Cloudflare Pages Function — recebe o lead do formulario da LP e repassa
// para o webhook da Reportana. O token/URL da Reportana fica na variavel de
// ambiente REPORTANA_WEBHOOK_URL (Cloudflare Pages > Settings > Environment
// variables), nunca no repositorio publico.

export async function onRequestPost({ request, env }) {
  const webhook = env.REPORTANA_WEBHOOK_URL;
  if (!webhook) {
    return json({ ok: false, error: "missing_webhook_config" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const email = String(body.email || "").trim();
  const phone = String(body.phone || body.telefone || "").trim();
  const name = String(body.name || "").trim();

  if (!email && !phone) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  const payload = {
    name: name,
    email: email,
    phone: phone,
    source: "lp-o-ano-da-virada",
    url: String(body.url || ""),
    utm: String(body.utm || ""),
    utm_source: String(body.utm_source || ""),
    utm_medium: String(body.utm_medium || ""),
    utm_campaign: String(body.utm_campaign || ""),
    utm_content: String(body.utm_content || ""),
    utm_term: String(body.utm_term || "")
  };

  try {
    const resp = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      return json({ ok: false, error: "reportana_error", status: resp.status }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 502);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
