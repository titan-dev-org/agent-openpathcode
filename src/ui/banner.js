import { theme } from './theme.js';
import { settings } from '../settings/settings.js';

const BIG = `
 ██████╗ ██████╗ ███████╗███╗   ██╗██████╗  █████╗ ████████╗██╗  ██╗
██╔═══██╗██╔══██╗██╔════╝████╗  ██║██╔══██╗██╔══██╗╚══██╔══╝██║  ██║
██║   ██║██████╔╝█████╗  ██╔██╗ ██║██████╔╝███████║   ██║   ███████║
██║   ██║██╔═══╝ ██╔══╝  ██║╚██╗██║██╔═══╝ ██╔══██║   ██║   ██╔══██║
╚██████╔╝██║     ███████╗██║ ╚████║██║     ██║  ██║   ██║   ██║  ██║
 ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝

 ██████╗ ██████╗ ██████╗ ███████╗
██╔════╝██╔═══██╗██╔══██╗██╔════╝
██║     ██║   ██║██║  ██║█████╗
██║     ██║   ██║██║  ██║██╔══╝
╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
`;

export function printBanner(model, provider, sessionInfo = null) {
  const st = settings.all();
  const w = Math.min(process.stdout.columns || 80, 100);

  console.log('');
  for (const line of BIG.trim().split('\n')) {
    console.log('  ' + theme.white(line));
  }
  console.log('');

  console.log(
    '  ' +
    theme.muted('v2.2') + '  ' +
    theme.muted('·') + '  ' +
    theme.dim('AI agent for your terminal')
  );
  console.log('  ' + theme.faint('─'.repeat(w - 4)));
  console.log('');

  if (model) {
    console.log(
      '  ' +
      theme.muted('model    ') +
      theme.primary(model) +
      '  ' + theme.muted('·') + '  ' +
      theme.secondary(provider?.name || '?')
    );
  } else {
    console.log('  ' + theme.warning('⚠ ') + theme.warning('no model active'));
    console.log('  ' + theme.muted('  run ') + theme.primary('/provider') + theme.muted(' then ') + theme.primary('/models'));
  }

  console.log(
    '  ' +
    theme.muted('tokens   ') + theme.text(String(st.maxTokens)) + '  ' +
    theme.muted('·') + '  ' +
    theme.muted('temp ') + theme.text(String(st.temperature)) + '  ' +
    theme.muted('·') + '  ' +
    theme.muted('topP ') + theme.text(String(st.topP))
  );

  if (sessionInfo) {
    console.log('  ' + theme.muted('session  ') + theme.mutedSoft(sessionInfo));
  }

  console.log('');
  console.log(
    '  ' +
    theme.muted('/help') + '  ' +
    theme.faint('·') + '  ' +
    theme.muted('exit') + '  ' +
    theme.faint('·') + '  ' +
    theme.muted('Ctrl+C')
  );
  console.log('');
}
