import { providers, usage } from '../db/database.js';
import { theme } from '../ui/theme.js';
import { log } from '../utils/logger.js';
import { makeTable } from '../ui/table.js';

export async function cmdModels(args = [], tui) {
  const list = providers.list();
  if (!list.length) return log.warn('Belum ada model. /provider dulu');
  if (args[0]) {
    const p = list.find((x) => String(x.id) === String(args[0]));
    if (!p) return log.error(`ID ${args[0]} tidak ditemukan`);
    tui.setModel(p.model, p);
    return log.success(`Now using: [${p.id}] ${p.model}`);
  }
  const uMap = {};
  for (const u of usage.aggregate()) uMap[`${u.provider}__${u.model}`] = u;
  const t = makeTable(['ID', 'Provider', 'Model', 'Tok In', 'Tok Out', 'Status']);
  for (const p of list) {
    const u = uMap[`${p.name}__${p.model}`];
    t.push([
      p.id, theme.white(p.name), theme.white(p.model),
      u ? theme.muted(String(u.total_in)) : theme.dim('—'),
      u ? theme.muted(String(u.total_out)) : theme.dim('—'),
      tui.currentModel === p.model ? theme.success('● active') : theme.muted('○ ready'),
    ]);
  }
  console.log(t.toString());
  const ans = await tui.ask(theme.primary('  Pilih ID (kosong=batal): '));
  const id = (ans || '').trim();
  if (!id) return log.dim('Dibatalkan');
  const p = list.find((x) => String(x.id) === id);
  if (!p) return log.error(`ID ${id} tidak ada`);
  tui.setModel(p.model, p);
  log.success(`Now using: [${p.id}] ${p.model}`);
}
