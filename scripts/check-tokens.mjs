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
  2. contrast matrix per mode over meta.roles (alpha composited, unrounded comparison), plus
     every semantic.color.dataViz.series color against the four surfaces at 3:1;
  3. chart series distinctness per mode (DATAVIZ_DISTINCT): OKLCH lightness band and chroma floor,
     adjacent series under simulated protanopia/deuteranopia and under normal vision, and distance
     from the feedback colors (thresholds in the comment above the check);
  4. at full depth, dataViz is present with series 1..6 or notApplicable, never missing;
  5. meta.notUsed lint over the --lint CSS/HTML files.
Requires uv. No network. Does not prove visual quality, font loading or component behavior.`);
  process.exit(0);
}
const result = report('design-system tokens: generator freshness, per-mode role and chart-series contrast, chart-series distinctness, dataViz coverage, notUsed lint');
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
    // Chart series are graphical objects: 3:1 against every surface layer (WCAG 1.4.11).
    const series = leafAt(resolved, 'semantic.color.dataViz.series') || {};
    for (const key of Object.keys(series).filter(key => !key.startsWith('$'))) {
      const fg = parseColor(series[key]?.$value);
      assert(fg, 'COLOR_FORMAT', `${mode}: dataViz.series.${key} is not a hex/rgb color the checker can compute`);
      for (const bgRole of SURFACES) {
        const bgRaw = color(bgRole);
        if (!bgRaw || !base) continue;
        const bg = bgRaw.a < 1 ? over(bgRaw, base) : bgRaw;
        const exact = ratio(fg.a < 1 ? over(fg, bg) : fg, bg);
        if (exact < 3) failures++;
        pairs.push({ fg: `dataViz.series.${key}`, bg: bgRole, ratio: Math.floor(exact * 100) / 100, threshold: 3, pass: exact >= 3 });
      }
    }
    modes[mode] = { file, pairs };
  }
  result.contrast = { modes, skipped: [...skipped].sort(), failures };
  result.counts.contrast_pairs = Object.values(modes).reduce((n, m) => n + m.pairs.length, 0);
  for (const [mode, data] of Object.entries(modes)) for (const p of data.pairs) {
    if (p.pass === false && !p.advisory) result.errors.push({ context: 'contrast', code: p.fg.startsWith('dataViz.') ? 'DATAVIZ_CONTRAST' : 'CONTRAST_FAIL', message: `${mode}: ${p.fg} on ${p.bg} = ${p.ratio}:1 < ${p.threshold}:1` });
  }
  if (failures) result.result = 'FAIL';
});

// Chart series distinctness per mode (DATAVIZ_DISTINCT; tokens-schema.md §6.3 "Series
// distinctness"). Thresholds and the color-vision model are those of the categorical-palette
// validator in Claude Code's bundled dataviz skill (scripts/validate_palette.js, checks 2-4b):
//   - OKLCH lightness band: light 0.43-0.77, dark 0.48-0.67. The dark band applies when the
//     mode's surface.default has OKLab L < 0.5, so mode names do not matter;
//   - OKLCH chroma >= 0.10 (below it a hue reads as gray);
//   - adjacent series n and n+1, protanopia and deuteranopia simulated with Machado, Oliveira &
//     Fernandes (2009) at severity 1.0, the smaller OKLab deltaE x100 of the two: >= 8 target;
//     6-8 is a warning (legal only with secondary encoding such as direct labels); < 6 fails;
//   - worst adjacent pair under normal vision: OKLab deltaE x100 >= 15.
// The feedback floor reuses the normal-vision floor: every series color stays >= 15 from
// feedback.success / warning / error of the same mode, so a series never reads as a status.
// Contrast against the surfaces is DATAVIZ_CONTRAST above.
const BAND = { light: [0.43, 0.77], dark: [0.48, 0.67] };
const CHROMA_FLOOR = 0.10, CVD_TARGET = 8, CVD_FLOOR = 6, NORMAL_FLOOR = 15, FEEDBACK_FLOOR = 15;
const MACHADO = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]]
};
const linearRGB = c => [c.r, c.g, c.b].map(x => { x /= 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
const simulate = (rgb, kind) => MACHADO[kind].map(row => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
const deltaE = (a, b, kind) => {
  const p = oklab(kind ? simulate(linearRGB(a), kind) : linearRGB(a)), q = oklab(kind ? simulate(linearRGB(b), kind) : linearRGB(b));
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const round1 = x => Math.floor(x * 10) / 10;
if (scratch) capture(result, 'dataViz distinctness', () => {
  const roles = tree.meta?.roles || {};
  const modes = {};
  const fail = message => { result.errors.push({ context: 'dataViz', code: 'DATAVIZ_DISTINCT', message }); result.result = 'FAIL'; };
  for (const file of fs.readdirSync(scratch).filter(name => /^tokens\.resolved(\.[\w-]+)?\.json$/.test(name)).sort()) {
    const resolved = readJSON(path.join(scratch, file));
    const mode = resolved.meta?.resolvedMode || tree.meta?.defaultMode || 'base';
    const series = leafAt(resolved, 'semantic.color.dataViz.series') || {};
    const keys = Object.keys(series).filter(key => /^\d+$/.test(key)).sort((a, b) => a - b);
    if (!keys.length) continue;
    const roleColor = role => typeof roles[role] === 'string' ? parseColor(leafAt(resolved, roles[role])?.$value) : null;
    const base = roleColor('surface.default');
    const opaque = c => c.a < 1 && base ? over(c, base) : c;
    const colors = keys.map(key => {
      const parsed = parseColor(series[key]?.$value);
      assert(parsed, 'COLOR_FORMAT', `${mode}: dataViz.series.${key} is not a hex/rgb color the checker can compute`);
      return opaque(parsed);
    });
    const bandName = base && oklab(linearRGB(base))[0] < 0.5 ? 'dark' : 'light';
    const [lo, hi] = BAND[bandName];
    keys.forEach((key, i) => {
      const [L, a, b] = oklab(linearRGB(colors[i])), C = Math.hypot(a, b);
      if (L < lo || L > hi) fail(`${mode}: dataViz.series.${key} OKLCH L ${L.toFixed(3)} is outside the ${bandName} band ${lo}-${hi}`);
      if (C < CHROMA_FLOOR) fail(`${mode}: dataViz.series.${key} OKLCH C ${C.toFixed(3)} < ${CHROMA_FLOOR} (reads as gray)`);
    });
    let worstCvd = Infinity, worstNormal = Infinity, nearestFeedback = Infinity;
    for (let i = 0; i + 1 < keys.length; i++) {
      const pair = `dataViz.series.${keys[i]} / ${keys[i + 1]}`;
      const cvd = Math.min(deltaE(colors[i], colors[i + 1], 'protan'), deltaE(colors[i], colors[i + 1], 'deutan'));
      const normal = deltaE(colors[i], colors[i + 1]);
      worstCvd = Math.min(worstCvd, cvd); worstNormal = Math.min(worstNormal, normal);
      if (cvd < CVD_FLOOR) fail(`${mode}: ${pair} CVD deltaE ${round1(cvd)} < ${CVD_FLOOR}`);
      else if (cvd < CVD_TARGET) result.warnings.push(`${mode}: ${pair} CVD deltaE ${round1(cvd)} is in the ${CVD_FLOOR}-${CVD_TARGET} band: legal only when the dataViz $description and DESIGN.md require secondary encoding (direct labels, gaps or texture)`);
      if (normal < NORMAL_FLOOR) fail(`${mode}: ${pair} normal-vision deltaE ${round1(normal)} < ${NORMAL_FLOOR}`);
    }
    for (const role of ['feedback.success', 'feedback.warning', 'feedback.error']) {
      const feedback = roleColor(role);
      if (!feedback) continue;
      keys.forEach((key, i) => {
        const d = deltaE(colors[i], opaque(feedback));
        nearestFeedback = Math.min(nearestFeedback, d);
        if (d < FEEDBACK_FLOOR) fail(`${mode}: dataViz.series.${key} is deltaE ${round1(d)} from ${role} (< ${FEEDBACK_FLOOR}); a series must not read as a status color`);
      });
    }
    modes[mode] = { band: bandName, series: keys.length, worst_adjacent_cvd: round1(worstCvd), worst_adjacent_normal: round1(worstNormal), nearest_feedback: Number.isFinite(nearestFeedback) ? round1(nearestFeedback) : null };
  }
  result.dataviz_distinct = modes;
});

// Full depth derives chart colors from the accent by default; only a product the
// user says has no charts is notApplicable (BD-TOKEN-001).
if (result.depth === 'full') capture(result, 'dataViz', () => {
  const status = tree.meta.categories.dataViz?.status;
  const series = leafAt(tree, 'semantic.color.dataViz.series') || {};
  assert(status !== 'missing', 'DATAVIZ_REQUIRED', 'meta.categories.dataViz is missing: derive the chart series from the accent, or mark notApplicable only when the user says the product has no charts');
  assert(status !== 'present' || [1, 2, 3, 4, 5, 6].every(n => series[n]?.$value !== undefined), 'DATAVIZ_REQUIRED', 'dataViz is present but semantic.color.dataViz.series lacks leaves 1..6');
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
