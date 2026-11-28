import { theme } from './theme.js';

const FRAMES = ['·', '•', '●', '•'];
const IS_TTY = process.stdout.isTTY;

export class Spinner {
  constructor(text = 'thinking') {
    this.text = text;
    this.interval = null;
    this.frame = 0;
    this.running = false;
  }

  start(text) {
    if (text) this.text = text;
    if (this.running || !IS_TTY) return;
    this.running = true;
    this.frame = 0;
    this.interval = setInterval(() => {
      try {
        const f = FRAMES[this.frame++ % FRAMES.length];
        process.stdout.write(`\r  ${theme.primary(f)} ${theme.muted(this.text)}  `);
      } catch {}
    }, 140);
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    if (IS_TTY) {
      try { process.stdout.write('\r' + ' '.repeat(60) + '\r'); } catch {}
    }
  }
}
