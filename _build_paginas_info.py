"""Páginas de informação (não de venda) do Rian para o Google e a IA do Google. 23/11/2026, pela verificação da skill search
(pasta search-work-rian/ do Claude Code), receita igual à da Thaize.

  /quem-e-rian-tavares   trajetória, formação, certificações, livros, como ele ensina
  /cursos-rian-tavares   o que tem em cada curso, preço, garantia, acesso, perguntas antes de comprar
  /atendimento           suporte, acesso que não chegou, garantia e reembolso (só publica com o WhatsApp confirmado pelo Thomas)

Regra do Thomas: páginas de venda e de captação não mudam. Estas são novas e só de informação. Visual e CSS da /i7d/.

Fontes dos fatos (nada inventado):
- /links/ (bio oficial no site): economista, CFP, professor de MBA, Bahia Asset (crédito offshore), SPX Capital (renda fixa e
  derivativos em dólar e euro), sócio de uma das maiores instituições financeiras do país, mesa de renda fixa da assessoria,
  quase R$ 5 bilhões por mês, mais de 300 palestras, CEO da Hedge Consultoria e do Café com Seu Dinheiro, +2 milhões de seguidores.
- Story "Quem sou eu" gravado pelo Rian: pai taxista, mãe dona de casa, aula de violão aos 13, bolsa integral no IBMEC do Rio,
  1º lugar da formatura, entrou como assessor e virou sócio depois de 3 anos, Instagram desde 2020, C6 Bank, Binance,
  General Motors e WhatsApp, Ultraman 2 vezes, "dinheiro é tempo".
- Certificações CFP, CGA, CEA, CPA-20 e PQO confirmadas pelo Rian (07/07/2026). +14 anos e +10 mil alunos (regras do Thomas).
- /i7d/ e /ipp/: aulas, preços, 15 dias de garantia, acesso por e-mail da Hubla, pagamento pela Hub.la, aviso de que não é
  recomendação personalizada. /obrigado/: e-mail da Hubla com o acesso, caixa de spam.
Nunca citar a XP (regra do Rian). Sem promessa de rendimento e sem recomendação personalizada (CVM).

Uso: python3 -I _build_paginas_info.py            (gera quem-e-rian-tavares/ e cursos-rian-tavares/)
     python3 -I _build_paginas_info.py atendimento (gera também atendimento/, só depois do WhatsApp confirmado)
"""
import html
import json
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent
LP = 'https://lp.riantavares.com.br'
WHATS_SUPORTE = None  # número do suporte confirmado pelo Thomas, só dígitos com 55 (ex.: '5511999999999')

SAMEAS = ['https://www.instagram.com/falecomrian/', 'https://www.youtube.com/@falecomrian', 'https://www.riantavares.com.br/']
PESSOA_ID = f'{LP}/quem-e-rian-tavares/#rian'
PESSOA = {
    '@type': 'Person', '@id': PESSOA_ID, 'name': 'Rian Tavares', 'alternateName': 'falecomrian',
    'jobTitle': 'Economista, planejador financeiro certificado (CFP) e professor de investimentos',
    'url': f'{LP}/quem-e-rian-tavares/', 'image': f'{LP}/img/rian-sentado.webp',
    'description': ('Economista e investidor com mais de 14 anos de mercado financeiro. Foi sócio de uma das maiores '
                    'instituições financeiras do país, onde movimentava quase R$ 5 bilhões por mês. Autor de 2 livros, '
                    'professor de MBA e criador dos cursos Investidor em 7 Dias e Invista Para Prosperar.'),
    'alumniOf': {'@type': 'CollegeOrUniversity', 'name': 'IBMEC'},
    'hasCredential': [{'@type': 'EducationalOccupationalCredential', 'name': n} for n in
                      ['CFP (Certified Financial Planner)', 'CGA (Certificação de Gestores ANBIMA)', 'CEA (Certificação de Especialista em Investimentos ANBIMA)', 'CPA-20', 'PQO']],
    'knowsAbout': ['investimentos', 'renda fixa', 'Tesouro Direto', 'educação financeira', 'reserva de emergência',
                   'fundos imobiliários', 'ações', 'investimentos no exterior'],
    'worksFor': [{'@type': 'Organization', 'name': 'Hedge Consultoria'}, {'@type': 'Organization', 'name': 'Café com Seu Dinheiro'}],
    'sameAs': SAMEAS,
}
CURSOS = [
    {'@type': 'Course', '@id': f'{LP}/cursos-rian-tavares/#i7d', 'name': 'Investidor em 7 Dias',
     'description': 'Curso online para quem nunca investiu. Em 4 aulas, abre a conta, entende renda fixa e renda variável e monta a primeira carteira diversificada para o seu perfil.',
     'url': f'{LP}/i7d/', 'inLanguage': 'pt-BR', 'provider': {'@id': PESSOA_ID},
     'offers': {'@type': 'Offer', 'price': '189.00', 'priceCurrency': 'BRL', 'category': 'Paid', 'url': f'{LP}/i7d/'},
     'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'Online', 'courseWorkload': 'PT7H', 'instructor': {'@id': PESSOA_ID}}},
    {'@type': 'Course', '@id': f'{LP}/cursos-rian-tavares/#ipp', 'name': 'Invista Para Prosperar',
     'description': 'Curso completo de investimentos do Rian Tavares, do zero ao avançado. 35 aulas em 5 módulos, renda fixa, ações, fundos imobiliários e investimentos no exterior.',
     'url': f'{LP}/ipp/', 'inLanguage': 'pt-BR', 'provider': {'@id': PESSOA_ID},
     'offers': {'@type': 'Offer', 'price': '1997.00', 'priceCurrency': 'BRL', 'category': 'Paid', 'url': f'{LP}/ipp/'},
     'hasCourseInstance': {'@type': 'CourseInstance', 'courseMode': 'Online', 'instructor': {'@id': PESSOA_ID}}},
]


def e(t):
    return html.escape(t, quote=False)


def estilos_i7d():
    h = (REPO / 'i7d' / 'index.html').read_text(encoding='utf-8')
    head = h[:h.index('</head>')]
    return ''.join(re.findall(r'<style>.*?</style>\n?', head, re.S))


CSS = """<style>
  /* páginas de informação: visual da /i7d/ */
  .pi-topo { background: var(--ink-deepest); padding: 16px 24px; }
  .pi-topo-in { max-width: 1180px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
  .pi-topo a.marca { font-weight: 700; letter-spacing: -0.02em; color: var(--text-paper); font-size: 17px; }
  .pi-topo nav { display: flex; gap: 18px; flex-wrap: wrap; }
  .pi-topo nav a { color: var(--text-paper-dim); font-size: 14px; }
  .pi-topo nav a[aria-current] { color: var(--terra-bright); }
  .pi-hero { background: var(--ink-deep); color: var(--text-paper); padding: clamp(48px, 7vw, 96px) 24px; }
  .pi-hero-in { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: 1.25fr 0.75fr; gap: 56px; align-items: center; }
  .pi-hero.sem-foto .pi-hero-in { grid-template-columns: 1fr; max-width: 880px; }
  .pi-hero h1 { font-weight: 600; font-size: clamp(32px, 4.4vw, 54px); line-height: 1.08; letter-spacing: -0.03em; margin: 6px 0 20px; color: var(--text-paper); }
  .pi-hero p.sub { font-size: clamp(16px, 1.55vw, 19px); line-height: 1.65; color: var(--text-paper-dim); }
  .pi-hero p.sub strong { color: var(--text-paper); }
  .pi-foto { border-radius: var(--radius-xl); overflow: hidden; aspect-ratio: 4 / 5; border: 1px solid rgba(77, 190, 219, 0.25); }
  .pi-foto img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
  .pi-numeros { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 34px; }
  .pi-numeros div { border: 1px solid rgba(77, 190, 219, 0.25); border-radius: var(--radius-lg); padding: 16px 12px; text-align: center; }
  .pi-numeros b { display: block; font-weight: 600; font-size: 24px; letter-spacing: -0.02em; color: var(--terra-bright); }
  .pi-numeros span { font-size: 13px; color: var(--text-paper-dim); line-height: 1.4; display: block; margin-top: 4px; }
  .pi-texto { max-width: 760px; margin: 0 auto; }
  .pi-texto h2 { font-weight: 600; font-size: clamp(25px, 2.8vw, 34px); line-height: 1.15; letter-spacing: -0.025em; margin: 52px 0 16px; }
  .pi-texto h2:first-child { margin-top: 0; }
  .pi-texto h3 { font-weight: 600; font-size: 20px; letter-spacing: -0.02em; margin: 28px 0 10px; }
  .pi-texto p, .pi-texto li { font-size: 17px; line-height: 1.75; color: var(--ink-soft); }
  .pi-texto p { margin: 0 0 16px; }
  .pi-texto ul { margin: 0 0 18px 20px; }
  .pi-texto li { margin-bottom: 6px; }
  .pi-texto a { color: var(--terra); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
  .section-dark .pi-texto h2, .section-dark .pi-texto h3 { color: var(--text-paper); }
  .section-dark .pi-texto p, .section-dark .pi-texto li { color: var(--text-paper-dim); }
  .section-dark .pi-texto a { color: var(--terra-bright); }
  .pi-citacao { border-left: 3px solid var(--terra); padding: 4px 0 4px 20px; margin: 26px 0; font-size: 21px; line-height: 1.45; letter-spacing: -0.015em; color: var(--ink); }
  .pi-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 26px 0 8px; }
  .pi-card { background: var(--paper-light); border: 1px solid var(--paper-deep); border-radius: var(--radius-lg); padding: 24px; }
  .pi-card h3 { margin-top: 0; color: var(--ink); }
  .pi-card p, .pi-card li { font-size: 16px; }
  .pi-card .preco { font-weight: 600; color: var(--ink); }
  .pi-faq { max-width: 820px; margin: 34px auto 0; display: grid; gap: 10px; }
  .pi-faq details { background: var(--paper-light); border: 1px solid var(--paper-deep); border-radius: var(--radius-md); padding: 0 20px; }
  .pi-faq summary { cursor: pointer; list-style: none; padding: 18px 0; font-weight: 600; font-size: 17px; color: var(--ink); }
  .pi-faq summary::-webkit-details-marker { display: none; }
  .pi-faq details p { padding: 0 0 18px; font-size: 16.5px; line-height: 1.7; color: var(--ink-soft); }
  .pi-faq details a { color: var(--terra); font-weight: 600; }
  .pi-links { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
  .pi-links a { text-decoration: none !important; border: 1px solid var(--terra); border-radius: 999px; padding: 10px 18px; font-size: 14px; }
  .pi-centro { text-align: center; }
  @media (max-width: 900px) {
    .pi-hero-in { grid-template-columns: 1fr; gap: 28px; }
    .pi-foto { order: -1; aspect-ratio: 4 / 3; }
    .pi-numeros { grid-template-columns: repeat(2, 1fr); }
    .pi-cards { grid-template-columns: 1fr; }
    .pi-texto p, .pi-texto li { font-size: 16.5px; }
    .pi-citacao { font-size: 19px; }
  }
</style>
"""

MENU = [('/quem-e-rian-tavares/', 'Quem é o Rian'), ('/cursos-rian-tavares/', 'Cursos'), ('/atendimento/', 'Atendimento')]


def topo(atual):
    itens = [(u, t) for u, t in MENU if u != '/atendimento/' or WHATS_SUPORTE or atual == '/atendimento/']
    links = ''.join(f'<a href="{u}"{" aria-current=\"page\"" if u == atual else ""}>{t}</a>' for u, t in itens)
    return f'<header class="pi-topo"><div class="pi-topo-in"><a class="marca" href="/quem-e-rian-tavares/">Rian Tavares</a><nav>{links}</nav></div></header>'


RODAPE = """<footer class="footer">
  <div class="footer-brand">Rian Tavares</div>
  <div>© 2026 Rian Tavares · Todos os direitos reservados</div>
  <nav class="footer-links">
    <a href="/quem-e-rian-tavares/">Quem é Rian Tavares</a>
    <a href="/cursos-rian-tavares/">Cursos</a>
    <a href="https://www.instagram.com/falecomrian/">Instagram @falecomrian</a>
  </nav>
  <p class="footer-disclaimer">
    O conteúdo do Rian Tavares é educação financeira. Não é recomendação de investimento personalizada e não substitui um profissional que conheça a sua situação. Rentabilidade passada não garante rentabilidade futura.
  </p>
</footer>"""


def faq_ld(itens):
    return {'@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': p, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub(r'<[^>]+>', '', r)}} for p, r in itens]}


def faq_html(itens):
    return '<div class="pi-faq">' + ''.join(f'<details><summary>{e(p)}</summary><p>{r}</p></details>' for p, r in itens) + '</div>'


def pagina(pasta, titulo, descricao, ld, corpo, imagem='/img/og-rian.webp'):
    url = f'{LP}/{pasta}/'
    grafo = {'@context': 'https://schema.org', '@graph': ld}
    s = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<!-- Página gerada por _build_paginas_info.py (visual da /i7d/). Mudança feita direto aqui some na próxima geração. -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{e(titulo)}</title>
<meta name="description" content="{e(descricao)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="{url}">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="theme-color" content="#0c0e13">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Rian Tavares">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(descricao)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{LP}{imagem}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">{json.dumps(grafo, ensure_ascii=False)}</script>
{estilos_i7d()}{CSS}</head>
<body>
{topo('/' + pasta + '/')}
<main>
{corpo}
</main>
{RODAPE}
<script>
  (function () {{
    var q = new URLSearchParams(location.search);
    try {{ navigator.sendBeacon("/api/hit", JSON.stringify({{ page: "/{pasta}/", utm_source: q.get("utm_source") || "", utm_medium: q.get("utm_medium") || "", utm_campaign: q.get("utm_campaign") || "", utm_content: q.get("utm_content") || "", utm_term: q.get("utm_term") || "", ref: document.referrer || "" }})); }} catch (e) {{}}
  }})();
</script>
</body>
</html>
'''
    txt = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', '', s, flags=re.S)
    assert '—' not in txt and '–' not in txt, f'travessão em {pasta}'
    assert not re.search(r'\bXP\b', txt), f'XP em {pasta}'
    assert 'escritório' not in txt.lower(), f'escritório em {pasta}'
    assert 'pay.hub.la' not in txt
    (REPO / pasta).mkdir(exist_ok=True)
    (REPO / pasta / 'index.html').write_text(s, encoding='utf-8')
    print('ok ->', REPO / pasta / 'index.html')


def breadcrumb(pasta, nome):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Rian Tavares', 'item': f'{LP}/'},
        {'@type': 'ListItem', 'position': 2, 'name': nome, 'item': f'{LP}/{pasta}/'}]}


def link_atendimento(texto='página de atendimento'):
    return f'<a href="/atendimento/">{texto}</a>' if WHATS_SUPORTE else texto


# ------------------------------------------------------------------ /quem-e-rian-tavares
def quem_e():
    faq = [
        ('Quem é Rian Tavares?',
         'Rian Tavares é economista e investidor, com mais de 14 anos de mercado financeiro. Passou pela Bahia Asset e pela SPX Capital, '
         'foi sócio de uma das maiores instituições financeiras do país, onde liderou a mesa de renda fixa da assessoria e movimentava quase '
         'R$ 5 bilhões por mês. É planejador financeiro certificado (CFP), autor de 2 livros, professor de MBA e ensina investimentos no '
         'Instagram @falecomrian e nos cursos Investidor em 7 Dias e Invista Para Prosperar.'),
        ('Rian Tavares é confiável?',
         'A trajetória dele é pública. Formado em Economia pelo IBMEC com bolsa integral, trabalhou na Bahia Asset e na SPX Capital e foi sócio '
         'de uma das maiores instituições financeiras do país. Tem as certificações CFP, CGA, CEA, CPA-20 e PQO, escreveu 2 livros e já ensinou '
         'mais de 10 mil alunos. Os cursos dele têm 15 dias de garantia, com o dinheiro devolvido se você pedir dentro desse prazo, e o pagamento '
         'é feito pela Hubla, uma plataforma conhecida de cursos online.'),
        ('Onde o Rian Tavares trabalhou?',
         'Começou como estagiário na Bahia Asset, na mesa de crédito offshore. Depois foi para a SPX Capital, operando renda fixa e derivativos em '
         'dólar e euro. Em seguida entrou como assessor de investimentos numa das maiores instituições financeiras do país, virou sócio 3 anos '
         'depois e liderou a mesa de renda fixa da assessoria. Hoje é CEO da Hedge Consultoria e do Café com Seu Dinheiro.'),
        ('Quais livros o Rian Tavares escreveu?',
         'Dois livros sobre economia e investimentos: "A Renda? É Fixa. O Preço? Não", sobre renda fixa, e "Não Existe Almoço Grátis", sobre economia.'),
        ('Quais são as certificações do Rian Tavares?',
         'CFP (planejador financeiro certificado), CGA (gestor de fundos certificado pela ANBIMA), CEA, CPA-20 e PQO.'),
        ('Rian Tavares tem página no Reclame Aqui?',
         'Não como empresa. As reclamações que citam os cursos dele aparecem na página da Hubla, a plataforma que vende os cursos, e as que '
         'consultamos em novembro de 2026 estavam todas respondidas. Quase todas falam de acesso, suporte ou reembolso. Para isso, o caminho é o suporte '
         f'oficial{" da " + link_atendimento() if WHATS_SUPORTE else ""}, e os cursos têm 15 dias de garantia.'),
        ('O Rian Tavares faz recomendação de investimento?',
         'Não. O que ele faz é ensinar. Nos cursos e no Instagram ele explica como cada investimento funciona e como montar uma carteira de acordo '
         'com o seu perfil, mas não diz o que cada pessoa deve comprar. A decisão é sempre de quem investe.'),
        ('Qual é o Instagram do Rian Tavares?',
         'É o <a href="https://www.instagram.com/falecomrian/">@falecomrian</a>. Ele também publica no YouTube, no canal '
         '<a href="https://www.youtube.com/@falecomrian">@falecomrian</a>.'),
        ('Quais são os cursos do Rian Tavares?',
         'São 2. O <a href="/i7d/">Investidor em 7 Dias</a>, para quem nunca investiu e quer abrir a conta e montar a primeira carteira, e o '
         '<a href="/ipp/">Invista Para Prosperar</a>, o curso completo, do zero ao avançado. A comparação está em '
         '<a href="/cursos-rian-tavares/">Cursos do Rian Tavares</a>.'),
    ]
    corpo = f'''<section class="pi-hero">
  <div class="pi-hero-in">
    <div>
      <span class="section-eyebrow" style="color: var(--terra-bright);">Quem é Rian Tavares</span>
      <h1>Rian Tavares, economista e investidor com mais de 14 anos de mercado financeiro</h1>
      <p class="sub">Foi sócio de uma das maiores instituições financeiras do país, onde <strong>movimentava quase R$ 5 bilhões por mês</strong>. Hoje ensina pessoas comuns a investir o seu dinheiro com segurança, começando do zero, no Instagram <strong>@falecomrian</strong> e nos cursos Investidor em 7 Dias e Invista Para Prosperar.</p>
      <div class="pi-numeros">
        <div><b>+14 anos</b><span>de mercado financeiro</span></div>
        <div><b>R$ 5 bi</b><span>movimentava quase isso por mês</span></div>
        <div><b>+10 mil</b><span>alunos</span></div>
        <div><b>2 livros</b><span>sobre economia e investimentos</span></div>
      </div>
    </div>
    <div class="pi-foto"><img src="/img/rian-sentado.webp" alt="Rian Tavares, economista e investidor" width="800" height="1000" fetchpriority="high"></div>
  </div>
</section>

<section class="section section-paper">
  <div class="pi-texto">
    <h2>De onde ele veio</h2>
    <p>Rian Tavares vem de uma família muito humilde. O pai era taxista e a mãe, dona de casa. O primeiro dinheiro dele veio aos 13 anos, dando aula de violão.</p>
    <p>Aos 18, sem dinheiro para pagar a faculdade, conquistou uma bolsa integral no IBMEC, no Rio de Janeiro, onde se formou em Economia como primeiro lugar da turma. Durante o curso chegou a dar monitoria de 8 matérias no mesmo semestre para ganhar dinheiro.</p>

    <h2>A carreira no mercado financeiro</h2>
    <p>O primeiro emprego no mercado foi como estagiário na Bahia Asset, na mesa de crédito offshore. Depois foi para a SPX Capital, onde operava títulos de renda fixa e derivativos em dólar e euro de países como Brasil, Turquia, México, Colômbia e Estados Unidos. Ele chama essa fase de "quase um MBA remunerado".</p>
    <p>Em seguida entrou como assessor de investimentos numa das maiores instituições financeiras do país. Três anos depois virou sócio. Lá liderou a mesa de renda fixa da assessoria, movimentava quase R$ 5 bilhões por mês e cuidou da relação com os maiores clientes e empresas do Brasil. Foram cerca de 7 anos falando direto com o investidor, o que ensinou a ele o lado psicológico de quem investe.</p>

    <h2>Formação e certificações</h2>
    <ul>
      <li>Economia pelo IBMEC, com bolsa integral, primeiro lugar da formatura</li>
      <li>CFP, planejador financeiro certificado</li>
      <li>CGA, gestor de fundos certificado pela ANBIMA</li>
      <li>CEA, CPA-20 e PQO</li>
      <li>Professor de MBA</li>
    </ul>

    <h2>Livros</h2>
    <p>Rian é autor de 2 livros, à venda na Amazon. "A Renda? É Fixa. O Preço? Não" explica a renda fixa, o investimento mais conhecido do Brasil, inclusive por que o preço de um título muda antes do vencimento. "Não Existe Almoço Grátis" explica economia para quem quer investir e entender o mundo.</p>

    <h2>O que ele faz hoje</h2>
    <p>É CEO da Hedge Consultoria e do Café com Seu Dinheiro, portal de economia e negócios com mais de 580 mil seguidores. Começou o Instagram em 2020 e hoje soma mais de 2 milhões de seguidores nas redes. Já deu mais de 300 palestras para investidores em todo o Brasil, e empresas como C6 Bank, Binance, General Motors e WhatsApp já trabalharam com ele.</p>
    <p>Fora do mercado, é triatleta amador. Completou o Ultraman 2 vezes, uma prova de 10 km nadando, 420 km pedalando e 84 km correndo.</p>
  </div>
</section>

<section class="section section-paper-warm">
  <div class="pi-texto">
    <h2>Como o Rian ensina a investir</h2>
    <p>Depois de anos atendendo os clientes mais ricos do país, ele viu de perto o que separa quem investe bem de quem deixa o dinheiro parado. É isso que ele ensina.</p>
    <ul>
      <li>Entender o básico antes de querer o avançado</li>
      <li>Saber o seu perfil de investidor antes de escolher o produto</li>
      <li>Aprender a ler o cenário, em vez de decorar dicas</li>
      <li>Seguir um caminho passo a passo, em vez de um amontoado de aulas</li>
    </ul>
    <p class="pi-citacao">"Se você não valoriza o seu dinheiro, indiretamente está desvalorizando o seu tempo."</p>
    <p>O conteúdo dele é educação financeira. Ele explica como cada investimento funciona e como montar uma carteira para o seu perfil, mas a decisão de onde colocar o dinheiro é sempre de quem investe.</p>
    <div class="pi-links">
      <a href="/cursos-rian-tavares/">Conheça os cursos</a>
      <a href="https://www.instagram.com/falecomrian/">Instagram @falecomrian</a>
      <a href="https://www.youtube.com/@falecomrian">YouTube</a>
    </div>
  </div>
</section>

<section class="section section-paper">
  <div class="pi-texto pi-centro"><h2>Perguntas sobre o Rian Tavares</h2></div>
  {faq_html(faq)}
</section>'''
    ld = [PESSOA,
          {'@type': 'ProfilePage', '@id': f'{LP}/quem-e-rian-tavares/', 'url': f'{LP}/quem-e-rian-tavares/', 'name': 'Quem é Rian Tavares',
           'inLanguage': 'pt-BR', 'dateModified': '2026-11-23', 'mainEntity': {'@id': PESSOA_ID}},
          faq_ld(faq), breadcrumb('quem-e-rian-tavares', 'Quem é Rian Tavares')]
    pagina('quem-e-rian-tavares', 'Quem é Rian Tavares | Economista, investidor e professor de investimentos',
           'Rian Tavares é economista, planejador financeiro certificado (CFP) e investidor com mais de 14 anos de mercado. Foi sócio de uma das maiores instituições financeiras do país e é autor de 2 livros.',
           ld, corpo, imagem='/img/rian-sentado.webp')


# ------------------------------------------------------------------ /cursos-rian-tavares
def cursos():
    faq = [
        ('O curso do Rian Tavares é bom? Vale a pena?',
         'Depende de onde você está. Os cursos foram feitos para quem quer aprender a investir o seu dinheiro começando do zero, sem termo técnico. '
         'Quem nunca investiu costuma começar pelo Investidor em 7 Dias, que termina com a conta aberta e a primeira carteira montada. Quem quer o '
         'caminho completo, com aulas ao vivo e suporte por 1 ano, vai para o Invista Para Prosperar. Os 2 têm 15 dias de garantia, então dá para '
         'assistir, testar e pedir o dinheiro de volta se não for para você.'),
        ('O curso do Rian Tavares é confiável?',
         'O Rian tem mais de 14 anos de mercado financeiro, foi sócio de uma das maiores instituições financeiras do país e é planejador financeiro '
         'certificado (CFP). Os cursos são vendidos pela Hubla, que manda o acesso por e-mail logo depois da compra, e têm 15 dias de garantia '
         'incondicional.'),
        ('Quanto custa o curso do Rian Tavares?',
         'Nas páginas oficiais, em novembro de 2026, o Investidor em 7 Dias custa R$ 189 à vista ou 12x de R$ 19,21, e o Invista Para Prosperar '
         'custa R$ 1.997 à vista ou 12x de R$ 202,91. O valor de cada um está sempre na página do curso, que pode ter condições especiais em '
         'algumas épocas do ano.'),
        ('Qual a diferença entre o Investidor em 7 Dias e o Invista Para Prosperar?',
         'O Investidor em 7 Dias tem 4 aulas e foca no primeiro passo, abrir a conta, entender renda fixa e renda variável e montar a primeira '
         'carteira. O Invista Para Prosperar é o curso completo, com 35 aulas em 5 módulos, a AssessorIA, 6 meses de aulas ao vivo com o Rian, '
         'suporte da equipe por 1 ano, e já inclui o Investidor em 7 Dias como bônus.'),
        ('Preciso ter muito dinheiro para começar?',
         'Não. Dá para começar com pouco. No Tesouro Direto, por exemplo, há títulos a partir de uns R$ 30. O que os cursos ensinam é onde colocar '
         'o que você tem e por quê.'),
        ('O curso diz em qual investimento eu devo colocar o meu dinheiro?',
         'Não de forma personalizada. O Rian ensina como cada investimento funciona, como descobrir o seu perfil e como montar uma carteira de '
         'acordo com ele. A escolha final é sua. Os cursos são educação financeira e não substituem um profissional que conheça a sua situação.'),
        ('Como eu recebo o acesso depois de comprar?',
         'Assim que o pagamento é confirmado, a Hubla manda um e-mail com o login para você criar a sua senha e entrar nas aulas. Se o e-mail não '
         f'aparecer em poucos minutos, olhe a caixa de spam e a aba Promoções. Se mesmo assim não chegar, fale com o suporte{" na " + link_atendimento() if WHATS_SUPORTE else ""}.'),
        ('Por quanto tempo eu tenho acesso?',
         'O acesso aos 2 cursos é vitalício. Você paga uma vez e assiste quantas vezes quiser, incluindo as atualizações.'),
        ('Como funciona a garantia e o reembolso?',
         'Os 2 cursos têm 15 dias de garantia incondicional. Se você pedir o reembolso dentro de 15 dias da compra, o valor é devolvido integral, '
         f'sem precisar explicar o motivo.{" O passo a passo está na " + link_atendimento() + "." if WHATS_SUPORTE else ""}'),
    ]
    corpo = f'''<section class="pi-hero sem-foto">
  <div class="pi-hero-in">
    <div>
      <span class="section-eyebrow" style="color: var(--terra-bright);">Cursos do Rian Tavares</span>
      <h1>Os cursos de investimentos do Rian Tavares</h1>
      <p class="sub">São 2 cursos online, os 2 com <strong>acesso vitalício</strong> e <strong>15 dias de garantia</strong>. O Investidor em 7 Dias é o primeiro passo para quem nunca investiu. O Invista Para Prosperar é o caminho completo, do zero ao avançado.</p>
    </div>
  </div>
</section>

<section class="section section-paper">
  <div class="pi-texto">
    <h2>O que tem em cada curso</h2>
    <div class="pi-cards">
      <div class="pi-card">
        <h3>Investidor em 7 Dias</h3>
        <p>Para quem nunca investiu ou só usa a poupança. São 4 aulas, na ordem certa.</p>
        <ul>
          <li>Aula 1, abrir a conta e descobrir o seu perfil de investidor</li>
          <li>Aula 2, renda fixa (Tesouro Direto, CDB, LCI, LCA, FGC e imposto)</li>
          <li>Aula 3, renda variável (ações, fundos, ETFs e fundos imobiliários)</li>
          <li>Aula 4, montar a carteira completa e diversificada para o seu perfil</li>
        </ul>
        <p>Inclui O Técnico, uma IA treinada com as aulas para tirar dúvidas, e 30 dias de suporte da equipe.</p>
        <p class="preco">R$ 189 à vista ou 12x de R$ 19,21</p>
        <p><a href="/i7d/">Ver a página do Investidor em 7 Dias</a></p>
      </div>
      <div class="pi-card">
        <h3>Invista Para Prosperar</h3>
        <p>O curso completo do Rian, para quem quer ir além da primeira carteira e construir patrimônio com método.</p>
        <ul>
          <li>35 aulas em 5 módulos, do zero ao avançado</li>
          <li>Renda fixa, ações, fundos imobiliários e investimentos no exterior</li>
          <li>AssessorIA, a IA do Rian para tirar dúvidas a qualquer hora</li>
          <li>Planilhas e calculadoras</li>
          <li>6 meses de aulas ao vivo com o Rian e suporte da equipe por 1 ano</li>
        </ul>
        <p>Já inclui o Investidor em 7 Dias e os 2 livros do Rian em versão digital.</p>
        <p class="preco">R$ 1.997 à vista ou 12x de R$ 202,91</p>
        <p><a href="/ipp/">Ver a página do Invista Para Prosperar</a></p>
      </div>
    </div>
    <p style="font-size: 14px;">Valores das páginas oficiais em novembro de 2026. O preço de cada curso está sempre na página dele.</p>

    <h2>Qual escolher</h2>
    <p>Se você nunca investiu e quer sair da poupança rápido, comece pelo <strong>Investidor em 7 Dias</strong>. Em 4 aulas você abre a conta, faz o primeiro investimento e monta uma carteira para o seu perfil.</p>
    <p>Se você quer aprender tudo, inclusive renda variável e investimento no exterior, e prefere ter aulas ao vivo e suporte por mais tempo, o <strong>Invista Para Prosperar</strong> é o mais completo.</p>

    <h2>Como funciona a compra</h2>
    <p>O pagamento é feito pela Hubla, no cartão em até 12x ou no PIX. Logo depois da confirmação chega um e-mail da Hubla com o acesso. Você cria a sua senha e já pode assistir pelo celular, tablet ou computador.</p>
    <p>Os 2 cursos têm 15 dias de garantia incondicional. Se não for para você, é só pedir o reembolso dentro desse prazo e o valor volta integral.</p>

    <h2>Quem ensina</h2>
    <p>Os cursos são do <a href="/quem-e-rian-tavares/">Rian Tavares</a>, economista e planejador financeiro certificado (CFP), com mais de 14 anos de mercado financeiro. Ele foi sócio de uma das maiores instituições financeiras do país, onde movimentava quase R$ 5 bilhões por mês, e já ensinou mais de 10 mil alunos.</p>
  </div>
</section>

<section class="section section-paper-warm">
  <div class="pi-texto pi-centro"><h2>Perguntas antes de comprar</h2></div>
  {faq_html(faq)}
</section>'''
    ld = [PESSOA] + CURSOS + [
        {'@type': 'WebPage', '@id': f'{LP}/cursos-rian-tavares/', 'url': f'{LP}/cursos-rian-tavares/', 'name': 'Cursos do Rian Tavares',
         'inLanguage': 'pt-BR', 'dateModified': '2026-11-23', 'about': [{'@id': c['@id']} for c in CURSOS], 'author': {'@id': PESSOA_ID}},
        faq_ld(faq), breadcrumb('cursos-rian-tavares', 'Cursos do Rian Tavares')]
    pagina('cursos-rian-tavares', 'Cursos do Rian Tavares | Investidor em 7 Dias e Invista Para Prosperar',
           'Os 2 cursos de investimentos do Rian Tavares, o que tem em cada um, quanto custam, como recebe o acesso e como funciona a garantia de 15 dias.',
           ld, corpo)


# ------------------------------------------------------------------ /atendimento
def atendimento():
    assert WHATS_SUPORTE, 'Falta o WhatsApp do suporte confirmado pelo Thomas'
    num = WHATS_SUPORTE
    vis = f'({num[2:4]}) {num[4:9]}-{num[9:]}'
    wa = f'https://wa.me/{num}'
    faq = [
        ('Como falar com o suporte do Rian Tavares?',
         f'Pelo WhatsApp oficial do suporte, <a href="{wa}">{vis}</a>. É por ele que a equipe atende dúvidas de pagamento, acesso ao curso, '
         'garantia e reembolso.'),
        ('Comprei o curso e o acesso não chegou. O que eu faço?',
         'O acesso vem por e-mail da Hubla logo depois que o pagamento é confirmado. Procure por "Hubla" na sua caixa de entrada, no spam e na aba '
         f'Promoções. No PIX e no cartão a confirmação costuma ser rápida. Se não encontrar, mande uma mensagem no WhatsApp do suporte, <a href="{wa}">{vis}</a>, com o e-mail usado na compra.'),
        ('Como pedir reembolso do curso do Rian Tavares?',
         f'Os cursos têm 15 dias de garantia incondicional. Dentro desse prazo, peça o reembolso pelo WhatsApp do suporte, <a href="{wa}">{vis}</a>, '
         'informando o e-mail da compra. O valor volta integral.'),
        ('Até quando posso pedir o reembolso?',
         'Até 15 dias depois da compra. Esse é o prazo da garantia dos 2 cursos, o Investidor em 7 Dias e o Invista Para Prosperar.'),
        ('Quem vende os cursos do Rian Tavares?',
         'Os cursos são vendidos pela Hubla, plataforma de pagamentos e cursos online. A cobrança e o e-mail de acesso chegam em nome da Hubla.'),
        ('Recebi uma mensagem pedindo pagamento em nome do Rian. É verdade?',
         f'Na dúvida, não pague. Confirme antes no WhatsApp oficial do suporte, <a href="{wa}">{vis}</a>, ou no Instagram '
         '<a href="https://www.instagram.com/falecomrian/">@falecomrian</a>.'),
    ]
    corpo = f'''<section class="pi-hero sem-foto">
  <div class="pi-hero-in">
    <div>
      <span class="section-eyebrow" style="color: var(--terra-bright);">Atendimento</span>
      <h1>Atendimento ao aluno do Rian Tavares</h1>
      <p class="sub">Acesso que não chegou, pagamento, garantia ou reembolso. O suporte oficial atende pelo WhatsApp <strong>{vis}</strong>.</p>
      <p style="margin-top: 26px;"><a class="cta" href="{wa}">Falar com o suporte no WhatsApp</a></p>
    </div>
  </div>
</section>

<section class="section section-paper">
  <div class="pi-texto">
    <h2>Não recebi o acesso</h2>
    <p>O acesso chega por e-mail da Hubla logo depois que o pagamento é confirmado. Procure por "Hubla" na caixa de entrada, no spam e na aba Promoções. No e-mail tem o link para criar a sua senha e entrar nas aulas.</p>
    <p>Se não encontrar, mande uma mensagem no WhatsApp do suporte com o e-mail que você usou na compra.</p>

    <h2>Garantia e reembolso</h2>
    <p>O Investidor em 7 Dias e o Invista Para Prosperar têm 15 dias de garantia incondicional. Se não for para você, peça o reembolso dentro desse prazo pelo WhatsApp do suporte, informando o e-mail da compra. O valor volta integral, sem precisar explicar o motivo.</p>

    <h2>Cuidado com golpes</h2>
    <p>Os cursos do Rian são vendidos só pelas páginas oficiais, com pagamento pela Hubla. Se alguém pedir pagamento por outro caminho em nome do Rian, confirme antes no WhatsApp oficial ou no Instagram <a href="https://www.instagram.com/falecomrian/">@falecomrian</a>.</p>
  </div>
</section>

<section class="section section-paper-warm">
  <div class="pi-texto pi-centro"><h2>Perguntas frequentes</h2></div>
  {faq_html(faq)}
</section>'''
    ld = [PESSOA,
          {'@type': 'ContactPage', '@id': f'{LP}/atendimento/', 'url': f'{LP}/atendimento/', 'name': 'Atendimento ao aluno do Rian Tavares',
           'inLanguage': 'pt-BR', 'dateModified': '2026-11-23',
           'mainEntity': {'@type': 'Organization', 'name': 'Rian Tavares', 'url': f'{LP}/quem-e-rian-tavares/', 'founder': {'@id': PESSOA_ID},
                          'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer support', 'telephone': '+' + num,
                                           'availableLanguage': 'Portuguese', 'url': wa}}},
          faq_ld(faq), breadcrumb('atendimento', 'Atendimento')]
    pagina('atendimento', 'Atendimento Rian Tavares | Suporte, acesso, garantia e reembolso',
           f'Fale com o suporte oficial do Rian Tavares pelo WhatsApp {vis}. Acesso que não chegou, pagamento pela Hubla, garantia de 15 dias e como pedir reembolso.',
           ld, corpo)


if __name__ == '__main__':
    quem_e()
    cursos()
    if 'atendimento' in sys.argv:
        atendimento()
