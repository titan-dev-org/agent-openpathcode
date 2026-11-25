import { providers } from '../db/database.js';
import { log } from '../utils/logger.js';

export async function cmdUse(args, tui) {
  const name = args.join(' ').trim();
  if (!name) return log.warn('Usage: /use <model>');
  const p = providers.findByName(name);
  if (!p) return log.error(`Model "${name}" tidak ada`);
  tui.setModel(p.model, p);
  log.success(`Now using: ${p.model}`);
}
