#!/usr/bin/env node
// Regression tests for the evidence-explorer plugin's data binding.
//
// Run from the repository root:  node scripts/test_evidence_explorer.mjs
// Exits non-zero on any failure. No dependencies beyond node >= 18.
//
// Every case below corresponds to a defect that actually shipped. A complete
// evidence set once bound an empty payload while the MyST build stayed green
// (wrong filenames, a 02..13 loop, cite-key strings read as finding records,
// and `catch { continue }` hiding all of it); the opposite fix then failed the
// template's own build, whose evidence directory is legitimately empty.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, 'test_fixtures', 'evidence_explorer');
const plugin = await import(resolve(HERE, '..', 'plugins', 'evidence-explorer-plugin.mjs'));

// Totals across scripts/test_fixtures/evidence_explorer/populated/.
const EXPECTED = { sections: 3, findings: 6, conflicts: 3, figure_data: 3 };

function render(dirName, opts = {}) {
  const warnings = [];
  const node = {
    type: 'evidence-explorer',
    evidenceDir: resolve(FIXTURES, dirName), // absolute: resolve() returns it unchanged
    height: '700px',
    ...opts,
  };
  const utils = { fileWarn: (_vfile, message) => warnings.push(message) };
  let threw = null;
  try {
    plugin.default.transforms[0].plugin({}, utils)(
      { type: 'root', children: [node] },
      { path: resolve(FIXTURES, 'page.md') },
    );
  } catch (err) {
    threw = err;
  }
  const payload = node.type === 'anywidget' ? JSON.parse(node.model.evidence_data) : null;
  return { node, payload, warnings, threw };
}

const cases = [
  ['populated binds every section', () => {
    const r = render('populated');
    if (r.threw) return `threw: ${r.threw.message}`;
    if (!r.payload) return `expected a bound widget, got node.type=${r.node.type}`;
    for (const [key, want] of Object.entries(EXPECTED)) {
      const got = r.payload[key].length;
      if (got !== want) return `${key}: bound ${got}, fixtures hold ${want}`;
    }
    if (!r.payload.findings.every((f) => f && typeof f === 'object')) {
      return 'a non-object leaked into findings (cite-key strings are not records)';
    }
    if (r.warnings.length) return `unexpected warning: ${r.warnings[0]}`;
    return null;
  }],

  ['cite-key strings stay out of findings', () => {
    const r = render('populated');
    if (r.threw || !r.payload) return 'did not bind';
    const ids = new Set(r.payload.findings.map((f) => f.finding_id));
    // populated/evidence_section_01.json lists cite keys under argument_groups;
    // those must not become findings, and no finding may be missing its id.
    if (ids.has(undefined)) return 'a finding arrived without finding_id';
    if (r.payload.findings.length !== EXPECTED.findings) return 'finding count drifted';
    return null;
  }],

  ['empty directory renders a placeholder, build survives', () => {
    const r = render('template_like');
    if (r.threw) return `threw on an un-instantiated template: ${r.threw.message}`;
    if (r.node.type !== 'paragraph') return `expected a paragraph, got ${r.node.type}`;
    if (!r.warnings.length) return 'no build warning was emitted';
    return null;
  }],

  ['unmatched JSON is fatal', () => {
    const r = render('stray');
    if (!r.threw) return `expected a throw, got node.type=${r.node.type}`;
    if (r.threw.constructor.name !== 'EvidenceLoadError') {
      return `expected EvidenceLoadError, got ${r.threw.constructor.name}`;
    }
    return null;
  }],

  ['missing directory is fatal', () => {
    const r = render('no_such_directory');
    if (!r.threw) return `expected a throw, got node.type=${r.node.type}`;
    return null;
  }],

  ['legacy filenames still load', () => {
    const r = render('legacy');
    if (r.threw) return `threw: ${r.threw.message}`;
    if (!r.payload || r.payload.sections.length !== 2) {
      return `expected 2 sections, got ${r.payload ? r.payload.sections.length : 'none'}`;
    }
    return null;
  }],

  ['a gap in the section run warns but renders', () => {
    const r = render('gap');
    if (r.threw) return `threw: ${r.threw.message}`;
    if (!r.payload || r.payload.sections.length !== 3) return 'expected 3 sections';
    if (!r.warnings.some((w) => w.includes('03') && w.includes('04'))) {
      return `expected a warning naming sections 03 and 04, got: ${r.warnings.join(' | ')}`;
    }
    return null;
  }],

  ['a :sections: count that disagrees warns', () => {
    const r = render('populated', { sectionCount: 12 });
    if (r.threw) return `threw: ${r.threw.message}`;
    if (!r.warnings.length) return 'expected a warning about the declared count';
    return null;
  }],
];

let failed = 0;
for (const [name, run] of cases) {
  let problem;
  try {
    problem = run();
  } catch (err) {
    problem = `test itself threw: ${err.message}`;
  }
  if (problem) failed += 1;
  console.log(`${problem ? 'FAIL' : 'ok  '}  ${name}${problem ? ` — ${problem}` : ''}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed === 0 ? 0 : 1);
