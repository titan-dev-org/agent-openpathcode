import fs from 'fs';
import path from 'path';

const ws = path.join(process.cwd(), 'openpathcode-app');
const dirs = [
  ws,
  path.join(ws, 'projects'),
  path.join(ws, 'sessions'),
  path.join(ws, 'db'),
  path.join(ws, 'logs'),
  path.join(ws, 'plugins'),
  path.join(ws, 'agents'),
  path.join(ws, 'skills'),
  path.join(ws, 'commands'),
  path.join(ws, 'snapshots'),
  path.join(ws, 'snapshots', 'files'),
];
for (const d of dirs) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
console.log('Workspace ready:', ws);
