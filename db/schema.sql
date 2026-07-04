-- Tabela de leads da LP O Ano da Virada (Cloudflare D1).
-- Rodar uma vez no Console do banco D1.
CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  url TEXT,
  utm TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
