#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { requireValue as assert, nonempty, localFile, readJSON, unique, verifyHash, checkImage, svgDocument, staticHtmlDocument, geometryFingerprint, fontSignature, run, report, capture, finish } from './lib/validation.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/validate-release.mjs /path/to/release/manifest.json\nReads manifest v1 and validates contained assets. See references/validation-contract.md.');
  process.exit(0);
}
const result = report('brand release manifest, provenance, hashes, file parsing, PNG alpha and declared SVG geometry groups');
result.ready_for_delivery = false;
const manifestFile = path.resolve(args[0] || 'manifest.json');
const root = path.dirname(manifestFile);
const imageFormats = new Set(['svg','png','jpeg','jpg','gif','webp','avif']);
const fontFormats = new Set(['ttf','otf','woff','woff2']);
const geometryGroups = new Map();
const imageResults = [];
let j;
let files;
let masters;
capture(result, 'manifest', () => {
  assert(args.length === 1, 'ARGUMENT', 'Supply exactly one manifest file path');
  j = readJSON(manifestFile);
  assert(j.schema_version === 1, 'MANIFEST_SCHEMA', 'schema_version must be 1');
  assert(nonempty(j.brand) && nonempty(j.version), 'MANIFEST_FIELDS', 'brand/version must be nonempty strings');
  files = unique(j.files, 'files', 'path');
  masters = unique(j.masters, 'masters', 'path');
  assert(files.size > 0 && masters.size > 0, 'MANIFEST_EMPTY', 'files and masters must be nonempty');
  assert(j.checks && typeof j.checks === 'object' && !Array.isArray(j.checks) && Object.keys(j.checks).length > 0, 'CHECKS_SCHEMA', 'checks must be a nonempty object');
  result.brand = j.brand; result.version = j.version;
});
if (files && masters) {
  for (const record of j.files) capture(result, record.path, () => {
    const file = localFile(root, record.path);
    assert(file !== manifestFile, 'MANIFEST_SELF', 'Manifest must not list its own checksum');
    assert(nonempty(record.role) && nonempty(record.format) && record.format === record.format.toLowerCase(), 'FILE_FIELDS', `Missing role or lowercase format: ${record.path}`);
    assert(record.role !== 'master' || masters.has(record.path), 'MASTER_UNREGISTERED', `role master must appear in masters: ${record.path}`);
    verifyHash(file, record.sha256);
    if (record.source_master !== undefined) {
      assert(nonempty(record.source_master) && masters.has(record.source_master), 'SOURCE_MASTER', `Unknown source_master: ${record.path}`);
      assert(record.source_master !== record.path, 'SOURCE_MASTER_SELF', `Asset points to itself: ${record.path}`);
      localFile(root, record.source_master);
      if (masters.get(record.source_master).kind === 'html') assert(record.format === 'png', 'HTML_DERIVATIVE_FORMAT', `HTML layout source only supports direct PNG derivatives: ${record.path}`);
    }
    const format = record.format === 'jpg' ? 'jpeg' : record.format;
    assert(record.role !== 'font' || fontFormats.has(format), 'FONT_FORMAT', `role font requires a supported font format: ${record.path}`);
    const isImage = imageFormats.has(record.format);
    if (isImage) {
      const info = checkImage(file, record.width, record.height, { deep: format !== 'svg' });
      assert(record.width !== undefined && record.height !== undefined, 'IMAGE_DIMENSIONS_REQUIRED', `Image dimensions required: ${record.path}`);
      assert(info.format === format, 'FORMAT_MISMATCH', `Actual image format differs: ${record.path}`);
      const variant = record.variant_kind ?? 'standard';
      assert(['standard','optical','material'].includes(variant), 'VARIANT_KIND', `Unknown variant_kind: ${record.path}`);
      if (!masters.has(record.path) && !['reference','evidence'].includes(record.role)) assert(record.source_master, 'SOURCE_MASTER_REQUIRED', `Derived image requires source_master: ${record.path}`);
      if (variant === 'optical') assert(record.source_master && nonempty(record.variant_reason), 'OPTICAL_REASON', `Optical variant requires source_master and variant_reason: ${record.path}`);
      if (format === 'svg') svgDocument(file, { strict: !['reference','evidence'].includes(record.role) });
      if (record.geometry_group !== undefined) {
        assert(nonempty(record.geometry_group) && format === 'svg' && variant === 'standard', 'GEOMETRY_SCOPE', `geometry_group only accepts standard SVG: ${record.path}`);
        const entries = geometryGroups.get(record.geometry_group) || [];
        entries.push({ path: record.path, fingerprint: geometryFingerprint(file) });
        geometryGroups.set(record.geometry_group, entries);
      }
      const measured = { path: record.path, format: info.format, width: info.width, height: info.height };
      if (format === 'png') {
        const values = run('magick', [file + '[0]', '-alpha', 'extract', '-format', '%[fx:minima] %[fx:maxima]', 'info:']).split(/\s+/).map(Number);
        assert(values.length === 2 && values.every(Number.isFinite), 'PNG_ALPHA_READ', `Cannot measure PNG alpha: ${record.path}`);
        measured.alpha_min = values[0]; measured.alpha_max = values[1];
        if (record.transparency !== undefined) {
          assert(['required','opaque'].includes(record.transparency), 'PNG_ALPHA_SCHEMA', `Unknown transparency value: ${record.path}`);
          if (record.transparency === 'required') assert(values[0] < 1 && values[1] > 0, 'PNG_ALPHA_REQUIRED', `PNG lacks visible content or transparent pixels: ${record.path}`);
          if (record.transparency === 'opaque') assert(values[0] === 1, 'PNG_ALPHA_OPAQUE', `PNG has transparency but is declared opaque: ${record.path}`);
        }
      } else assert(record.transparency === undefined, 'PNG_ALPHA_SCOPE', `transparency applies only to PNG: ${record.path}`);
      imageResults.push(measured);
    } else {
      assert(record.width === undefined && record.height === undefined && record.geometry_group === undefined && record.variant_kind === undefined && record.transparency === undefined, 'IMAGE_FIELDS_SCOPE', `Image fields on non-image: ${record.path}`);
      if (fontFormats.has(format)) {
        fontSignature(file, format);
        assert(record.role === 'font', 'FONT_ROLE', `Font file must have role font: ${record.path}`);
        assert(nonempty(record.license_file) && files.has(record.license_file), 'FONT_LICENSE', `Font needs registered license_file: ${record.path}`);
        localFile(root, record.license_file);
      } else {
        const extension = path.extname(record.path).slice(1).toLowerCase();
        assert(extension === format, 'FORMAT_EXTENSION', `Format/extension mismatch: ${record.path}`);
      }
    }
  });
  for (const master of j.masters) capture(result, `master ${master.path}`, () => {
    assert(files.has(master.path), 'MASTER_FILE', `Master absent from files: ${master.path}`);
    assert(['vector','raster','html'].includes(master.kind), 'MASTER_KIND', `Invalid master kind: ${master.path}`);
    const file = localFile(root, master.path); const record = files.get(master.path);
    if (master.kind === 'vector') {
      assert(record.format === 'svg' && record.variant_kind !== 'material', 'VECTOR_MASTER', `Vector master requires a standard/optical SVG: ${master.path}`);
      const svg = svgDocument(file, { strict: true });
      assert(/<(?:[\w.-]+:)?(?:path|rect|circle|ellipse|line|polyline|polygon|text)\b/.test(svg.source), 'VECTOR_EMPTY', `Vector master has no drawing elements: ${master.path}`);
    } else if (master.kind === 'raster') assert(imageFormats.has(record.format) && record.format !== 'svg', 'RASTER_MASTER', `Raster master must be an actual raster: ${master.path}`);
    else {
      assert(record.role === 'master' && record.format === 'html' && path.extname(master.path).toLowerCase() === '.html', 'HTML_MASTER', `HTML layout master needs role master, format html and an .html file: ${master.path}`);
      staticHtmlDocument(file);
    }
  });
  capture(result, 'source provenance graph', () => {
    for (const start of files.keys()) {
      const seen = new Set(); let current = start;
      while (current && files.has(current)) {
        assert(!seen.has(current), 'SOURCE_MASTER_CYCLE', `source_master cycle beginning at ${start}`);
        seen.add(current); current = files.get(current).source_master;
      }
    }
  });
  for (const [group, entries] of geometryGroups) capture(result, `geometry ${group}`, () => {
    assert(entries.length >= 2, 'GEOMETRY_GROUP_SIZE', `Geometry group needs at least two assets: ${group}`);
    assert(new Set(entries.map(entry => entry.fingerprint)).size === 1, 'GEOMETRY_MISMATCH', `Standard SVG geometry differs: ${group}`);
  });
  if (j.checks && typeof j.checks === 'object' && !Array.isArray(j.checks)) for (const [name, check] of Object.entries(j.checks)) capture(result, `check ${name}`, () => {
    assert(check && typeof check === 'object' && ['pass','fail','not_run','not_applicable'].includes(check.status), 'CHECK_STATUS', `Invalid check status: ${name}`);
    if (['pass','fail'].includes(check.status)) localFile(root, check.evidence);
    else assert(nonempty(check.reason), 'CHECK_REASON', `Missing check reason: ${name}`);
    if (check.evidence !== undefined) localFile(root, check.evidence);
    assert(check.status !== 'fail', 'DECLARED_CHECK_FAILED', `Recorded check failed: ${name}`);
    if (check.status === 'not_run') result.warnings.push(`Check not run: ${name}: ${check.reason}`);
  });
  capture(result, 'file inventory', () => {
    const list = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? list(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
    const extras = list(root).filter(file => file !== manifestFile && !files.has(path.relative(root, file).split(path.sep).join('/')));
    if (extras.length) result.warnings.push(`Unlisted files: ${extras.map(file => path.relative(root, file)).join(', ')}`);
  });
  result.counts = { files: files.size, masters: masters.size, images: imageResults.length, geometry_groups: geometryGroups.size, declared_checks: Object.keys(j.checks || {}).length };
  result.images = imageResults;
  result.geometry_groups = Object.fromEntries(geometryGroups);
  result.ready_for_delivery = result.result === 'PASS' && !Object.values(j.checks || {}).some(check => check?.status === 'not_run');
}
result.warnings.push('Mechanical PASS does not verify the truth of declared visual checks or approve the brand selection.');
finish(result);
