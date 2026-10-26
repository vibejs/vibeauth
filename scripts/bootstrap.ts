import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, '.local-packs');
mkdirSync(output, { recursive: true });
for (const project of ['vibeform', 'vibequery']) {
  const directory = resolve(root, '..', project);
  if (!existsSync(resolve(directory, 'dist/index.js'))) {
    throw new Error(`Build the local ${project} repository before bootstrap.`);
  }
  // Package managers may update their own metadata even when packing. Work only on a copy.
  const staging = mkdtempSync(join(tmpdir(), 'vibeauth-optional-pack-'));
  try {
    for (const file of [
      'package.json',
      'pnpm-workspace.yaml',
      'dist',
      'devtools',
      'README.md',
      'LICENSE',
      'THIRD-PARTY-NOTICES.md',
    ]) {
      const source = resolve(directory, file);
      if (existsSync(source)) cpSync(source, resolve(staging, file), { recursive: true });
    }
    const result = spawnSync(
      'pnpm',
      [
        '--config.manage-package-manager-versions=false',
        '--config.verify-deps-before-run=false',
        '--dir',
        staging,
        'pack',
        '--pack-destination',
        output,
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) throw new Error(`Unable to pack ${project}.`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
