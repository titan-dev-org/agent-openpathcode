import readline from 'readline';
import { printBanner } from './banner.js';
import { theme } from './theme.js';
import { handleCommand } from '../commands/index.js';
import { Agent } from '../agent/agent.js';
import { v4 as uuidv4 } from 'uuid';
import { sessions, messages } from '../db/database.js';
import { PluginManager } from '../plugins/pluginManager.js';
import { SkillLoader } from '../skills/skillLoader.js';
import { AgentRegistry } from '../agents/registry.js';
import { CustomCommandLoader } from '../commands/customLoader.js';
import { setBusReadline } from './readlineBus.js';

export class TUI {
  constructor() {
    this.rl = null;
    this.agent = null;
    this.currentSession = null;
    this.currentModel = null;
    this.provider = null;
    this.preloadedMCP = null;
    this.mcpStatuses = [];
    this.plugins = null;
    this.skills = null;
    this.agentRegistry = null;
    this.customCommands = null;
    this.activeCustomAgent = null;
    this.activeSkill = null;
    this._paused = false;
    this._exiting = false;
    this._rebuilding = false;
    this._busy = false;          // ← KUNCI: cegah input ganda
  }

  clearScreen() { process.stdout.write('\x1B[2J\x1B[3J\x1B[H'); }
  ask(q) { return new Promise((r) => this.rl.question(q, r)); }
  promptString() { return theme.primary('▸ '); }

  buildReadline() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.promptString(),
      historySize: 200,
      terminal: true,
    });
    rl.on('close', () => {
      if (this._exiting) { console.log(theme.muted('\n  bye\n')); process.exit(0); }
      if (this._paused || this._rebuilding) return;
      this._rebuilding = true;
      setTimeout(() => {
        try { this.rl = this.buildReadline(); setBusReadline(this.rl); this.rl.prompt(); } catch {}
        this._rebuilding = false;
      }, 20);
    });
    rl.on('line', (input) => this._handleLine(input));
    setBusReadline(rl);
    return rl;
  }

  async start() {
    this.clearScreen();

    this.plugins = new PluginManager(); await this.plugins.loadAll();
    this.skills = new SkillLoader(); this.skills.loadAll();
    this.agentRegistry = new AgentRegistry(); this.agentRegistry.loadAll();
    this.customCommands = new CustomCommandLoader(); this.customCommands.loadAll();

    printBanner(this.currentModel, this.provider);

    if (this.mcpStatuses.length) {
      console.log('  ' + theme.muted('mcp'));
      for (const s of this.mcpStatuses) {
        console.log(
          '  ' +
          (s.ok ? theme.success('  ● ') : theme.error('  ○ ')) +
          theme.text(s.name) +
          (s.ok ? theme.muted(`  ${s.toolCount} tools`) : theme.muted(`  ${(s.error || '').slice(0, 40)}`))
        );
      }
      console.log('');
    }

    const pl = this.plugins.list().length, sk = this.skills.list().length, ag = this.agentRegistry.list().length, cc = this.customCommands.list().length;
    if (pl || sk || ag || cc) {
      console.log('  ' + theme.muted('extensions  ') + theme.mutedSoft(`plugins=${pl} skills=${sk} agents=${ag} cmds=${cc}`));
      console.log('');
    }

    await this.plugins.emit('onStart', { tui: this });
    process.stdin.resume();
    this.rl = this.buildReadline();
    setBusReadline(this.rl);
    this.rl.prompt();
  }

  async _handleLine(input) {
    const line = input.trim();

    // ===== KUNCI: kalau sedang sibuk, abaikan input =====
    if (this._busy) {
      // Jangan prompt; user sedang menunggu AI
      return;
    }

    if (line === 'exit' || line === 'quit') {
      this._exiting = true;
      await this.plugins.emit('onExit', { tui: this });
      console.log(theme.muted('\n  bye\n'));
      process.exit(0);
    }
    if (!line) { if (!this._paused) this.rl.prompt(); return; }

    if (line.startsWith('/')) {
      // Command juga harus busy-guarded
      this._busy = true;
      this._paused = true;
      this.rl.pause();
      try { await handleCommand(line, this); }
      catch (e) { console.log('  ' + theme.error('│ ') + theme.error(e.message)); }
      finally { this._paused = false; this._busy = false; }
      if (!this._exiting) this.rl.resume();
      if (!this._exiting) this.rl.prompt();
      return;
    }

    if (!this.currentModel) {
      console.log('  ' + theme.warning('│ ') + theme.warning('no model selected'));
      console.log('  ' + theme.warning('│ ') + theme.muted('run /provider then /models'));
      return this.rl.prompt();
    }

    // ===== BLOKIR INPUT SELAMA AI PROSES =====
    this._busy = true;
    this._paused = true;
    this.rl.pause();

    try { await this.runAgent(line); }
    catch (e) { console.log('  ' + theme.error('│ ') + theme.error(e.message)); }
    finally { this._paused = false; this._busy = false; }

    if (!this._exiting) {
      this.rl.resume();
      this.rl.prompt();
    }
  }

  async runAgent(userInput) {
    if (!this.currentSession) {
      const sid = uuidv4();
      sessions.create(sid, userInput.slice(0, 50), this.currentModel, this.provider?.id || null);
      this.currentSession = { id: sid };
      messages.add(sid, 'user', userInput);
    } else {
      messages.add(this.currentSession.id, 'user', userInput);
      sessions.touch(this.currentSession.id);
    }
    if (!this.agent) {
      this.agent = new Agent({
        provider: this.provider,
        model: this.currentModel,
        sessionId: this.currentSession.id,
        mcp: this.preloadedMCP,
        plugins: this.plugins,
        skills: this.skills,
        customAgent: this.activeCustomAgent,
        activeSkill: this.activeSkill,
      });
    } else {
      this.agent.setModel(this.currentModel, this.provider);
      this.agent.sessionId = this.currentSession.id;
      this.agent.customAgent = this.activeCustomAgent;
      this.agent.activeSkill = this.activeSkill;
    }
    await this.agent.run(userInput);
  }

  setModel(model, provider) {
    this.currentModel = model;
    this.provider = provider;
    if (this.agent) this.agent.setModel(model, provider);
  }
  resetSession() { this.agent = null; this.currentSession = null; }
}
