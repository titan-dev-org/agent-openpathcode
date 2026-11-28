import { getPolicy, setPolicy } from '../permissions/policy.js';
import { makeTable } from '../ui/table.js';
import { theme } from '../ui/theme.js';
import { log } from '../utils/logger.js';

const ACTIONS = ['read_file', 'write_file', 'edit_file', 'list_files', 'run_command', 'git_push'];

export async function cmdPermissions(args = []) {
  if (args.length >= 2) {
    const [a, r] = args;
    if (!['allow', 'ask', 'deny'].includes(r)) return log.error('Rule: allow | ask | deny');
    setPolicy(a, r);
    return log.success(`Policy "${a}" = ${r}`);
  }
  const t = makeTable(['Action', 'Rule']);
  for (const a of ACTIONS) t.push([theme.white(a), theme.primary(getPolicy(a))]);
  console.log(t.toString());
  log.dim('Set: /permissions <action> <allow|ask|deny>');
}
