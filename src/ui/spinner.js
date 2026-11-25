import { theme } from './theme.js';

const FRAMES = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
const IS_TTY = process.stdout.isTTY;

export class Spinner {
  constructor(text = 'Thinking') { this.text = text; this.interval = null; this.frame = 0; this.running = false; }
  start(text) {
    if (text) this.text = text;
    if (this.running || !IS_TTY) return;
    this.running = true; this.frame = 0;
    this.interval = setInterval(() => {
      process.stdout.write(`\r  ${theme.primary(FRAMES[this.frame++ % FRAMES.length])} ${theme.muted(this.text)}...   `);
    }, 80);
  }
  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.interval);
    if (IS_TTY) process.stdout.write('\r' + ' '.repeat(70) + '\r');
  }
}
