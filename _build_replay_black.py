# Monta /replay-black.html (18/11/2026): a /black-vitalicia inteira, com uma secao do replay da live antes do hero.
# Rodar DEPOIS de _build_black_vitalicia.py, sempre que a /black-vitalicia mudar:
#   python -I _build_replay_black.py
import pathlib

AQUI = pathlib.Path(__file__).parent
html = (AQUI / "black-vitalicia.html").read_text(encoding="utf-8")
YT = "pdepLwuV6dA"
CHECKOUT = "https://pay.hub.la/rkh4csUigSsuGzY4mRFJ"


def troca(velho, novo):
    global html
    assert velho in html, velho
    html = html.replace(velho, novo)


# titulo, descricao e enderecos
ini = html.index("<title>")
fim = html.index("</title>") + len("</title>")
html = html[:ini] + "<title>Replay da Black Friday do Invista Para Prosperar | Rian Tavares</title>" + html[fim:]
troca('href="https://lp.riantavares.com.br/black-vitalicia"', 'href="https://lp.riantavares.com.br/replay-black"')
troca('content="https://lp.riantavares.com.br/black-vitalicia"', 'content="https://lp.riantavares.com.br/replay-black"')
html = html.replace('<meta property="og:title" content="', '<meta property="og:title" content="Replay liberado · ', 1)

css = """<style>
  /* ===== Secao do replay (18/11/2026) ===== */
  .replay-sec { padding: 44px 0 64px; background: radial-gradient(70% 55% at 50% 0%, rgba(241,197,107,.14), rgba(0,0,0,0) 70%), var(--black); color: var(--text-cream); text-align: center; }
  .replay-rotulo { margin: 0 0 16px; font-family: 'DM Sans', 'Inter', sans-serif; font-size: 14px; font-weight: 600; letter-spacing: .06em; color: rgba(247,240,226,.78); }
  .replay-rotulo i { display: inline-block; width: 8px; height: 8px; margin: 0 9px 0 0; vertical-align: middle; border-radius: 50%; background: #e6c27a; box-shadow: 0 0 0 3px rgba(230,194,122,.22); }
  .replay-rotulo em { font-style: italic; color: var(--gold-bright); }
  .replay-sec .section-headline { max-width: 820px; margin: 0 auto 14px; }
  .replay-sec .section-sub { max-width: 640px; margin: 0 auto; color: rgba(247,240,226,.78); }
  .replay-video { position: relative; max-width: 960px; margin: 28px auto 0; aspect-ratio: 16 / 9; border-radius: 18px; overflow: hidden; background: #000; border: 1px solid rgba(217,191,139,.28); box-shadow: 0 40px 90px -40px rgba(0,0,0,.9); }
  .replay-video iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
  @media (max-width: 900px) { .replay-sec { padding: 36px 0 44px; } .replay-video { border-radius: 12px; margin-top: 20px; } .replay-rotulo { font-size: 11.5px; } }
</style>
</head>"""
troca("</head>", css)

secao = f"""<!-- ============ REPLAY (18/11/2026), modelado na secao 1 da /aula-conexao da Thaize ============ -->
<section class="replay-sec" id="replay">
  <div class="container">
    <p class="replay-rotulo"><i></i>Replay da live <em>liberado</em></p>
    <h2 class="section-headline">Assista ao replay da Black Friday do Invista Para Prosperar e aprenda a investir o seu dinheiro do jeito certo</h2>
    <p class="section-sub">A live completa pra você assistir agora e entender tudo o que você leva na Black Friday.</p>
    <div class="replay-video">
      <iframe src="https://www.youtube-nocookie.com/embed/{YT}?rel=0&modestbranding=1" title="Replay da live da Black Friday do Invista Para Prosperar" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
    </div>
  </div>
</section>

<!-- ============ HERO"""
troca("<!-- ============ HERO", secao)

out = AQUI / "replay-black.html"
out.write_text(html, encoding="utf-8")
print("ok", out, len(html))
