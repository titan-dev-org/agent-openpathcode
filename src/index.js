import { TUI } from './ui/tui.js';
import { initDatabase } from './db/database.js';
import { ensureWorkspace } from './utils/workspace.js';
import { MCPManager } from './mcp/mcpClient.js';

export async function main() {
  process.on('SIGINT', () => { process.stdout.write('\r' + ' '.repeat(80) + '\r'); console.log('\n  goodbye\n'); process.exit(0); });
  await ensureWorkspace();
  await initDatabase();
  const mcp = new MCPManager();
  await mcp.loadServers().catch(() => {});
  const tui = new TUI();
  tui.preloadedMCP = mcp;
  tui.mcpStatuses = mcp.statuses;
  await tui.start();
}
