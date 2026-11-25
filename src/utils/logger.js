import { theme } from '../ui/theme.js';

export const log = {
  info: (m) => console.log('  ' + theme.primary('· ') + m),
  success: (m) => console.log('  ' + theme.success('✓ ') + m),
  warn: (m) => console.log('  ' + theme.warning('⚠ ') + m),
  error: (m) => console.log('  ' + theme.error('✗ ') + m),
  dim: (m) => console.log('  ' + theme.muted(m)),
};
