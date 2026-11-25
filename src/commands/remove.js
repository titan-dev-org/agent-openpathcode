import { providers } from '../db/database.js';
import { log } from '../utils/logger.js';
import { makeTable } from '../ui/table.js';
import { theme } from '../ui/theme.js';

export async function cmdRemove(args = [], tui) {
  const list = providers.findAll();
  if (!list.length) return log.warn('Belum ada model');
  if (args[0]) {
    const p = list.find((x) => String(x.id) === args[0] || x.model === args[0] || x.name === args[0]);
    if (!p) return log.error('Tidak ditemukan');
    providers.remove(p.id);
    if (tui && tui.currentModel === p.model) { tui.currentModel = null; tui.provider = null; }
    return log.success(`Terhapus: ${p.name} (${p.model})`);
  }
  const t = makeTable(['ID','Provider','Model']);
  for (const p of list) t.push([p.id, p.name, p.model]);
  console.log(t.toString());
  const ans = (await tui.ask('  ID(s) pisah koma: ')).trim();
  const ids = ans.split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) return log.dim('Dibatalkan');
  let n = 0;
  for (const id of ids) { const p = list.find((x) => String(x.id) === id); if (p) { providers.remove(p.id); n++; } }
  log.success(`Terhapus ${n} model`);
}
