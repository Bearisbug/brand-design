#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const RENDERER = fileURLToPath(new URL('../libraries/applications/render.mjs', import.meta.url));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);

// A deterministic, original minimal TrueType font with one empty .notdef glyph.
// Font rendering is outside these tests; the fixture tests actual binary resource copying.
function tinyFont() {
  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000, 0); head.writeUInt32BE(0x00010000, 4);
  head.writeUInt32BE(0x5f0f3cf5, 12); head.writeUInt16BE(1000, 18);
  head.writeUInt16BE(8, 46); head.writeInt16BE(2, 48);
  const hhea = Buffer.alloc(36);
  hhea.writeUInt32BE(0x00010000); hhea.writeInt16BE(800, 4); hhea.writeInt16BE(-200, 6);
  hhea.writeUInt16BE(500, 10); hhea.writeInt16BE(1, 18); hhea.writeUInt16BE(1, 34);
  const maxp = Buffer.alloc(32); maxp.writeUInt32BE(0x00010000); maxp.writeUInt16BE(1, 4); maxp.writeUInt16BE(2, 14);
  const hmtx = Buffer.alloc(4); hmtx.writeUInt16BE(500);
  const loca = Buffer.alloc(4); loca.writeUInt16BE(6, 2);
  const cmap = Buffer.alloc(44);
  cmap.writeUInt16BE(1, 2); cmap.writeUInt16BE(3, 4); cmap.writeUInt16BE(1, 6); cmap.writeUInt32BE(12, 8);
  cmap.writeUInt16BE(4, 12); cmap.writeUInt16BE(32, 14); cmap.writeUInt16BE(4, 18);
  cmap.writeUInt16BE(4, 20); cmap.writeUInt16BE(1, 22);
  cmap.writeUInt16BE(32, 26); cmap.writeUInt16BE(0xffff, 28);
  cmap.writeUInt16BE(32, 32); cmap.writeUInt16BE(0xffff, 34);
  cmap.writeInt16BE(-32, 36); cmap.writeInt16BE(1, 38);
  const label = Buffer.from('RendererFixture', 'utf16le').swap16();
  const name = Buffer.alloc(18 + label.length);
  name.writeUInt16BE(1, 2); name.writeUInt16BE(18, 4);
  name.writeUInt16BE(3, 6); name.writeUInt16BE(1, 8); name.writeUInt16BE(0x0409, 10);
  name.writeUInt16BE(1, 12); name.writeUInt16BE(label.length, 14); label.copy(name, 18);
  const post = Buffer.alloc(32); post.writeUInt32BE(0x00030000);
  const tables = Object.entries({ cmap, glyf: Buffer.alloc(12), head, hhea, hmtx, loca, maxp, name, post });
  const checksum = bytes => { let sum = 0; for (let i = 0; i < bytes.length; i += 4) sum = (sum + bytes.readUInt32BE(i)) >>> 0; return sum; };
  const offsets = [];
  let size = 12 + tables.length * 16;
  for (const [, table] of tables) { offsets.push(size); size += Math.ceil(table.length / 4) * 4; }
  const font = Buffer.alloc(size);
  font.writeUInt32BE(0x00010000); font.writeUInt16BE(tables.length, 4);
  const power = 2 ** Math.floor(Math.log2(tables.length));
  font.writeUInt16BE(power * 16, 6); font.writeUInt16BE(Math.log2(power), 8); font.writeUInt16BE(tables.length * 16 - power * 16, 10);
  tables.forEach(([tag, table], index) => {
    const start = 12 + index * 16;
    const padded = Buffer.alloc(Math.ceil(table.length / 4) * 4); table.copy(padded);
    font.write(tag, start, 4, 'ascii'); font.writeUInt32BE(checksum(padded), start + 4);
    font.writeUInt32BE(offsets[index], start + 8); font.writeUInt32BE(table.length, start + 12);
    padded.copy(font, offsets[index]);
  });
  font.writeUInt32BE((0xb1b0afba - checksum(font)) >>> 0, offsets[tables.findIndex(([tag]) => tag === 'head')] + 8);
  return font;
}

async function writeJSON(target, value) { await fs.writeFile(target, JSON.stringify(value, null, 2) + '\n'); }
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'brand-render-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const library = path.join(root, 'library');
  const brandRoot = path.join(root, 'brand');
  const output = path.join(root, 'output');
  await fs.mkdir(library); await fs.mkdir(brandRoot);
  const renderer = path.join(library, 'render.mjs');
  await fs.copyFile(RENDERER, renderer);
  const template = '<!doctype html><html lang="{{LANG}}"><head><title>{{BRAND_NAME}}: {{TITLE}}</title><link rel="stylesheet" href="brand.css"></head><body style="{{LAYOUT_STYLE}}" class="{{THEME}}" data-width="{{WIDTH}}" data-height="{{HEIGHT}}"><img src="{{LOGO_SRC}}" alt="{{BRAND_NAME}}"><p>{{KICKER}}</p><h1>{{TITLE}}</h1><div>{{BODY}}</div><footer>{{FOOTER}}</footer>{{GRAPHIC}}</body></html>';
  await fs.writeFile(path.join(library, 'card.html'), template);
  const catalog = { schema_version: 1, templates: [{ id: 'card', width: 1080, height: 1350, file: 'card.html' }] };
  await writeJSON(path.join(library, 'templates.json'), catalog);
  const brand = {
    schema_version: 1, id: 'fixture-brand', name: 'Fixture & Co', language: 'zh-CN',
    colors: { paper: '#FAF8F0', text: '#17271A', muted: '#4A604E', brand: '#426E4B', on_brand: '#FFFFFF', rule: '#A3B8A7' },
    type: { family: 'RendererFixture', file: 'font.ttf', license: 'OFL.txt', weight_min: 400, weight_max: 700, heading_weight: 700, body_weight: 400, label_weight: 500, heading_tracking_em: -0.025, kerning: 'none', ligatures: 'none', heading_line_height: 1.25, body_line_height: 1.5, label_line_height: 1.3 },
    assets: { logo_on_paper: 'logo-paper.svg', logo_on_brand: 'logo-brand.svg', graphic: { paper: 'graphic.svg', brand: 'graphic.svg' } },
  };
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0h20v20H0z" fill="#426E4B"/></svg>\n';
  for (const file of ['logo-paper.svg', 'logo-brand.svg', 'graphic.svg']) await fs.writeFile(path.join(brandRoot, file), svg);
  await fs.writeFile(path.join(brandRoot, 'font.ttf'), tinyFont());
  await fs.writeFile(path.join(brandRoot, 'OFL.txt'), 'Original RendererFixture test font. Dedicated to the public domain.\n');
  const content = { schema_version: 2, items: [{ id: 'launch', template: 'card', theme: 'paper', kicker: '', title: 'A clear title', body: 'Body text.', footer: '', layout: {
    logo: { x: 80, y: 80, width: 240, height: 240 },
    title: { x: 80, y: 380, width: 920, height: 240, font_size: 80, line_height_px: 96, max_lines: 2, align: 'left' },
    body: { x: 80, y: 680, width: 920, height: 160, font_size: 32, line_height_px: 44, max_lines: 3, align: 'left' },
    kicker: { x: 360, y: 80, width: 640, height: 50, font_size: 24, line_height_px: 32, max_lines: 1, align: 'right' },
    footer: { x: 80, y: 1250, width: 920, height: 50, font_size: 24, line_height_px: 32, max_lines: 1, align: 'left' },
    graphic: { x: 80, y: 900, width: 250, height: 250 },
  } }] };
  const brandPath = path.join(brandRoot, 'brand.json');
  const contentPath = path.join(root, 'content.json');
  const save = async () => { await writeJSON(brandPath, brand); await writeJSON(contentPath, content); };
  await save();
  const run = (args = []) => spawnSync(process.execPath, [renderer, '--brand', brandPath, '--content', contentPath, '--output', output, ...args], { encoding: 'utf8' });
  return { root, library, brandRoot, brand, brandPath, content, contentPath, output, catalog, save, run };
}

const succeeds = result => assert.equal(result.status, 0, result.stderr || result.stdout);
const rejects = (result, pattern) => { assert.notEqual(result.status, 0, result.stdout); assert.match(result.stderr, pattern); };
async function snapshot(root) {
  const files = {};
  async function walk(dir, prefix = '') {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), relative + '/');
      else if (entry.isSymbolicLink()) files[relative] = 'symlink:' + await fs.readlink(path.join(dir, entry.name));
      else files[relative] = hash(await fs.readFile(path.join(dir, entry.name)));
    }
  }
  try { await walk(root); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  return files;
}

test('renders text safely, copies binary resources, and records verifiable provenance', async t => {
  const f = await fixture(t);
  f.content.items[0].title = '<script>alert("x")</script> & {{TITLE}}';
  f.content.items[0].body = "<img src=x onerror='evil()'>";
  await f.save(); succeeds(f.run());
  const html = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  assert.equal((html.match(/&lt;script&gt;/g) || []).length, 2);
  assert.equal((html.match(/Fixture &amp; Co/g) || []).length, 2);
  assert.ok(html.includes('&lt;img src=x onerror=&#39;evil()&#39;&gt;'));
  assert.ok(html.includes('&amp; {{TITLE}}'));
  assert.ok(!html.includes('<script>') && !html.includes('<img src=x'));
  assert.ok(html.includes('class="art" src="assets/graphic-paper.svg"'));
  assert.ok(html.includes('src="assets/logo-paper.svg"'));
  const css = await fs.readFile(path.join(f.output, 'brand.css'), 'utf8');
  for (const name of ['paper', 'text', 'muted', 'brand', 'on-brand', 'rule', 'font-family', 'heading-weight', 'body-weight', 'label-weight', 'heading-tracking', 'heading-line-height', 'body-line-height', 'label-line-height', 'font-kerning', 'font-ligatures']) assert.ok(css.includes(`--${name}:`), name);
  assert.ok(css.includes('--heading-tracking: -0.025em;') && css.includes('font-weight: 400 700;'));
  assert.ok(css.includes('--heading-line-height: 1.25;') && css.includes('--body-line-height: 1.5;') && css.includes('--label-line-height: 1.3;'));
  assert.deepEqual(await fs.readFile(path.join(f.output, 'assets/font.ttf')), tinyFont());
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  const { integrity, ...unsigned } = manifest;
  assert.equal(integrity.sha256, hash(canonical(unsigned)));
  assert.equal(manifest.brand.id, f.brand.id);
  for (const result of Object.values(manifest.validation)) assert.equal(result, 'not_run');
  for (const record of manifest.outputs) {
    const bytes = await fs.readFile(path.join(f.output, record.path));
    assert.equal(hash(bytes), record.sha256); assert.equal(bytes.length, record.size);
  }
  const sources = manifest.sources;
  for (const record of [sources.brand, sources.content, sources.template_index, sources.renderer, ...sources.templates, ...sources.resources]) assert.equal(hash(await fs.readFile(record.path)), record.sha256);
});

test('repeated build is byte-identical and preserves unrelated files', async t => {
  const f = await fixture(t); succeeds(f.run());
  await fs.writeFile(path.join(f.output, 'notes.txt'), 'User notes');
  const before = await snapshot(f.output);
  succeeds(f.run()); assert.deepEqual(await snapshot(f.output), before);
});

test('missing used-theme resource fails before creating output', async t => {
  const f = await fixture(t); await fs.unlink(path.join(f.brandRoot, 'logo-paper.svg'));
  rejects(f.run(), /missing or inaccessible/); assert.equal(await snapshot(f.output), null);
});

test('lexical source traversal is rejected before writes', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.root, 'outside.svg'), '<svg/>');
  f.brand.assets.logo_on_paper = '../outside.svg'; await f.save();
  rejects(f.run(), /path escapes/); assert.equal(await snapshot(f.output), null);
});

test('source symlink escape is rejected before writes', async t => {
  const f = await fixture(t); await fs.writeFile(path.join(f.root, 'outside.svg'), '<svg/>');
  await fs.symlink('../outside.svg', path.join(f.brandRoot, 'escape.svg'));
  f.brand.assets.logo_on_paper = 'escape.svg'; await f.save();
  rejects(f.run(), /real path escapes/); assert.equal(await snapshot(f.output), null);
});

test('duplicate content IDs are rejected', async t => {
  const f = await fixture(t); f.content.items.push({ ...f.content.items[0] }); await f.save();
  rejects(f.run(), /duplicate item ID/); assert.equal(await snapshot(f.output), null);
});

test('duplicate template IDs are rejected', async t => {
  const f = await fixture(t); f.catalog.templates.push({ ...f.catalog.templates[0] });
  await writeJSON(path.join(f.library, 'templates.json'), f.catalog);
  rejects(f.run(), /duplicate template ID/); assert.equal(await snapshot(f.output), null);
});

test('edited managed file is retained and blocks all updates', async t => {
  const f = await fixture(t); succeeds(f.run());
  await fs.appendFile(path.join(f.output, 'launch.html'), '\nUser change');
  f.content.items[0].title = 'Updated title'; await f.save();
  const before = await snapshot(f.output);
  rejects(f.run(), /managed file modified: launch.html/);
  assert.deepEqual(await snapshot(f.output), before);
});

test('edited manifest blocks updates', async t => {
  const f = await fixture(t); succeeds(f.run());
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  manifest.brand.name = 'User edit'; await writeJSON(path.join(f.output, 'build.json'), manifest);
  const before = await snapshot(f.output);
  rejects(f.run(), /build.json was modified/); assert.deepEqual(await snapshot(f.output), before);
});

test('unrelated file collision blocks build without changing any file', async t => {
  const f = await fixture(t); await fs.mkdir(f.output);
  await fs.writeFile(path.join(f.output, 'launch.html'), 'Unrelated user document');
  const before = await snapshot(f.output);
  rejects(f.run(), /unrelated file conflict: launch.html/);
  assert.deepEqual(await snapshot(f.output), before);
});

test('output resource symlink is rejected without modifying its target', async t => {
  const f = await fixture(t); await fs.mkdir(f.output);
  const elsewhere = path.join(f.root, 'elsewhere'); await fs.mkdir(elsewhere);
  await fs.writeFile(path.join(elsewhere, 'keep.txt'), 'Keep');
  await fs.symlink(elsewhere, path.join(f.output, 'assets'));
  rejects(f.run(), /output conflict: symlink/);
  assert.deepEqual(Object.keys(await snapshot(elsewhere)), ['keep.txt']);
});

test('removed items and graphic are retained and explicitly marked stale', async t => {
  const f = await fixture(t); succeeds(f.run());
  const oldPage = await fs.readFile(path.join(f.output, 'launch.html'));
  f.content.items[0].id = 'next'; f.content.items[0].theme = 'brand'; f.brand.assets.graphic = { paper: null, brand: null };
  await f.save(); succeeds(f.run());
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  assert.deepEqual(manifest.stale.map(x => x.path), ['assets/graphic-paper.svg', 'assets/logo-paper.svg', 'launch.html']);
  assert.ok(!manifest.outputs.some(x => ['launch.html', 'assets/graphic-paper.svg', 'assets/graphic-brand.svg'].includes(x.path)));
  assert.deepEqual(await fs.readFile(path.join(f.output, 'launch.html')), oldPage);
  const html = await fs.readFile(path.join(f.output, 'next.html'), 'utf8');
  assert.ok(html.includes('src="assets/logo-brand.svg"') && !html.includes('class="art"'));
  const before = await snapshot(f.output); succeeds(f.run()); assert.deepEqual(await snapshot(f.output), before);
});

test('invalid type, graphic, color, blank title, and font extension are rejected', async t => {
  for (const [label, modify, pattern] of [
    ['weight', f => { f.brand.type.heading_weight = 900; }, /heading_weight/],
    ['color', f => { f.brand.colors.text = 'red;display:none'; }, /expected #RRGGBB/],
    ['title', f => { f.content.items[0].title = '  '; }, /title required/],
    ['font', f => { f.brand.type.file = 'logo-paper.svg'; }, /unsupported file extension/],
    ['line height', f => { f.brand.type.heading_line_height = 0.8; }, /heading_line_height/],
    ['missing line height', f => { delete f.brand.type.body_line_height; }, /body_line_height/],
    ['invalid used graphic', f => { f.brand.assets.graphic.paper = 5; }, /graphic.paper/],
  ]) await t.test(label, async sub => { const f = await fixture(sub); modify(f); await f.save(); rejects(f.run(), pattern); assert.equal(await snapshot(f.output), null); });
});

test('invalid later item leaves an existing build untouched', async t => {
  const f = await fixture(t); succeeds(f.run()); const before = await snapshot(f.output);
  f.content.items.push({ id: 'later', template: 'missing', theme: 'paper', title: 'Later' }); await f.save();
  rejects(f.run(), /unknown template/); assert.deepEqual(await snapshot(f.output), before);
});

test('new path conflict during rebuild preserves prior managed and unrelated files', async t => {
  const f = await fixture(t); succeeds(f.run());
  await fs.writeFile(path.join(f.output, 'next.html'), 'User draft');
  f.content.items[0].id = 'next'; f.content.items[0].title = 'Updated'; await f.save();
  const before = await snapshot(f.output);
  rejects(f.run(), /unrelated file conflict: next.html/); assert.deepEqual(await snapshot(f.output), before);
});

test('theme-specific graphics select independently copied source bytes', async t => {
  const f = await fixture(t);
  const brandSVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5" fill="#FFFFFF"/></svg>\n';
  await fs.writeFile(path.join(f.brandRoot, 'brand-art.svg'), brandSVG);
  f.brand.assets.graphic.brand = 'brand-art.svg';
  f.content.items.push({ ...f.content.items[0], id: 'brand-launch', theme: 'brand' });
  await f.save(); succeeds(f.run());
  assert.equal(await fs.readFile(path.join(f.output, 'assets/graphic-brand.svg'), 'utf8'), brandSVG);
  assert.notDeepEqual(await fs.readFile(path.join(f.output, 'assets/graphic-brand.svg')), await fs.readFile(path.join(f.output, 'assets/graphic-paper.svg')));
  assert.match(await fs.readFile(path.join(f.output, 'brand-launch.html'), 'utf8'), /class="art" src="assets\/graphic-brand.svg"/);
  f.brand.assets.graphic.paper = null; await f.save(); succeeds(f.run());
  assert.ok(!(await fs.readFile(path.join(f.output, 'launch.html'), 'utf8')).includes('class="art"'));
  assert.ok((await fs.readFile(path.join(f.output, 'brand-launch.html'), 'utf8')).includes('class="art"'));
});

test('valid content change updates owned HTML and binds the new content hash', async t => {
  const f = await fixture(t); succeeds(f.run());
  const old = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  f.content.items[0].title = 'Updated <title>'; await f.save(); succeeds(f.run());
  const current = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  assert.notEqual(old, current); assert.match(current, /Updated &lt;title&gt;/);
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  assert.equal(manifest.sources.content.sha256, hash(await fs.readFile(f.contentPath)));
});

test('manifest formatting edits and missing managed files block rebuilding', async t => {
  await t.test('formatting', async sub => {
    const f = await fixture(sub); succeeds(f.run());
    await fs.appendFile(path.join(f.output, 'build.json'), '\n');
    const before = await snapshot(f.output);
    rejects(f.run(), /build.json formatting was modified/); assert.deepEqual(await snapshot(f.output), before);
  });
  await t.test('missing output', async sub => {
    const f = await fixture(sub); succeeds(f.run()); await fs.unlink(path.join(f.output, 'assets/OFL.txt'));
    const before = await snapshot(f.output);
    rejects(f.run(), /managed file missing/); assert.deepEqual(await snapshot(f.output), before);
  });
});

test('unused theme resource declarations are not required, read, copied, or recorded', async t => {
  for (const mode of ['omitted', 'null', 'missing paths', 'escaping paths']) await t.test(mode, async sub => {
    const f = await fixture(sub);
    await fs.unlink(path.join(f.brandRoot, 'logo-brand.svg'));
    if (mode === 'omitted') { delete f.brand.assets.logo_on_brand; delete f.brand.assets.graphic.brand; }
    if (mode === 'null') { f.brand.assets.logo_on_brand = null; f.brand.assets.graphic.brand = null; }
    if (mode === 'missing paths') { f.brand.assets.logo_on_brand = 'missing-logo.svg'; f.brand.assets.graphic.brand = 'missing-art.svg'; }
    if (mode === 'escaping paths') { f.brand.assets.logo_on_brand = '../outside-logo.svg'; f.brand.assets.graphic.brand = '../outside-art.svg'; }
    await f.save(); succeeds(f.run());
    const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
    assert.ok(!manifest.sources.resources.some(x => ['logo_on_brand', 'graphic_brand'].includes(x.role)));
    assert.ok(!manifest.outputs.some(x => ['assets/logo-brand.svg', 'assets/graphic-brand.svg'].includes(x.path)));
    assert.ok(!(await snapshot(f.output))['assets/logo-brand.svg']);
    assert.ok(!(await snapshot(f.output))['assets/graphic-brand.svg']);
  });
});

test('used-theme logo is required while graphic omission and null mean no artwork', async t => {
  for (const mode of ['graphic theme omitted', 'graphic theme null', 'graphic object omitted', 'graphic object null']) await t.test(mode, async sub => {
    const f = await fixture(sub);
    if (mode === 'graphic theme omitted') delete f.brand.assets.graphic.paper;
    if (mode === 'graphic theme null') f.brand.assets.graphic.paper = null;
    if (mode === 'graphic object omitted') delete f.brand.assets.graphic;
    if (mode === 'graphic object null') f.brand.assets.graphic = null;
    await fs.unlink(path.join(f.brandRoot, 'graphic.svg'));
    await f.save(); succeeds(f.run());
    assert.ok(!(await fs.readFile(path.join(f.output, 'launch.html'), 'utf8')).includes('class="art"'));
    const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
    assert.ok(!manifest.sources.resources.some(x => x.role.startsWith('graphic_')));
  });
  for (const theme of ['paper', 'brand']) await t.test(`missing ${theme} logo declaration`, async sub => {
    const f = await fixture(sub); f.content.items[0].theme = theme; delete f.brand.assets[`logo_on_${theme}`]; await f.save();
    rejects(f.run(), new RegExp(`logo_on_${theme}`)); assert.equal(await snapshot(f.output), null);
  });
  await t.test('declared used artwork missing', async sub => {
    const f = await fixture(sub); f.brand.assets.graphic.paper = 'missing.svg'; await f.save();
    rejects(f.run(), /graphic_paper: missing or inaccessible/); assert.equal(await snapshot(f.output), null);
  });
});

test('removing a theme stops reading its sources and retains previous artifacts as stale', async t => {
  const f = await fixture(t);
  f.content.items.push({ ...f.content.items[0], id: 'brand-launch', theme: 'brand' });
  await f.save(); succeeds(f.run());
  f.content.items.pop(); delete f.brand.assets.logo_on_brand; delete f.brand.assets.graphic.brand;
  await fs.unlink(path.join(f.brandRoot, 'logo-brand.svg')); await f.save(); succeeds(f.run());
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  assert.deepEqual(manifest.stale.map(x => x.path), ['assets/graphic-brand.svg', 'assets/logo-brand.svg', 'brand-launch.html']);
  assert.ok(!manifest.sources.resources.some(x => ['logo_on_brand', 'graphic_brand'].includes(x.role)));
  const before = await snapshot(f.output); succeeds(f.run()); assert.deepEqual(await snapshot(f.output), before);
});

test('content theme validation precedes resource reads', async t => {
  const f = await fixture(t); f.content.items[0].theme = 'missing'; await f.save();
  await fs.unlink(path.join(f.brandRoot, 'font.ttf'));
  rejects(f.run(), /theme must be paper or brand/); assert.equal(await snapshot(f.output), null);
});

test('nonempty copy requires body display slots, not metadata or inactive markup', async t => {
  const cases = [
    ['title removed', 'title', '', ''],
    ['title only in head title', 'title', '<title>{{TITLE}}</title>', ''],
    ['title only in head text', 'title', '<span>{{TITLE}}</span>', ''],
    ['title only in attribute', 'title', '', '<h1 aria-label="{{TITLE}}">Fixed</h1>'],
    ['title only in comment', 'title', '', '<!-- <h1>{{TITLE}}</h1> -->'],
    ['title only in script', 'title', '', '<script>const fake = "<h1>{{TITLE}}</h1>";</script>'],
    ['title only in style', 'title', '', '<style>.title::after { content: "{{TITLE}}"; }</style>'],
    ['title only in template', 'title', '', '<template><h1>{{TITLE}}</h1></template>'],
    ['title only under hidden', 'title', '', '<div hidden><h1>{{TITLE}}</h1></div>'],
    ['body removed', 'body', '', ''],
    ['body only in title', 'body', '<title>{{BODY}}</title>', ''],
    ['body only in attribute', 'body', '', '<div data-copy="{{BODY}}"></div>'],
    ['body only in comment', 'body', '', '<!-- {{BODY}} -->'],
    ['body only in script', 'body', '', '<script>const body = "{{BODY}}";</script>'],
    ['body only in style', 'body', '', '<style>.body::after { content: "{{BODY}}"; }</style>'],
    ['kicker removed', 'kicker', '', ''],
    ['kicker only in attribute', 'kicker', '', '<p title="{{KICKER}}"></p>'],
    ['footer removed', 'footer', '', ''],
    ['footer only in comment', 'footer', '', '<!-- {{FOOTER}} -->'],
  ];
  for (const [label, field, head, body] of cases) await t.test(label, async sub => {
    const f = await fixture(sub);
    Object.assign(f.content.items[0], { title: 'Title', body: '', kicker: '', footer: '', [field]: 'Required copy' });
    await f.save();
    await fs.writeFile(path.join(f.library, 'card.html'), `<!doctype html><html><head>${head}</head><body style="{{LAYOUT_STYLE}}">${field === 'title' ? '' : '<h1>{{TITLE}}</h1>'}${body}</body></html>`);
    rejects(f.run(), new RegExp(`lacks display slot \\{\\{${field.toUpperCase()}\\}\\}`));
    assert.equal(await snapshot(f.output), null);
  });
});

test('empty optional copy permits omitted slots and quoted attribute delimiters are scanned correctly', async t => {
  const f = await fixture(t);
  Object.assign(f.content.items[0], { body: '', kicker: '', footer: '' }); await f.save();
  await fs.writeFile(path.join(f.library, 'card.html'), '<!doctype html><html><head><title>{{TITLE}}</title></head><body style="{{LAYOUT_STYLE}}"><h1 title="a > b and hidden words">{{TITLE}}</h1></body></html>');
  succeeds(f.run());
  assert.match(await fs.readFile(path.join(f.output, 'launch.html'), 'utf8'), /<h1 title="a > b and hidden words">A clear title<\/h1>/);
});

test('deleted display slot blocks rebuild without changing previous outputs', async t => {
  const f = await fixture(t); succeeds(f.run()); const before = await snapshot(f.output);
  const templatePath = path.join(f.library, 'card.html');
  const html = await fs.readFile(templatePath, 'utf8'); await fs.writeFile(templatePath, html.replace('<div>{{BODY}}</div>', '<div></div>'));
  rejects(f.run(), /lacks display slot \{\{BODY\}\}/); assert.deepEqual(await snapshot(f.output), before);
});

test('complete layouts scale both axes by canvas width and bind the validated mapping to the manifest', async t => {
  const f = await fixture(t);
  Object.assign(f.content.items[0].layout.title, { x: 108, y: 216, width: 864, height: 216, font_size: 54, line_height_px: 64.8, max_lines: 3, align: 'center' });
  await f.save(); succeeds(f.run());
  const html = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  const dimensions = Object.fromEntries([...html.matchAll(/--title-([a-z-]+):([0-9.e+-]+)cqw/g)].map(([, key, value]) => [key, Number(value)]));
  for (const [key, expected] of Object.entries({ x: 10, y: 20, w: 80, h: 20, 'font-size': 5, 'line-height': 6 })) assert.ok(Math.abs(dimensions[key] - expected) < 1e-12, key);
  assert.ok(html.includes('--title-align:center;--title-max-lines:3;'));
  assert.ok(!html.includes('{{LAYOUT_STYLE}}'));
  const css = await fs.readFile(path.join(f.output, 'brand.css'), 'utf8');
  assert.ok(css.includes('--font-kerning: none;') && css.includes('--font-ligatures: none;'));
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  assert.deepEqual(manifest.items[0].layout, f.content.items[0].layout);
  assert.equal(manifest.validation.overflow, 'not_run');
  assert.equal(manifest.validation.visual, 'not_run');
  const before = await snapshot(f.output); succeeds(f.run()); assert.deepEqual(await snapshot(f.output), before);
});

test('schema 1 content and missing layout are rejected before any output is created', async t => {
  for (const mode of ['old content schema', 'missing layout']) await t.test(mode, async sub => {
    const f = await fixture(sub);
    if (mode === 'old content schema') f.content.schema_version = 1;
    else delete f.content.items[0].layout;
    await f.save(); rejects(f.run(), mode === 'old content schema' ? /content.schema_version: expected 2/ : /layout: expected object/);
    assert.equal(await snapshot(f.output), null);
  });
});

test('each used content role needs its own complete layout slot', async t => {
  for (const name of ['logo', 'title', 'body', 'kicker', 'footer', 'graphic']) await t.test(name, async sub => {
    const f = await fixture(sub);
    if (name === 'kicker' || name === 'footer') f.content.items[0][name] = 'Required copy';
    f.content.items[0].layout[name] = null;
    await f.save(); rejects(f.run(), new RegExp(`layout\\.${name}: required`));
    assert.equal(await snapshot(f.output), null);
  });
});

test('unused optional content permits omitted or null layout slots', async t => {
  const f = await fixture(t);
  Object.assign(f.content.items[0], { body: '', kicker: '', footer: '' });
  f.brand.assets.graphic.paper = null;
  delete f.content.items[0].layout.body;
  f.content.items[0].layout.kicker = null;
  delete f.content.items[0].layout.footer;
  f.content.items[0].layout.graphic = null;
  await f.save(); succeeds(f.run());
  const manifest = JSON.parse(await fs.readFile(path.join(f.output, 'build.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.items[0].layout).sort(), ['logo', 'title']);
  const html = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  assert.ok(!html.includes('--body-x:') && !html.includes('--graphic-x:') && !html.includes('class="art"'));
});

test('unknown layout entries and CSS injection are rejected without changing an existing build', async t => {
  const cases = [
    ['unknown slot', item => { item.layout.overlay = { x: 0, y: 0, width: 10, height: 10 }; }, /unknown slot overlay/],
    ['unknown style field', item => { item.layout.title.style = 'display:none'; }, /unknown field style/],
    ['coordinate injection', item => { item.layout.title.x = '0;display:none'; }, /title.x: expected finite number/],
    ['alignment injection', item => { item.layout.title.align = 'left;color:red'; }, /title.align: expected left, center, or right/],
    ['string number', item => { item.layout.logo.width = '240'; }, /logo.width: expected finite number/],
  ];
  for (const [label, modify, pattern] of cases) await t.test(label, async sub => {
    const f = await fixture(sub); succeeds(f.run());
    const before = await snapshot(f.output);
    modify(f.content.items[0]); await f.save(); rejects(f.run(), pattern);
    assert.deepEqual(await snapshot(f.output), before);
  });
});

test('invalid later layouts prevent writes for earlier valid changed items', async t => {
  const cases = [
    ['outside canvas', item => { item.layout.graphic.x = 1000; }, /graphic: rectangle/],
    ['negative origin', item => { item.layout.logo.y = -1; }, /logo: rectangle/],
    ['zero dimensions', item => { item.layout.title.width = 0; }, /title: rectangle/],
    ['incomplete text slot', item => { delete item.layout.body.line_height_px; }, /body.line_height_px: expected finite number/],
    ['line too short', item => { item.layout.body.line_height_px = 20; }, /body.line_height_px: must be at least font_size/],
    ['line does not fit', item => { item.layout.body.height = 30; }, /body.line_height_px: must be at least font_size/],
    ['invalid line limit', item => { item.layout.body.max_lines = 1.5; }, /body.max_lines: expected integer 1..50/],
  ];
  for (const [label, modify, pattern] of cases) await t.test(label, async sub => {
    const f = await fixture(sub); succeeds(f.run()); const before = await snapshot(f.output);
    f.content.items[0].title = 'First item changed';
    const later = structuredClone(f.content.items[0]); later.id = 'later'; modify(later); f.content.items.push(later);
    await f.save(); rejects(f.run(), pattern); assert.deepEqual(await snapshot(f.output), before);
    assert.equal(await snapshot(path.join(f.output, 'later.html')), null);
  });
});

test('a JSON numeric overflow is rejected as nonfinite before writing output', async t => {
  const f = await fixture(t);
  f.content.items[0].layout.title.width = 'NUMERIC_OVERFLOW'; await f.save();
  const source = await fs.readFile(f.contentPath, 'utf8');
  await fs.writeFile(f.contentPath, source.replace('"NUMERIC_OVERFLOW"', '1e309'));
  rejects(f.run(), /title.width: expected finite number/); assert.equal(await snapshot(f.output), null);
});

test('plain text keeps authored Chinese and English line breaks while escaping markup', async t => {
  const f = await fixture(t);
  f.content.items[0].title = '听过的内容，\n也能找到出处。';
  f.content.items[0].body = 'Keep the original\nwords & <punctuation>.';
  await f.save(); succeeds(f.run());
  const html = await fs.readFile(path.join(f.output, 'launch.html'), 'utf8');
  assert.ok(html.includes('<h1>听过的内容，\n也能找到出处。</h1>'));
  assert.ok(html.includes('<div>Keep the original\nwords &amp; &lt;punctuation&gt;.</div>'));
  assert.ok(!html.includes('<br'));
  const before = await snapshot(f.output);
  f.content.items[0].title += '\nThird line'; await f.save();
  rejects(f.run(), /title: explicit line count exceeds max_lines 2/); assert.deepEqual(await snapshot(f.output), before);
});

test('CRLF lines count once and single-line labels reject authored extra lines', async t => {
  const f = await fixture(t);
  f.content.items[0].title = 'First line\r\nSecond line';
  await f.save(); succeeds(f.run());
  f.content.items[0].kicker = 'First\r\nSecond'; await f.save();
  rejects(f.run(), /kicker: explicit line count exceeds max_lines 1/);
});

test('font shaping options require explicit safe enum values', async t => {
  for (const [label, modify, pattern] of [
    ['missing kerning', type => { delete type.kerning; }, /brand.type.kerning/],
    ['missing ligatures', type => { delete type.ligatures; }, /brand.type.ligatures/],
    ['kerning injection', type => { type.kerning = 'normal;display:none'; }, /brand.type.kerning/],
    ['unsupported ligatures', type => { type.ligatures = 'discretionary-ligatures'; }, /brand.type.ligatures/],
  ]) await t.test(label, async sub => {
    const f = await fixture(sub); modify(f.brand.type); await f.save();
    rejects(f.run(), pattern); assert.equal(await snapshot(f.output), null);
  });
});

test('templates missing the layout marker reject rebuilding and preserve existing outputs', async t => {
  const f = await fixture(t); succeeds(f.run()); const before = await snapshot(f.output);
  const templatePath = path.join(f.library, 'card.html');
  await fs.writeFile(templatePath, (await fs.readFile(templatePath, 'utf8')).replace('{{LAYOUT_STYLE}}', ''));
  rejects(f.run(), /missing required marker \{\{LAYOUT_STYLE\}\}/);
  assert.deepEqual(await snapshot(f.output), before);
});
