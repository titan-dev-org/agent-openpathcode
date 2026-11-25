import { initDatabase } from '../db/database.js';
import { ensureWorkspace } from '../utils/workspace.js';
import { MCPManager } from '../mcp/mcpClient.js';
import { Agent } from '../agent/agent.js';
import { providers, messages } from '../db/database.js';

process.on('message', async (msg) => {
  if (msg?.type !== 'run') return;

  try {
    await ensureWorkspace();
    await initDatabase();

    const mcp = new MCPManager();
    await mcp.loadServers().catch(() => {});

    messages.add(msg.sessionId, 'user', msg.prompt);

    // Tangkap output AI: kita redirect console.log ke buffer
    const origLog = console.log;
    let buffer = '';
    console.log = (...args) => { buffer += args.join(' ') + '\n'; };

    const agent = new Agent({
      provider: msg.provider,
      model: msg.model,
      sessionId: msg.sessionId,
      mcp,
    });

    try { await agent.run(msg.prompt); }
    finally { console.log = origLog; }

    process.send({ type: 'done', output: buffer });
    process.exit(0);
  } catch (e) {
    process.send({ type: 'done', output: '', error: e.message });
    process.exit(1);
  }
});
