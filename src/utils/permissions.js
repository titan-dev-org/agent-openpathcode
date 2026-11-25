import readline from 'readline';
import { theme } from '../ui/theme.js';

export async function askPermission(action, details) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(theme.warning(`\n[!] Permission required:`));
    console.log(theme.white(`   Action: ${action}`));
    console.log(theme.muted(`   ${details}\n`));
    rl.question(theme.primary('   Allow? (y/N): '), (ans) => {
      rl.close();
      const a = ans.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });
}
