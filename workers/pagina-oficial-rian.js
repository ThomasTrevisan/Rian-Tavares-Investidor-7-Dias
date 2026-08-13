// Worker da HOMEPAGE oficial (riantavares.com.br/ EXATO, nada alem da raiz).
// NAO amarrar o dominio raiz nem o www ao projeto Pages: a GreatPages serve
// as LPs de anuncio (/aula-gratuita etc.) nos dois hosts e nao pode cair.
// Deploy: Workers & Pages > Create Worker > colar este codigo > Deploy.
// Rota: dominio riantavares.com.br > Workers Routes > "riantavares.com.br/"
// (e opcionalmente "www.riantavares.com.br/") apontando pra este worker.
export default {
  async fetch() {
    const r = await fetch("https://lp.riantavares.com.br/home/");
    const html = await r.text();
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
