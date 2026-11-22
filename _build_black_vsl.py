# Monta /black/vsl.html do Rian (21/11/2026): a /black/vsl da Thaize modelada para a Black dos Investimentos.
# Mesmo cabeçalho, estilos e scripts da página dela; troca só identidade (pixel, título, links), o vídeo do vturb
# e o corpo da oferta, com os fatos da /black-vitalicia do Rian.
# Rodar: python3 -I _build_black_vsl.py "<caminho do Thaize-Tavares-MB2/black/vsl.html>"
import pathlib, sys, re

AQUI = pathlib.Path(__file__).parent
html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")

CK = "https://pay.hub.la/rkh4csUigSsuGzY4mRFJ?lpv=black-vsl"
WA = "https://wa.me/5511955056319?text=Oi%2C%20tenho%20uma%20d%C3%BAvida%20sobre%20a%20Black%20dos%20Investimentos"
VID = "6b024f553c1cdea412104d1a"
REVELAR = 1410  # 23:30, tempo do botão passado pelo Thomas em 21/11 (gravação da live, "link liberado" aos 23:27)


def troca(velho, novo, n=1):
    global html
    c = html.count(velho)
    assert c == n, (c, velho[:80])
    html = html.replace(velho, novo)


# ---------- cabeçalho ----------
troca("<!-- ATENÇÃO: página gerada por Lançamentos/Black Friday/scripts/lp_black_vsl.py (cabeçalho e estilos da black-vv.html). Mudança feita direto aqui some na próxima geração. -->",
      "<!-- ATENÇÃO: página gerada por _build_black_vsl.py (modelo: /black/vsl da Thaize). Mudança feita direto aqui some na próxima geração. -->")
troca('href="/favicon.png"', 'href="/favicon-192.png"')
troca("1337404051138245", "1657954945312718", 2)
ini = html.index("<title>"); fim = html.index('<meta name="twitter:image"')
fim = html.index(">", fim) + 1
html = html[:ini] + """<title>Black Friday do Invista Para Prosperar · Acesso Vitalício | Rian Tavares</title>
<meta name="description" content="Black dos Investimentos: todos os cursos de investimentos e a AssessorIA com acesso vitalício e 12 meses de encontros ao vivo com o Rian.">
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="https://lp.riantavares.com.br/black/vsl">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Rian Tavares">
<meta property="og:title" content="Black dos Investimentos">
<meta property="og:description" content="Todos os cursos de investimentos e a AssessorIA com acesso vitalício e 12 meses de encontros ao vivo com o Rian.">
<meta property="og:url" content="https://lp.riantavares.com.br/black/vsl">
<meta property="og:image" content="https://lp.riantavares.com.br/img/og-ipp.webp">
<meta property="og:locale" content="pt_BR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://lp.riantavares.com.br/img/og-ipp.webp">""" + html[fim:]
# preloads das fotos da Thaize (não existem aqui)
html = re.sub(r'<link rel="preload"[^>]*href="/img/[^"]*"[^>]*>\n?', "", html)

# ---------- corpo ----------
ini = html.index('<div class="nv-faixa">')
fim = html.index("</div><!-- /esconder -->") + len("</div><!-- /esconder -->")

CHK = '<li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg><span>{}</span></li>'


def prod(tag, h3, p, checks, sep, inc):
    lis = "".join(CHK.format(c) for c in checks)
    return f"""      <article class="nv-prod">
        <span class="nv-tag">{tag}</span>
        <h3>{h3}</h3>
        <p>{p}</p>
        <ul class="nv-check">{lis}</ul>
        <div class="nv-prod-pe"><span class="nv-sep">Separado · <s>{sep}</s></span><span class="nv-inc">{inc}</span></div>
      </article>"""


ITENS = [  # nome, valor por ano (ancoragem da Black do Rian, total R$ 6.674)
    ("Invista Para Prosperar", "R$ 1.497"),
    ("Economia sem Economês", "R$ 189"),
    ("Planilhas e calculadoras", "R$ 397"),
    ("AssessorIA", "R$ 697"),
    ("Clube do Investidor", "R$ 3.000"),
    ("Suporte direto com a equipe", "R$ 497"),
    ("Grupo Fechado de Alunos", "R$ 397"),
]
tabela = "\n".join(f"        <tr><td>{n}</td><td>{v}</td></tr>" for n, v in ITENS)
lista = "\n".join(f"        <li><span>{n}</span><span>{v}/ano</span></li>" for n, v in ITENS)
ICON = '<span class="faq-icon"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></span>'


def faq(q, a):
    return f"""      <details class="faq-item">
        <summary>{q}{ICON}</summary>
        <div class="faq-answer">{a}</div>
      </details>"""


SELOS = html[html.index('    <div class="nv-selos">'):]
SELOS = SELOS[:SELOS.index("</div>\n") + len("</div>\n")]

corpo = f"""<div class="nv-faixa">Black Friday Vitalícia <em>liberada</em> pelas próximas horas</div>

<!-- ============ TOPO DA VSL ============ -->
<section class="vsl-topo">
  <div class="vsl-topo-in">
    <span class="vsl-selo"><i></i>BLACK FRIDAY · CONDIÇÃO ESPECIAL</span>
    <h1 class="vsl-h1">Eu acabei de fazer a <em>oferta mais louca da minha vida</em></h1>
    <p class="vsl-sub">Ela vai encerrar em breve. É a primeira e única vez que farei isso.</p>
    <p class="vsl-assista">ASSISTA O VÍDEO ABAIXO <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg></p>
    <div class="vsl-video">
      <vturb-smartplayer id="vid-{VID}" style="display: block; margin: 0 auto; width: 100%;"><div class="vturb-player-placeholder" style="position: relative; width: 100%; padding: 56.25% 0 0; z-index: 0; background-color: black;"></div></vturb-smartplayer>
      <script type="text/javascript">var s=document.createElement("script");s.src="https://scripts.converteai.net/5ab6965b-6268-4b7f-885a-aac5dae85715/players/{VID}/v4/player.js",s.async=!0,document.head.appendChild(s);</script>
    </div>
    <p class="vsl-som"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>Confira se o som do seu celular está ligado</p>
  </div>
</section>

<div class="esconder">
<section class="vsl-cta-revelado">
  <div class="vsl-topo-in">
    <a href="{CK}" class="cta cta-bigger" target="_blank" rel="noopener">ACESSO IMEDIATO E VITALÍCIO</a>
    <p class="vsl-cta-info">12x de R$ 126,71 ou R$ 1.247 à vista · 15 dias de garantia</p>
  </div>
</section>

<!-- ============ GANHA-GANHA ============ -->
<section class="nv-sec nv-claro">
  <div class="nv-wrap nv-estreito nv-centro">
    <span class="nv-eyebrow">Por que essa oferta existe</span>
    <h2>Porque é um ganha-ganha</h2>
    <p>Você sabe como funciona. O acesso aos meus cursos tem prazo, e todo ano você teria que renovar. Muita gente não renova e fica sozinha na hora de investir, sem saber se o produto que o gerente ofereceu é bom, sem saber o que fazer quando a bolsa cai e sem acompanhar o que eu estou ensinando agora.</p>
    <p class="nv-forte">Na Black dos Investimentos isso acaba. Você nunca mais fica sem acesso aos cursos e à AssessorIA, nunca mais precisa renovar e paga muito menos do que pagaria renovando todo ano.</p>
  </div>
  <div class="nv-wrap nv-pilares">
      <div class="nv-pilar"><span>01 · CONHECIMENTO</span><b>A trilha completa</b><p>Todos os meus cursos, da reserva de emergência à carteira completa, sempre atualizados.</p></div>
      <div class="nv-pilar"><span>02 · FERRAMENTAS</span><b>Investe junto com você</b><p>A AssessorIA e todas as minhas planilhas e calculadoras para usar no dia a dia.</p></div>
      <div class="nv-pilar"><span>03 · ACOMPANHAMENTO</span><b>Nunca sozinho</b><p>Encontro ao vivo comigo todo mês, suporte da minha equipe e o grupo de alunos.</p></div>
  </div>
</section>

<!-- ============ PRODUTOS ============ -->
<section class="nv-sec nv-creme">
  <div class="nv-wrap nv-centro nv-estreito">
    <span class="nv-eyebrow">O que você leva para sempre</span>
    <h2>Tudo isso está incluso na Black dos Investimentos</h2>
    <p>Abaixo, quanto cada item custaria comprando separado. Na Black, você leva tudo, e os cursos e a AssessorIA ficam com você para sempre.</p>
  </div>
  <div class="nv-wrap nv-prods">
{prod("Curso · carro-chefe", "Invista Para Prosperar", "O meu treinamento principal, com todo o meu método de investimentos, da reserva de emergência à carteira completa. Você leva o que tem hoje e todas as atualizações.", ["Mais de 35 aulas em 5 módulos", "Do zero ao avançado, para quem está começando e para quem já investe", "Aulas curtas, de 15 a 30 minutos"], "R$ 1.497/ano", "Incluso · vitalício")}
{prod("Aulas mensais", "Economia sem Economês", "Aulas que eu gravo todo mês explicando o que está acontecendo na economia e o que isso significa pro seu dinheiro.", ["O cenário do mês em português claro"], "R$ 189/ano", "Incluso · vitalício")}
{prod("Materiais", "Planilhas e calculadoras", "As mesmas que eu uso na minha vida, para você planejar os seus investimentos sem travar.", ["Calculadora de renda fixa, de CDB e LCI/LCA", "Simulação de investimentos e controle de carteira"], "R$ 397/ano", "Incluso · vitalício")}
{prod("Inteligência artificial", "AssessorIA", "A minha IA de investimentos, treinada com o que eu aprendi em mais de 14 anos de mercado financeiro. Ela te conhece com 9 perguntas rápidas e responde levando em conta o seu perfil e o seu objetivo.", ["O gerente ofereceu um produto? Pergunta pra ela antes de investir um real", "Disponível 24 horas por dia"], "R$ 697/ano", "Incluso · vitalício")}
{prod("Ao vivo comigo", "Clube do Investidor", "Um encontro ao vivo comigo todo mês, com conteúdo novo, a leitura do cenário e tira-dúvidas no final.", ["Encontros gravados para quem não puder estar ao vivo"], "R$ 3.000/ano", "Incluso · 12 meses")}
{prod("Suporte", "Suporte direto com a minha equipe", "Contato direto com o meu time para tirar as suas dúvidas durante 1 ano inteiro.", ["Atendimento pelo WhatsApp"], "R$ 497/ano", "Incluso · 12 meses")}
{prod("Comunidade", "Grupo Fechado de Alunos", "Alunos de todos os pontos de partida, de quem está começando a quem já tem carteira montada, trocando experiência.", ["Só para quem é aluno"], "R$ 397/ano", "Incluso")}
  </div>
  <div class="nv-centro"><a href="{CK}" class="cta cta-bigger nv-cta" target="_blank" rel="noopener">QUERO TUDO ISSO PARA SEMPRE</a></div>
</section>

<!-- ============ BÔNUS ============ -->
<section class="nv-sec nv-escuro">
  <div class="nv-wrap nv-centro nv-estreito">
    <span class="nv-eyebrow">E calma, ainda tem mais</span>
    <h2>Os bônus da Black Friday</h2>
  </div>
  <div class="nv-wrap nv-bonus-grid">
      <div class="nv-bonus"><span>BÔNUS 01</span><b>Investidor em 7 Dias</b><p>Para quem está começando. Eu abro a conta da corretora junto com você na tela do meu computador e a gente faz o seu primeiro investimento juntos.</p></div>
      <div class="nv-bonus"><span>BÔNUS 02</span><b>Gravação de todos os aulões do Clube do Investidor</b><p>Todos os encontros que já aconteceram, para você assistir quando quiser.</p></div>
      <div class="nv-bonus"><span>BÔNUS 03</span><b>Bônus surpresa</b><p>Um bônus que eu só revelo para quem entrar na Black.</p></div>
  </div>
</section>

<!-- ============ ANCORAGEM ============ -->
<section class="nv-sec nv-claro">
  <div class="nv-wrap nv-estreito nv-centro">
    <span class="nv-eyebrow">Comprando tudo separado</span>
    <h2>Quanto você investiria ano a ano</h2>
    <p>Para ter acesso por um ano a tudo isso, você precisaria investir R$ 6.674. E renovar todo ano.</p>
    <table class="nv-tabela">
      <thead><tr><th>Produto</th><th>Por ano</th></tr></thead>
      <tbody>
{tabela}
      </tbody>
      <tfoot><tr><td>Total em 1 ano</td><td>R$ 6.674</td></tr></tfoot>
    </table>
    <div class="nv-anos">
        <div><span>Ano 1</span><b>R$ 6.674</b></div>
        <div><span>Ano 2</span><b>R$ 13.348</b></div>
        <div><span>Ano 3</span><b>R$ 20.022</b></div>
        <div><span>Ano 4</span><b>R$ 26.696</b></div>
        <div><span>Ano 5</span><b>R$ 33.370</b></div>
    </div>
    <p class="nv-forte">R$ 33.370 em 5 anos, sem contar os bônus. Mas isso aqui é Black Friday. Você não vai pagar nem o preço de 1 ano.</p>
  </div>
</section>

<!-- ============ PREÇO ============ -->
<section class="nv-sec nv-escuro" id="oferta">
  <div class="nv-wrap nv-preco">
    <span class="vsl-selo"><i></i>BLACK FRIDAY · CONDIÇÃO ESPECIAL</span>
    <h2>Black dos Investimentos</h2>
    <ul class="nv-preco-lista">
{lista}
      <li class="nv-bonus-linha"><span>+ 3 bônus da Black</span><span>incluso</span></li>
    </ul>
    <p class="nv-de">De <s>R$ 6.674 por ano</s></p>
    <p class="nv-por"><small>12x</small> R$ 126,71</p>
    <p class="nv-avista">ou R$ 1.247 à vista · uma única vez, cursos e AssessorIA para sempre</p>
    <a href="{CK}" class="cta cta-bigger nv-cta" target="_blank" rel="noopener">GARANTIR MINHA VAGA NA BLACK</a>
{SELOS}    <div class="nv-duvida"><p><b>Ficou com alguma dúvida?</b> Fale com o nosso time agora. A gente te ajuda a garantir a sua vaga na Black.</p><a href="{WA}" target="_blank" rel="noopener">Chamar o time</a></div>
  </div>
</section>

<!-- ============ SE FIZER UMA ============ -->
<section class="nv-sec nv-creme">
  <div class="nv-wrap nv-estreito nv-centro">
    <span class="nv-eyebrow">É fácil recuperar o investimento</span>
    <h2>Se você fizer só uma dessas coisas, a Black já se paga</h2>
  </div>
  <ol class="nv-wrap nv-sefizer">
      <li><b>01</b><span>No produto do banco que você deixa de comprar depois de perguntar para a AssessorIA</span></li>
      <li><b>02</b><span>Na reserva de emergência que sai da poupança e vai para o lugar certo</span></li>
      <li><b>03</b><span>Na renda fixa escolhida certa para cada momento, entre Tesouro, CDB, LCI e LCA</span></li>
      <li><b>04</b><span>Na hora certa de reforçar a renda fixa ou a renda variável, lendo a Selic</span></li>
      <li><b>05</b><span>Na carteira montada por objetivo, e não por palpite</span></li>
      <li><b>06</b><span>No direcionamento dos encontros ao vivo comigo</span></li>
  </ol>
</section>

<!-- ============ GARANTIA ============ -->
<section class="nv-sec nv-claro">
  <div class="nv-wrap nv-garantia">
    <div class="nv-selo-garantia"><b>15</b><span>dias de<br>garantia</span></div>
    <div>
      <span class="nv-eyebrow">O risco é todo meu</span>
      <h2>Entre, conheça tudo e decida depois</h2>
      <p>Você tem 15 dias para conhecer todos os cursos, a AssessorIA e o acompanhamento e tirar as suas próprias conclusões. Se não gostar, devolvemos 100% do valor. Sem perguntas.</p>
    </div>
  </div>
</section>

<!-- ============ QUEM SOU EU ============ -->
<section class="nv-sec nv-escuro">
  <div class="nv-wrap nv-bio">
    <div class="nv-bio-foto"><img src="/img/rian-hero.webp" width="1080" height="1620" alt="Rian Tavares" loading="lazy" decoding="async"></div>
    <div>
      <span class="nv-eyebrow">Quem está do seu lado</span>
      <h2>Rian Tavares</h2>
      <p>Passei mais de 14 anos no mercado financeiro. Fui sócio de uma das maiores instituições financeiras do país e liderei uma mesa de renda fixa que movimentava quase 5 bilhões de reais por mês, atendendo os clientes mais ricos do Brasil.</p>
      <p>Sou planejador financeiro e gestor de fundos certificado, autor de 2 livros e professor de MBA de Private Banking. Hoje ensino pessoas comuns a investir do jeito certo.</p>
      <div class="nv-numeros"><div><b>+10 mil</b><span>alunos</span></div><div><b>+14 anos</b><span>de mercado</span></div><div><b>2</b><span>livros</span></div></div>
    </div>
  </div>
</section>

<!-- ============ SEGURANÇA ============ -->
<section class="nv-sec nv-creme">
  <div class="nv-wrap nv-estreito nv-centro nv-golpe">
    <span class="nv-eyebrow">Cuidado com golpes</span>
    <h2>Compre só pelos canais oficiais</h2>
    <p>A gente vende somente pelo checkout da Hubla, pelos botões desta página.</p>
    <p>Se alguém pedir dinheiro por fora ou prometer uma condição em meu nome, é golpe.</p>
    <p>Só confie no meu Instagram @falecomrian e no nosso time. Na dúvida, chame no direct.</p>
    <a href="{WA}" class="nv-link" target="_blank" rel="noopener">Falar com o time no WhatsApp</a>
  </div>
</section>

<!-- ============ FAQ ============ -->
<section class="nv-sec nv-claro">
  <div class="nv-wrap nv-estreito">
    <div class="nv-centro"><span class="nv-eyebrow">Tira-dúvidas</span><h2>Perguntas frequentes</h2></div>
    <div class="faq-list">
{faq("O que significa acesso vitalício?", "Você paga uma única vez e nunca mais precisa renovar os cursos e a AssessorIA. Leva tudo o que eu tenho hoje, com todas as atualizações, para sempre. O Clube do Investidor e o suporte são de 12 meses.")}
{faq("Eu já sou aluno do Rian. Vale a pena?", "Vale. Em vez de renovar todo ano, você garante o acesso para sempre a todos os meus cursos e à AssessorIA, pagando menos do que 1 ano do curso. Se você já é meu aluno, chame o meu time antes de comprar.")}
{faq("Eu nunca investi nada. Vou conseguir acompanhar?", "Vai. O primeiro módulo começa do zero, com perfil de investidor e reserva de emergência. Se você sabe usar o aplicativo do banco, já consegue acompanhar. E a AssessorIA tira as dúvidas do jeito mais simples possível, a qualquer hora.")}
{faq("Posso parcelar? Posso usar 2 cartões?", "Sim. Você pode parcelar em até 12x no cartão e também pagar com 2 cartões, direto no checkout da Hubla.")}
{faq("E se eu não gostar?", "Você tem 15 dias de garantia. Se não gostar, devolvemos 100% do valor.")}
{faq("Até quando vale esse preço?", "Esse é o preço da Black Friday e pode fechar a qualquer momento. Quando encerrar, já era.")}
    </div>
  </div>
</section>

<!-- ============ FINAL ============ -->
<section class="nv-sec nv-escuro">
  <div class="nv-wrap nv-estreito nv-centro">
    <span class="nv-eyebrow">Essa oferta não vai se repetir</span>
    <h2>Pague uma vez e tenha os meus cursos e a AssessorIA para sempre</h2>
    <p>Cursos, IA e acompanhamento. Por menos de R$ 3,50 por dia, uma única vez.</p>
    <a href="{CK}" class="cta cta-bigger nv-cta" target="_blank" rel="noopener">GARANTIR MINHA VAGA NA BLACK</a>
    <p class="vsl-cta-info">12x de R$ 126,71 ou R$ 1.247 à vista · 15 dias de garantia</p>
  </div>
</section>

<div class="nv-espaco"></div>
<div class="nv-barra"><div><b>Black dos Investimentos</b><span>12x R$ 126,71</span></div><a href="{CK}" target="_blank" rel="noopener">Garantir</a></div>
</div><!-- /esconder -->"""

html = html[:ini] + corpo + html[fim:]

# ---------- scripts do fim ----------
troca("/* libera o bloco .esconder quando a pessoa chega em 2004s do vídeo (?revelar=N para testar) */",
      f"/* libera o bloco .esconder quando a pessoa chega em {REVELAR}s do vídeo (?revelar=N para testar) */")
troca("if (!teste) seg = 2004;", f"if (!teste) seg = {REVELAR};")

corpo_final = html[html.index("<body>"):]  # o CSS herdado tem comentários citando a Thaize, isso não aparece na página
for proibido in ["Thaize", "thaize", "Viver de Vendas", "Vendedor.IA", "7ZaYKJllfao8bbpV3wpo", "comercial-black", "1337404051138245", "6af923ebf5f35a3e0ae6e121"]:
    assert proibido not in corpo_final, proibido
for proibido in ["1337404051138245", "thaizetavares.com.br", "7ZaYKJllfao8bbpV3wpo"]:
    assert proibido not in html, proibido

saida = AQUI / "black" / "vsl.html"
saida.parent.mkdir(exist_ok=True)
saida.write_text(html, encoding="utf-8")
print("ok", saida, len(html))
