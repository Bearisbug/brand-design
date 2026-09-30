#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { requireValue as assert, nonempty, sha256, readJSON, report, capture, finish } from './lib/validation.mjs';
import { generate, leafAt } from './lib/tokens.mjs';

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log(`Usage: node scripts/tokens-to-brand-json.mjs DESIGN_SYSTEM_DIR MAP.json [--out BRAND.json]
Writes the application renderer's brand.json (libraries/applications/contract.md) from the design
system's tokens, so fixed-canvas materials and product UI read one source. Values are resolved by
regenerating from tokens.json (+ modes/) with the vendored generator; stale snapshots are never read.
MAP.json: { id, name, language, mode?, colors?: {paper,text,muted,brand,on_brand,rule -> role or token path},
  type: { heading, body, label -> typography token paths, file, license, weight_min, weight_max, kerning, ligatures },
  assets: { ...as brand.json } }. Default colors: surface.default, text.primary, text.secondary, accent, onAccent, divider.
The typography steps' langOverrides for MAP.language (exact tag, then primary subtag) are applied.
Paths in MAP are copied verbatim and resolve relative to the output brand.json. Requires uv.`);
  process.exit(0);
}
const result = report('brand.json generated from design-system tokens');
const outIndex = args.indexOf('--out');
const COLOR_DEFAULTS = { paper: 'surface.default', text: 'text.primary', muted: 'text.secondary', brand: 'accent', on_brand: 'onAccent', rule: 'divider' };
let scratch;
capture(result, 'generate', () => {
  assert(args.length >= 2 && !args[0].startsWith('--') && !args[1].startsWith('--'), 'ARGUMENT', 'Supply DESIGN_SYSTEM_DIR and MAP.json');
  assert(outIndex < 0 || nonempty(args[outIndex + 1]), 'ARGUMENT', '--out requires a file path');
  const dir = path.resolve(args[0]);
  const mapFile = path.resolve(args[1]);
  const map = readJSON(mapFile);
  const tokens = readJSON(path.join(dir, 'tokens.json'));
  const defaultMode = tokens.meta?.defaultMode;
  const mode = map.mode || defaultMode;
  assert(!map.mode || map.mode === defaultMode || (tokens.meta?.modes || []).includes(map.mode), 'BRAND_JSON_MODE', `mode ${map.mode} is not in meta.modes`);
  scratch = generate(dir).scratch;
  const resolvedName = mode && mode !== defaultMode ? `tokens.resolved.${mode}.json` : 'tokens.resolved.json';
  assert(fs.existsSync(path.join(scratch, resolvedName)), 'BRAND_JSON_MODE', `mode ${mode} has no modes/${mode}.json override`);
  const resolved = readJSON(path.join(scratch, resolvedName));
  const roles = tokens.meta?.roles || {};
  const target = ref => /^(primitive|semantic|component)\./.test(ref) ? ref : roles[ref];
  const color = (key, ref) => {
    const p = target(ref);
    assert(typeof p === 'string', 'BRAND_JSON_ROLE', `colors.${key}: role ${ref} is not mapped to a token`);
    const v = leafAt(resolved, p)?.$value;
    const m = typeof v === 'string' && v.match(/^#([\da-f]{6})(ff)?$/i);
    assert(m, 'BRAND_JSON_COLOR', `colors.${key}: ${p} = ${JSON.stringify(v)} is not an opaque #RRGGBB (applications need opaque colors)`);
    return `#${m[1].toUpperCase()}`;
  };
  const colorRefs = { ...COLOR_DEFAULTS, ...(map.colors || {}) };
  const colors = Object.fromEntries(Object.entries(colorRefs).map(([k, ref]) => [k, color(k, ref)]));
  const t = map.type || {};
  const lang = String(map.language || '');
  let override = null;
  const step = name => {
    assert(nonempty(t[name]), 'BRAND_JSON_TYPE', `type.${name} must name a typography token path`);
    const node = leafAt(resolved, t[name]);
    const value = node?.$value;
    assert(value && typeof value === 'object' && 'fontSize' in value, 'BRAND_JSON_TYPE', `type.${name}: ${t[name]} is not a typography leaf`);
    const overrides = node.$extensions?.['com.design-extract']?.langOverrides || {};
    const key = lang in overrides ? lang : lang.split('-')[0] in overrides ? lang.split('-')[0] : null;
    if (key) override = key;
    return key ? { ...value, ...overrides[key] } : value;
  };
  const heading = step('heading'), body = step('body'), label = step('label');
  const first = ff => (Array.isArray(ff) ? ff[0] : String(ff).split(',')[0]).trim().replace(/^["']|["']$/g, '');
  const family = first(heading.fontFamily);
  assert([body, label].every(s => first(s.fontFamily) === family), 'BRAND_JSON_FAMILY', `heading/body/label must share one font family for the application renderer (got ${[heading, body, label].map(s => first(s.fontFamily)).join(', ')})`);
  const brand = {
    schema_version: 1, id: map.id, name: map.name, language: map.language,
    colors,
    type: {
      family, file: t.file, license: t.license, weight_min: t.weight_min, weight_max: t.weight_max,
      heading_weight: heading.fontWeight, body_weight: body.fontWeight, label_weight: label.fontWeight,
      heading_line_height: heading.lineHeight, body_line_height: body.lineHeight, label_line_height: label.lineHeight,
      heading_tracking_em: Math.round((heading.letterSpacing || 0) / heading.fontSize * 10000) / 10000,
      kerning: t.kerning, ligatures: t.ligatures
    },
    assets: map.assets,
    generated_from: {
      script: 'scripts/tokens-to-brand-json.mjs',
      tokens_sha256: sha256(path.join(dir, 'tokens.json')),
      mode_override_sha256: mode !== defaultMode ? sha256(path.join(dir, 'modes', `${mode}.json`)) : null,
      map_sha256: sha256(mapFile), mode, language_override: override,
      colors: Object.fromEntries(Object.entries(colorRefs).map(([k, ref]) => [k, target(ref)])),
      type: { heading: t.heading, body: t.body, label: t.label }
    }
  };
  const out = path.resolve(outIndex >= 0 ? args[outIndex + 1] : path.join(path.dirname(mapFile), 'brand.json'));
  fs.writeFileSync(out, JSON.stringify(brand, null, 2) + '\n');
  result.output = out; result.sha256 = sha256(out);
  result.warnings.push('Only token-derived fields are checked here; the renderer validates the rest, and browser review still decides layout quality.');
});
if (scratch) fs.rmSync(scratch, { recursive: true, force: true });
finish(result);
