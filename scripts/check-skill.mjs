#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { requireValue as assert, nonempty, positive, localFile, readJSON, unique, verifyHash, checkImage, fontSignature, report, capture, finish, toolAvailable } from './lib/validation.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: check.sh [--deep] [--root SKILL_DIRECTORY]\nChecks local metadata, links, IDs, source hashes, image headers and local absolute paths in text files. --deep also decodes raster images with ImageMagick. No network requests.');
  process.exit(0);
}
const rootIndex = args.indexOf('--root');
const root = path.resolve(rootIndex >= 0 ? args[rootIndex + 1] || '' : path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const deep = args.includes('--deep');
const result = report(deep ? 'visual-system skill: structural, hashes, image headers and raster decoding' : 'visual-system skill: structural, hashes and image headers');
const known = new Set(['--deep', '--root']);
capture(result, 'arguments', () => args.forEach((arg, i) => assert(known.has(arg) || i === rootIndex + 1 && rootIndex >= 0, 'ARGUMENT', `Unknown argument: ${arg}`)));
capture(result, 'root argument', () => assert(rootIndex < 0 || nonempty(args[rootIndex + 1]) && !args[rootIndex + 1].startsWith('--'), 'ARGUMENT', '--root requires a directory path'));
if (result.errors.length) { finish(result); process.exit(1); }
if (deep) capture(result, 'dependencies', () => assert(toolAvailable('magick'), 'DEPENDENCY', '--deep requires ImageMagick magick on PATH'));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
}
function stripFences(source, file) {
  let fence = null;
  const lines = source.split('\n').map(line => {
    const match = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (match) {
      if (!fence) fence = match[1];
      else if (match[1][0] === fence[0] && match[1].length >= fence.length) fence = null;
      return '';
    }
    return fence ? '' : line;
  });
  assert(!fence, 'MARKDOWN_FENCE', `Unclosed code fence: ${file}`);
  return lines.join('\n');
}
function frontmatter(file, required) {
  const source = fs.readFileSync(file, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert(match, 'FRONTMATTER', `Missing frontmatter: ${file}`);
  const fields = {};
  const lines = match[1].split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const pair = line.match(/^([a-z_][a-z\d_-]*):\s*(.*)$/i);
    if (!pair) continue;
    assert(!(pair[1] in fields), 'FRONTMATTER_DUPLICATE', `Duplicate frontmatter field ${pair[1]}: ${file}`);
    fields[pair[1]] = pair[2].trim().replace(/^(['"])(.*)\1$/, '$2');
    if (/^[|>][-+]?$/.test(fields[pair[1]])) {
      const block = []; let next = index + 1;
      while (next < lines.length && (/^\s+/.test(lines[next]) || !lines[next].trim())) block.push(lines[next++].trim());
      fields[pair[1]] = block.join('\n').trim(); index = next - 1;
    }
  }
  for (const field of required) assert(nonempty(fields[field]), 'FRONTMATTER_FIELD', `Missing ${field}: ${file}`);
  return fields;
}
const markdowns = capture(result, 'file inventory', () => walk(root).filter(file => file.endsWith('.md'))) || [];
const sourceByFile = new Map();
const linksByFile = new Map();
let links = 0;
for (const file of markdowns) capture(result, path.relative(root, file), () => {
  const source = stripFences(fs.readFileSync(file, 'utf8'), file);
  sourceByFile.set(file, source);
  const found = [];
  const patterns = [/!?\[([^\]]*)\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+["'][^\n]*?["'])?\s*\)/g, /^\s{0,3}\[([^\]]+)\]:\s*(<[^>]*>|\S+)/gm];
  for (const pattern of patterns) for (const match of source.matchAll(pattern)) {
    const destination = match[2].replace(/^<|>$/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(destination) || destination.startsWith('//')) continue;
    const [relative, rawAnchor] = destination.split('#');
    let decoded;
    try { decoded = decodeURIComponent(relative); } catch { assert(false, 'LINK_ENCODING', `Invalid URL encoding: ${destination}`); }
    const target = relative ? localFile(root, decoded, { base: path.dirname(file), directory: relative.endsWith('/') }) : file;
    if (rawAnchor && target.endsWith('.md')) {
      const targetSource = fs.readFileSync(target, 'utf8');
      const anchor = decodeURIComponent(rawAnchor);
      const explicit = [...targetSource.matchAll(/\bid\s*=\s*['"]([^'"]+)['"]/g)].map(item => item[1]);
      const headings = [...targetSource.matchAll(/^#{1,6}\s+(.+)$/gm)].map(item => item[1].toLowerCase().replace(/[^\p{L}\p{N}\p{M}_\-\s]/gu, '').trim().replace(/\s+/g, '-'));
      assert(explicit.includes(anchor) || headings.includes(anchor), 'LINK_ANCHOR', `Missing anchor ${destination}: ${file}`);
    }
    links++;
    found.push({ label: match[1], destination, target, anchor: rawAnchor });
  }
  linksByFile.set(file, found);
});
capture(result, 'Skill entry', () => {
  const file = localFile(root, 'SKILL.md');
  const fields = frontmatter(file, ['name', 'description']);
  assert(fields.name === 'visual-system', 'SKILL_NAME', 'SKILL.md name must be visual-system');
});
capture(result, 'rule catalog', () => {
  const catalog = localFile(root, 'references/00-catalog.md');
  localFile(root, 'references/CONVENTIONS.md');
  const cards = new Map();
  const pattern = /^## (BD-\S+) · .+$/gm;
  for (const [file, source] of sourceByFile) {
    if (!file.startsWith(path.join(root, 'references') + path.sep) || file === catalog) continue;
    for (const match of source.matchAll(pattern)) {
      assert(/^BD-[A-Z][A-Z\d]*-\d{3}$/.test(match[1]), 'CARD_ID', `Card ID must be BD-CATEGORY-000: ${match[1]}`);
      assert(!cards.has(match[1]), 'CARD_DUPLICATE', `Duplicate card: ${match[1]}`);
      const precedingLine = source.slice(0, match.index).split('\n').at(-2)?.trim();
      assert(precedingLine === `<a id="${match[1].toLowerCase()}"></a>` || precedingLine === `<a id='${match[1].toLowerCase()}'></a>`, 'CARD_ANCHOR', `Card requires preceding explicit lowercase anchor: ${match[1]}`);
      const tail = source.slice(match.index + match[0].length);
      const nextHeading = tail.search(/^## /m);
      const body = nextHeading < 0 ? tail : tail.slice(0, nextHeading);
      for (const field of ['触发','规则','产物','验证']) assert(new RegExp(`^[ \\t]*-[ \\t]*(?:\\*\\*)?${field}(?:\\*\\*)?[：:][ \\t]*\\S`, 'm').test(body), 'CARD_FIELD', `Card ${match[1]} needs nonempty ${field} field`);
      cards.set(match[1], file);
    }
  }
  assert(cards.size > 0, 'CARD_MISSING', 'No BD rule cards found');
  const catalogLinks = (linksByFile.get(catalog) || []).filter(link => /BD-[A-Z\d]+(?:-[A-Z\d]+)*/.test(link.label));
  const registered = new Set();
  for (const link of catalogLinks) {
    const id = link.label.match(/BD-[A-Z\d]+(?:-[A-Z\d]+)*/)[0];
    assert(cards.has(id), 'CATALOG_UNKNOWN', `Catalog references unknown card: ${id}`);
    assert(!registered.has(id), 'CATALOG_DUPLICATE', `Catalog card registered more than once: ${id}`);
    assert(cards.get(id) === link.target && link.anchor === id.toLowerCase(), 'CATALOG_TARGET', `Catalog must link to card definition and explicit anchor: ${id}`);
    registered.add(id);
  }
  for (const id of cards.keys()) assert(registered.has(id), 'CATALOG_MISSING', `Card missing from catalog: ${id}`);
  for (const [file, source] of sourceByFile) {
    if (!file.startsWith(path.join(root, 'references') + path.sep) && file !== path.join(root, 'SKILL.md')) continue;
    for (const match of source.matchAll(/\bBD-[A-Z\d]+(?:-[A-Z\d]+)*\b/g)) assert(cards.has(match[0]), 'CARD_REFERENCE', `Unknown rule reference ${match[0]}: ${file}`);
  }
  result.counts.rule_cards = cards.size;
});

const imagePaths = new Set();
function asset(dir, relative, hash, width, height, contentType) {
  const file = localFile(root, relative, { base: dir });
  verifyHash(file, hash);
  checkImage(file, width, height, { deep, contentType });
  imagePaths.add(file);
  return file;
}
const stylesRoot = path.join(root, 'libraries/styles');
const packs = capture(result, 'style inventory', () => fs.readdirSync(stylesRoot).filter(slug => fs.existsSync(path.join(stylesRoot, slug, 'STYLE.md')))) || [];
const manifests = new Map();
for (const slug of packs) capture(result, `style ${slug}`, () => {
  const dir = path.join(stylesRoot, slug);
  for (const file of ['STYLE.md', 'EXAMPLES.md', 'PROMPTS.md', 'sources.json']) localFile(root, `${slug}/${file}`, { base: stylesRoot });
  const fields = frontmatter(path.join(dir, 'STYLE.md'), ['id', 'name', 'version', 'status']);
  const j = readJSON(path.join(dir, 'sources.json'));
  assert(j.schema_version === 1, 'SOURCE_SCHEMA', `Unsupported sources schema: ${slug}`);
  assert(j.style_id === slug && fields.id === slug, 'STYLE_ID', `Style IDs disagree: ${slug}`);
  assert(['provisional', 'validated'].includes(j.status) && fields.status === j.status, 'STYLE_STATUS', `Style statuses disagree: ${slug}`);
  if (j.status === 'validated') assert(j.validation?.task && j.validation?.result && j.validation?.scope, 'VALIDATED_EVIDENCE', `validated requires validation.task/result/scope: ${slug}`);
  const index = linksByFile.get(path.join(stylesRoot, 'INDEX.md')) || [];
  for (const file of ['STYLE.md', 'EXAMPLES.md']) assert(index.some(link => link.target === path.join(dir, file)), 'STYLE_INDEX', `Missing style index link: ${slug}/${file}`);
  const assets = unique(j.assets, `${slug} assets`);
  const samples = unique(j.samples || [], `${slug} samples`);
  assert(assets.size > 0 && samples.size > 0, 'SOURCE_EMPTY', `Style assets and samples must be nonempty: ${slug}`);
  for (const a of j.assets) {
    assert(positive(a.width) && positive(a.height) && nonempty(a.original_content_type) && nonempty(a.preview_content_type), 'SOURCE_IMAGE_FIELDS', `Source requires dimensions and actual content types: ${slug}/${a.id}`);
    assert(nonempty(a.page_url), 'SOURCE_URL', `Missing page URL: ${slug}/${a.id}`);
    for (const field of ['page_url','asset_url','product_page_url']) if (a[field]) assert(/^https?:$/.test(new URL(a[field]).protocol), 'SOURCE_URL', `Invalid ${field}: ${slug}/${a.id}`);
    asset(dir, a.original_file, a.original_sha256, a.width, a.height, a.original_content_type);
    asset(dir, a.preview_file, a.preview_sha256, a.preview_width ?? a.width, a.preview_height ?? a.height, a.preview_content_type);
    if (a.crop) assert(a.crop.x >= 0 && a.crop.y >= 0 && a.crop.width > 0 && a.crop.height > 0 && a.crop.x + a.crop.width <= a.width && a.crop.y + a.crop.height <= a.height, 'CROP_BOUNDS', `Source crop outside canvas: ${slug}/${a.id}`);
  }
  for (const s of j.samples) {
    assert(assets.has(s.asset_id), 'SOURCE_REFERENCE', `Unknown asset_id: ${slug}/${s.id}`);
    assert(nonempty(s.observation) && nonempty(s.transfer_suggestion), 'SAMPLE_FIELDS', `Missing observation/transfer: ${slug}/${s.id}`);
    if (s.detail_file) {
      assert(positive(s.detail_width) && positive(s.detail_height), 'SAMPLE_DIMENSIONS', `Detail dimensions required: ${slug}/${s.id}`);
      asset(dir, s.detail_file, s.detail_sha256, s.detail_width, s.detail_height);
    }
    const display = s.display_file || s.detail_file || assets.get(s.asset_id).preview_file;
    localFile(root, display, { base: dir });
    assert([s.detail_file, assets.get(s.asset_id).preview_file, s.enhancement?.output_file].includes(display), 'DISPLAY_PROVENANCE', `Display lacks known derivation: ${slug}/${s.id}`);
    if (s.detail_derivation) {
      const d = s.detail_derivation;
      const input = localFile(root, d.input_file, { base: dir });
      if (d.trim_geometry) {
        const m = d.trim_geometry.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
        assert(m, 'CROP_SCHEMA', `Invalid trim_geometry: ${slug}/${s.id}`);
        const [w,h,x,y] = m.slice(1).map(Number); const info = checkImage(input);
        assert(w > 0 && h > 0 && x + w <= info.width && y + h <= info.height, 'CROP_BOUNDS', `Detail crop outside canvas: ${slug}/${s.id}`);
        const pad = d.padding_px ?? d.white_padding_px ?? 0;
        if (d.resize === false) assert(w + pad * 2 === s.detail_width && h + pad * 2 === s.detail_height, 'CROP_DIMENSIONS', `Crop/padding dimensions disagree: ${slug}/${s.id}`);
      }
    }
    if (s.enhancement) {
      const e = s.enhancement;
      assert(e.kind === 'ai_clarity_enhancement' && nonempty(e.tool) && nonempty(e.prompt_id) && e.review && positive(e.width) && positive(e.height), 'ENHANCEMENT_SCHEMA', `Incomplete enhancement: ${slug}/${s.id}`);
      asset(dir, e.output_file, e.sha256, e.width, e.height);
      localFile(root, e.input_file, { base: dir });
      localFile(root, e.prompt_file, { base: dir });
      const a = assets.get(s.asset_id);
      assert(e.input_file !== e.output_file && [s.detail_file, a.original_file, a.preview_file].filter(Boolean).includes(e.input_file), 'ENHANCEMENT_PROVENANCE', `Enhancement input must belong to the sample's original/preview/detail chain: ${slug}/${s.id}`);
    }
  }
  unique(j.reference_groups || [], `${slug} groups`);
  for (const g of j.reference_groups || []) {
    const members = g.members || g.sample_ids;
    assert(Array.isArray(members) && members.length === g.count && new Set(members).size === g.count && members.every(id => samples.has(id)), 'GROUP_MEMBERS', `Invalid group membership: ${slug}/${g.id}`);
    asset(dir, g.overview_file, g.overview_sha256, g.width, g.height);
  }
  if (j.overview) {
    asset(dir, j.overview.file, j.overview.sha256, j.overview.width, j.overview.height);
    for (const file of j.overview.input_files || []) localFile(root, file, { base: dir });
  }
  manifests.set(slug, j);
  result.counts.source_assets = (result.counts.source_assets || 0) + assets.size;
  result.counts.samples = (result.counts.samples || 0) + samples.size;
});
capture(result, 'style overview', () => {
  const j = readJSON(localFile(root, 'OVERVIEW.sources.json', { base: stylesRoot }));
  const members = unique(j.members, 'Style overview', 'style_id');
  assert(members.size === packs.length && packs.every(slug => members.has(slug)), 'OVERVIEW_MEMBERS', 'Overview must map every indexed style once');
  for (const m of j.members) {
    const j2 = readJSON(localFile(root, m.sources_file, { base: stylesRoot }));
    assert(j2.style_id === m.style_id, 'OVERVIEW_SOURCE', `Overview source mismatch: ${m.style_id}`);
    const s = j2.samples.find(sample => sample.id === m.sample_id);
    assert(s, 'OVERVIEW_SAMPLE', `Overview sample missing: ${m.style_id}/${m.sample_id}`);
    const a = j2.assets.find(item => item.id === s.asset_id);
    assert(m.file === `${m.style_id}/${s.display_file || s.detail_file || a.preview_file}` && m.ai_enhanced === Boolean(s.enhancement), 'OVERVIEW_DISPLAY', `Overview display/AI label mismatch: ${m.style_id}`);
    asset(stylesRoot, m.file, m.sha256);
  }
  asset(stylesRoot, j.output_file, j.sha256, j.width, j.height);
});
const fontsManifest = path.join(root, 'libraries/fonts/sources.json');
if (fs.existsSync(fontsManifest)) capture(result, 'font library', () => {
  const j = readJSON(fontsManifest); const dir = path.dirname(fontsManifest);
  assert(j.schema_version === 1, 'FONT_SCHEMA', 'Unsupported fonts sources schema');
  unique(j.fonts, 'Fonts');
  for (const font of j.fonts) {
    assert(nonempty(font.family) && /^https?:$/.test(new URL(font.official_url).protocol), 'FONT_FIELDS', `Missing font family/official URL: ${font.id}`);
    const license = localFile(root, font.license_file, { base: dir });
    if (font.license_sha256) verifyHash(license, font.license_sha256);
    assert(fs.statSync(license).size > 0, 'FONT_LICENSE', `Empty font license: ${font.id}`);
    unique(font.files, `Font files ${font.id}`, 'path');
    assert(font.files.length > 0, 'FONT_FILES', `Missing font files: ${font.id}`);
    for (const record of font.files) {
      assert(nonempty(record.format), 'FONT_FORMAT', `Font format missing: ${font.id}`);
      const file = localFile(root, record.path, { base: dir });
      verifyHash(file, record.sha256); fontSignature(file, record.format);
      if (record.bytes !== undefined) assert(fs.statSync(file).size === record.bytes, 'FONT_BYTES', `Font bytes mismatch: ${font.id}`);
    }
  }
  result.counts.font_families = j.fonts.length;
});
else result.warnings.push('Font library sources.json is absent; font file checks not run.');
const applicationsRoot = path.join(root, 'libraries/applications');
if (fs.existsSync(applicationsRoot)) capture(result, 'application templates', () => {
  for (const file of ['INDEX.md', 'contract.md', 'render.mjs']) localFile(root, file, { base: applicationsRoot });
  const j = readJSON(localFile(root, 'templates.json', { base: applicationsRoot }));
  assert(j.schema_version === 1 && Array.isArray(j.templates) && j.templates.length > 0 && j.templates.length <= 100, 'APPLICATION_SCHEMA', 'Application template index requires schema_version 1 and 1..100 templates');
  unique(j.templates, 'Application templates');
  const allowed = new Set(['LANG','BRAND_NAME','TITLE','BODY','KICKER','FOOTER','THEME','LOGO_SRC','GRAPHIC','WIDTH','HEIGHT','LAYOUT_STYLE']);
  const required = ['LANG','BRAND_NAME','TITLE','THEME','LOGO_SRC','WIDTH','HEIGHT','LAYOUT_STYLE'];
  for (const t of j.templates) {
    assert(/^[a-z][a-z0-9-]{0,63}$/.test(t.id), 'APPLICATION_ID', `Invalid template ID: ${t.id}`);
    assert([t.width,t.height].every(v => Number.isInteger(v) && v > 0 && v <= 10000), 'APPLICATION_DIMENSIONS', `Invalid template canvas: ${t.id}`);
    const file = localFile(applicationsRoot, t.file);
    assert(path.extname(file) === '.html', 'APPLICATION_FILE', `Template must be HTML: ${t.id}`);
    const html = fs.readFileSync(file, 'utf8');
    const markers = [...html.matchAll(/\{\{([^{}]+)\}\}/g)].map(m => m[1]);
    assert(markers.every(m => allowed.has(m)) && required.every(m => markers.includes(m)), 'APPLICATION_MARKERS', `Unknown or missing required template slot: ${t.id}`);
    assert(/<link\b[^>]*\bhref\s*=\s*["']brand\.css["']/i.test(html), 'APPLICATION_CSS', `Template must load generated brand.css: ${t.id}`);
  }
  result.counts.application_templates = j.templates.length;
});
const vendorRoot = path.join(root, 'vendor');
if (fs.existsSync(vendorRoot)) capture(result, 'vendored upstream', () => {
  let count = 0;
  for (const name of fs.readdirSync(vendorRoot)) {
    const dir = path.join(vendorRoot, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const j = readJSON(localFile(root, 'SOURCE.json', { base: dir }));
    assert(/^https:\/\//.test(j.upstream || '') && /^[a-f\d]{40}$/.test(j.commit || ''), 'VENDOR_SOURCE', `vendor/${name}/SOURCE.json needs upstream URL and 40-hex commit`);
    unique(j.files, `vendor/${name} files`, 'path');
    for (const record of j.files) verifyHash(localFile(root, record.path, { base: dir }), record.sha256);
    const listed = new Set(j.files.map(record => record.path));
    for (const file of walk(dir)) {
      const relative = path.relative(dir, file).split(path.sep).join('/');
      if (path.basename(file) === '.DS_Store') continue;
      assert(relative === 'SOURCE.json' || listed.has(relative), 'VENDOR_UNLISTED', `Unlisted vendored file: vendor/${name}/${relative}`);
    }
    count += j.files.length;
  }
  result.counts.vendored_files = count;
});
// Published text must not carry a macOS home path (the Users root, bare or as a file URL).
// Scope: tracked plus untracked non-ignored files; the whole tree outside git.
// Binary files are skipped: third-party originals keep their own embedded metadata.
capture(result, 'local absolute paths', () => {
  const listed = spawnSync('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const files = listed.status === 0 ? listed.stdout.split('\0').filter(Boolean).map(file => path.join(root, file)) : walk(root).filter(file => !path.relative(root, file).split(path.sep).includes('.git'));
  for (const file of files) {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const bytes = fs.readFileSync(file);
    if (bytes.subarray(0, 8000).includes(0)) continue;
    bytes.toString('utf8').split('\n').forEach((line, index) => {
      const hit = line.match(/(?:file:\/\/)?\/Users\/[^\s"'<>)]*/);
      if (hit) {
        result.errors.push({ context: 'local absolute paths', code: 'LOCAL_PATH', message: `${path.relative(root, file)}:${index + 1}: ${hit[0].slice(0, 120)}; write a path relative to the Skill root` });
        result.result = 'FAIL';
      }
    });
  }
});
result.counts.markdown_files = markdowns.length;
result.counts.local_links = links;
result.counts.style_packs = packs.length;
result.counts.image_files = imagePaths.size;
result.warnings.push('Mechanical checks do not prove reference clarity, font loading/coverage, design quality, originality or brand-transfer performance.');
finish(result);
