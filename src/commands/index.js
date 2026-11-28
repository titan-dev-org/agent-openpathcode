import { cmdProvider } from './provider.js';
import { cmdModels } from './models.js';
import { cmdUse } from './use.js';
import { cmdSessions } from './sessions.js';
import { cmdRemove } from './remove.js';
import { cmdHelp } from './help.js';
import { cmdUsage } from './usage.js';
import { cmdPermissions } from './permissions.js';
import { cmdSettings } from './settings.js';
import { undo, redo } from '../undo/snapshot.js';
import { log } from '../utils/logger.js';
import { theme } from '../ui/theme.js';
import { MultiSession } from '../session/multiSession.js';
import { providers } from '../db/database.js';

export async function handleCommand(line, tui) {
  const [cmd, ...args] = line.slice(1).split(/\s+/);
  switch (cmd) {
    case 'help':        return cmdHelp(tui);
    case 'provider':    return cmdProvider(args, tui);
    case 'models':      return cmdModels(args, tui);
    case 'use':         return cmdUse(args, tui);
    case 'remove':
    case 'rm':          return cmdRemove(args, tui);
    case 'sessions':    return cmdSessions(args, tui);
    case 'usage':       return cmdUsage();
    case 'permissions': return cmdPermissions(args);
    case 'settings':    return cmdSettings(args, tui);
    case 'new':         tui.resetSession(); console.log('  ' + theme.success('✓ ') + 'new session'); return;
    case 'clear':       tui.clearScreen(); return;
    case 'undo':        { const r = undo(); return r.ok ? log.success(r.msg) : log.warn(r.msg); }
    case 'redo':        { const r = redo(); return r.ok ? log.success(r.msg) : log.warn(r.msg); }
    case 'plugins':     return runPlugins(tui);
    case 'skills':      return runSkills(tui);
    case 'skill':       return runSkill(tui, args);
    case 'agents':      return runAgents(tui, args);
    case 'parallel':    return runParallel(tui, args);
    case 'exit':
    case 'quit':        process.exit(0);
    default: {
      const custom = tui.customCommands?.get(cmd);
      if (custom) {
        if (!tui.currentModel) return log.warn('Pilih model dulu dengan /models');
        const prompt = tui.customCommands.render(custom, args);
        await tui.runAgent(prompt);
        return;
      }
      console.log(`  ${theme.error('✗')} Unknown command /${cmd}. Type /help`);
    }
  }
}

function runPlugins(tui) {
  const l = tui.plugins?.list() || [];
  if (!l.length) return log.warn('Belum ada plugin di openpathcode-app/plugins/');
  for (const p of l) log.info(`${p.name}  [${p.hooks.join(', ')}]`);
}
function runSkills(tui) {
  const l = tui.skills?.list() || [];
  if (!l.length) return log.warn('Belum ada skill di openpathcode-app/skills/');
  for (const s of l) log.info(`${s.name} — ${s.description}`);
}
function runSkill(tui, args) {
  if (!args[0]) return log.warn('Usage: /skill <name>  (atau /skill off)');
  if (args[0] === 'off') { tui.activeSkill = null; return log.success('Skill dimatikan'); }
  const s = tui.skills?.get(args[0]);
  if (!s) return log.error(`Skill "${args[0]}" tidak ada`);
  tui.activeSkill = s;
  log.success(`Active skill: ${s.name}`);
}
function runAgents(tui, args) {
  const l = tui.agentRegistry?.list() || [];
  if (!l.length) return log.warn('Belum ada agent di openpathcode-app/agents/');
  if (args[0] === 'off') { tui.activeCustomAgent = null; return log.success('Custom agent dimatikan'); }
  if (args[0]) {
    const a = tui.agentRegistry.get(args[0]);
    if (!a) return log.error(`Agent "${args[0]}" tidak ada`);
    tui.activeCustomAgent = a;
    if (a.model && a.model.trim()) {
      const p = providers.findByName(a.model);
      if (p) tui.setModel(p.model, p);
    }
    return log.success(`Active agent: ${a.name}`);
  }
  for (const n of l) log.info(n);
  log.dim('Aktifkan: /agents <name> | Matikan: /agents off');
}
async function runParallel(tui, args) {
  if (args.length < 1) return log.warn('Usage: /parallel "prompt1" "prompt2" ...');
  if (!tui.currentModel) return log.warn('Pilih model dulu');
  log.info(`Menjalankan ${args.length} task paralel…`);
  const ms = new MultiSession();
  const results = await ms.spawnParallel(args, { provider: tui.provider, model: tui.currentModel });
  for (const r of results) {
    console.log('');
    console.log('  ' + theme.primary.bold(`◆ Result: ${r.prompt.slice(0, 50)}`));
    console.log('  ' + theme.white((r.output || r.error || '').slice(0, 800)));
  }
}
