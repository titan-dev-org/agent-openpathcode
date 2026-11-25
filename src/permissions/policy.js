import { getDB } from '../db/database.js';
import readline from 'readline';
import { theme } from '../ui/theme.js';

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
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log('');
    console.log('  ' + theme.warning('🔒 Permission required'));
    console.log('  ' + theme.muted('action: ') + theme.white(action));
    console.log('  ' + theme.muted('detail: ') + theme.dim(details));
    rl.question('  ' + theme.primary('Allow? (y/n/always): '), (ans) => {
      rl.close();
      const a = ans.trim().toLowerCase();
      if (a === 'a' || a === 'always') {
        setPolicy(action, 'allow');
        console.log('  ' + theme.success('✓ ') + theme.muted(`policy "${action}" = allow`));
        resolve(true);
      } else resolve(a === 'y' || a === 'yes');
    });
  });
}
