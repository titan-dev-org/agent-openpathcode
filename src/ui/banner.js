import gradient from 'gradient-string';
import { theme } from './theme.js';

export function printBanner(model, provider) {
  const line = theme.muted('─'.repeat(56));
  const title = gradient(['#00E5FF', '#7C4DFF', '#FF4081'])(' OPENPATHCODE ');
  console.log('');
  console.log('  ' + title + '  ' + theme.muted('v2.1.0'));
  console.log('  ' + theme.dim('AI agent for your terminal'));
  console.log('  ' + line);
  if (model) {
    console.log('  ' + theme.muted('model  ') + theme.primary(model) + theme.muted('  ·  ') + theme.secondary(provider?.name || '?'));
  } else {
    console.log('  ' + theme.warning('⚠ no model active'));
    console.log('  ' + theme.dim('  run /provider then /models'));
  }
  console.log('  ' + line);
  console.log('  ' + theme.dim('/help for commands  ·  exit to quit'));
  console.log('');
}
