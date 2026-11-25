import fetch from 'node-fetch';
import { SYSTEM_PROMPT } from './prompt.js';
import { TOOL_SCHEMAS, executeTool } from './tools.js';
import { TokenOptimizer } from './tokenOptimizer.js';
import { messages as msgRepo, usage } from '../db/database.js';
import { theme } from '../ui/theme.js';
import { Spinner } from '../ui/spinner.js';
import { MCPManager } from '../mcp/mcpClient.js';

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
  }

  buildSystemPrompt() {
    let p = this.customAgent?.system || SYSTEM_PROMPT;
    if (this.activeSkill) {
      p += `\n\nACTIVE SKILL: ${this.activeSkill.name}\n${this.activeSkill.body}\n`;
    }
    return p;
  }

  getTools() {
    const builtin = TOOL_SCHEMAS;
    const mcpTools = this.mcp.getTools();
    let all = [...builtin, ...mcpTools];
    if (this.customAgent?.tools && Array.isArray(this.customAgent.tools) && this.customAgent.tools.length) {
      const allow = new Set(this.customAgent.tools);
      all = all.filter((t) => allow.has(t.function.name));
    }
    return all;
  }

  async run(userInput) {
    if (!this.mcpLoaded) {
      await this.mcp.loadServers().catch(() => {});
      this.mcpLoaded = true;
    }
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
      this.spinner.start(iter === 1 ? 'Thinking' : `Processing (${iter})`);
      const res = await this.callLLM(history, tools);
      this.spinner.stop();
      if (!res) return;

      const msg = res.choices[0].message;
      const tin = res.usage?.prompt_tokens || TokenOptimizer.estimateTokens(JSON.stringify(history));
      const tout = res.usage?.completion_tokens || TokenOptimizer.estimateTokens(msg.content || '');
      usage.add(this.model, this.provider?.name || 'unknown', tin, tout);

      if (msg.content) {
        this.renderAI(msg.content);
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

          this.spinner.start(`Running ${name}`);
          let result;
          try {
            if (name.startsWith('mcp__')) result = await this.mcp.callTool(name, args);
            else result = await executeTool(name, args);
          } catch (e) { result = { error: e.message }; }
          this.spinner.stop();

          if (this.plugins) await this.plugins.emit('onAfterTool', { name, args, result });
          const content = typeof result === 'string' ? result : JSON.stringify(result);
          const safe = content && content.length ? content : '{"ok":true}';
          history.push({ role: 'tool', tool_call_id: tc.id || 'call_unknown', content: TokenOptimizer.truncateContent(safe) });
          msgRepo.add(this.sessionId, 'tool', safe.slice(0, 4000), 0, 0, tc.id || 'call_unknown', null);
        }
        continue;
      }

      console.log('  ' + theme.dim(`· ${msgRepo.count(this.sessionId)} messages in session`));
      console.log('');
      return;
    }
    this.spinner.stop();
  }

  renderAI(text) {
    console.log('');
    console.log('  ' + theme.primary.bold('◆ AI'));
    for (const ln of text.split('\n')) console.log('  ' + theme.white(ln));
    console.log('');
  }

  renderTool(name, args) {
    const s = Object.entries(args || {}).map(([k,v]) => {
      let x = typeof v === 'string' ? v : JSON.stringify(v);
      if (x.length > 40) x = x.slice(0,37) + '...';
      return `${k}=${x.replace(/\n/g,'\\n')}`;
    }).join(' ');
    console.log('  ' + theme.secondary('⚙ ') + theme.muted(name) + (s ? ' ' + theme.dim(s) : ''));
  }

  async callLLM(history, tools) {
    const endpoint = this.provider.endpoint.replace(/\/$/, '') + '/chat/completions';
    const body = { model: this.model, messages: history, tools: tools.length ? tools : undefined, tool_choice: tools.length ? 'auto' : undefined, temperature: 0.2 };
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.provider.api_key}` }, body: JSON.stringify(body) });
    if (!r.ok) {
      this.spinner.stop();
      const txt = await r.text();
      console.log(''); console.log('  ' + theme.error.bold(`✗ API ${r.status}`));
      console.log('  ' + theme.muted(txt.slice(0, 300))); console.log('');
      return null;
    }
    return await r.json();
  }
}
