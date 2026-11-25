import { fork } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessions, messages } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Multi session manager.
 * - create()/resume()/close() = session management (sama seperti sebelumnya)
 * - spawnParallel(prompts) = jalankan beberapa agent secara PARALEL via child_process.fork()
 */
export class MultiSession {
  constructor() { this.children = new Map(); }

  create(title, model, providerId) {
    const id = uuidv4();
    sessions.create(id, title, model, providerId);
    return id;
  }

  list() { return sessions.list(); }

  /**
   * Jalankan beberapa prompt secara paralel, masing-masing di session terpisah.
   * Return array of { prompt, output, error }
   */
  async spawnParallel(tasks, { provider, model, mcpConfig, timeoutMs = 120000 } = {}) {
    const workerPath = path.join(__dirname, 'worker.js');
    const results = [];

    const promises = tasks.map((task, idx) => new Promise((resolve) => {
      const sid = uuidv4();
      sessions.create(sid, `parallel-${idx}: ${String(task).slice(0,40)}`, model, provider?.id || null);

      const child = fork(workerPath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, OPC_PARALLEL: '1' },
      });
      this.children.set(sid, child);

      let output = '';
      let error = '';
      child.stdout.on('data', (d) => output += d.toString());
      child.stderr.on('data', (d) => error += d.toString());

      const timer = setTimeout(() => {
        try { child.kill('SIGTERM'); } catch {}
        resolve({ prompt: task, sessionId: sid, output, error: error + '\n[timeout]' });
      }, timeoutMs);

      child.on('message', (msg) => {
        if (msg?.type === 'done') {
          clearTimeout(timer);
          this.children.delete(sid);
          resolve({ prompt: task, sessionId: sid, output: msg.output || output, error });
        }
      });

      child.on('exit', (code) => {
        clearTimeout(timer);
        if (!this.children.has(sid)) return;
        this.children.delete(sid);
        resolve({ prompt: task, sessionId: sid, output, error: error + (code ? `\n[exit ${code}]` : '') });
      });

      child.send({
        type: 'run',
        prompt: task,
        sessionId: sid,
        provider,
        model,
        mcpConfig: mcpConfig || [],
      });
    }));

    const res = await Promise.all(promises);
    return res;
  }

  killAll() {
    for (const [, child] of this.children) { try { child.kill('SIGTERM'); } catch {} }
    this.children.clear();
  }
}
