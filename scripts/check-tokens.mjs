#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { requireValue as assert, sha256, readJSON, report, capture, finish } from './lib/validation.mjs';
import { generate, GENERATED_RE, leafAt } from './lib/tokens.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`Usage: node scripts/check-tokens.mjs DESIGN_SYSTEM_DIR [--lint FILE ...] [--out REPORT.json]
Mechanical checks for a profile-2 token set (see references/system.md#bd-token-001):
  1. regenerates every consumable with vendor/theme-extract (uv run python) in a temp copy and
     requires the delivered tokens.css / adapters / resolved snapshots / DESIGN.md frontmatter to
     match byte for byte, with no extra generated-looking files left over;
  2. contrast matrix per mode over meta.roles (alpha composited, unrounded comparison);
  3. meta.notUsed lint over the --lint CSS/HTML files.
Requires uv. No network. Does not prove visual quality, font loading or component behavior.`);
  process.exit(0);
}
const result = report('design-system tokens: generator freshness, per-mode role contrast, notUsed lint');
const outIndex = args.indexOf('--out');
const lintIndex = args.indexOf('--lint');
const dirArg = args[0];
const lintFiles = lintIndex < 0 ? [] : args.slice(lintIndex + 1, outIndex > lintIndex ? outIndex : undefined);
capture(result, 'arguments', () => {
  assert(dirArg && !dirArg.startsWith('--'), 'ARGUMENT', 'First argument must be the design-system directory');
  assert(outIndex < 0 || (args[outIndex + 1] && !args[outIndex + 1].startsWith('--')), 'ARGUMENT', '--out requires a file path');
  assert(lintIndex < 0 || lintFiles.length > 0, 'ARGUMENT', '--lint requires at least one file');
});
const dir = path.resolve(dirArg || '.');
let tree;
capture(result, 'tokens.json', () => {
  assert(fs.existsSync(path.join(dir, 'tokens.json')), 'FILE_MISSING', `Missing tokens.json in ${dir}`);
  tree = readJSON(path.join(dir, 'tokens.json'));
  result.tokens_sha256 = sha256(path.join(dir, 'tokens.json'));
  const cats = tree.meta?.categories;
  result.depth = cats ? 'full' : 'minimal';
  if (cats) result.categories = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, v?.status]));
  else result.warnings.push('No meta.categories: minimal handoff depth, category coverage not declared.');
});
if (result.errors.length) { finish(result); process.exit(1); }

// 1. Freshness: the generator is the only author of consumables.
const frontmatter = source => (source.match(/^---\n[\s\S]*?\n---\n?/) || [''])[0];
let scratch;
capture(result, 'generator', () => {
  const run = generate(dir);
  scratch = run.scratch;
  for (const line of run.stderr.split('\n')) if (line.startsWith('WARN')) result.warnings.push(line);
  const generated = fs.readdirSync(scratch).filter(name => GENERATED_RE.test(name));
  for (const name of fs.readdirSync(dir)) if (GENERATED_RE.test(name) && !generated.includes(name)) {
    result.errors.push({ context: 'generator', code: 'GENERATED_UNEXPECTED', message: `${name} is not produced by the current tokens (left over from a removed mode?); delete it` });
    result.result = 'FAIL';
  }
  for (const name of [...generated, 'DESIGN.md']) {
    const delivered = path.join(dir, name);
    if (!fs.existsSync(delivered)) {
      result.errors.push({ context: 'generator', code: 'GENERATED_MISSING', message: `Missing generated file ${name}; run the generator (see BD-TOKEN-001)` });
      result.result = 'FAIL'; continue;
    }
    const want = fs.readFileSync(path.join(scratch, name), 'utf8');
    const have = fs.readFileSync(delivered, 'utf8');
    if (name === 'DESIGN.md' ? frontmatter(want) !== frontmatter(have) : want !== have) {
      result.errors.push({ context: 'generator', code: 'GENERATED_STALE', message: `${name} differs from the generator output; edit tokens.json and regenerate, never the output` });
      result.result = 'FAIL';
    }
  }
  result.counts.generated_files = generated.length + 1;
});

// 2. Contrast matrix per mode, from snapshots regenerated from the current tokens.
function parseColor(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  let m = v.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const alpha = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a: alpha };
  }
  return null;
}
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = c => [c.r, c.g, c.b].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }).reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const SURFACES = ['surface.sunken', 'surface.default', 'surface.raised', 'surface.overlay'];
const PAIRS = [
  ...['text.primary', 'text.secondary', 'text.tertiary', 'accent', 'feedback.success', 'feedback.warning', 'feedback.error']
    .flatMap(fg => SURFACES.map(bg => [fg, bg, 4.5])),
  ['text.primary', 'selection', 4.5],
  ['onAccent', 'accent', 4.5],
  ...SURFACES.map(bg => ['focusRing.color', bg, 3]),
  ...SURFACES.map(bg => ['divider', bg, null])
];
// Text on an interactive fill keeps 4.5:1 after the state layer (an overlay of the
// text's own color, i.e. currentColor, at the state opacity) is composited. Controls
// (filled and text buttons, links) take hover/focus/pressed; dragged applies to
// draggable rows and cards, i.e. body text on surfaces. The primary button pair is
// enforced at every depth; the others describe the specimen's full component set
// (plain buttons, draggable rows) and are enforced at full depth, advisory otherwise.
const CONTROL = ['state.hover', 'state.focus', 'state.pressed'];
const STATE_PAIRS = [
  ['onAccent', 'accent', CONTROL], ['accent', 'surface.default', CONTROL], ['accent', 'surface.raised', CONTROL],
  ['text.primary', 'surface.default', [...CONTROL, 'state.dragged']], ['text.primary', 'surface.raised', [...CONTROL, 'state.dragged']]
];
if (scratch) capture(result, 'contrast', () => {
  const roles = tree.meta?.roles;
  assert(roles, 'ROLES_MISSING', 'meta.roles is required at every depth; map unused roles to {status, reason} (BD-TOKEN-001)');
  const modes = {};
  const skipped = new Set();
  let failures = 0;
  for (const file of fs.readdirSync(scratch).filter(name => /^tokens\.resolved(\.[\w-]+)?\.json$/.test(name)).sort()) {
    const resolved = readJSON(path.join(scratch, file));
    const mode = resolved.meta?.resolvedMode || tree.meta?.defaultMode || 'base';
    const color = role => {
      const target = roles[role];
      if (typeof target !== 'string') { skipped.add(`${role}: ${target?.status || 'undeclared'}`); return null; }
      const parsed = parseColor(leafAt(resolved, target)?.$value);
      assert(parsed, 'COLOR_FORMAT', `${mode}: role ${role} (${target}) is not a hex/rgb color the checker can compute`);
      return parsed;
    };
    const base = color('surface.default');
    assert(!base || base.a === 1, 'SURFACE_ALPHA', `${mode}: surface.default must be opaque to composite other layers`);
    const pairs = [];
    for (const [fgRole, bgRole, threshold] of PAIRS) {
      const fg = color(fgRole), bgRaw = color(bgRole);
      if (!fg || !bgRaw || !base) continue;
      const bg = bgRaw.a < 1 ? over(bgRaw, base) : bgRaw;
      const exact = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
      const pass = threshold === null ? null : exact >= threshold;
      if (pass === false) failures++;
      pairs.push({ fg: fgRole, bg: bgRole, ratio: Math.floor(exact * 100) / 100, threshold, pass });
    }
    for (const [fgRole, bgRole, states] of STATE_PAIRS) for (const state of states) {
      const strict = fgRole === 'onAccent' || result.depth === 'full';
      const target = roles[state];
      if (typeof target !== 'string') continue;
      const alpha = leafAt(resolved, target)?.$value;
      const fg = color(fgRole), bgRaw = color(bgRole);
      if (!fg || !bgRaw || !base || typeof alpha !== 'number') continue;
      const bg = bgRaw.a < 1 ? over(bgRaw, base) : bgRaw;
      const text = fg.a < 1 ? over(fg, bg) : fg;
      const exact = ratio(text, over({ ...text, a: alpha }, bg));
      const pass = exact >= 4.5;
      const row = { fg: fgRole, bg: `${bgRole}+${state.slice(6)}`, ratio: Math.floor(exact * 100) / 100, threshold: 4.5, pass };
      if (!strict) row.advisory = true;
      if (!pass && strict) failures++;
      if (!pass && !strict) result.warnings.push(`advisory (minimal depth): ${mode}: ${fgRole} on ${row.bg} = ${row.ratio}:1 < 4.5:1`);
      pairs.push(row);
    }
    modes[mode] = { file, pairs };
  }
  result.contrast = { modes, skipped: [...skipped].sort(), failures };
  result.counts.contrast_pairs = Object.values(modes).reduce((n, m) => n + m.pairs.length, 0);
  for (const [mode, data] of Object.entries(modes)) for (const p of data.pairs) {
    if (p.pass === false && !p.advisory) result.errors.push({ context: 'contrast', code: 'CONTRAST_FAIL', message: `${mode}: ${p.fg} on ${p.bg} = ${p.ratio}:1 < ${p.threshold}:1` });
  }
  if (failures) result.result = 'FAIL';
});
if (scratch) fs.rmSync(scratch, { recursive: true, force: true });

// 3. notUsed lint over delivered CSS/HTML: every declaration at any nesting depth,
// custom properties included, vendor prefixes folded, patterns case-insensitive.
function declarations(css) {
  const out = [];
  const parts = css.replace(/\/\*[\s\S]*?\*\//g, '').split(/([{};])/);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i + 1] === '{') continue; // selector or at-rule prelude
    const m = parts[i].match(/^\s*(--[\w-]+|-?[a-zA-Z][\w-]*)\s*:\s*([\s\S]+?)\s*$/);
    if (m) out.push([m[1].toLowerCase(), m[2]]);
  }
  return out;
}
capture(result, 'notUsed lint', () => {
  if (!lintFiles.length) return;
  const rules = (tree.meta?.notUsed || []).filter(item => item.css);
  const patterns = new Map();
  for (const rule of rules) if (rule.css.valuePattern) {
    try { patterns.set(rule.id, new RegExp(rule.css.valuePattern, 'i')); }
    catch (error) { result.errors.push({ context: 'notUsed', code: 'NOT_USED_PATTERN', message: `${rule.id}: ${error.message}` }); result.result = 'FAIL'; }
  }
  const hits = [];
  for (const rel of lintFiles) {
    const file = path.resolve(rel);
    assert(fs.existsSync(file), 'FILE_MISSING', `Missing lint file: ${rel}`);
    let css = fs.readFileSync(file, 'utf8');
    if (/\.html?$/i.test(file)) css = [...css.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join('\n') + '\n'
      + [...css.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m => `{${m[1] ?? m[2]}}`).join('\n');
    for (const [property, value] of declarations(css)) {
      const bare = property.replace(/^-(?:webkit|moz|ms|o)-/, '');
      for (const rule of rules) {
        const byProperty = rule.css.property && bare === rule.css.property.toLowerCase();
        const byValue = patterns.get(rule.id)?.test(value);
        if (byProperty || byValue) hits.push(`${rel}: ${rule.id} -> ${property}: ${value.slice(0, 80)}`);
      }
    }
  }
  result.counts.lint_files = lintFiles.length;
  for (const hit of hits) result.errors.push({ context: 'notUsed', code: 'NOT_USED', message: hit });
  if (hits.length) result.result = 'FAIL';
});

if (outIndex >= 0) fs.writeFileSync(path.resolve(args[outIndex + 1]), JSON.stringify(result, null, 2) + '\n');
finish(result);
