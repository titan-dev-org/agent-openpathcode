import { getDB } from '../db/database.js';
import readline from 'readline';
import { theme } from '../ui/theme.js';
import { pauseBus, resumeBus } from '../ui/readlineBus.js';

const DEFAULT = {
  read_file: 'allow', list_files: 'allow',
  write_file: 'allow', edit_file: 'allow',
  run_command: 'ask', git_push: 'ask',
};

export function getPolicy(action) {
  try {
    const row = getDB().prepare('SELECT rule FROM permissions WHERE action=?').get(action);
    if (row) return row.rule;
  } catch {}
  return DEFAULT[action] || 'ask';
}

export function setPolicy(action, rule) {
  getDB().prepare('INSERT OR REPLACE INTO permissions (action, rule) VALUES (?,?)').run(action, rule);
}

export async function askPermission(action, details) {
  const rule = getPolicy(action);
  if (rule === 'allow') return true;
  if (rule === 'deny') {
    console.log('  ' + theme.error('✗ ') + theme.error(`"${action}" diblokir oleh policy`));
    return false;
  }

  pauseBus();
  console.log('');
  console.log('  ' + theme.warning('🔒 Permission required'));
  console.log('  ' + theme.muted('action: ') + theme.white(action));
  console.log('  ' + theme.muted('detail: ') + theme.dim(details));
  const answer = await promptOnce('  ' + theme.primary('Allow? (y/n/always): '));
  resumeBus();

  const a = (answer || '').trim().toLowerCase();
  if (a === 'a' || a === 'always') {
    setPolicy(action, 'allow');
    console.log('  ' + theme.success('✓ ') + theme.muted(`policy "${action}" = allow`));
    return true;
  }
  return a === 'y' || a === 'yes';
}

function promptOnce(q) {
  return new Promise((resolve) => {
    if (process.stdin.isPaused()) process.stdin.resume();
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    let done = false;
    const finish = (v) => { if (done) return; done = true; try { rl.close(); } catch {} resolve(v); };
    rl.question(q, (ans) => finish(ans));
    setTimeout(() => finish(''), 5 * 60 * 1000);
  });
}
