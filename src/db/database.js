import Database from 'better-sqlite3';
import path from 'path';
import { DB_DIR } from '../utils/workspace.js';

let db = null;

export async function initDatabase() {
  db = new Database(path.join(DB_DIR, 'openpathcode.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, endpoint TEXT NOT NULL, model TEXT NOT NULL, api_key TEXT NOT NULL, active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, title TEXT, model TEXT, provider_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, tool_call_id TEXT, tool_calls TEXT, tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS usage_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, model TEXT NOT NULL, provider TEXT, tokens_in INTEGER DEFAULT 0, tokens_out INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS mcp_servers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, command TEXT NOT NULL, args TEXT, active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS permissions (action TEXT PRIMARY KEY, rule TEXT NOT NULL);
  `);
  try {
    const cols = db.prepare('PRAGMA table_info(messages)').all().map((c) => c.name);
    if (!cols.includes('tool_call_id')) db.exec('ALTER TABLE messages ADD COLUMN tool_call_id TEXT');
    if (!cols.includes('tool_calls')) db.exec('ALTER TABLE messages ADD COLUMN tool_calls TEXT');
  } catch {}
  return db;
}

export function getDB() { if (!db) throw new Error('DB not init'); return db; }

export const providers = {
  add: (n,e,m,k) => getDB().prepare('INSERT INTO providers (name, endpoint, model, api_key) VALUES (?,?,?,?)').run(n,e,m,k),
  list: () => getDB().prepare('SELECT * FROM providers WHERE active=1 ORDER BY id ASC').all(),
  findByName: (n) => getDB().prepare('SELECT * FROM providers WHERE model=? OR name=? LIMIT 1').get(n,n),
  findById: (id) => getDB().prepare('SELECT * FROM providers WHERE id=?').get(id),
  findAll: () => getDB().prepare('SELECT * FROM providers ORDER BY id ASC').all(),
  remove: (id) => getDB().prepare('DELETE FROM providers WHERE id=?').run(id),
};

export const sessions = {
  create: (id,t,m,pid) => getDB().prepare('INSERT INTO sessions (id,title,model,provider_id) VALUES (?,?,?,?)').run(id,t,m,pid),
  list: () => getDB().prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all(),
  get: (id) => getDB().prepare('SELECT * FROM sessions WHERE id=?').get(id),
  touch: (id) => getDB().prepare('UPDATE sessions SET updated_at=CURRENT_TIMESTAMP WHERE id=?').run(id),
  delete: (id) => getDB().prepare('DELETE FROM sessions WHERE id=?').run(id),
};

export const messages = {
  add: (sid, role, content, tin=0, tout=0, tcid=null, tcs=null) =>
    getDB().prepare('INSERT INTO messages (session_id,role,content,tokens_in,tokens_out,tool_call_id,tool_calls) VALUES (?,?,?,?,?,?,?)')
      .run(sid, role, content ?? '', tin, tout, tcid, tcs ? JSON.stringify(tcs) : null),
  list: (sid) => getDB().prepare('SELECT * FROM messages WHERE session_id=? ORDER BY id ASC').all(sid),
  count: (sid) => getDB().prepare('SELECT COUNT(*) as c FROM messages WHERE session_id=?').get(sid).c,
  deleteBySession: (sid) => getDB().prepare('DELETE FROM messages WHERE session_id=?').run(sid),
};

export const usage = {
  add: (m,p,tin,tout) => getDB().prepare('INSERT INTO usage_stats (model,provider,tokens_in,tokens_out) VALUES (?,?,?,?)').run(m,p,tin,tout),
  aggregate: () => getDB().prepare('SELECT model, provider, SUM(tokens_in) as total_in, SUM(tokens_out) as total_out, COUNT(*) as calls FROM usage_stats GROUP BY model,provider ORDER BY total_in DESC').all(),
  total: () => getDB().prepare('SELECT SUM(tokens_in) as tin, SUM(tokens_out) as tout FROM usage_stats').get(),
};
