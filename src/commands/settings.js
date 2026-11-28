import { settings } from '../settings/settings.js';
import { makeTable } from '../ui/table.js';
import { theme } from '../ui/theme.js';
import { log } from '../utils/logger.js';

export async function cmdSettings(args = [], tui) {
  const s = settings.all();

  if (args.length >= 2) {
    const [k, ...rest] = args;
    return applySetting(k, rest.join(' '));
  }

  if (args[0] === 'reset') {
    settings.reset();
    return log.success('Settings direset ke default');
  }

  const t = makeTable(['Key', 'Value', 'Default', 'Keterangan']);
  t.push(['maxTokens',   theme.primary(String(s.maxTokens)),   String(settings.defaults().maxTokens),   'max_tokens dikirim ke API']);
  t.push(['temperature', theme.primary(String(s.temperature)), String(settings.defaults().temperature), '0=deterministik, 2=kreatif']);
  t.push(['topP',        theme.primary(String(s.topP)),        String(settings.defaults().topP),        'nucleus sampling']);
  console.log(t.toString());

  const key = (await tui.ask(theme.primary('  Key (maxTokens/temperature/topP, kosong=batal): '))).trim();
  if (!key) return log.dim('Dibatalkan');
  const val = (await tui.ask(theme.primary(`  Nilai baru untuk ${key}: `))).trim();
  if (!val) return log.dim('Dibatalkan');
  applySetting(key, val);
}

function applySetting(k, raw) {
  const s = settings.all();
  if (!(k in s)) return log.error(`Setting "${k}" tidak dikenal`);
  let v = raw;
  if (k === 'maxTokens') {
    v = parseInt(raw, 10);
    if (!Number.isFinite(v) || v < 1 || v > 200000) return log.error('maxTokens harus 1–200000');
  } else {
    v = parseFloat(raw);
    if (!Number.isFinite(v) || v < 0 || v > 2) return log.error(`${k} harus 0–2`);
  }
  settings.set(k, v);
  log.success(`${k} = ${v} (berlaku semua model & provider)`);
}
