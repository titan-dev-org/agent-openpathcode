let rl = null;

export function setBusReadline(instance) { rl = instance; }
export function getBusReadline() { return rl; }

export function pauseBus() {
  if (rl && typeof rl.pause === 'function') {
    try { rl.pause(); } catch {}
  }
}

export function resumeBus() {
  if (rl && typeof rl.resume === 'function') {
    try { rl.resume(); } catch {}
  }
}
