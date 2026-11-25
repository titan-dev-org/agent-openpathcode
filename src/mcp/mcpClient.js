import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { getDB } from '../db/database.js';
import fs from 'fs';
import path from 'path';
import { LOGS_DIR } from '../utils/workspace.js';

export class MCPManager {
  constructor() { this.clients = new Map(); this.tools = []; this.statuses = []; }

  async loadServers() {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    let servers = [];
    try { servers = getDB().prepare('SELECT * FROM mcp_servers WHERE active=1').all(); }
    catch { return []; }

    for (const s of servers) {
      const logPath = path.join(LOGS_DIR, `mcp-${s.name}.log`);
      try {
        const transport = new StdioClientTransport({
          command: s.command,
          args: JSON.parse(s.args || '[]'),
          stderr: 'pipe',
          env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
        });

        if (transport.stderr) {
          const logStream = fs.createWriteStream(logPath, { flags: 'a' });
          transport.stderr.on('data', (chunk) => { try { logStream.write(chunk); } catch {} });
        }

        const client = new Client({ name: 'openpathcode', version: '2.1.0' }, { capabilities: {} });
        await client.connect(transport);
        this.clients.set(s.name, client);

        const { tools } = await client.listTools();
        for (const t of tools) {
          this.tools.push({
            type: 'function',
            function: {
              name: `mcp__${s.name}__${t.name}`,
              description: t.description || '',
              parameters: t.inputSchema || { type: 'object', properties: {} },
            },
          });
        }
        this.statuses.push({ name: s.name, ok: true, toolCount: tools.length });
      } catch (e) {
        try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${e.message}\n`); } catch {}
        this.statuses.push({ name: s.name, ok: false, error: e.message });
      }
    }
    return this.statuses;
  }

  getTools() { return this.tools; }
  async callTool(name, args) {
    const [_, srv, ...rest] = name.split('__');
    const c = this.clients.get(srv);
    if (!c) throw new Error(`MCP ${srv} not connected`);
    return await c.callTool({ name: rest.join('__'), arguments: args });
  }
}
