import boxen from 'boxen';
import { theme } from '../ui/theme.js';

export async function cmdHelp() {
  const c = `
${theme.primary.bold('CORE')}
  /provider          Tambah provider (OpenAI-compatible)
  /models [id]       Tabel model + pilih ID
  /use <name>        Aktifkan model by name
  /remove [id]       Hapus model
  /usage             Token usage per model
  /new               Session baru
  /clear             Bersihkan layar
  exit               Keluar

${theme.primary.bold('SESSIONS')}
  /sessions          List sessions
  /sessions resume <id>
  /sessions delete <id>
  /parallel "p1" "p2"  Jalankan beberapa agent PARALEL

${theme.primary.bold('FILE SAFETY')}
  /undo              Rollback perubahan file terakhir
  /redo              Redo

${theme.primary.bold('PERMISSIONS')}
  /permissions                  Lihat semua policy
  /permissions <action> <rule>  set allow|ask|deny

${theme.primary.bold('EXTENSIONS')}
  /plugins           List plugin
  /skills            List skill (SKILL.md)
  /skill <name>      Aktifkan skill
  /skill off         Matikan skill
  /agents            List custom agent
  /agents <name>     Aktifkan custom agent
  /agents off        Matikan

${theme.primary.bold('CUSTOM COMMANDS')}
  Taruh YAML di openpathcode-app/commands/
  Jalankan: /<nama> <args>
`;
  console.log(boxen(c, { padding: 1, borderStyle: 'round', borderColor: 'cyan', title: 'OpenPathCode Help', titleAlignment: 'center' }));
}
