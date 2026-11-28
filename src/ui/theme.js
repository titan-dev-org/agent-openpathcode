import chalk from 'chalk';

const mk = (hexFn) => {
  const fn = (...a) => hexFn(...a);
  fn.bold = (...a) => chalk.bold(hexFn(...a));
  fn.dim = (...a) => chalk.dim(hexFn(...a));
  return fn;
};

export const theme = {
  primary: mk(chalk.hex('#22D3EE')),
  primarySoft: mk(chalk.hex('#67E8F9')),
  secondary: mk(chalk.hex('#A78BFA')),
  secondarySoft: mk(chalk.hex('#C4B5FD')),
  success: mk(chalk.hex('#4ADE80')),
  warning: mk(chalk.hex('#FBBF24')),
  error: mk(chalk.hex('#F87171')),
  white: chalk.white,
  text: chalk.hex('#E2E8F0'),
  muted: mk(chalk.hex('#64748B')),
  mutedSoft: mk(chalk.hex('#94A3B8')),
  faint: mk(chalk.hex('#334155')),
  bold: chalk.bold,
  dim: chalk.dim,
  accent: mk(chalk.hex('#F472B6')),
};
