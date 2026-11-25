import fs from 'fs';
import path from 'path';

export const WORKSPACE_ROOT = path.join(process.cwd(), 'openpathcode-app');
export const PROJECTS_DIR = path.join(WORKSPACE_ROOT, 'projects');
export const DB_DIR = path.join(WORKSPACE_ROOT, 'db');
export const SESSIONS_DIR = path.join(WORKSPACE_ROOT, 'sessions');
export const LOGS_DIR = path.join(WORKSPACE_ROOT, 'logs');
export const PLUGINS_DIR = path.join(WORKSPACE_ROOT, 'plugins');
export const AGENTS_DIR = path.join(WORKSPACE_ROOT, 'agents');
export const SKILLS_DIR = path.join(WORKSPACE_ROOT, 'skills');
export const COMMANDS_DIR = path.join(WORKSPACE_ROOT, 'commands');
export const SNAPSHOTS_DIR = path.join(WORKSPACE_ROOT, 'snapshots');

export async function ensureWorkspace() {
  const all = [WORKSPACE_ROOT, PROJECTS_DIR, DB_DIR, SESSIONS_DIR, LOGS_DIR,
    PLUGINS_DIR, AGENTS_DIR, SKILLS_DIR, COMMANDS_DIR, SNAPSHOTS_DIR,
    path.join(SNAPSHOTS_DIR, 'files')];
  for (const d of all) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

export function safeResolve(baseDir, targetPath) {
  const resolved = path.resolve(baseDir, targetPath);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase + path.sep) && resolved !== normalizedBase) {
    throw new Error(`Access denied: ${targetPath} is outside workspace`);
  }
  return resolved;
}

export function listProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];
  return fs.readdirSync(PROJECTS_DIR)
    .filter((f) => fs.statSync(path.join(PROJECTS_DIR, f)).isDirectory());
}
