import { usage } from '../db/database.js';
import { theme } from '../ui/theme.js';
import { makeTable } from '../ui/table.js';

export async function cmdUsage() {
  const rows = usage.aggregate();
  const total = usage.total();
  if (!rows.length) { console.log('  ' + theme.muted('· belum ada usage')); return; }
  const t = makeTable(['Model', 'Provider', 'Calls', 'Tokens In', 'Tokens Out']);
  for (const r of rows) t.push([theme.white(r.model), theme.muted(r.provider || '-'), String(r.calls), theme.primary(String(r.total_in||0)), theme.secondary(String(r.total_out||0))]);
  console.log(t.toString());
  console.log('  ' + theme.muted('Total: ') + theme.primary(`in=${total.tin||0}`) + '  ' + theme.secondary(`out=${total.tout||0}`));
  console.log('');
}
