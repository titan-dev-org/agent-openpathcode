import { sessions, messages } from '../db/database.js';
import { makeTable } from '../ui/table.js';
import { theme } from '../ui/theme.js';
import { log } from '../utils/logger.js';

export async function cmdSessions(args = [], tui) {
  if (args[0] === 'resume' && args[1]) {
    const s = sessions.get(args[1]);
    if (!s) return log.error('Session tidak ada');
    tui.resetSession();
    tui.currentSession = { id: s.id };
    tui.currentModel = s.model;
    log.success(`Resumed: ${s.title}`);
    for (const m of messages.list(s.id)) {
      if (m.role === 'user') console.log(theme.primary('\n  ❯ ') + theme.white(m.content));
      else if (m.role === 'assistant') console.log(theme.secondary('\n  ◆ AI\n  ') + theme.white(m.content));
    }
    return;
  }
  if (args[0] === 'delete' && args[1]) { sessions.delete(args[1]); messages.deleteBySession(args[1]); return log.success('Deleted'); }
  const list = sessions.list();
  if (!list.length) return log.warn('Belum ada session');
  const t = makeTable(['ID','Title','Model','Updated']);
  for (const s of list) t.push([s.id.slice(0,8), (s.title||'').slice(0,40), s.model, s.updated_at]);
  console.log(t.toString());
  log.dim('Resume: /sessions resume <full-id>');
}
