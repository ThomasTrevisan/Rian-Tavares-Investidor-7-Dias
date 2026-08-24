// Teste A/B da LP "O Ano da Virada" (50/50, sticky por cookie).
// A = /o-ano-da-virada/ (headline atual) · B = /o-ano-da-virada-b/ (headline nova).
// Todo mundo que cai em /o-ano-da-virada e' sorteado, independente do link de origem.
// Bots/previews vao sempre pra A (nao entram no split, nao poluem a metrica).
// A visita e' contada pelo beacon (page = location.pathname) e o cadastro pelo source do form,
// entao o painel separa A x B sozinho.

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  // Dominio white: investidor.* serve so o passo a passo pos-compra (/obrigado/).
  // O funil inteiro vive em lp.riantavares.com.br; qualquer rota antiga cai no /obrigado/.
  if (url.hostname === "investidor.riantavares.com.br") {
    const allowed = path === "/obrigado" || path.startsWith("/obrigado/") ||
      path.startsWith("/img/") || path.startsWith("/fonts/") || path.startsWith("/api/");
    if (!allowed) {
      return new Response(null, {
        status: 302,
        headers: { Location: "https://investidor.riantavares.com.br/obrigado/", "Cache-Control": "no-store" },
      });
    }
  }

  // A raiz do lp. e a pagina oficial de links (bio do Rian), servida de /links/.
  if (path === "/") {
    return env.ASSETS.fetch(new Request(new URL("/links/", url.origin).toString(), request));
  }

  // Only the main LP entry path is split. Tudo o resto passa direto (custo ~zero).
  if (path !== "/o-ano-da-virada") return next();

  const ua = (request.headers.get("user-agent") || "").toLowerCase();
  const isBot = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discordbot|linkedinbot|embedly|quora|pinterest|preview|headless|lighthouse|pingdom|gtmetrix|uptimerobot|ahrefs|semrush|petalbot/.test(ua);

  // Serve a variante A (LP atual) buscando o HTML real direto no store de assets, COM barra.
  // env.ASSETS.fetch nao passa pelo middleware, entao nao ha loop nem o 308 de normalizacao de barra:
  // devolve 200 na hora e o Set-Cookie cola de verdade. no-store evita o edge "fixar" uma versao pra todos.
  async function serveA(setCookie) {
    const assetReq = new Request(new URL("/o-ano-da-virada/", url.origin).toString(), request);
    const resp = await env.ASSETS.fetch(assetReq);
    const out = new Response(resp.body, resp);
    if (setCookie) out.headers.append("Set-Cookie", setCookie);
    out.headers.set("Cache-Control", "no-store");
    return out;
  }

  // Bots e previews: sempre A, sem cookie, fora do sorteio.
  if (isBot) return serveA(null);

  // Sticky: quem ja foi sorteado mantem a mesma versao.
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)ab_oadv=([ab])/);
  let variant = m ? m[1] : null;
  let setCookie = null;

  if (variant !== "a" && variant !== "b") {
    variant = Math.random() < 0.5 ? "a" : "b";
    setCookie = `ab_oadv=${variant}; Path=/; Max-Age=2592000; SameSite=Lax`;
  }

  if (variant === "b") {
    const headers = new Headers({
      Location: "/o-ano-da-virada-b/" + (url.search || ""),
      "Cache-Control": "no-store",
    });
    if (setCookie) headers.append("Set-Cookie", setCookie);
    return new Response(null, { status: 302, headers });
  }

  return serveA(setCookie);
}
