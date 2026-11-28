import fs from 'fs';
import path from 'path';
import { WORKSPACE_ROOT } from '../utils/workspace.js';

const FILE = path.join(WORKSPACE_ROOT, 'settings.json');

const DEFAULTS = {
  maxTokens: 4096,
  temperature: 0.2,
  topP: 1.0,
};

let cache = null;

function load() {
  if (cache) return cache;
  try {
    if (fs.existsSync(FILE)) {
      cache = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
      return cache;
    }
  } catch {}
  cache = { ...DEFAULTS };
  return cache;
}

function save(s) {
  cache = s;
  try {
    if (!fs.existsSync(WORKSPACE_ROOT)) fs.mkdirSync(WORKSPACE_ROOT, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
  } catch {}
}

export const settings = {
  get: () => load(),
  getValue: (k) => load()[k],
  set: (k, v) => { const s = load(); s[k] = v; save(s); },
  setMany: (obj) => { const s = { ...load(), ...obj }; save(s); },
  reset: () => { cache = { ...DEFAULTS }; save(cache); },
  all: () => load(),
  defaults: () => ({ ...DEFAULTS }),
};
