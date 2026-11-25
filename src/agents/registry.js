import fs from 'fs';
import path from 'path';
import { AGENTS_DIR } from '../utils/workspace.js';
import YAML from 'yaml';

export class AgentRegistry {
  constructor() { this.agents = new Map(); }

  loadAll() {
    if (!fs.existsSync(AGENTS_DIR)) return [];
    for (const f of fs.readdirSync(AGENTS_DIR).filter((x) => /\.ya?ml$/i.test(x))) {
      try {
        const cfg = YAML.parse(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'));
        if (cfg?.name && cfg?.system) {
          this.agents.set(cfg.name, {
            name: cfg.name,
            model: cfg.model || null,
            tools: Array.isArray(cfg.tools) ? cfg.tools : null,
            system: cfg.system,
          });
        }
      } catch {}
    }
    return [...this.agents.values()];
  }

  get(name) { return this.agents.get(name); }
  list() { return [...this.agents.values()].map((a) => a.name); }
}
