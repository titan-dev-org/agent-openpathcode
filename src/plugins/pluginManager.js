import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { PLUGINS_DIR } from '../utils/workspace.js';
import { theme } from '../ui/theme.js';

export class PluginManager {
  constructor() { this.plugins = []; }

  async loadAll() {
    if (!fs.existsSync(PLUGINS_DIR)) return [];
    for (const f of fs.readdirSync(PLUGINS_DIR).filter((x) => x.endsWith('.js'))) {
      try {
        const mod = await import(pathToFileURL(path.join(PLUGINS_DIR, f)).href);
        const p = mod.default;
        if (p?.name && p?.hooks) this.plugins.push(p);
        else console.log('  ' + theme.warning('⚠ plugin ') + f + ' tidak valid');
      } catch (e) {
        console.log('  ' + theme.error('✗ plugin ') + f + ': ' + e.message);
      }
    }
    return this.plugins;
  }

  async emit(event, ctx) {
    for (const p of this.plugins) {
      const fn = p.hooks?.[event];
      if (typeof fn === 'function') {
        try { await fn(ctx); } catch (e) {
          console.log('  ' + theme.warning(`⚠ plugin ${p.name} ${event}: ${e.message}`));
        }
      }
    }
  }

  list() { return this.plugins.map((p) => ({ name: p.name, hooks: Object.keys(p.hooks || {}) })); }
}
