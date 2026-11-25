import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import readline from 'readline';
import { PROJECTS_DIR, safeResolve } from '../utils/workspace.js';
import { askPermission } from '../permissions/policy.js';
import { snapshotFile } from '../undo/snapshot.js';
import { theme } from '../ui/theme.js';
import { gitPush } from '../git/gitPush.js';

export const TOOL_SCHEMAS = [
  { type:'function', function:{ name:'list_files', description:'List files in project', parameters:{ type:'object', properties:{ project:{type:'string'}, subfolder:{type:'string'} }, required:['project'] } } },
  { type:'function', function:{ name:'read_file', description:'Read file', parameters:{ type:'object', properties:{ project:{type:'string'}, path:{type:'string'} }, required:['project','path'] } } },
  { type:'function', function:{ name:'write_file', description:'Write/create file', parameters:{ type:'object', properties:{ project:{type:'string'}, path:{type:'string'}, content:{type:'string'} }, required:['project','path','content'] } } },
  { type:'function', function:{ name:'edit_file', description:'Replace snippet', parameters:{ type:'object', properties:{ project:{type:'string'}, path:{type:'string'}, find:{type:'string'}, replace:{type:'string'} }, required:['project','path','find','replace'] } } },
  { type:'function', function:{ name:'run_command', description:'Run shell command', parameters:{ type:'object', properties:{ project:{type:'string'}, command:{type:'string'} }, required:['project','command'] } } },
  { type:'function', function:{ name:'git_push', description:'Push project to GitHub', parameters:{ type:'object', properties:{ project:{type:'string'}, repo_url:{type:'string'}, branch:{type:'string'} }, required:['project','repo_url'] } } },
];

export async function executeTool(name, args) {
  const pd = safeResolve(PROJECTS_DIR, args.project);
  switch (name) {
    case 'list_files': {
      const base = args.subfolder ? safeResolve(pd, args.subfolder) : pd;
      if (!fs.existsSync(base)) return { error: 'folder not found' };
      return { files: walk(base, base) };
    }
    case 'read_file': {
      const p = safeResolve(pd, args.path);
      if (!fs.existsSync(p)) return { error: 'file not found' };
      return { content: fs.readFileSync(p, 'utf8') };
    }
    case 'write_file': {
      const p = safeResolve(pd, args.path);
      if (fs.existsSync(p)) snapshotFile(p);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, args.content, 'utf8');
      return { success: true, path: p };
    }
    case 'edit_file': {
      const p = safeResolve(pd, args.path);
      if (!fs.existsSync(p)) return { error: 'file not found' };
      const src = fs.readFileSync(p, 'utf8');
      if (!src.includes(args.find)) return { error: 'find text not found' };
      snapshotFile(p);
      fs.writeFileSync(p, src.replace(args.find, args.replace), 'utf8');
      return { success: true };
    }
    case 'run_command': {
      const ok = await askPermission('run_command', args.command);
      if (!ok) return { error: 'permission denied' };
      try { return { output: execSync(args.command, { cwd: pd, encoding: 'utf8', timeout: 60000, stdio: 'pipe' }) }; }
      catch (e) { return { error: e.message, stderr: e.stderr?.toString() }; }
    }
    case 'git_push': {
      const ok = await askPermission('git_push', `push ${args.project} → ${args.repo_url}`);
      if (!ok) return { error: 'permission denied' };
      const token = await askToken();
      if (!token) return { error: 'no token' };
      return await gitPush(pd, args.repo_url, token, args.branch || 'main');
    }
    default: return { error: `unknown tool: ${name}` };
  }
}

function walk(root, dir, prefix = '') {
  const out = [];
  for (const e of fs.readdirSync(dir)) {
    if (e === '.git' || e === 'node_modules') continue;
    const full = path.join(dir, e), rel = path.join(prefix, e).replace(/\\/g,'/');
    if (fs.statSync(full).isDirectory()) { out.push(rel + '/'); out.push(...walk(root, full, rel)); }
    else out.push(rel);
  }
  return out;
}

async function askToken() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(theme.warning('\n🔑 GitHub Token (repo scope):'));
    rl.question(theme.primary('   Token: '), (t) => { rl.close(); resolve(t.trim()); });
  });
}
