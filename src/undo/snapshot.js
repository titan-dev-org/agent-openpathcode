import fs from 'fs';
import path from 'path';
import { SNAPSHOTS_DIR } from '../utils/workspace.js';

const STACK = path.join(SNAPSHOTS_DIR, 'stack.json');
const REDO = path.join(SNAPSHOTS_DIR, 'redo.json');
const FILES = path.join(SNAPSHOTS_DIR, 'files');

function read(f) { try { return JSON.parse(fs.readFileSync(f,'utf8')); } catch { return []; } }
function write(f, a) { fs.writeFileSync(f, JSON.stringify(a, null, 2)); }

export function snapshotFile(absPath) {
  if (!fs.existsSync(absPath)) return null;
  if (!fs.existsSync(FILES)) fs.mkdirSync(FILES, { recursive: true });
  const id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const backup = path.join(FILES, id);
  fs.writeFileSync(backup, fs.readFileSync(absPath));
  const stack = read(STACK);
  stack.push({ id, file: absPath, backup, at: new Date().toISOString() });
  write(STACK, stack);
  write(REDO, []);
  return id;
}

export function undo() {
  const stack = read(STACK);
  if (!stack.length) return { ok: false, msg: 'Tidak ada perubahan untuk di-undo' };
  const entry = stack.pop();
  if (!fs.existsSync(entry.file)) { write(STACK, stack); return { ok: false, msg: 'File sudah tidak ada' }; }
  const redoStack = read(REDO);
  const cur = `${entry.backup}.redo`;
  fs.writeFileSync(cur, fs.readFileSync(entry.file));
  redoStack.push({ ...entry, backup: cur });
  write(REDO, redoStack);
  fs.writeFileSync(entry.file, fs.readFileSync(entry.backup));
  write(STACK, stack);
  return { ok: true, msg: `Undo: ${path.basename(entry.file)}` };
}

export function redo() {
  const redoStack = read(REDO);
  if (!redoStack.length) return { ok: false, msg: 'Tidak ada yang bisa di-redo' };
  const entry = redoStack.pop();
  if (!fs.existsSync(entry.file)) { write(REDO, redoStack); return { ok: false, msg: 'File sudah tidak ada' }; }
  const stack = read(STACK);
  stack.push(entry);
  write(STACK, stack);
  fs.writeFileSync(entry.file, fs.readFileSync(entry.backup));
  write(REDO, redoStack);
  return { ok: true, msg: `Redo: ${path.basename(entry.file)}` };
}
