import fs from 'fs';
import path from 'path';

const ws = path.join(process.cwd(), 'openpathcode-app');
const dirs = ['projects','sessions','db','logs','plugins','agents','skills','commands','snapshots','snapshots/files'];
for (const d of [ws, ...dirs.map((x) => path.join(ws, x))]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}
console.log('Workspace ready:', ws);
