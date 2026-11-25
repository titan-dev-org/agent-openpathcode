import fs from 'fs';
import path from 'path';
import { COMMANDS_DIR } from '../utils/workspace.js';
import YAML from 'yaml';

export class CustomCommandLoader {
  constructor() { this.cmds = new Map(); }

  loadAll() {
    if (!fs.existsSync(COMMANDS_DIR)) return [];
    for (const f of fs.readdirSync(COMMANDS_DIR).filter((x) => /\.ya?ml$/i.test(x))) {
      try {
        const cfg = YAML.parse(fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8'));
        if (cfg?.name && cfg?.prompt) this.cmds.set(cfg.name, cfg);
      } catch {}
    }
    return [...this.cmds.values()];
  }

  render(cmd, args) {
    let prompt = cmd.prompt || '';
    prompt = prompt.replace(/\{\{args\}\}/g, args.join(' '));
    prompt = prompt.replace(/\{\{(\d+)\}\}/g, (_, i) => args[Number(i)] || '');
    return prompt;
  }

  get(name) { return this.cmds.get(name); }
  list() { return [...this.cmds.values()]; }
}
