// Cloudflare Pages Function: calendário e abas editáveis do /plano (mesmo modelo do /plano da Thaize).
// GET  /api/plano            -> { ok, dias:[{data,fg,fa}], acoes:[{id,data,texto,tipo,trilha,ordem}] }
// POST /api/plano {senha,op} -> ops: check | seed | salvar_dia | log
// A senha NÃO fica no código (este repo é público): vem do Secret PLANO_SENHA do Cloudflare Pages.
// Cada edição grava antes/depois na tabela plano_log, pra dar pra desfazer na mão.

const TIPOS = ["marco", "conteudo", "live", "insta", "instarot", "trafego", "alerta"];
const TRILHAS = ["g", "a", "o"];
const FG = ["", "pre", "bur", "spo", "cap", "cpl", "car"];
const FA = ["", "conv", "aqu", "ret", "bla", "car"];

async function garantirTabelas(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS plano_acoes (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL, texto TEXT NOT NULL, tipo TEXT NOT NULL, trilha TEXT NOT NULL, ordem INTEGER DEFAULT 0, updated_at TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS plano_dias (data TEXT PRIMARY KEY, fg TEXT DEFAULT '', fa TEXT DEFAULT '')"),
    db.prepare("CREATE TABLE IF NOT EXISTS plano_log (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT, op TEXT, data TEXT, antes TEXT, depois TEXT)"),
    db.prepare("CREATE TABLE IF NOT EXISTS plano_docs (chave TEXT PRIMARY KEY, json TEXT, updated_at TEXT)"),
  ]);
}

async function sha256(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}

const dataOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));
const limpa = (a) => ({
  texto: String(a.texto || "").trim().slice(0, 300),
  tipo: TIPOS.includes(a.tipo) ? a.tipo : "conteudo",
  trilha: TRILHAS.includes(a.trilha) ? a.trilha : "g",
});

async function lerDia(db, data) {
  const ac = (await db.prepare("SELECT id,texto,tipo,trilha,ordem FROM plano_acoes WHERE data=? ORDER BY ordem,id").bind(data).all()).results || [];
  const dia = await db.prepare("SELECT fg,fa FROM plano_dias WHERE data=?").bind(data).first();
  return { fg: dia ? dia.fg : "", fa: dia ? dia.fa : "", acoes: ac };
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "no_db" }, 500);
  await garantirTabelas(env.DB);
  const dias = (await env.DB.prepare("SELECT data,fg,fa FROM plano_dias").all()).results || [];
  const acoes = (await env.DB.prepare("SELECT id,data,texto,tipo,trilha,ordem FROM plano_acoes ORDER BY data,ordem,id").all()).results || [];
  const rows = (await env.DB.prepare("SELECT chave,json FROM plano_docs").all()).results || [];
  const docs = {};
  for (const r of rows) { try { docs[r.chave] = JSON.parse(r.json); } catch (e) {} }
  return json({ ok: true, dias, acoes, concepcao: docs.concepcao || null, docs });
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "no_db" }, 500);
  let b;
  try { b = await request.json(); } catch (e) { return json({ ok: false, error: "invalid_body" }, 400); }
  if (!env.PLANO_SENHA) return json({ ok: false, error: "sem_senha" }, 503);
  if ((await sha256(String(b.senha || ""))) !== (await sha256(env.PLANO_SENHA))) return json({ ok: false, error: "senha" }, 401);
  const db = env.DB;
  await garantirTabelas(db);
  const agora = new Date().toISOString();

  if (b.op === "check") return json({ ok: true });

  if (b.op === "log") {
    const r = (await db.prepare("SELECT id,created_at,op,data,antes,depois FROM plano_log ORDER BY id DESC LIMIT 100").all()).results || [];
    return json({ ok: true, log: r });
  }

  if (b.op === "seed") {
    const n = await db.prepare("SELECT COUNT(*) c FROM plano_acoes").first();
    if (n && n.c > 0 && !b.force) return json({ ok: false, error: "ja_tem_dados", total: n.c }, 409);
    const st = [db.prepare("DELETE FROM plano_acoes"), db.prepare("DELETE FROM plano_dias")];
    for (const d of b.dias || []) {
      if (!dataOk(d.data)) continue;
      st.push(db.prepare("INSERT INTO plano_dias (data,fg,fa) VALUES (?,?,?)").bind(d.data, FG.includes(d.fg) ? d.fg : "", FA.includes(d.fa) ? d.fa : ""));
    }
    (b.acoes || []).forEach((a, i) => {
      if (!dataOk(a.data)) return;
      const c = limpa(a); if (!c.texto) return;
      st.push(db.prepare("INSERT INTO plano_acoes (data,texto,tipo,trilha,ordem,updated_at) VALUES (?,?,?,?,?,?)").bind(a.data, c.texto, c.tipo, c.trilha, Number(a.ordem) || i, agora));
    });
    st.push(db.prepare("INSERT INTO plano_log (created_at,op,data,antes,depois) VALUES (?,?,?,?,?)").bind(agora, "seed", "", "", JSON.stringify({ dias: (b.dias || []).length, acoes: (b.acoes || []).length })));
    for (let i = 0; i < st.length; i += 90) await db.batch(st.slice(i, i + 90));
    return json({ ok: true, dias: (b.dias || []).length, acoes: (b.acoes || []).length });
  }

  if (b.op === "salvar_dia") {
    if (!dataOk(b.data)) return json({ ok: false, error: "data" }, 400);
    const antes = await lerDia(db, b.data);
    const lista = (b.acoes || []).map(limpa).filter((a) => a.texto);
    const fg = FG.includes(b.fg) ? b.fg : "";
    const fa = FA.includes(b.fa) ? b.fa : "";
    const st = [
      db.prepare("DELETE FROM plano_acoes WHERE data=?").bind(b.data),
      db.prepare("INSERT INTO plano_dias (data,fg,fa) VALUES (?,?,?) ON CONFLICT(data) DO UPDATE SET fg=excluded.fg, fa=excluded.fa").bind(b.data, fg, fa),
    ];
    lista.forEach((a, i) => st.push(db.prepare("INSERT INTO plano_acoes (data,texto,tipo,trilha,ordem,updated_at) VALUES (?,?,?,?,?,?)").bind(b.data, a.texto, a.tipo, a.trilha, i, agora)));
    st.push(db.prepare("INSERT INTO plano_log (created_at,op,data,antes,depois) VALUES (?,?,?,?,?)").bind(agora, "salvar_dia", b.data, JSON.stringify(antes), JSON.stringify({ fg, fa, acoes: lista })));
    await db.batch(st);
    return json({ ok: true, dia: await lerDia(db, b.data) });
  }

  if (b.op === "salvar_concepcao") {
    if (!b.doc || typeof b.doc !== "object") return json({ ok: false, error: "doc" }, 400);
    const txt = JSON.stringify(b.doc);
    if (txt.length > 500000) return json({ ok: false, error: "grande" }, 400);
    const antes = await db.prepare("SELECT json FROM plano_docs WHERE chave='concepcao'").first();
    await db.batch([
      db.prepare("INSERT INTO plano_docs (chave,json,updated_at) VALUES ('concepcao',?,?) ON CONFLICT(chave) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at").bind(txt, agora),
      db.prepare("INSERT INTO plano_log (created_at,op,data,antes,depois) VALUES (?,?,?,?,?)").bind(agora, "salvar_concepcao", "", antes ? antes.json : "", txt),
    ]);
    return json({ ok: true });
  }

  if (b.op === "salvar_doc") {
    const chave = String(b.chave || "");
    if (!/^pane-[a-z]+$/.test(chave)) return json({ ok: false, error: "chave" }, 400);
    let html = String(b.valor || "");
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "").replace(/javascript:/gi, "");
    if (html.length > 400000) return json({ ok: false, error: "grande" }, 400);
    const txt = JSON.stringify(html);
    const antes = await db.prepare("SELECT json FROM plano_docs WHERE chave=?").bind(chave).first();
    await db.batch([
      db.prepare("INSERT INTO plano_docs (chave,json,updated_at) VALUES (?,?,?) ON CONFLICT(chave) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at").bind(chave, txt, agora),
      db.prepare("INSERT INTO plano_log (created_at,op,data,antes,depois) VALUES (?,?,?,?,?)").bind(agora, "salvar_doc", chave, antes ? antes.json : "", txt),
    ]);
    return json({ ok: true });
  }

  return json({ ok: false, error: "op" }, 400);
}
