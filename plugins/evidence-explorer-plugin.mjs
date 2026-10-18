// evidence-explorer-plugin.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const evidenceDirective = {
  name: 'evidence-explorer',
  doc: 'Interactive evidence database explorer widget. The :evidence-dir: option is resolved relative to the calling markdown file. Default "../evidence" is correct when the directive is placed in a content/*.md page (the conventional layout). Section files are discovered from that directory, so no section count is assumed; set the optional :sections: option to the review\'s section count to have an incomplete load reported as a build warning.',
  options: {
    'evidence-dir': { type: String },
    height: { type: String },
    sections: { type: Number },
  },
  run(data) {
    return [{
      type: 'evidence-explorer',
      evidenceDir: data.options?.['evidence-dir'] || '../evidence',
      height: data.options?.height || '700px',
      sectionCount: data.options?.sections || 0,
    }];
  },
};

// Raised when no evidence file can be read; deliberately not caught, so a
// regression in the filenames or the directory fails the build instead of
// publishing an empty explorer.
class EvidenceLoadError extends Error {}

// Universal conflict normalizer — handles all 15+ schema variants
function normalizeConflict(c, sec) {
  const norm = { section: sec };

  // Description / topic
  norm.topic = c.topic || c.description || '';
  norm.nature_of_conflict = c.nature_of_conflict || c.description || c.topic || '';
  norm.resolution_status = c.resolution_status || c.resolution || '';

  // Extract Side A text
  if (c.paper1_claim) {
    norm.side_a = c.paper1_claim;
  } else if (c.paper_a_claim) {
    norm.side_a = c.paper_a_claim;
  } else if (c.claim_a) {
    norm.side_a = c.claim_a;
  } else if (typeof c.side_a === 'string') {
    norm.side_a = c.side_a;
  } else if (c.side_a && typeof c.side_a === 'object') {
    norm.side_a = c.side_a.position || c.side_a.claim || JSON.stringify(c.side_a).slice(0, 200);
  } else {
    norm.side_a = '';
  }

  // Extract Side B text
  if (c.paper2_claim) {
    norm.side_b = c.paper2_claim;
  } else if (c.paper_b_claim) {
    norm.side_b = c.paper_b_claim;
  } else if (c.claim_b) {
    norm.side_b = c.claim_b;
  } else if (typeof c.side_b === 'string') {
    norm.side_b = c.side_b;
  } else if (c.side_b && typeof c.side_b === 'object') {
    norm.side_b = c.side_b.position || c.side_b.claim || JSON.stringify(c.side_b).slice(0, 200);
  } else {
    norm.side_b = '';
  }

  // Extract DOIs — try all known field patterns
  norm.paper_a_doi = c.paper1_doi || c.paper_a_doi || '';
  norm.paper_b_doi = c.paper2_doi || c.paper_b_doi || '';

  // If no DOIs from direct fields, try to extract from nested structures
  if (!norm.paper_a_doi) {
    // Check side_a dict for DOIs
    if (c.side_a && typeof c.side_a === 'object') {
      const evidence = c.side_a.supporting_evidence || c.side_a.evidence || '';
      const doiMatch = String(evidence).match(/10\.\d{4,}\/[^\s,;)]+/);
      if (doiMatch) norm.paper_a_doi = doiMatch[0];
    }
    // Check papers_side_a, papers_supporting_view_a, etc.
    for (const key of Object.keys(c)) {
      if (key.includes('papers') && key.includes('a') && Array.isArray(c[key])) {
        const dois = c[key].filter(p => typeof p === 'string' && p.startsWith('10.'));
        if (dois.length > 0) norm.paper_a_doi = dois.join(', ');
      }
    }
  }
  if (!norm.paper_b_doi) {
    if (c.side_b && typeof c.side_b === 'object') {
      const evidence = c.side_b.supporting_evidence || c.side_b.evidence || '';
      const doiMatch = String(evidence).match(/10\.\d{4,}\/[^\s,;)]+/);
      if (doiMatch) norm.paper_b_doi = doiMatch[0];
    }
    for (const key of Object.keys(c)) {
      if (key.includes('papers') && key.includes('b') && Array.isArray(c[key])) {
        const dois = c[key].filter(p => typeof p === 'string' && p.startsWith('10.'));
        if (dois.length > 0) norm.paper_b_doi = dois.join(', ');
      }
    }
  }

  // For papers[] array format — extract DOIs from array items
  if (Array.isArray(c.papers) && (!norm.paper_a_doi || !norm.paper_b_doi)) {
    const dois = c.papers
      .map(p => typeof p === 'string' ? p : (p.doi || ''))
      .filter(d => d);
    if (dois.length >= 1 && !norm.paper_a_doi) norm.paper_a_doi = dois[0];
    if (dois.length >= 2 && !norm.paper_b_doi) norm.paper_b_doi = dois[1];
  }

  // For section 12 custom fields (papers_supporting_divisive, papers_SST_carries_prediction, etc.)
  if (!norm.paper_a_doi || !norm.paper_b_doi) {
    const paperKeys = Object.keys(c).filter(k => k.startsWith('papers_'));
    if (paperKeys.length >= 2) {
      for (let i = 0; i < paperKeys.length && i < 2; i++) {
        const val = c[paperKeys[i]];
        const dois = Array.isArray(val) 
          ? val.map(p => typeof p === 'string' ? p : (p.doi || '')).filter(d => d)
          : [];
        if (i === 0 && !norm.paper_a_doi && dois.length > 0) {
          norm.paper_a_doi = dois.join(', ');
          if (!norm.side_a) norm.side_a = paperKeys[0].replace('papers_', '').replace(/_/g, ' ');
        }
        if (i === 1 && !norm.paper_b_doi && dois.length > 0) {
          norm.paper_b_doi = dois.join(', ');
          if (!norm.side_b) norm.side_b = paperKeys[1].replace('papers_', '').replace(/_/g, ' ');
        }
      }
    }
  }

  // Additional metadata
  norm.likely_reason = c.likely_reason || c.assessment || c.notes || c.significance || c.why_it_matters || '';

  return norm;
}

const evidenceTransform = {
  name: 'evidence-data-loader',
  stage: 'document',
  plugin: (opts, utils) => (tree, vfile) => {
    function transform(node) {
      if (node == null) return;
      if (node.type === 'evidence-explorer') {
        const docDir = vfile?.path ? dirname(vfile.path) : process.cwd();
        const evidenceDir = resolve(docDir, node.evidenceDir || '../evidence');
        // Current layout first, then the two legacy names kept for older trees.
        const NAME_PATTERNS = [
          (p) => 'evidence_section_' + p + '.json',
          (p) => 'section_' + p + '_evidence_package.json',
          (p) => 'section_' + p + '_evidence.json',
        ];
        const SECTION_FILE_RE =
          /^(?:evidence_section_(\d{2})\.json|section_(\d{2})_evidence(?:_package)?\.json)$/;
        // Discover the sections actually present rather than assuming a count: reviews
        // instantiated from this template have different numbers of sections, so any
        // hardcoded range silently drops real sections or hunts for absent ones.
        let entries = [];
        try {
          entries = readdirSync(evidenceDir);
        } catch (e) {
          throw new EvidenceLoadError(
            'evidence-explorer: evidence directory ' + evidenceDir + ' could not be read (' +
            e.message + '). The explorer would publish empty.'
          );
        }
        const presentSections = [...new Set(
          entries
            .map((f) => SECTION_FILE_RE.exec(f))
            .filter(Boolean)
            .map((m) => parseInt(m[1] ?? m[2], 10))
        )].sort((a, b) => a - b);
        if (presentSections.length === 0) {
          // An evidence directory holding no JSON at all is an un-instantiated template:
          // the packages are written by the review pipeline, so this page renders a
          // placeholder instead of failing the template's own build. JSON files that ARE
          // present but match no package name mean the naming has drifted — the failure
          // that once published an empty explorer — and that stays fatal.
          const jsonCount = entries.filter((f) => f.endsWith('.json')).length;
          if (jsonCount > 0) {
            throw new EvidenceLoadError(
              'evidence-explorer: ' + jsonCount + ' JSON file(s) in ' + evidenceDir +
              ' but none match an evidence-package name (' +
              NAME_PATTERNS.map((p) => p('NN')).join(', ') + '). The explorer would publish empty.'
            );
          }
          const msg = 'evidence-explorer: no evidence packages in ' + node.evidenceDir +
            ' yet; rendering a placeholder in place of the explorer.';
          if (utils && typeof utils.fileWarn === 'function') utils.fileWarn(vfile, msg, { node });
          else console.warn(msg);
          node.type = 'paragraph';
          node.children = [{
            type: 'text',
            value: 'Evidence Explorer: no evidence packages found in ' + node.evidenceDir +
              '. This page populates once the review pipeline writes evidence_section_NN.json.',
          }];
          return;
        }
        try {
          const sections = [];
          const allFindings = [];
          const allConflicts = [];
          const allFigureData = [];

          for (const sec of presentSections) {
            const padded = String(sec).padStart(2, '0');
            let raw;
            const tried = [];
            for (const pattern of NAME_PATTERNS) {
              const candidate = resolve(evidenceDir, pattern(padded));
              tried.push(candidate);
              try {
                raw = readFileSync(candidate, 'utf-8');
                break;
              } catch (e) { /* try the next naming convention */ }
            }
            if (raw === undefined) {
              throw new EvidenceLoadError(
                'evidence-explorer: the evidence file for section ' + padded + ' was found in ' +
                evidenceDir + ' but could not be read (tried ' + tried.join(', ') + ').'
              );
            }

            const ev = JSON.parse(raw);

            // Extract findings. The current package shape stores finding records in
            // ev.findings and uses argument_groups only to reference them by cite key,
            // so object-shaped argument-group entries are accepted but bare strings
            // (cite keys) are not treated as findings.
            let findings = Array.isArray(ev.findings) ? ev.findings.filter(f => f && typeof f === 'object') : [];
            if (findings.length === 0) {
              const ag = ev.argument_groups;
              if (ag && typeof ag === 'object') {
                for (const topicVal of Object.values(ag)) {
                  if (topicVal && typeof topicVal === 'object') {
                    const supporting = topicVal.supporting_findings || topicVal.supporting_evidence || [];
                    const counter = topicVal.counter_findings || topicVal.counter_evidence || [];
                    if (Array.isArray(supporting)) findings.push(...supporting.filter(f => f && typeof f === 'object'));
                    if (Array.isArray(counter)) findings.push(...counter.filter(f => f && typeof f === 'object'));
                  }
                }
              }
              if (Array.isArray(ev.unmatched_findings)) {
                findings.push(...ev.unmatched_findings.filter(f => f && typeof f === 'object'));
              }
            }

            // Normalize conflicts using the universal normalizer
            const conflicts = (ev.conflicts || []).map(c => normalizeConflict(c, sec));

            const figData = ev.figure_data || [];

            findings.forEach(f => {
              f.section = sec;
              f.section_title = ev.section_title || '';
              if (!f.tier && f.replication_status) f.tier = f.replication_status;
            });
            figData.forEach(fd => { fd.section = sec; });

            sections.push({
              section: sec,
              title: ev.section_title || ('Section ' + sec),
              papers: ev.unique_papers || ev.total_findings || findings.length,
              findings: findings.length,
              conflicts: conflicts.length,
              figure_comparisons: figData.length,
            });
            allFindings.push(...findings);
            allConflicts.push(...conflicts);
            allFigureData.push(...figData);
          }

          // Fail loudly. A silent `continue` on every read is what previously let an
          // empty explorer ship with a green build.
          if (sections.length === 0) {
            throw new EvidenceLoadError(
              'evidence-explorer: ' + presentSections.length + ' evidence file(s) were found in ' +
              evidenceDir + ' but none yielded a section. The explorer would publish empty.'
            );
          }
          // An interior gap in the discovered run, or a count that disagrees with an
          // explicit :sections: declaration, means the explorer is incomplete.
          const gaps = [];
          for (let s = presentSections[0]; s <= presentSections[presentSections.length - 1]; s++) {
            if (!presentSections.includes(s)) gaps.push(String(s).padStart(2, '0'));
          }
          const declared = node.sectionCount || 0;
          if (gaps.length > 0 || (declared && sections.length !== declared)) {
            const msg = 'evidence-explorer: loaded ' + sections.length + ' section(s) from ' +
              evidenceDir + (declared ? ', but :sections: declares ' + declared : '') +
              (gaps.length ? '; no evidence file for section(s) ' + gaps.join(', ') : '') +
              '; the explorer is incomplete.';
            if (utils && typeof utils.fileWarn === 'function') utils.fileWarn(vfile, msg, { node });
            else console.warn(msg);
          }
          if (allFindings.length === 0 || allConflicts.length === 0) {
            const msg = 'evidence-explorer: evidence files loaded (' + sections.length +
              ') but the bound payload has ' + allFindings.length + ' findings and ' +
              allConflicts.length + ' conflicts; the explorer would render empty panels.';
            if (utils && typeof utils.fileWarn === 'function') utils.fileWarn(vfile, msg, { node });
            else console.warn(msg);
          }

          node.type = 'anywidget';
          node.id = 'evidence-explorer-' + Date.now() + '-' + Math.random().toString(36).slice(2,9);
          node.esm = './evidence-explorer-widget.mjs';
          node.model = {
            evidence_data: JSON.stringify({
              sections: sections,
              findings: allFindings,
              conflicts: allConflicts,
              figure_data: allFigureData,
            }),
            height: node.height || '700px',
          };
        } catch (err) {
          if (err instanceof EvidenceLoadError) throw err;
          node.type = 'paragraph';
          node.children = [{ type: 'text', value: '[Evidence Explorer error: ' + err.message + ']' }];
        }
      }
      if (node.children) {
        for (const child of node.children) transform(child);
      }
    }
    transform(tree);
  },
};

export default {
  name: 'Evidence Explorer Plugin',
  directives: [evidenceDirective],
  transforms: [evidenceTransform],
};
