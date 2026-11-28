import fetch from 'node-fetch';
import { SYSTEM_PROMPT } from './prompt.js';
import { TOOL_SCHEMAS, executeTool } from './tools.js';
import { TokenOptimizer } from './tokenOptimizer.js';
import { messages as msgRepo, usage } from '../db/database.js';
import { theme } from '../ui/theme.js';
import { Spinner } from '../ui/spinner.js';
import { MCPManager } from '../mcp/mcpClient.js';
import { settings } from '../settings/settings.js';

export class Agent {
  constructor({ provider, model, sessionId, mcp, plugins, skills, customAgent, activeSkill }) {
    this.provider = provider;
    this.model = model;
    this.sessionId = sessionId;
    this.mcp = mcp || new MCPManager();
    this.mcpLoaded = !!mcp;
    this.spinner = new Spinner();
    this.plugins = plugins;
    this.skills = skills;
    this.customAgent = customAgent;
    this.activeSkill = activeSkill;
    this.version = 0;
  }

  setModel(model, provider) {
    this.model = model;
    this.provider = provider;
    this.version += 1;
  }

  buildSystemPrompt() {
    let p = this.customAgent?.system || SYSTEM_PROMPT;
    if (this.activeSkill) p += `\n\nACTIVE SKILL: ${this.activeSkill.name}\n${this.activeSkill.body}\n`;
    return p;
  }

  getTools() {
    let all = [...TOOL_SCHEMAS, ...this.mcp.getTools()];
    if (this.customAgent?.tools?.length) {
      const allow = new Set(this.customAgent.tools);
      all = all.filter((t) => allow.has(t.function.name));
    }
    return all;
  }

  async run(userInput) {
    const snapshotModel = this.model;
    const snapshotProvider = this.provider;
    const s = { ...settings.all() };

    if (!this.mcpLoaded) { await this.mcp.loadServers().catch(() => {}); this.mcpLoaded = true; }
    if (this.plugins) await this.plugins.emit('onUserMessage', { text: userInput, sessionId: this.sessionId });

    const tools = this.getTools();
    const rows = msgRepo.list(this.sessionId);
    const dbHistory = rows
      .filter((m) => m.role !== 'tool' || m.content)
      .map((m) => {
        const base = { role: m.role, content: m.content ?? '' };
        if (m.role === 'tool') base.tool_call_id = m.tool_call_id || 'call_unknown';
        if (m.tool_calls) { try { base.tool_calls = JSON.parse(m.tool_calls); } catch {} }
        return base;
      });
    let history = [{ role: 'system', content: this.buildSystemPrompt() }, ...dbHistory];
    history = TokenOptimizer.compressMessages(history, 20);

    let iter = 0;
    while (iter < 8) {
      iter++;
      this.spinner.start(iter === 1 ? 'thinking' : `step ${iter}`);
      const res = await this.callLLM(history, tools, { model: snapshotModel, provider: snapshotProvider, settings: s });
      this.spinner.stop();
      await new Promise((r) => setTimeout(r, 20));
      if (!res) return;

      const msg = res.choices[0].message;
      const tin = res.usage?.prompt_tokens || TokenOptimizer.estimateTokens(JSON.stringify(history));
      const tout = res.usage?.completion_tokens || TokenOptimizer.estimateTokens(msg.content || '');
      usage.add(snapshotModel, snapshotProvider?.name || 'unknown', tin, tout);

      if (msg.content) {
        this.renderAI(msg.content, snapshotModel);
        if (this.plugins) await this.plugins.emit('onAIResponse', { text: msg.content, sessionId: this.sessionId });
        msgRepo.add(this.sessionId, 'assistant', msg.content, tin, tout, null, msg.tool_calls || null);
        history.push({ role: 'assistant', content: msg.content, ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}) });
      }

      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          const name = tc.function.name;
          let args = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}
          this.renderTool(name, args);
          if (this.plugins) await this.plugins.emit('onBeforeTool', { name, args });

          let result;
          try {
            if (name.startsWith('mcp__')) result = await this.mcp.callTool(name, args);
            else result = await executeTool(name, args);
          } catch (e) { result = { error: e.message }; }

          if (this.plugins) await this.plugins.emit('onAfterTool', { name, args, result });
          const content = typeof result === 'string' ? result : JSON.stringify(result);
          const safe = content && content.length ? content : '{"ok":true}';
          history.push({ role: 'tool', tool_call_id: tc.id || 'call_unknown', content: TokenOptimizer.truncateContent(safe) });
          msgRepo.add(this.sessionId, 'tool', safe.slice(0, 4000), 0, 0, tc.id || 'call_unknown', null);
        }
        continue;
      }

      const total = msgRepo.count(this.sessionId);
      console.log('  ' + theme.faint('· ') + theme.muted(`${total} msg`) + theme.faint('  ·  ') + theme.muted(`${tin + tout} tok`) + theme.faint('  ·  ') + theme.primarySoft(snapshotModel));
      console.log('');
      return;
    }
    this.spinner.stop();
  }

  renderAI(text, model) {
    const bar = theme.primary('│');
    const lines = text.split('\n');
    const tag = theme.muted('ai') + theme.faint(' · ') + theme.primarySoft(model || this.model);
    console.log('');
    console.log('  ' + tag);
    for (const ln of lines) console.log('  ' + bar + '  ' + theme.text(ln));
    console.log('');
  }

  renderTool(name, args) {
    const argStr = Object.entries(args || {}).map(([k, v]) => {
      let x = typeof v === 'string' ? v : JSON.stringify(v);
      if (x.length > 50) x = x.slice(0, 47) + '…';
      return `${theme.muted(k)}=${theme.mutedSoft(x.replace(/\n/g, '⏎'))}`;
    }).join(' ');
    console.log('  ' + theme.secondary('▸ ') + theme.secondarySoft(name) + (argStr ? '  ' + argStr : ''));
  }

  async callLLM(history, tools, ctx) {
    const { model, provider, settings: s } = ctx;
    const endpoint = provider.endpoint.replace(/\/$/, '') + '/chat/completions';
    const body = {
      model,
      messages: history,
      tools: tools.length ? tools : undefined,
      tool_choice: tools.length ? 'auto' : undefined,
      temperature: s.temperature,
      top_p: s.topP,
      max_tokens: s.maxTokens,
    };
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.api_key}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      this.spinner.stop();
      const txt = await r.text();
      console.log('');
      console.log('  ' + theme.error('│ ') + theme.error.bold(`API ${r.status}`) + theme.muted(`  ·  ${model}`));
      console.log('  ' + theme.error('│ ') + theme.muted(txt.slice(0, 300)));
      console.log('');
      return null;
    }
    return await r.json();
  }
}
