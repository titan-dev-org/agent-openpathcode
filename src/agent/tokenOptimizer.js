export class TokenOptimizer {
  static compressMessages(messages, maxRecent = 20) {
    if (messages.length <= maxRecent) return messages;
    const sys = messages.filter((m) => m.role === 'system');
    const rest = messages.filter((m) => m.role !== 'system');
    const recent = rest.slice(-maxRecent);
    const older = rest.slice(0, rest.length - maxRecent);
    const summary = {
      role: 'system',
      content: `[Context: ${older.length} earlier messages summarized] ` +
        older.map((m) => `${m.role}: ${String(m.content || '').slice(0, 60)}`).join(' | '),
    };
    return [...sys, summary, ...recent];
  }
  static truncateContent(text, head = 2000, tail = 500) {
    if (typeof text !== 'string' || text.length <= head + tail + 50) return text;
    return text.slice(0, head) + `\n...[truncated ${text.length - head - tail} chars]...\n` + text.slice(-tail);
  }
  static estimateTokens(t) { return Math.ceil(String(t).length / 4); }
}
