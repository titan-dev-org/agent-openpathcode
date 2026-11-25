import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { theme } from '../ui/theme.js';

export async function gitPush(projectDir, repoUrl, token, branch = 'main') {
  try {
    const u = new URL(repoUrl);
    const auth = `https://${token}@${u.host}${u.pathname}`;
    if (!fs.existsSync(path.join(projectDir, '.git'))) {
      execSync('git init', { cwd: projectDir, stdio: 'pipe' });
      execSync(`git checkout -b ${branch}`, { cwd: projectDir, stdio: 'pipe' });
      execSync('git config user.email "openpathcode@local"', { cwd: projectDir });
      execSync('git config user.name "OpenPathCode"', { cwd: projectDir });
    }
    try { execSync(`git remote set-url origin ${auth}`, { cwd: projectDir, stdio: 'pipe' }); }
    catch { execSync(`git remote add origin ${auth}`, { cwd: projectDir, stdio: 'pipe' }); }
    execSync('git add -A', { cwd: projectDir, stdio: 'pipe' });
    try { execSync('git commit -m "OpenPathCode: push"', { cwd: projectDir, stdio: 'pipe' }); } catch {}
    execSync(`git push -u origin ${branch} --force`, { cwd: projectDir, stdio: 'pipe' });
    console.log('  ' + theme.success(`✓ Pushed to ${repoUrl} (${branch})`));
    return { success: true };
  } catch (e) {
    console.log('  ' + theme.error(`✗ git push failed: ${e.message}`));
    return { error: e.message };
  }
}
