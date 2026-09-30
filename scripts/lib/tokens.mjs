import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireValue as assert, toolAvailable } from './validation.mjs';

export const generator = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'vendor', 'theme-extract', 'scripts', 'build_tokens.py');
export const GENERATED_RE = /^tokens\.(css|tailwind\.css|shadcn\.css|resolved(\.[\w-]+)?\.json)$/;

// Regenerates every consumable from tokens.json (+ modes/, themes/, DESIGN.md) in a
// fresh temp dir with the vendored generator. Caller removes `scratch`.
export function generate(dir) {
  assert(fs.existsSync(path.join(dir, 'tokens.json')), 'FILE_MISSING', `Missing tokens.json in ${dir}`);
  assert(fs.existsSync(generator), 'FILE_MISSING', `Missing vendored generator: ${generator}`);
  assert(toolAvailable('uv'), 'DEPENDENCY', 'uv is required to run the vendored Python generator');
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-tokens-'));
  fs.copyFileSync(path.join(dir, 'tokens.json'), path.join(scratch, 'tokens.json'));
  for (const sub of ['modes', 'themes']) if (fs.existsSync(path.join(dir, sub))) fs.cpSync(path.join(dir, sub), path.join(scratch, sub), { recursive: true });
  if (fs.existsSync(path.join(dir, 'DESIGN.md'))) fs.copyFileSync(path.join(dir, 'DESIGN.md'), path.join(scratch, 'DESIGN.md'));
  const child = spawnSync('uv', ['run', '--quiet', 'python', generator, scratch, '--emit', 'all'], { encoding: 'utf8', timeout: 120000 });
  if (child.error || child.status !== 0) fs.rmSync(scratch, { recursive: true, force: true });
  assert(!child.error, 'DEPENDENCY', `uv: ${child.error?.message}`);
  assert(child.status === 0, 'GENERATOR_FAILED', (child.stderr || child.stdout).trim().slice(0, 4000));
  return { scratch, stderr: child.stderr || '' };
}

export const leafAt = (tree, dotted) => dotted.split('.').reduce((node, key) => node?.[key], tree);
