# Monta /black-vitalicia.html (pagina de vendas da Black dos Investimentos do Rian, 16/11/2026).
# Estilo: CSS da /black-vv da Thaize (repo Thaize-Tavares-MB2, black-vv.html, linhas do <head>), sem o video.
# Corpo: _black_vitalicia_body.html. Rodar: python -I _build_black_vitalicia.py <caminho do black-vv.html da Thaize>
import re, sys, pathlib

AQUI = pathlib.Path(__file__).parent
src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
head = src[: src.index("<body>")]
body = (AQUI / "_black_vitalicia_body.html").read_text(encoding="utf-8")

# comentario do gerador da Thaize
head = re.sub(r"<!-- ATENÇÃO: esta página é gerada.*?-->\n", "", head)
# pixel da Thaize -> pixel do Rian, mais o GTM do Rian
head = head.replace("1337404051138245", "1657954945312718")
gtm = ("<!-- Google Tag Manager -->\n<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\n"
       "new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\n"
       "j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n"
       "'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n"
       "})(window,document,'script','dataLayer','GTM-M2WP6WNT');</script>\n<!-- End Google Tag Manager -->\n")
head = head.replace("<!-- Meta Pixel -->", gtm + "<!-- Meta Pixel -->", 1)
head = head.replace('href="/favicon.png"', 'href="/favicon-192.png"').replace('sizes="96x96"', 'sizes="192x192"')

meta_old = head[head.index("<title>"): head.index('<link rel="preconnect" href="https://cdn.utmify.com.br"')]
meta_new = """<title>Black dos Investimentos · Acesso Vitalício | Rian Tavares</title>
<meta name="description" content="Black dos Investimentos: todos os cursos do Rian e a AssessorIA com acesso vitalício e 12 meses de encontros ao vivo no Clube do Investidor.">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://lp.riantavares.com.br/black-vitalicia">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rian Tavares">
<meta property="og:title" content="Black dos Investimentos">
<meta property="og:description" content="Todos os cursos e a AssessorIA com acesso vitalício e 12 meses de encontros ao vivo com o Rian.">
<meta property="og:url" content="https://lp.riantavares.com.br/black-vitalicia">
<meta property="og:image" content="https://lp.riantavares.com.br/img/og-ipp.webp">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">

"""
head = head.replace(meta_old, meta_new)
# preconnect do vturb (sem video aqui) e preloads das fotos da Thaize
head = re.sub(r'<link rel="preconnect" href="https://(scripts|cdn)\.converteai\.net" crossorigin>\n', "", head)
head = head.replace('<link rel="preload" as="image" href="img/hero-desktop.webp?v=2"', '<link rel="preload" as="image" href="/img/black/hero-vitalicia-desktop.webp"')
head = head.replace('<link rel="preload" as="image" href="img/hero-mobile-black-alunos-v3.webp"', '<link rel="preload" as="image" href="/img/black/hero-vitalicia-mobile.webp"')
# fontes com caminho absoluto (a pagina fica na raiz, mas assim nao quebra com barra no fim)
head = head.replace("url(fonts/", "url(/fonts/").replace('href="fonts/', 'href="/fonts/')
head = head.replace('<meta name="theme-color" content="#1a1611">', '<meta name="theme-color" content="#1a1611">')

extra = """<style>
  /* ===== Ajustes da versao do Rian (16/11/2026) ===== */
  .hero-price-vsl { margin: 12px 0 0; text-align: center; }
  .hero-price { margin: -18px 0 28px; font-family: 'Inter', sans-serif; font-size: 15px; color: rgba(247, 240, 226, 0.78); }
  .hero-rian .brand-logo { width: clamp(280px, 26vw, 400px); margin-bottom: 6px; }
  @media (max-width: 900px) {
    .hero-rian .hero-left > .hero-price { display: none; }
    .hero-price { margin: 12px 0 8px; text-align: center; font-size: 14px; }
    .hero-rian .hero-bg-mobile { position: relative; overflow: hidden; aspect-ratio: 1365 / 900; }
    .hero-rian .hero-bg-mobile img { height: 100%; object-fit: cover; object-position: center top; }
    .hero-rian .hero-bg-mobile::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 40%; background: linear-gradient(180deg, rgba(10,9,8,0), #0a0908 92%); }
    .hero-rian .hero-content { margin-top: -64px; position: relative; z-index: 2; }
    .hero-rian .hero-content .brand { display: none; }
    .hero-rian .hero-sub { margin-bottom: 0; }
    .hero-price-vsl { display: none; }
  }
  /* conversa da AssessorIA dentro do celular (no lugar do video da Vendedor.IA) */
  .chat-mock { display: flex; flex-direction: column; width: 100%; height: 100%; border-radius: 33px; overflow: hidden; background: #f4efe6; font-family: 'Inter', sans-serif; }
  .chat-top { display: flex; align-items: center; gap: 10px; padding: 18px 16px 12px; background: #1a1611; color: #f7f0e2; }
  .chat-top img { width: 38px; height: 38px; border-radius: 50%; object-fit: cover; }
  .chat-top b { display: block; font-size: 14px; font-weight: 600; }
  .chat-top small { display: block; font-size: 11px; opacity: .7; }
  .chat-body { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 14px 12px; overflow: hidden; }
  .msg { margin: 0; max-width: 86%; padding: 9px 12px; border-radius: 14px; font-size: 12.5px; line-height: 1.42; color: #2a2318; }
  .msg.me { align-self: flex-end; background: #e6d3a8; border-bottom-right-radius: 4px; }
  .msg.ai { align-self: flex-start; background: #fff; border-bottom-left-radius: 4px; box-shadow: 0 6px 14px -10px rgba(40, 28, 8, .35); }
  .chat-in { display: flex; align-items: center; justify-content: space-between; margin: 0 10px 14px; padding: 10px 14px; border-radius: 999px; background: #fff; font-size: 12px; color: #9a8f7d; }
  .chat-in i { width: 22px; height: 22px; border-radius: 50%; background: #1a1611; }
  @media (max-width: 900px) { .msg { font-size: 11.5px; } }
  .ent-ia { display: flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 40%, rgba(201,169,110,.25), transparent 70%); }
  .ent-ia img { width: 58% !important; height: auto !important; border-radius: 50%; }
  /* depoimentos em texto (sem video) */
  .depo-txt-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; max-width: 1040px; margin: 0 auto; }
  .depo-txt { padding: 26px 24px; border-radius: 20px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(217, 191, 139, 0.22); text-align: left; }
  .depo-txt .video-depo-tags { margin-bottom: 14px; }
  .depo-txt p { margin: 0; font-family: 'Inter', sans-serif; font-weight: 300; font-size: 16px; line-height: 1.55; color: var(--cream); }
  .depo-txt p b { font-weight: 600; color: var(--gold-bright); }
  .depo-note { max-width: 720px; margin: 22px auto 0; text-align: center; font-size: 12.5px; line-height: 1.5; color: rgba(247, 240, 226, 0.55); }
  @media (max-width: 900px) { .depo-txt-grid { grid-template-columns: 1fr; } }
  .orb-5 .orb-center img { object-fit: cover; object-position: center 8%; }
  /* banner vermelho de urgencia com contador diario (16/11) */
  .ub-red { position: relative; z-index: 20; display: flex; align-items: center; justify-content: center; gap: 16px; padding: 14px 20px; text-decoration: none; color: #fff;
    background: linear-gradient(135deg, #c1121f 0%, #8a0c1c 55%, #5e0814 100%); border-bottom: 1px solid rgba(255,255,255,.14);
    font-family: 'DM Sans', 'Inter', sans-serif; font-size: 18px; font-weight: 800; letter-spacing: .03em; text-transform: uppercase; text-shadow: 0 1px 2px rgba(0,0,0,.4); }
  .ub-red:hover { filter: brightness(1.08); }
  .ub-dot { width: 11px; height: 11px; border-radius: 50%; background: #fff; flex-shrink: 0; animation: ubDot 1.4s ease-out infinite; }
  @keyframes ubDot { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,.7); } 70% { box-shadow: 0 0 0 8px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }
  .ub-timer { display: inline-flex; align-items: center; gap: 3px; font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: 0; text-shadow: none; flex-shrink: 0; }
  .ub-box { background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.22); border-radius: 8px; padding: 5px 8px; line-height: 1; min-width: 1.9em; text-align: center; }
  .ub-sep { opacity: .65; }
  @media (max-width: 640px) {
    .ub-red { gap: 12px; padding: 10px 12px; font-size: 15.5px; letter-spacing: 0; line-height: 1.25; text-align: center; justify-content: center; }
    .ub-text { max-width: 215px; }
    .ub-dot { display: none; }
    .ub-timer { font-size: 21px; gap: 2px; }
    .ub-box { padding: 6px 5px; border-radius: 7px; min-width: 1.7em; }
  }
  .footer-text { max-width: 760px; margin-left: auto; margin-right: auto; }
</style>
</head>"""
head = head.rstrip()
assert head.endswith("</head>")
head = head[: -len("</head>")] + extra

html = head + "\n" + body
out = AQUI / "black-vitalicia.html"
out.write_text(html, encoding="utf-8")
print("ok", out, len(html))
