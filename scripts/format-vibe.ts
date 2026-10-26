import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const write = process.argv.includes('--write');
let changed = false;
async function visit(directory: string) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', '.local'].includes(item.name)) continue;
    const path = join(directory, item.name);
    if (item.isDirectory()) await visit(path);
    else if (path.endsWith('.vibe')) {
      const original = await readFile(path, 'utf8');
      // Use only the formatter's SFC syntax parser. This adds no Vue runtime/API dependency.
      const result = spawnSync(
        'pnpm',
        [
          '--config.verify-deps-before-run=false',
          'exec',
          'oxfmt',
          '--stdin-filepath',
          `${path}.vue`,
        ],
        { cwd: root, input: original, encoding: 'utf8' },
      );
      if (result.status !== 0) throw new Error(`Unable to format ${path}: ${result.stderr}`);
      if (result.stdout !== original) {
        if (write) await writeFile(path, result.stdout);
        else {
          changed = true;
          console.error(`Unformatted: ${path.slice(root.length + 1)}`);
        }
      }
    }
  }
}
await visit(resolve(root, 'examples'));
await visit(resolve(root, 'test/fixtures'));
if (changed) process.exitCode = 1;
