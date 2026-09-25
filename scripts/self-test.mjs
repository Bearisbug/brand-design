#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { sha256, run, fontSignature, requireValue as assert } from './lib/validation.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage: node scripts/self-test.mjs [--output /path/to/results.json]\nCreates isolated local fixtures, runs positive and fault cases, removes fixtures, and writes a mechanical test report. Requires Node, xmllint and magick.');
  process.exit(0);
}
assert(args.length === 0 || args.length === 2 && args[0] === '--output', 'ARGUMENT', 'Use --output REPORT.json or no arguments');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-validation-'));
const results = [];
const write = (dir, file, value) => { const target = path.join(dir, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2) + '\n'); return target; };
const rect = (paint = '#152837', x = 4) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="${paint}" d="M ${x} 4 H 28 V 28 H 4 Z"/></svg>`;
function invoke(script, parameters) {
  const child = spawnSync(process.execPath, [path.join(here, script), ...parameters], { encoding: 'utf8', timeout: 60000 });
  assert(!child.error, 'CHILD_EXECUTION', child.error?.message);
  let report;
  try { report = JSON.parse(child.stdout); } catch { throw new Error(`Invalid child report: ${child.stdout}\n${child.stderr}`); }
  return { exit_code: child.status, report };
}
function entry(dir, file, role, format, extra = {}) { return { path: file, role, format, sha256: sha256(path.join(dir, file)), ...extra }; }
function release(dir) {
  write(dir, 'master.svg', rect());
  write(dir, 'logo.svg', rect('#ffffff'));
  write(dir, 'optical.svg', rect('#ffffff', 5));
  run('magick', ['-size','32x32','xc:none','-fill','#152837','-draw','rectangle 4,4 27,27',path.join(dir,'logo.png')]);
  run('magick', ['-size','32x32','xc:#708090',path.join(dir,'material.png')]);
  write(dir, 'review.md', '# Fixture evidence\nThis is a mechanical fixture, not a visual approval.\n');
  return {
    schema_version: 1, brand: 'Checker Fixture', version: 'fixture-1',
    masters: [{ path: 'master.svg', kind: 'vector' }],
    files: [
      entry(dir,'master.svg','master','svg',{width:32,height:32,geometry_group:'mark'}),
      entry(dir,'logo.svg','logo','svg',{width:32,height:32,source_master:'master.svg',geometry_group:'mark'}),
      entry(dir,'optical.svg','favicon','svg',{width:32,height:32,source_master:'master.svg',variant_kind:'optical',variant_reason:'Open a one-unit aperture for the fixture size.'}),
      entry(dir,'logo.png','logo','png',{width:32,height:32,source_master:'master.svg',transparency:'required'}),
      entry(dir,'material.png','application','png',{width:32,height:32,source_master:'master.svg',variant_kind:'material',transparency:'opaque'}),
      entry(dir,'review.md','evidence','md')
    ], checks: { fixture: { status: 'pass', evidence: 'review.md' } }
  };
}
function testRelease(name, expected, mutate = () => {}, after) {
  const dir = path.join(temp, name); fs.mkdirSync(dir);
  const j = release(dir); mutate(j, dir);
  const file = write(dir, 'manifest.json', j);
  const { exit_code, report } = invoke('validate-release.mjs', [file]);
  const codes = report.errors.map(error => error.code);
  const passed = expected === 'PASS' ? exit_code === 0 && report.result === 'PASS' : exit_code === 1 && codes.includes(expected);
  if (after) after(report);
  results.push({ case: name, expected, actual: report.result, detected_codes: codes, pass: passed });
}
const htmlLayout = (body = '<main><h1>可编辑标题</h1><p>固定画布排版源</p></main>', head = '<meta charset="utf-8">') => `<!doctype html><html lang="zh-CN"><head>${head}<title>Mechanical layout fixture</title><link rel="stylesheet" href="layout.css"></head><body>${body}</body></html>`;
function htmlRelease(j, dir) {
  write(dir, 'source/layout.html', htmlLayout());
  write(dir, 'source/layout.css', 'html,body{margin:0;width:1200px;height:630px}main{padding:64px}h1{font-size:64px}p{font-size:32px}\n');
  run('magick', ['-size','1200x630','xc:#152837',path.join(dir,'application.png')]);
  j.masters.push({ path: 'source/layout.html', kind: 'html' });
  j.files.push(entry(dir,'source/layout.html','master','html'), entry(dir,'source/layout.css','source','css'), entry(dir,'application.png','application','png',{width:1200,height:630,source_master:'source/layout.html',transparency:'opaque'}));
  fs.appendFileSync(path.join(dir,'review.md'), 'The HTML and PNG are synthetic mechanical fixtures. The PNG is not a browser render; no visual or editability approval is claimed.\n');
  j.files.find(record => record.path === 'review.md').sha256 = sha256(path.join(dir,'review.md'));
}
function testHtml(name, expected, mutate = () => {}, after) {
  testRelease(name, expected, (j, dir) => { htmlRelease(j, dir); mutate(j, dir); }, after);
}
function replaceHtml(j, dir, source) {
  write(dir, 'source/layout.html', source);
  j.files.find(record => record.path === 'source/layout.html').sha256 = sha256(path.join(dir,'source/layout.html'));
}
function skill(dir) {
  write(dir, 'SKILL.md', '---\nname: brand-design\ndescription: Fixture entry for validation tests.\n---\n# Fixture\n[Catalog](references/00-catalog.md)\n');
  write(dir, 'references/CONVENTIONS.md', '# Fixture conventions\n');
  write(dir, 'references/00-catalog.md', '# Catalog\n[BD-TEST-001](rules.md#bd-test-001)\n');
  write(dir, 'references/rules.md', '# Rules\n<a id="bd-test-001"></a>\n## BD-TEST-001 · Fixture\n- 触发：Fixture input.\n- 规则：Fixture rule.\n- 产物：Fixture output.\n- 验证：Fixture verification.\n');
  const styles = path.join(dir, 'libraries/styles');
  const pack = path.join(styles, 'fixture'); fs.mkdirSync(pack, { recursive: true });
  write(styles, 'INDEX.md', '# Styles\n[STYLE](fixture/STYLE.md) [Examples](fixture/EXAMPLES.md)\n');
  write(pack, 'STYLE.md', '---\nid: fixture\nname: Fixture\nversion: 1\nstatus: provisional\n---\n# Fixture\n');
  write(pack, 'EXAMPLES.md', '# Examples\n![one](original.png)\n');
  write(pack, 'PROMPTS.md', '# Prompts\n');
  run('magick', ['-size','32x32','xc:white',path.join(pack,'original.png')]);
  fs.copyFileSync(path.join(pack,'original.png'),path.join(pack,'preview.png'));
  fs.copyFileSync(path.join(pack,'original.png'),path.join(pack,'enhanced.png'));
  fs.copyFileSync(path.join(pack,'original.png'),path.join(styles,'OVERVIEW.png'));
  write(pack, 'PROMPT.json', { id: 'sample-1', prompt: 'Fixture prompt.' });
  const hash = sha256(path.join(pack,'original.png'));
  const source = { schema_version:1, style_id:'fixture', status:'provisional', assets:[{id:'source-1',page_url:'https://example.com/reference',original_file:'original.png',original_sha256:hash,original_content_type:'image/png',width:32,height:32,preview_file:'preview.png',preview_sha256:hash,preview_content_type:'image/png'}], samples:[{id:'sample-1',asset_id:'source-1',observation:'Fixture observation',transfer_suggestion:'Fixture transfer',display_file:'preview.png'}], reference_groups:[{id:'group',sample_ids:['sample-1'],count:1,overview_file:'preview.png',overview_sha256:hash}] };
  write(pack, 'sources.json', source);
  const overview = { members:[{style_id:'fixture',sample_id:'sample-1',sources_file:'fixture/sources.json',file:'fixture/preview.png',sha256:hash,ai_enhanced:false}], output_file:'OVERVIEW.png',sha256:hash,width:32,height:32 };
  write(styles, 'OVERVIEW.sources.json', overview);
  return { source, overview, pack, styles, hash };
}
function testSkill(name, expected, mutate = () => {}) {
  const dir = path.join(temp, name); fs.mkdirSync(dir);
  const data = skill(dir); mutate(data, dir);
  write(data.pack, 'sources.json', data.source); write(data.styles, 'OVERVIEW.sources.json', data.overview);
  const { exit_code, report } = invoke('check-skill.mjs', ['--root',dir]);
  const codes = report.errors.map(error => error.code);
  results.push({ case:name, expected, actual:report.result, detected_codes:codes, pass: expected === 'PASS' ? exit_code === 0 && report.result === 'PASS' : exit_code === 1 && codes.includes(expected) });
}
try {
  testRelease('release-standard-optical-material', 'PASS');
  testRelease('release-svg-intrinsic-size-before-viewbox', 'PASS', (j,dir) => {
    write(dir,'master.svg',rect().replace('viewBox="0 0 32 32"','viewBox="0 0 64 64"'));
    j.files[0].sha256=sha256(path.join(dir,'master.svg'));delete j.files[0].geometry_group;delete j.files[1].geometry_group;
  });
  testRelease('release-image-cannot-have-font-role', 'FONT_FORMAT', j => { j.files[3].role='font'; });
  testRelease('release-font-needs-license', 'FONT_LICENSE', (j,dir) => {
    const data=Buffer.alloc(12);data.writeUInt32BE(0x10000,0);write(dir,'fixture.ttf',data);
    j.files.push(entry(dir,'fixture.ttf','font','ttf'));
  });
  testRelease('release-sha-mismatch', 'HASH_MISMATCH', j => { j.files[1].sha256 = '0'.repeat(64); });
  testRelease('release-wrong-dimensions', 'DIMENSION_MISMATCH', j => { j.files[3].width = 33; });
  testRelease('release-missing-source-master', 'SOURCE_MASTER_REQUIRED', j => { delete j.files[3].source_master; });
  testRelease('release-unknown-source-master', 'SOURCE_MASTER', j => { j.files[3].source_master = 'unknown.svg'; });
  testRelease('release-source-master-cycle', 'SOURCE_MASTER_CYCLE', j => { j.masters.push({path:'logo.svg',kind:'vector'});j.files[0].source_master='logo.svg'; });
  testRelease('release-master-not-in-files', 'MASTER_FILE', j => { j.files = j.files.filter(file => file.path !== 'master.svg'); });
  testRelease('release-path-escape', 'PATH_ESCAPE', j => { j.files[1].path = '../outside.svg'; });
  testRelease('release-symlink-escape', 'PATH_ESCAPE', (j,dir) => { const outside=write(temp,'outside.svg',rect()); fs.symlinkSync(outside,path.join(dir,'escape.svg'));j.files[1].path='escape.svg';j.files[1].sha256=sha256(outside); });
  testRelease('release-opaque-as-transparent', 'PNG_ALPHA_REQUIRED', (j,dir) => { fs.copyFileSync(path.join(dir,'material.png'),path.join(dir,'logo.png'));j.files[3].sha256=sha256(path.join(dir,'logo.png')); });
  testRelease('release-empty-transparent-image', 'PNG_ALPHA_REQUIRED', (j,dir) => { run('magick',['-size','32x32','xc:none',path.join(dir,'logo.png')]);j.files[3].sha256=sha256(path.join(dir,'logo.png')); });
  testRelease('release-malformed-svg', 'TOOL_FAILED', (j,dir) => { write(dir,'logo.svg','<svg width="32" height="32"><path></svg>');j.files[1].sha256=sha256(path.join(dir,'logo.svg')); });
  testRelease('release-raster-wrapped-as-vector', 'SVG_EMBED', (j,dir) => { write(dir,'master.svg','<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><image href="data:image/png;base64,abc"/></svg>');j.files[0].sha256=sha256(path.join(dir,'master.svg')); });
  testRelease('release-material-vector-master', 'VECTOR_MASTER', j => { j.files[0].variant_kind = 'material';delete j.files[0].geometry_group;delete j.files[1].geometry_group; });
  testRelease('release-geometry-change', 'GEOMETRY_MISMATCH', (j,dir) => { write(dir,'logo.svg',rect('#fff',6));j.files[1].sha256=sha256(path.join(dir,'logo.svg')); });
  testRelease('release-optical-without-reason', 'OPTICAL_REASON', j => { delete j.files[2].variant_reason; });
  testRelease('release-optical-in-standard-group', 'GEOMETRY_SCOPE', j => { j.files[2].geometry_group='mark'; });
  for (const [name,ref,expected] of [
    ['single-quoted-local',"'#g'",'PASS'],['double-quoted-local','&quot;#g&quot;','PASS'],
    ['single-quoted-external',"'https://example.com/a.svg#g'",'SVG_EXTERNAL'],['double-quoted-external','&quot;https://example.com/a.svg#g&quot;','SVG_EXTERNAL']
  ]) testRelease(`release-${name}`,expected,(j,dir)=>{
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="g"><stop stop-color="#000"/></linearGradient></defs><path d="M4 4H28V28H4Z" fill="url(${ref})"/></svg>`;
    write(dir,'master.svg',svg);j.files[0].sha256=sha256(path.join(dir,'master.svg'));delete j.files[0].geometry_group;delete j.files[1].geometry_group;
  });
  testRelease('release-declared-fail', 'DECLARED_CHECK_FAILED', j => { j.checks.fixture.status='fail'; });
  testRelease('release-not-run-is-not-ready', 'PASS', j => { j.checks.fixture={status:'not_run',reason:'Fixture intentionally lacks visual review.'}; }, report => assert(report.ready_for_delivery === false,'READINESS','not_run must not be ready'));
  testRelease('release-pass-missing-evidence', 'FILE_MISSING', j => { j.checks.fixture.evidence='missing.md'; });
  testRelease('release-missing-svg-local-reference', 'SVG_LOCAL_REF', (j,dir) => { write(dir,'logo.svg',rect().replace('fill="#152837"','fill="url(#missing)"'));j.files[1].sha256=sha256(path.join(dir,'logo.svg')); });
  testRelease('release-svg-comment-is-not-element', 'PASS', (j,dir) => { write(dir,'logo.svg',rect('#fff').replace('<path','<!-- An <image> is only mentioned here. -->\n<path'));j.files[1].sha256=sha256(path.join(dir,'logo.svg')); });
  testHtml('release-html-fixed-canvas-png', 'PASS');
  testHtml('release-ordinary-html-keeps-existing-contract', 'PASS', (j,dir) => {
    write(dir,'guide.html','<p>HTML documentation fragment: not a layout master.</p>');
    j.files.push(entry(dir,'guide.html','documentation','html'));
  });
  testHtml('release-html-only-master', 'PASS', (j,dir) => {
    const kept = new Set(['source/layout.html','source/layout.css','application.png','review.md']);
    for (const record of j.files) if (!kept.has(record.path)) fs.unlinkSync(path.join(dir,record.path));
    j.files = j.files.filter(record => kept.has(record.path));
    j.masters = j.masters.filter(master => master.kind === 'html');
  });
  testHtml('release-html-optional-script-with-static-content', 'PASS', (j,dir) => {
    const sentinel = path.join(dir,'script-executed.txt');
    replaceHtml(j,dir,htmlLayout(`<main><h1>Static content</h1><p>Optional enhancement</p></main><script>require('node:fs').writeFileSync(${JSON.stringify(sentinel)}, 'unexpected');</script>`));
    j.checks.fixture.reason = 'Script source is a synthetic execution sentinel; the validator must not execute it.';
  }, report => assert(!report.warnings.some(warning => warning.includes('script-executed.txt')), 'HTML_EXECUTION', 'HTML scripts must not execute'));
  testHtml('release-html-charset-http-equiv', 'PASS', (j,dir) => replaceHtml(j,dir,htmlLayout(undefined,'<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">')));
  testHtml('release-html-raster-master-chain', 'PASS', j => {
    j.masters.push({path:'application.png',kind:'raster'});
    j.files.find(record => record.path === 'logo.png').source_master = 'application.png';
  });
  testHtml('release-html-missing-file', 'FILE_MISSING', (_,dir) => fs.unlinkSync(path.join(dir,'source/layout.html')));
  testHtml('release-html-sha-mismatch', 'HASH_MISMATCH', j => { j.files.find(record => record.path === 'source/layout.html').sha256='0'.repeat(64); });
  testHtml('release-html-unknown-master-kind', 'MASTER_KIND', j => { j.masters.find(master => master.kind === 'html').kind='code'; });
  testHtml('release-html-wrong-role', 'HTML_MASTER', j => { j.files.find(record => record.path === 'source/layout.html').role='application'; });
  testHtml('release-html-wrong-format', 'HTML_MASTER', j => { j.files.find(record => record.path === 'source/layout.html').format='md'; });
  testHtml('release-html-image-fields-forbidden', 'IMAGE_FIELDS_SCOPE', j => { j.files.find(record => record.path === 'source/layout.html').width=1200; });
  testHtml('release-html-plain-text-disguise', 'HTML_DOCUMENT', (j,dir) => replaceHtml(j,dir,'This file is not an HTML layout source.'));
  testHtml('release-html-png-disguise', 'HTML_ENCODING', (j,dir) => replaceHtml(j,dir,fs.readFileSync(path.join(dir,'application.png'))));
  testHtml('release-html-incomplete-document', 'HTML_DOCUMENT', (j,dir) => replaceHtml(j,dir,htmlLayout().replace('</body>','')));
  testHtml('release-html-missing-charset', 'HTML_CHARSET', (j,dir) => replaceHtml(j,dir,htmlLayout(undefined,'')));
  testHtml('release-html-charset-mentioned-is-not-declared', 'HTML_CHARSET', (j,dir) => replaceHtml(j,dir,htmlLayout(undefined,'<meta data-note="charset=utf-8">')));
  testHtml('release-html-empty-spa-body', 'HTML_STATIC_CONTENT', (j,dir) => replaceHtml(j,dir,htmlLayout('<div id="app"></div><script>document.getElementById("app").innerHTML="<h1>Generated</h1><p>Script-only content</p>";</script>')));
  testHtml('release-html-template-only-body', 'HTML_STATIC_CONTENT', (j,dir) => replaceHtml(j,dir,htmlLayout('<template><main><h1>Not rendered</h1><p>Template content</p></main></template><div id="app"></div>')));
  testHtml('release-html-flattened-image', 'HTML_STATIC_CONTENT', (j,dir) => replaceHtml(j,dir,htmlLayout('<main><img src="../application.png" alt="Flattened poster text"></main>')));
  testHtml('release-html-single-text-element', 'PASS', (j,dir) => replaceHtml(j,dir,htmlLayout('<p>Single text element</p>')));
  testHtml('release-html-as-vector', 'VECTOR_MASTER', j => { j.masters.find(master => master.kind === 'html').kind='vector'; });
  testHtml('release-html-as-raster', 'RASTER_MASTER', j => { j.masters.find(master => master.kind === 'html').kind='raster'; });
  testHtml('release-html-to-svg', 'HTML_DERIVATIVE_FORMAT', j => { j.files.find(record => record.path === 'logo.svg').source_master='source/layout.html'; });
  testHtml('release-html-to-nonimage', 'HTML_DERIVATIVE_FORMAT', j => { j.files.find(record => record.path === 'source/layout.css').source_master='source/layout.html'; });
  testHtml('release-html-geometry-group-forbidden', 'IMAGE_FIELDS_SCOPE', j => { j.files.find(record => record.path === 'source/layout.html').geometry_group='mark'; });
  testHtml('release-html-source-master-cycle', 'SOURCE_MASTER_CYCLE', j => {
    j.masters.push({path:'application.png',kind:'raster'});
    j.files.find(record => record.path === 'source/layout.html').source_master='application.png';
  });
  testHtml('release-html-not-run-is-not-ready', 'PASS', j => { j.checks.fixture={status:'not_run',reason:'Browser rendering has not been run for this mechanical fixture.'}; }, report => assert(report.ready_for_delivery === false,'READINESS','HTML not_run must not be ready'));
  testSkill('skill-schema-variants-and-catalog','PASS');
  testSkill('skill-bad-frontmatter','FRONTMATTER_FIELD', (_,dir) => write(dir,'SKILL.md','---\nname: brand-design\n---\n# Fixture\n'));
  testSkill('skill-empty-block-description','FRONTMATTER_FIELD', (_,dir) => write(dir,'SKILL.md','---\nname: brand-design\ndescription: |\n---\n# Fixture\n'));
  testSkill('skill-multiline-description','PASS', (_,dir) => write(dir,'SKILL.md','---\nname: brand-design\ndescription: >\n  Fixture description.\n  Second line.\n---\n# Fixture\n'));
  testSkill('skill-fenced-broken-link-is-ignored','PASS', (_,dir) => fs.appendFileSync(path.join(dir,'SKILL.md'),'\n```md\n[example](missing.md)\n```\n'));
  testSkill('skill-broken-link','FILE_MISSING', (_,dir) => fs.appendFileSync(path.join(dir,'SKILL.md'),'\n[missing](missing.md)\n'));
  testSkill('skill-duplicate-rule','CARD_DUPLICATE', (_,dir) => fs.appendFileSync(path.join(dir,'references/rules.md'),'\n## BD-TEST-001 · Duplicate\n'));
  testSkill('skill-card-missing-field','CARD_FIELD', (_,dir) => { const f=path.join(dir,'references/rules.md');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('- 验证：Fixture verification.','')); });
  testSkill('skill-card-empty-field','CARD_FIELD', (_,dir) => { const f=path.join(dir,'references/rules.md');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('- 规则：Fixture rule.','- 规则：')); });
  testSkill('skill-card-invalid-id','CARD_ID', (_,dir) => { for(const relative of ['references/rules.md','references/00-catalog.md']){const f=path.join(dir,relative);fs.writeFileSync(f,fs.readFileSync(f,'utf8').replaceAll('BD-TEST-001','BD-TEST-X1').replaceAll('bd-test-001','bd-test-x1'));} });
  testSkill('skill-catalog-wrong-anchor','LINK_ANCHOR', (_,dir) => write(dir,'references/00-catalog.md','# Catalog\n[BD-TEST-001](rules.md#missing)\n'));
  testSkill('skill-unknown-source','SOURCE_REFERENCE', data => { data.source.samples[0].asset_id='missing'; });
  testSkill('skill-duplicate-sample','ID_DUPLICATE', data => { data.source.samples.push(structuredClone(data.source.samples[0])); });
  const addEnhancement = data => {
    data.source.samples[0].display_file='enhanced.png';
    data.source.samples[0].enhancement={kind:'ai_clarity_enhancement',input_file:'preview.png',output_file:'enhanced.png',tool:'fixture',prompt_id:'sample-1',prompt_file:'PROMPT.json',width:32,height:32,sha256:data.hash,review:{status:'fixture'}};
    data.overview.members[0].file='fixture/enhanced.png';data.overview.members[0].ai_enhanced=true;
  };
  testSkill('skill-preview-enhancement-input','PASS', addEnhancement);
  testSkill('skill-cross-source-enhancement-input','ENHANCEMENT_PROVENANCE', data => {
    addEnhancement(data);fs.copyFileSync(path.join(data.pack,'preview.png'),path.join(data.pack,'other.png'));
    data.source.assets.push({...data.source.assets[0],id:'source-2',original_file:'other.png',preview_file:'other.png'});
    data.source.samples[0].enhancement.input_file='other.png';
  });
  testSkill('skill-group-membership','GROUP_MEMBERS', data => { data.source.reference_groups[0].sample_ids=['missing']; });
  testSkill('skill-source-format-mismatch','FORMAT_MISMATCH', data => { data.source.assets[0].original_content_type='image/jpeg'; });
  testSkill('skill-source-dimensions-missing','SOURCE_IMAGE_FIELDS', data => { delete data.source.assets[0].width;delete data.source.assets[0].height; });
  testSkill('skill-source-sha-mismatch','HASH_MISMATCH', data => { data.source.assets[0].original_sha256='0'.repeat(64); });

  function applicationFixture(_, dir) {
    const base = path.join(dir, 'libraries/applications');
    write(base, 'INDEX.md', '# Application fixture\n');
    write(base, 'contract.md', '# Fixture contract\n');
    write(base, 'render.mjs', '// Fixture: static checker does not run this file.\n');
    write(base, 'card.html', '<!doctype html><html lang="{{LANG}}"><head><title>{{BRAND_NAME}}</title><link rel="stylesheet" href="brand.css"></head><body class="{{THEME}}" data-width="{{WIDTH}}" data-height="{{HEIGHT}}" style="{{LAYOUT_STYLE}}"><img src="{{LOGO_SRC}}" alt="{{BRAND_NAME}}"><h1>{{TITLE}}</h1></body></html>');
    write(base, 'templates.json', {schema_version:1,templates:[{id:'card',width:1200,height:630,file:'card.html'}]});
    return base;
  }
  testSkill('application-index-valid','PASS', applicationFixture);
  testSkill('application-missing-template','FILE_MISSING', (data,dir) => { const base=applicationFixture(data,dir); fs.unlinkSync(path.join(base,'card.html')); });
  testSkill('application-unknown-slot','APPLICATION_MARKERS', (data,dir) => { const base=applicationFixture(data,dir); fs.appendFileSync(path.join(base,'card.html'),'{{UNKNOWN}}'); });
  testSkill('application-required-slot-missing','APPLICATION_MARKERS', (data,dir) => { const base=applicationFixture(data,dir), file=path.join(base,'card.html'); fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('{{TITLE}}','Fixed content')); });
  testSkill('application-missing-css','APPLICATION_CSS', (data,dir) => { const base=applicationFixture(data,dir), file=path.join(base,'card.html'); fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('href="brand.css"','href="unmapped.css"')); });
  testSkill('application-bad-dimensions','APPLICATION_DIMENSIONS', (data,dir) => { const base=applicationFixture(data,dir); write(base,'templates.json',{schema_version:1,templates:[{id:'card',width:0,height:630,file:'card.html'}]}); });
  testSkill('application-duplicate-id','ID_DUPLICATE', (data,dir) => { const base=applicationFixture(data,dir), t={id:'card',width:1200,height:630,file:'card.html'}; write(base,'templates.json',{schema_version:1,templates:[t,t]}); });
  testSkill('application-layout-slot-missing','APPLICATION_MARKERS', (data,dir) => { const base=applicationFixture(data,dir), file=path.join(base,'card.html'); fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('{{LAYOUT_STYLE}}','')); });
  testSkill('application-template-path-escape','PATH_ESCAPE', (data,dir) => { const base=applicationFixture(data,dir); write(dir,'outside.html',fs.readFileSync(path.join(base,'card.html'),'utf8')); write(base,'templates.json',{schema_version:1,templates:[{id:'card',width:1200,height:630,file:'../../outside.html'}]}); });
  const badFont=write(temp,'bad.ttf','not a font');
  let fontCode; try {fontSignature(badFont,'ttf');}catch(error){fontCode=error.code;}
  results.push({case:'font-invalid-signature',expected:'FONT_SIGNATURE',actual:fontCode,pass:fontCode==='FONT_SIGNATURE'});
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
const report = { schema_version:1, generated_at:new Date().toISOString(), scope:'Mechanical validator self-tests; synthetic fixtures, not Agent behavior or visual design validation.', node_version:process.version, validator_sha256:Object.fromEntries(['check-skill.mjs','validate-release.mjs','lib/validation.mjs','self-test.mjs'].map(file=>[file,sha256(path.join(here,file))])), result:results.every(test=>test.pass)?'PASS':'FAIL', total:results.length, passed:results.filter(test=>test.pass).length, cases:results, fixture_cleanup:'complete' };
const output = JSON.stringify(report,null,2)+'\n';
if(args[0]==='--output') { const destination=path.resolve(args[1]);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,output); }
process.stdout.write(output);
process.exitCode=report.result==='PASS'?0:1;
