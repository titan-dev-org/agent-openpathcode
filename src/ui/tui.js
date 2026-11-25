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
  }

  clearScreen() { process.stdout.write('\x1B[2J\x1B[3J\x1B[H'); }
  ask(q) { return new Promise((r) => this.rl.question(q, r)); }

  buildReadline() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: theme.primary('❯ '), historySize: 200, terminal: true });
    rl.on('close', () => {
      if (this._exiting) { console.log(theme.muted('\n  goodbye\n')); process.exit(0); }
      if (this._paused || this._rebuilding) return;
      this._rebuilding = true;
      setTimeout(() => { try { this.rl = this.buildReadline(); this.rl.prompt(); } catch {} this._rebuilding = false; }, 20);
    });
    rl.on('line', (input) => this._handleLine(input));
    return rl;
  }

  async start() {
    this.clearScreen();
    printBanner(this.currentModel, this.provider);

    this.plugins = new PluginManager(); await this.plugins.loadAll();
    this.skills = new SkillLoader(); this.skills.loadAll();
    this.agentRegistry = new AgentRegistry(); this.agentRegistry.loadAll();
    this.customCommands = new CustomCommandLoader(); this.customCommands.loadAll();

    if (this.mcpStatuses.length) {
      console.log('  ' + theme.muted('· MCP:'));
      for (const s of this.mcpStatuses) {
        console.log('    ' + (s.ok ? theme.success('✓ ') : theme.error('✗ ')) + theme.white(s.name) +
          (s.ok ? theme.muted(` (${s.toolCount} tools)`) : theme.muted(` — ${(s.error||'').slice(0,50)}`)));
      }
    }
    const pl = this.plugins.list().length, sk = this.skills.list().length, ag = this.agentRegistry.list().length, cc = this.customCommands.list().length;
    if (pl || sk || ag || cc) console.log('  ' + theme.muted(`· plugins=${pl} skills=${sk} agents=${ag} commands=${cc}`));
    console.log('');

    await this.plugins.emit('onStart', { tui: this });
    process.stdin.resume();
    this.rl = this.buildReadline();
    this.rl.prompt();
  }

  async _handleLine(input) {
    const line = input.trim();
    if (line === 'exit' || line === 'quit') {
      this._exiting = true;
      await this.plugins.emit('onExit', { tui: this });
      console.log(theme.muted('\n  goodbye\n'));
      process.exit(0);
    }
    if (!line) { if (!this._paused) this.rl.prompt(); return; }
    if (line.startsWith('/')) {
      try { this._paused = true; await handleCommand(line, this); }
      catch (e) { console.log('  ' + theme.error('✗ ') + theme.error(e.message)); }
      finally { this._paused = false; }
      if (!this._exiting) this.rl.prompt();
      return;
    }
    if (!this.currentModel) {
      console.log('  ' + theme.warning('⚠ ') + theme.warning('Pilih model dulu dengan /models'));
      return this.rl.prompt();
    }
    try { await this.runAgent(line); }
    catch (e) { console.log('  ' + theme.error('✗ ') + theme.error(e.message)); }
    if (!this._exiting) this.rl.prompt();
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
      this.agent = new Agent({ provider: this.provider, model: this.currentModel, sessionId: this.currentSession.id, mcp: this.preloadedMCP, plugins: this.plugins, skills: this.skills, customAgent: this.activeCustomAgent, activeSkill: this.activeSkill });
    } else {
      this.agent.provider = this.provider;
      this.agent.model = this.currentModel;
      this.agent.sessionId = this.currentSession.id;
      this.agent.customAgent = this.activeCustomAgent;
      this.agent.activeSkill = this.activeSkill;
    }
    await this.agent.run(userInput);
  }

  setModel(model, provider) { this.currentModel = model; this.provider = provider; }
  resetSession() { this.agent = null; this.currentSession = null; }
}
