import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourceDir = path.join(repoRoot, 'attachments');
const targetDir = path.join(repoRoot, 'static', 'attachments');

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(sourceDir))) {
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true, force: true });
}

await main();

