import { providers } from '../db/database.js';
import { log } from '../utils/logger.js';

export async function cmdProvider(args = [], tui) {
  if (args[0] === 'list') {
    const l = providers.findAll();
    if (!l.length) return log.warn('Belum ada provider');
    for (const p of l) log.info(`${p.id}. ${p.name} — ${p.model} (${p.endpoint})`);
    return;
  }
  console.log('  ' + 'Tambah provider (OpenAI-compatible):\n');
  const name = (await tui.ask('  Provider name: ')).trim();
  if (!name) return log.error('Dibatalkan');
  const endpoint = (await tui.ask('  Endpoint (…/v1): ')).trim();
  if (!endpoint.startsWith('http')) return log.error('Endpoint harus http(s)');
  const model = (await tui.ask('  Model name: ')).trim();
  if (!model) return log.error('Dibatalkan');
  const apiKey = await askSecret(tui, '  API Key: ');
  if (!apiKey) return log.error('Dibatalkan');
  providers.add(name, endpoint, model, apiKey);
  log.success(`Added: ${name} (${model})`);
  log.dim('Gunakan /models untuk pilih');
}

async function askSecret(tui, prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const was = stdin.isRaw;
    stdin.setRawMode(true); stdin.resume();
    let v = '';
    const onData = (buf) => {
      for (const ch of buf.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(was||false); stdin.removeListener('data', onData);
          process.stdout.write('\n'); resolve(v); return;
        }
        if (ch === '\u0003') { stdin.setRawMode(was||false); stdin.removeListener('data', onData); process.stdout.write('\n'); process.exit(0); }
        if (ch === '\u007f' || ch === '\b') { if (v.length) { v = v.slice(0,-1); process.stdout.write('\b \b'); } continue; }
        if (ch >= ' ' && ch <= '~') { v += ch; process.stdout.write('*'); }
      }
    };
    stdin.on('data', onData);
  });
}
