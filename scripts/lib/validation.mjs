import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function requireValue(value, code, message) {
  if (!value) throw Object.assign(new Error(message), { code });
}
export const nonempty = value => typeof value === 'string' && value.trim().length > 0;
export const positive = value => Number.isFinite(value) && value > 0;
export function within(root, file) {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}
export function localFile(root, relative, { base = root, directory = false } = {}) {
  requireValue(nonempty(relative) && !path.isAbsolute(relative) && !/^[a-z][a-z\d+.-]*:/i.test(relative) && !relative.includes('\\'), 'PATH_INVALID', `Expected relative path: ${relative}`);
  const file = path.resolve(base, relative);
  requireValue(within(root, file), 'PATH_ESCAPE', `Path escapes root: ${relative}`);
  requireValue(fs.existsSync(file), 'FILE_MISSING', `Missing file: ${relative}`);
  requireValue(within(fs.realpathSync(root), fs.realpathSync(file)), 'PATH_ESCAPE', `Symlink escapes root: ${relative}`);
  requireValue(directory ? fs.statSync(file).isDirectory() : fs.statSync(file).isFile(), 'FILE_TYPE', `Unexpected file type: ${relative}`);
  return file;
}
export function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw Object.assign(new Error(`Invalid JSON ${file}: ${error.message}`), { code: 'JSON_PARSE' }); }
}
export function unique(items, label, key = 'id') {
  requireValue(Array.isArray(items), 'SCHEMA_ARRAY', `${label} must be an array`);
  const values = items.map(item => item[key]);
  requireValue(values.every(nonempty), 'ID_MISSING', `${label} has missing ${key}`);
  requireValue(new Set(values).size === values.length, 'ID_DUPLICATE', `${label} has duplicate ${key}`);
  return new Map(items.map(item => [item[key], item]));
}
export function verifyHash(file, expected) {
  requireValue(typeof expected === 'string' && /^[a-f\d]{64}$/.test(expected), 'HASH_INVALID', `Invalid SHA-256: ${file}`);
  requireValue(sha256(file) === expected, 'HASH_MISMATCH', `SHA-256 mismatch: ${file}`);
}
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024, ...options });
  requireValue(!result.error, 'DEPENDENCY', `${command}: ${result.error?.message}`);
  requireValue(result.status === 0, 'TOOL_FAILED', `${command} failed: ${(result.stderr || '').trim().slice(0, 1200)}`);
  return result.stdout.trim();
}
export function toolAvailable(command) {
  return !spawnSync(command, ['--version'], { stdio: 'ignore', timeout: 10000 }).error;
}
export function svgDocument(file, { strict = false } = {}) {
  const source = fs.readFileSync(file, 'utf8');
  // Do not resolve DTDs, entities, network references or scripts while validating assets.
  requireValue(!/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source), 'SVG_DTD', `DTD/entity declaration forbidden: ${file}`);
  run('xmllint', ['--nonet', '--noout', file]);
  const rootName = run('xmllint', ['--nonet', '--xpath', 'local-name(/*)', file]);
  requireValue(rootName === 'svg', 'SVG_ROOT', `Expected SVG root: ${file}`);
  if (strict) {
    const activeSource = source.replace(/<!--[\s\S]*?-->/g, '');
    requireValue(!/<(?:[\w.-]+:)?(?:image|script|foreignObject)\b/i.test(activeSource), 'SVG_EMBED', `Vector asset contains raster/active content: ${file}`);
    requireValue(!/\s(?:[\w.-]+:)?on[\w-]+\s*=/i.test(activeSource), 'SVG_ACTIVE', `SVG event handler: ${file}`);
    const refs = [...activeSource.matchAll(/\b(?:xlink:)?href\s*=\s*(['"])(.*?)\1/g)].map(match => match[2]);
    requireValue(refs.every(ref => ref.startsWith('#')), 'SVG_EXTERNAL', `SVG has external dependency: ${file}`);
    const cssUrls = [...activeSource.matchAll(/url\(([^)]*)\)/gi)].map(match => match[1].replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim().replace(/^(['"])(.*)\1$/, '$2'));
    requireValue(!/@import\b/i.test(activeSource) && cssUrls.every(ref => ref.startsWith('#')), 'SVG_EXTERNAL', `SVG has external CSS resource: ${file}`);
    const ids = [...activeSource.matchAll(/\bid\s*=\s*(['"])(.*?)\1/g)].map(match => match[2]);
    requireValue(new Set(ids).size === ids.length, 'SVG_ID_DUPLICATE', `Duplicate SVG id: ${file}`);
    requireValue([...refs, ...cssUrls].every(ref => ids.includes(ref.slice(1))), 'SVG_LOCAL_REF', `SVG reference points to missing local id: ${file}`);
  }
  const tag = source.match(/<(?:[\w.-]+:)?svg\b([^>]*)>/i)?.[1] || '';
  const attr = name => tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(['"])(.*?)\\1`))?.[2];
  const viewBox = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  const length = value => /^\d*\.?\d+(?:px)?$/.test(value || '') ? Number(value.replace(/px$/, '')) : null;
  const width = length(attr('width')) ?? (viewBox?.length === 4 ? viewBox[2] : null);
  const height = length(attr('height')) ?? (viewBox?.length === 4 ? viewBox[3] : null);
  requireValue(positive(width) && positive(height), 'SVG_DIMENSIONS', `SVG needs positive width/height or viewBox: ${file}`);
  return { source, width, height, format: 'svg', viewBox };
}

export function staticHtmlDocument(file) {
  let source;
  try { source = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(file)); }
  catch { requireValue(false, 'HTML_ENCODING', `HTML layout source must be UTF-8 text: ${file}`); }
  // This is a bounded source-shape check, not an HTML parser or a dependency scan.
  // Ignore non-rendering blocks without executing scripts or interpreting styles.
  const inert = /<!--[\s\S]*?-->|<(script|style|template|noscript)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi;
  const markup = source.replace(inert, '');
  const attributes = '(?:[^>"\']|"[^"]*"|\'[^\']*\')*';
  const document = markup.match(new RegExp(`^\\s*(?:<!doctype\\s+html\\s*>\\s*)?<html\\b${attributes}>\\s*<head\\b${attributes}>([\\s\\S]*?)<\\/head\\s*>\\s*<body\\b${attributes}>([\\s\\S]*?)<\\/body\\s*>\\s*<\\/html\\s*>\\s*$`, 'i'));
  requireValue(document, 'HTML_DOCUMENT', `HTML layout source needs explicit html, head and body elements: ${file}`);
  const [, head, body] = document;
  const metas = [...head.matchAll(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi)];
  const charset = metas.some(([tag]) => {
    const values = Object.fromEntries([...tag.matchAll(/([a-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi)].map(([, name, quoted, single, bare]) => [name.toLowerCase(), (quoted ?? single ?? bare).trim().toLowerCase()]));
    return /^utf-?8$/.test(values.charset || '') || values['http-equiv'] === 'content-type' && /(?:^|;)\s*charset\s*=\s*utf-?8\s*(?:;|$)/i.test(values.content || '');
  });
  requireValue(charset, 'HTML_CHARSET', `HTML layout source needs a UTF-8 charset declaration: ${file}`);
  // SVG metadata, image alt text, comments and script strings do not count as
  // editable HTML text. CSS visibility and actual layering require browser QA.
  const content = body.replace(/<(svg|math)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>/gi, '');
  const text = content.replace(/<(?:[^>"']|"[^"]*"|'[^']*')*>/g, '').replace(/&(?:nbsp|ensp|emsp|thinsp|zwnj|zwj|#0*(?:9|10|13|32|160)|#x0*(?:9|a|d|20|a0));/gi, '').trim();
  requireValue(text.length > 0, 'HTML_STATIC_CONTENT', `HTML layout source needs editable static text outside images, scripts and templates: ${file}`);
  return { format: 'html' };
}

export function imageInfo(file) {
  const b = fs.readFileSync(file);
  const ascii = (start, end) => b.toString('ascii', start, end);
  if (b.length >= 33 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    requireValue(b.readUInt32BE(8) === 13 && ascii(12, 16) === 'IHDR', 'IMAGE_HEADER', `Invalid PNG header: ${file}`);
    return { format: 'png', width: b.readUInt32BE(16), height: b.readUInt32BE(20), colorType: b[25] };
  }
  if (b.length >= 10 && /^GIF8[79]a$/.test(ascii(0, 6))) return { format: 'gif', width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') {
    const kind = ascii(12, 16);
    if (kind === 'VP8X') return { format: 'webp', width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (kind === 'VP8 ') return { format: 'webp', width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') { const bits = b.readUInt32LE(21); return { format: 'webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) }; }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length - 8) {
      if (b[i++] !== 0xff) continue;
      while (b[i] === 0xff) i++;
      const marker = b[i++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = b.readUInt16BE(i);
      requireValue(size >= 2, 'IMAGE_HEADER', `Invalid JPEG marker: ${file}`);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { format: 'jpeg', height: b.readUInt16BE(i + 3), width: b.readUInt16BE(i + 5) };
      i += size;
    }
  }
  if (b.length >= 16 && ascii(4, 8) === 'ftyp' && /avif|avis/.test(ascii(8, Math.min(b.readUInt32BE(0), 64)))) {
    // AVIF's Image Spatial Extents property is authoritative for the primary image canvas.
    const ispe = b.indexOf(Buffer.from('ispe'));
    if (ispe > 0 && ispe + 16 <= b.length) return { format: 'avif', width: b.readUInt32BE(ispe + 8), height: b.readUInt32BE(ispe + 12) };
  }
  if (/^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<(?:[\w.-]+:)?svg\b/.test(b.toString('utf8', 0, Math.min(b.length, 5000)))) return svgDocument(file);
  throw Object.assign(new Error(`Unsupported or invalid image: ${file}`), { code: 'IMAGE_FORMAT' });
}
export function checkImage(file, width, height, { deep = false, contentType } = {}) {
  const info = imageInfo(file);
  requireValue(positive(info.width) && positive(info.height), 'IMAGE_DIMENSIONS', `Invalid image dimensions: ${file}`);
  if (width !== undefined || height !== undefined) {
    requireValue(positive(width) && positive(height), 'DIMENSION_SCHEMA', `Incomplete dimensions: ${file}`);
    requireValue(Math.abs(info.width - width) < 0.01 && Math.abs(info.height - height) < 0.01, 'DIMENSION_MISMATCH', `Dimensions mismatch ${file}: ${info.width}×${info.height}, declared ${width}×${height}`);
  }
  if (contentType) requireValue(contentType === `image/${info.format === 'svg' ? 'svg+xml' : info.format}`, 'FORMAT_MISMATCH', `Content type mismatch: ${file}`);
  if (deep && info.format !== 'svg') {
    const dimensions = run('magick', [file + '[0]', '-format', '%w %h', 'info:']).split(/\s+/).map(Number);
    requireValue(dimensions[0] === info.width && dimensions[1] === info.height, 'DECODE_DIMENSIONS', `Decoded dimensions mismatch: ${file}`);
  }
  return info;
}

export function geometryFingerprint(file) {
  const { source, viewBox } = svgDocument(file, { strict: true });
  requireValue(viewBox?.length === 4 && viewBox.every(Number.isFinite), 'GEOMETRY_VIEWBOX', `Geometry group requires viewBox: ${file}`);
  requireValue(!/<(?:[\w.-]+:)?(?:style|text|tspan|use)\b|\s(?:style|class)\s*=/i.test(source), 'GEOMETRY_UNSUPPORTED', `Geometry groups require self-contained outlined shapes without CSS or use: ${file}`);
  let canonical = run('xmllint', ['--nonet', '--c14n', file]);
  canonical = canonical.replace(/<!--[\s\S]*?-->/g, '').replace(/<(title|desc|metadata)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  canonical = canonical.replace(/<(linearGradient|radialGradient)\b[^>]*>[\s\S]*?<\/\1>/g, '');
  const tokens = [];
  for (const match of canonical.matchAll(/<(\/?)([\w:.-]+)([^>]*)>/g)) {
    const [, close, tag, attributes] = match;
    if (['defs'].includes(tag)) continue;
    if (close) { tokens.push(`/${tag}`); continue; }
    const fields = [];
    for (const item of attributes.matchAll(/([\w:.-]+)="([^"]*)"/g)) {
      let [, key, value] = item;
      if (['id','color','xmlns','xmlns:xlink','aria-label','role','version'].includes(key) || key.startsWith('data-')) continue;
      if (tag === 'svg' && ['width','height'].includes(key)) continue;
      if (key === 'fill' || key === 'stroke') value = value === 'none' ? 'none' : 'paint';
      fields.push([key, value.trim().replace(/\s+/g, ' ')]);
    }
    // Default SVG fill is painted; make implicit and explicit ordinary fills comparable.
    if (!fields.some(([key]) => key === 'fill')) fields.push(['fill', 'paint']);
    tokens.push([tag, fields.sort(([a], [b]) => a.localeCompare(b))]);
  }
  return crypto.createHash('sha256').update(JSON.stringify(tokens)).digest('hex');
}
export function fontSignature(file, format) {
  const b = fs.readFileSync(file); const tag = b.toString('ascii', 0, 4);
  const actual = tag === 'wOFF' ? 'woff' : tag === 'wOF2' ? 'woff2' : tag === 'OTTO' ? 'otf' : b.length >= 12 && b.readUInt32BE(0) === 0x10000 ? 'ttf' : null;
  requireValue(actual && b.length >= 12, 'FONT_SIGNATURE', `Invalid supported font signature: ${file}`);
  if (format) requireValue(actual === format.toLowerCase(), 'FONT_FORMAT', `Font format mismatch: ${file}`);
  return actual;
}
export function report(scope) {
  return { schema_version: 1, scope, result: 'PASS', mechanical_only: true, counts: {}, warnings: [], errors: [] };
}
export function capture(result, label, fn) {
  try { return fn(); }
  catch (error) { result.result = 'FAIL'; result.errors.push({ context: label, code: error.code || 'UNEXPECTED', message: error.message }); return undefined; }
}
export function finish(result, json = true) {
  process.stdout.write(json ? JSON.stringify(result, null, 2) + '\n' : `${result.result}: ${result.scope}\n${result.errors.map(error => `${error.code}: ${error.message}`).join('\n')}\n`);
  process.exitCode = result.result === 'PASS' ? 0 : 1;
}
