import chalk from 'chalk';

const mk = (c) => {
  const fn = (...a) => chalk.hex(c)(...a);
  fn.bold = (...a) => chalk.bold(chalk.hex(c)(...a));
  fn.dim = (...a) => chalk.dim(chalk.hex(c)(...a));
  return fn;
};

export const theme = {
  primary: mk('#00E5FF'),
  secondary: mk('#7C4DFF'),
  success: mk('#00E676'),
  warning: mk('#FFC400'),
  error: mk('#FF5252'),
  muted: mk('#78909C'),
  accent: mk('#FF4081'),
  white: chalk.white,
  bold: chalk.bold,
  dim: chalk.dim,
};
