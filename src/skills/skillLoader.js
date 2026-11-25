import fs from 'fs';
import path from 'path';
import { SKILLS_DIR } from '../utils/workspace.js';

export class SkillLoader {
  constructor() { this.skills = new Map(); }

  loadAll() {
    if (!fs.existsSync(SKILLS_DIR)) return [];
    for (const dir of fs.readdirSync(SKILLS_DIR)) {
      const full = path.join(SKILLS_DIR, dir);
      if (!fs.statSync(full).isDirectory()) continue;
      const md = path.join(full, 'SKILL.md');
      if (!fs.existsSync(md)) continue;
      const raw = fs.readFileSync(md, 'utf8');
      let name = dir, description = '', body = raw;
      const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (fm) {
        for (const line of fm[1].split('\n')) {
          const [k, ...v] = line.split(':');
          const val = v.join(':').trim();
          if (k?.trim() === 'name') name = val;
          if (k?.trim() === 'description') description = val;
        }
        body = fm[2].trim();
      }
      this.skills.set(name, { name, description, body });
    }
    return [...this.skills.values()];
  }

  get(name) { return this.skills.get(name); }
  list() { return [...this.skills.values()]; }
}
