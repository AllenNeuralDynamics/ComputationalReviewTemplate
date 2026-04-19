# DATAML Phase Protocols

> **Template-aware:** This pipeline assumes the repo was created from `ComputationalReviewTemplate`. All directory structure, plugins, widgets, `myst.yml`, `deploy.yml`, and `authors.yml` already exist. Phase 14 UPDATES existing files (adds section entries to `myst.yml` toc, populates `content/provenance.md`). Phase 20 pushes content into the existing structure — it does NOT create directories or deploy infrastructure.


Delegation templates for all DATAML mechanical phases: citation infrastructure (3), evidence curation (5), bibliography (9), methods (13), document assembly (14), citation triples (15), fix preparation (17), fix application (19), and repository push (20).

**Information barrier:** No information barrier. DATAML performs mechanical work (database queries, JSON manipulation, file assembly, git operations). Seeing all phase templates does not bias scientific judgment because DATAML does not make scientific judgments.

---

## Phase 3: Citation Infrastructure

**Agent:** DATAML

The coordinator delegates this entire phase to DATAML with the evidence artifacts and the task description below. The coordinator's role is to assemble the artifact references and verify the output — not to run the CrossRef queries itself.

**PREREQUISITE GATE:** Before starting this transition, the coordinator must
save `gate_evidence_compliance.json` confirming all clusters passed compliance.

*(Coordinator saves gate_evidence_compliance.json with per-cluster metrics after all clusters pass)*

Phase 2 evidence artifacts are too large for a single agent to load (~100-300KB each, 1+ MB total). Before Phase 4, the coordinator builds a condensed scaffold input in Python containing per-cluster:
- `strongest_evidence` and `weakest_evidence_cited` (full detail)
- `conflicts` (full detail)
- `figure_data` (full detail — needed for figure planning)
- `evidence_gaps` and `unreplicated_claims` (full detail)
- Up to 10 `replicated_claims` and 10 `contested_claims` (truncated claim strings)
- Paper count per cluster

This summary does NOT include individual findings, DOIs, or source sentences — the scaffold doesn't need them. Target: <200KB. Full evidence artifacts are preserved for Phase 7.

**STRUCTURAL ENFORCEMENT — citation_key_map and author_name_table:**

These two artifacts are the SOLE source of citation keys and author names for the entire pipeline. If they are not built here, Phase 7 writers will invent their own keys in incompatible formats (bare DOIs, journal abbreviations, single-letter initials), and will hallucinate author names from LLM memory.

The Phase 7 delegation template (below) includes `{{artifact:<citation_key_map_vid>}}` and `{{artifact:<author_name_table_vid>}}`. If these artifacts don't exist, the artifact markers won't resolve and the delegation will contain literal unresolved strings — making the delegation structurally invalid. This is intentional: it makes skipping the citation_key_map construction structurally impossible.

**gate_citation_infrastructure.json MUST include:**
```json
{
  "citation_key_map_vid": "<version_id — null blocks all downstream phases>",
  "author_name_table_vid": "<version_id — null blocks Phase 7>",
  "total_dois_mapped": "<int>",
  "crossref_failures": "<int>",
  "crossref_failure_dois": ["<list of DOIs that failed lookup>"]
}
```

If `citation_key_map_vid` is null, Phase 4 CANNOT start. Verify: `assert gate_data['citation_key_map_vid'] is not None`.

The coordinator also builds the `citation_key_map` programmatically:
*(CrossRef querying + cite_key_map construction delegated to DATAML — see Phase 3 delegation template)*

This produces a `citation_key_map` (DOI → cite_key) with ZERO LLM involvement in author names. Save as artifact and pass to all subsequent phases.

**Also build an `author_name_table`** for Phase 7 writers to use for prose-style mentions:
*(Author name table construction delegated to DATAML)*

Save as artifact alongside the citation_key_map.


## Phase 5: Evidence Curation

**Agent:** DATAML

The coordinator delegates this phase to DATAML with the evidence artifacts, scaffold, and citation_key_map. The coordinator provides the cluster→section mapping (from the scaffold) in the task description.

The coordinator assigns Phase 2 findings to sections programmatically using the cluster→section mapping defined in the scaffold:

*(Cluster→section assignment delegated to DATAML — deterministic mapping from scaffold)*

Papers may appear in multiple section packages if their cluster maps to multiple sections. The total unique papers across all packages should be ≥75% of the total unique papers from Phase 2.

The per-section evidence packages are saved as artifacts and provided to Phase 7 section writers AT FULL PRECISION — including all `claim_source_sentences` and `effect_size_source_sentences`. No compression.

**Per-section scaffold extract:** The full scaffold is too large (~140KB)
for a section writer to efficiently locate their specific plan. In
addition to the evidence package, the coordinator builds a focused
scaffold extract for each section containing ONLY:
- Their section's plan from `section_plans` (thesis, key evidence,
  conflicts, connections, word target)
- Adjacent section plans for N-1 and N+1 (thesis + connection fields only)
- Their section's figure specifications from `figure_registry`
- The document figure style guide
- The cross-cutting elements (terminology, abbreviations, voice guide)
- The opening and closing constraints

Target: <20KB per extract. Save as `section_NN_scaffold_extract.json`.

*(Per-section scaffold extracts built by DATAML — each <20KB)*

Phase 7 delegation templates should reference the per-section extract instead of the full scaffold. The full scaffold remains available as a fallback if the writer needs broader context.

Transform per-topic evidence into per-section evidence packages organized by ARGUMENT, not by paper.

**Per-section package format:**
```
SECTION [N] EVIDENCE PACKAGE

ARGUMENT 1: "[Thesis from scaffold]"
├── Supporting evidence:
│   ├── Paper A: [claim, effect_size, n, species, preparation, replication_status]
│   └── Synthesis: [what these papers together establish]
├── Counter-evidence:
│   └── Paper C: [contradicting finding, explanation of discrepancy]
├── Figure data: [pre-extracted table from Phase 2 figure_data]
└── Cross-references: ["Reference Section M's finding about X"]

FIGURES FOR THIS SECTION:
├── Figure fig:secN-xxx: [data table ready for plotting]

OPENING CONSTRAINT: "Begin where Section [N-1] left off with [specific topic]"
CLOSING CONSTRAINT: "End by setting up [specific topic] for Section [N+1]"

SUGGESTED PARAGRAPH GROUPINGS:
├── Paragraph 1: "[Convergent finding] — Papers A, B, C, D, E all support X"
│   └── What binds them: [shared conclusion, complementary methods]
│   └── Treatment tier: A = landmark (detailed), B–E = core/confirmatory (integrated)
├── Paragraph 2: "[Conflict] — Papers F, G vs H, I disagree on Y"
│   └── What explains the discrepancy: [method, species, preparation]
│   └── Treatment tier: F, H = landmark (detailed methods comparison), G, I = core (supporting)
├── Paragraph 3: "[Resolution or open question] — Paper J provides partial resolution, K–M confirm"
│   └── What remains unresolved: [specific gap]
│   └── Treatment tier: J = landmark, K–M = confirmatory

These groupings are suggestions, not mandates — the section writer may reorganize. But they signal that paragraphs should cite 5–8 papers on average, with landmark papers receiving detailed treatment and confirmatory papers cited as converging evidence. The target is synthesis density, not sequential coverage.
```

**Citation discipline:** Evidence packages must only contain papers from Phase 2 outputs. Do not introduce new citations during curation. If a gap is identified that requires additional evidence, flag it for a supplementary Phase 2 search rather than filling it from LLM memory.

**Gate:** Every package must contain:
- **Paper count (tiered by section importance):**
  - Core sections (the main cell-type or function sections identified in the scaffold): ≥40 unique papers
  - Supporting sections (methods, classification, development, species, modeling): ≥30 unique papers
  - Synthesis/conclusion sections: ≥20 unique papers (these re-cite from earlier sections)
  - If any section falls below its tier, flag for supplementary Phase 2 search before proceeding.
- These are FLOORS, not targets. Include ALL relevant papers from Phase 2 — do not compress to the minimum. If Phase 2 gathered 40 papers relevant to a section, the evidence package should contain 40 papers, not 15.
- **Anti-compression check:** If the total unique papers assigned across all sections is less than 75% of the total unique papers gathered in Phase 2, justify why the remainder were excluded. A common failure mode is that the curation agent treats the floor as a target and drops relevant papers to stay near the minimum.
- ≥1 conflict per section
- Figure data for planned figures
- Cross-refs and opening/closing constraints
- All papers traceable to Phase 2


**Full precision assertion (MANDATORY):**
Every finding in the per-section evidence packages MUST retain ALL schema fields from Phase 2:
claim, claim_source_sentence, evidence, effect_size, effect_size_source_sentence, n, 
study_system, replication_status, replication_evidence_dois, doi, text_access.

Gate check: sample 10 random findings per section. If ANY is missing claim_source_sentence 
or text_access → the entire curation is non-compliant. Send back to DATAML.

**CANONICAL CITATION KEY MAP AND AUTHOR NAME TABLE:**
Phase 2 compliance produced two artifacts:
1. `citation_key_map` — DOI → cite_key, mechanically derived from database first authors
2. `author_name_table` — cite_key → {first_author, display, et_al, all_authors}, mechanically derived from database author lists

Both are passed to every Phase 7 section writer. The citation_key_map ensures consistent cite_keys. The author_name_table is the ONLY permitted source for prose-style author mentions — writers must not generate author names from memory.

Phase 5 also assigns cite_keys to all findings in the evidence packages using the citation_key_map. Implementation:
```python
for section_package in all_packages:
    for finding in section_package['findings']:
        doi = finding['doi']
        finding['cite_key'] = citation_key_map[doi]
```

The key format rules are:
- Format: FirstAuthorLastNameYear (e.g., Cardin2009, Tasic2018)
- ASCII only (no accented characters)
- Disambiguation for same first-author + year: append a/b (e.g., Lee2012a, Lee2012b)

**GATE ARTIFACT:** After all evidence packages pass the gate checks above,
the coordinator saves `gate_evidence_curated.json`:

*(Gate artifact built by DATAML — coordinator verifies coverage ≥75% and per-section floors)*


**MANDATORY — Per-agent input filtering for Phase 7:**
Before passing `citation_key_map` and `author_name_table` to Phase 7 writers, DATAML MUST filter each to contain ONLY the DOIs/keys present in that section's evidence package. A section writer with 70 cited papers should receive a 70-entry key map, not the full 973-entry map.

**MANDATORY — Conflict normalization:**
DATAML MUST normalize all conflict schemas from Phase 2 into the canonical format (`paper_a_doi`, `paper_b_doi`, `paper_a_claim`, `paper_b_claim`, `nature_of_conflict`, `resolution_status`) before saving per-section evidence packages. Per-section evidence package `argument_groups` MUST use field names: `supporting_findings`, `counter_findings` (not `_evidence`).


## Phase 9: Bibliography

**Agent:** DATAML

**PREREQUISITE:**
```python
require_phase('4b_critic')
check_gate('gate_critic_complete.json')
```

After section drafting, BEFORE assembly. For each \citep{}/\citet{} key:

1. Look up the DOI (carried from Phase 2 findings via the cite_key→DOI mapping) on CrossRef: `GET https://api.crossref.org/works/{doi}`
2. Extract author, title, journal, year, volume, pages from the CrossRef response
3. Create BibTeX entry with the cite_key as entry key and CrossRef-fetched fields
4. If CrossRef lookup fails, search Europe PMC by DOI as fallback
5. Flag unfindable citations with `% WARNING:` prefix in a BibTeX comment (ASCII only — do NOT use emoji or Unicode symbols anywhere in `.bib` files. BibTeX's parser cannot handle non-ASCII bytes and will silently skip all entries after the offending byte, causing mass citation loss.)
6. Ensure author fields use BibTeX-standard `and` separators, not commas (e.g., `Smith, John and Jones, Alice`)
7. Deduplicate bib entries with the same DOI — keep the most complete entry

**Contamination safety net (run during Phase 9):**
Because cite_keys and author names are now mechanically derived from database metadata, Bhatt contamination should be structurally impossible. This scan confirms that:
```bash
# Should return zero fabricated results in a compliant pipeline
grep -in "bhatt" *.bib
grep -inE "\\\\cite[pt]\{Bhatt|and Bhatt|Bhatt and|Bhatt et al|Bhatt's|\(Bhatt|De Bhatt|Bhatt colleagues" section_*.tex
```
If ANY match is found: this indicates a pipeline compliance failure — either:
(a) A Phase 2 agent included author names despite instructions not to, OR
(b) A Phase 7 writer used author names from memory despite the author_name_table being provided, OR
(c) A cite_key slipped through without mechanical assignment

For each match:
1. Identify the associated DOI
2. Look up the correct first author from CrossRef
3. Rename the cite_key mechanically (find-and-replace across all .tex and .bib files)
4. Rewrite in-text mentions using the author_name_table
5. Log the failure as a pipeline compliance incident

> **Note:** "Bhatt" IS a real surname. If CrossRef confirms a real Bhatt first author for a given DOI, the match is legitimate. The diagnostic: `crossref_data[doi]['author'][0]['family'].lower() == 'bhatt'`.

**Principle:** Bib entries come from databases, never from LLM memory. DOIs are the universal identifier.

**BibTeX ASCII requirement:** The final `.bib` file must be pure ASCII. Replace accented characters with LaTeX escapes (é → `{\'e}`, ü → `{\"u}`, ñ → `{\~n}`). Strip any remaining non-ASCII bytes. This is a hard compilation requirement — a single emoji or Unicode character can cause BibTeX to silently drop dozens of entries.


## Phase 13: Methods

**Agent:** DATAML

The Methods section is a transparency document describing how the review was produced. The coordinator delegates this to DATAML with all gate artifacts and the phase ledger as inputs. DATAML writes it using pipeline metadata — no LLM-generated claims about the pipeline. Save as `content/M_methods.md`.

**Subsections (M.1–M.8):**

**M.1 Search Strategy:**
- Databases searched (with URLs)
- Date range of searches
- Actual search queries used (extracted from Phase 2 delegation artifacts)
- Number of results per query
- Total unique papers after deduplication

**M.2 Inclusion/Exclusion Criteria:**
- Criteria applied (from Phase 1 scope + Phase 2 compliance checks)
- Papers excluded and reasons (from `search_failures`)
- Papers with `metadata_only` access that were excluded

**M.3 Full-Text Retrieval:**
- Sources used: Elsevier API, Springer API, PMC, Europe PMC
- Retrieval rates per source
- Final fulltext rate vs abstract-only rate
- Size-validation methodology (15KB threshold)

**M.4 Evidence Extraction:**
- Schema used (link to evidence JSON schema)
- Quantitative extraction rate (% with effect sizes)
- Sample size extraction rate (% with n > 0)
- Replication status distribution

**M.5 Citation Verification:**
- Phase 16 results: VERIFIED / MINOR / CHIMERIC / HALLUCINATED / MISATTRIBUTED counts
- Fix actions taken (Phase 17-13)
- Final error rate after fixes

**M.6 Pipeline Execution:**
```python
# Extract from pipeline metadata metadata
methods_data = {
    'model_version': 'claude-opus-4-6',
    'total_frames': len(pipeline metadata),
    'total_tokens': sum(f['token_count'] for f in pipeline metadata),
    'phases_completed': [p for p, v in phase_ledger.items() if v['status'] == 'complete'],
    'wall_clock_hours': (end_time - start_time).total_seconds() / 3600,
}
```

**M.7 Figure Reproducibility:**
- Statement that all figures are reproducible from evidence JSONs
- Link to `figures/notebooks/` directory
- `shared_style.py` version and color palette

**M.8 Reproducibility Statement:**
- Pipeline version 
- All evidence packages, gate artifacts, and critic reports saved in `provenance/`
- Statement: "All figures can be regenerated by running the Jupyter notebooks in `figures/notebooks/` with the evidence data in `evidence/`."

**M.0 Pipeline Architecture Figure (placed at top of Methods, before M.1):**
Generate a publication-quality figure (`fig_methods_pipeline.png`) showing the complete
pipeline architecture with actual execution metrics from this run (phase count, agent
count, paper count, fulltext rate, verification results). Place it at the TOP of the
Methods file, immediately after the chapter intro paragraph and before `## M.1 Search
Strategy`:

```markdown
:::{figure} ../figures/fig_methods_pipeline.png
:label: fig-methods-pipeline
:width: 100%
**Pipeline architecture.** Twenty-phase orchestrator for computational reviews.
Green: coordinator-owned mechanical phases. Orange: agent delegations. Purple: blinded
critic phases. Numbers show actual execution metrics from this run.
:::
```

Note: use `:label:` not `:name:` (MyST canonical; `{numref}` resolves labels first).
The caption MUST start with a short bold title phrase — this is a global template rule,
audited at the Phase 8 gate.

Also create a Jupyter notebook (`figures/notebooks/fig_methods_pipeline.ipynb`) that
regenerates the figure from `provenance/pipeline_metrics.json`.

**M.8 Pipeline Skills section (MANDATORY, inserted before Reproducibility Statement):**

The Methods file must include a `## M.8 Pipeline Skills` subsection describing the
twelve skill files that encode the pipeline. Build the table programmatically by
scanning `skills/*.md` for frontmatter / first-line description:

```python
import pathlib, re
rows = []
for path in sorted(pathlib.Path("skills").glob("comprev-*.md")):
    first = path.read_text().splitlines()[0].lstrip("# ").strip()
    rows.append((path.name, first))
table = "| Skill | Role |\n|---|---|\n"
table += "\n".join(f"| `{n}` | {d} |" for n, d in rows)
```

Do NOT write the table by hand (skill names and phase ownership change across
template versions). The output is an auto-generated table plus a single paragraph
pointing readers to the template repository for re-running the pipeline on a new
topic. Renumber the existing Reproducibility Statement to M.9 to accommodate.

The template scaffold at `content/M_methods.md` already contains the skeleton for
this section — fill in the table from the live `skills/` directory rather than
retyping the template literal.


## Phase 14: Document Assembly

**Agent:** DATAML

Phase 14 now produces two parallel outputs: the MyST repository (primary) and the LaTeX PDF.

**PROHIBITION — Unresolvable citation keys at assembly time:**

If section `.md` or `.tex` files contain citation keys not present in the `.bib` file, this means Phase 7 writers used non-canonical keys. The ONLY correct responses are:

1. **The `citation_key_map` was not built** → go back to Phase 3 and build it. This is the most likely cause.
2. **Writers ignored the map** → send sections back to Phase 7 writers with: "Replace all citation keys with canonical keys from the citation_key_map. Keys not in the map must be removed, not guessed."

**MANDATORY — Figure artifact collection and path verification (Phase 14):**

After assembling all content files, the coordinator MUST:

1. **Collect ALL figure PNGs from Phase 7 child agent artifacts:**
*(Figure artifact collection delegated to DATAML)*

2. **Verify every figure reference resolves to an actual file:**
*(Figure reference verification delegated to DATAML — assert zero broken references)*

3. **Verify figure path format consistency:**
*(Figure path format enforcement delegated to DATAML)*

**NEVER do any of the following:**
- Search CrossRef by author surname + year to guess which paper was intended
- Add stub `.bib` entries with placeholder titles like "[Reference pending verification]"
- Leave unresolvable keys in the document and proceed to GitHub push

**8a. MyST Assembly (Primary):**

Copy all `.md` section files, figures, evidence, and provenance to the repository structure:

*(Assembly file-copy logic delegated to DATAML — see Phase 14 task description)*

Verify MyST build: `myst build --execute` should complete without errors.

**8b. LaTeX Assembly:**

1. **Preamble:** ONE \documentclass. Required packages:
   - `\usepackage[expansion=false]{microtype}` — typography (expansion=false prevents font errors)
   - `\usepackage[round,authoryear]{natbib}` — author-year citations; use `\citep{Key}` for parenthetical and `\citet{Key}` for textual
   - `hyperref` — clickable links
   - `geometry` — margins
   - `booktabs` — tables
   - `graphicx` — figures
   - `float` — provides `[H]` placement specifier
   - `\usepackage[section]{placeins}` — auto-inserts `\FloatBarrier` at every `\section`
   - `amsmath`, `amssymb` — math symbols including `\checkmark`
   - `enumitem` — custom list labels (section writers may use `[label=...]`)
   - `xcolor` — colored text
   
   **Robustness rule:** If the first compilation attempt fails with "Undefined control sequence" or "Environment undefined," identify the missing package from the error, add it to the preamble, and recompile — do NOT remove the command from the section file.
2. **Section concatenation:** Strip any stray \documentclass, \begin{document}, \begin{thebibliography} from section files.
3. **Bibliography:** ONE consolidated .bib file. `\bibliographystyle{abbrvnat}` (alphabetical by first-author surname). ONE `\bibliography{}` at end.

**8b-i. Figure Path Reconciliation (MANDATORY before compilation):**

After copying all section `.tex` and figure files to the workspace:
1. Extract every `\includegraphics{...}` path from all `.tex` files
2. For each path, check whether the file exists on disk
3. If not found: search for a figure artifact with a similar name (fuzzy match). Either rename the file on disk or update the `\includegraphics` path in the `.tex`
4. Assert: every `\includegraphics{}` path resolves to a file on disk

Run this as a script, not by eye:
```python
import re, glob, os
for tex in glob.glob('section_*.tex'):
    for match in re.finditer(r'\\includegraphics(\[.*?\])?\{(.+?)\}',
                             open(tex).read()):
        path = match.group(2)
        assert os.path.exists(path), f"MISSING: {path} in {tex}"
```

4. **Abstract:** Summarizes scientific findings, NOT process. May only cite papers already in the bibliography — no new references.

**8c. Figure Registry:**

Build `figures/_figure_registry.json` with per-figure provenance:

*(Figure registry built by DATAML from notebook metadata)*

**Phase completion verification (MANDATORY before compilation):**

The coordinator MUST run this anti-skip check. If ANY assertion fails,
assembly is BLOCKED — the coordinator must go back and run the missing phase.

*(DATAML runs phase completion verification — asserts all 9 prerequisite gate artifacts exist)*

Then also run the existing assertions:

```
assert count(\begin{thebibliography}) == 0
assert count(\documentclass) == 1
assert count(\bibliography{) == 1
assert \usepackage[expansion=false]{microtype} present
assert all \citep{}/\citet{} keys present in .bib  — zero orphaned citations
assert \bibliographystyle{abbrvnat} present
assert all \includegraphics{} paths resolve to files on disk
assert count(bare \begin{figure} without placement specifier) == 0
```

**MyST Build Test (MANDATORY gate — catches ~25 issue categories at once):**
Run `myst build --html` on the assembled content and parse stdout/stderr:
- Assert: 0 lines containing "Could not link citation"
- Assert: 0 lines containing "Cross reference target was not found"  
- Assert: 0 lines containing "Cannot find image"
- Assert: 0 lines containing "Unknown Directive"
If any assertions fail, return the specific warnings. The coordinator routes fixes to the 
appropriate agent (citation issues → Phase 9 rebuild, cross-ref issues → Phase 7 writers, 
image issues → path fixes).

**Mechanical Notebook→Dropdown Embedding:**
Section writers do NOT embed dropdown code. Phase 14 DATAML does it mechanically:
1. For each figure PNG, find the matching .ipynb in figures/notebooks/
2. Read the notebook JSON, extract ALL code cells (not just one)
3. For each cell, join source lines: `'\n'.join(line.rstrip('\n') for line in cell['source'])`
4. Combine cells with `'\n\n# ---\n\n'` separator
5. Insert after the figure directive as: `:::{dropdown} 📓 Figure code` followed by a python code block and `:::`
6. Validate: no single line > 200 chars (catches concatenation bugs)

If notebooks are stubs ("see main workspace"), build them from `pipeline.lineage[figure_vid]`:
extract the generation code, clean workspace-specific paths, create proper .ipynb.

**myst.yml Preservation:**
Phase 14 MUST NOT rewrite myst.yml from scratch. Instead:
1. Read the existing myst.yml from the repo
2. Update ONLY the `toc:` entries to match the new section filenames
3. Preserve: site:, extends:, plugins:, bibliography:, exports:, and all other fields
4. Never remove the `site:` block (removing it causes MyST to skip HTML generation)

**Quality checklist:**
- [ ] All sections present and in order
- [ ] All figure files present and referenced
- [ ] All \ref{} resolve
- [ ] Bibliography contains all cited works
- [ ] Every section has ≥2 figures, with at least 1 cross-study comparison (Type B)
- [ ] Cross-study comparison figures present (not just schematics)
- [ ] No process language (see Output Hygiene)

---


**MANDATORY — Site infrastructure:**
Phase 14 MUST also:
a) Create `content/evidence_database.md` with `:::{evidence-explorer}` directive
b) Create `content/provenance.md` with pipeline summary from gate artifacts
c) Add `:::{authorship-explorer}` with `:authors: ../authors.yml` to `content/00_frontmatter.md` ONLY (after the abstract, before the body)
d) Add `:::{citation-annotations}` with `:evidence-dir: ../evidence` to each section .md file
e) Verify `myst.yml` `project.toc` lists ALL `content/*.md` files (count must match)
f) Deploy plugin files: `citation-annotation-plugin.mjs`, `citation-annotation-widget.mjs`, `evidence-explorer-plugin.mjs`, `evidence-explorer-widget.mjs` — all using the anywidget pattern (NEVER raw HTML/CSS/JS injection)
g) Insert the Phase 11 Abstract into `content/00_frontmatter.md`

**Plugin deployment notes:**
- All MyST plugins MUST use the anywidget pattern: directive → transform that converts to `node.type='anywidget'` with `.esm` and `.model` properties
- MyST renders citations as `<cite>` elements with DOI in `<a href="https://doi.org/...">` — citation annotation plugins must match by DOI
- The `authorship-plugin.mjs` resolves `./authors.yml` relative to the document directory — directives must specify `:authors: ../authors.yml` since content files are in `content/`


## Phase 15: Citation Triples

**Agent:** DATAML

**EXHAUSTIVE EXTRACTION (MANDATORY):** Extract one triple for EVERY `{cite:p}` and
`{cite:t}` occurrence in the final document. If a citation directive contains
multiple keys (e.g., `{cite:p}\`Smith2020,Jones2021\``), each key produces a
separate triple paired with the same sentence. No heuristic selection, no
sampling, no prioritization — every citation-claim pair must be extracted.

For each occurrence, produce:

```json
{
  "cite_key": "Smith2022",
  "source_file": "sec-05-intrinsic-electrophysiology.md",
  "source_line": 42,
  "sentence": "the full sentence containing the {cite:p}/{cite:t} directive",
  "claimed_finding": "what the review says this paper shows (1-2 sentence summary)",
  "bib_entry": {
    "title": "from the .bib file or references.bib",
    "author": "from the .bib file",
    "journal": "from the .bib file",
    "year": "from the .bib file",
    "volume": "from the .bib file",
    "pages": "from the .bib file",
    "doi": "from the .bib file"
  }
}
```

Split into batches of 18 triples. The bib entry gives checkers everything needed
to verify without guessing keywords.

**Completeness check:** After extraction, assert that the total triple count equals
the total number of individual cite keys across all `{cite:p}`/`{cite:t}` directives
in the document. If the counts diverge, re-extract — a citation was missed.

**Why exhaustive:** Heuristic extraction (e.g., selecting only topic sentences or
paragraph conclusions) misses citations in parenthetical asides, subordinate clauses,
and methodological caveats. These low-profile citations are disproportionately likely
to carry misattributions because they receive less authorial attention during drafting.


## Phase 17: Fix Preparation

**Agent:** DATAML

For each non-VERIFIED triple, prepare a fix request:

**For MINOR issues:**
```
FIX REQUEST (MINOR — bib metadata correction)
  cite_key: Smith2022
  issue: Year is 2021 in bib, should be 2022 per PubMed
  action: UPDATE BIB ENTRY
  correct_metadata: {year: 2022, volume: 45, pages: "112-128"}
  context_lines: [not needed for pure bib fixes]
```

**For CHIMERIC issues:**
```
FIX REQUEST (CHIMERIC — wrong paper behind DOI)
  cite_key: Jones2019
  issue: Bib title doesn't match the claim context, DOI 10.1234/xxx 
         resolves to "Brainstem circuits in zebrafish" (similarity: 0.21)
  action: REPLACE BIB ENTRY with correct paper
  correct_metadata: {full database-fetched entry for the INTENDED paper}
  context_lines: ±10 lines around \citep{Jones2019} in .tex
  note_to_fixer: "Verify the citing sentence still makes sense with the corrected paper"
```

**For HALLUCINATED issues:**
```
FIX REQUEST (HALLUCINATED — paper does not exist)
  cite_key: FakePaper2023
  issue: No paper found in PubMed, Europe PMC, or CrossRef
  action: REMOVE CITATION or REPLACE WITH REAL PAPER
  context_lines: ±10 lines around \citep{FakePaper2023} in .tex
  note_to_fixer: "Find a real paper that supports this claim, or remove the 
                  claim if no real source exists. Any replacement must be verified 
                  against a database with a valid DOI."
```

**For MISATTRIBUTED issues:**
```
FIX REQUEST (MISATTRIBUTED — wrong finding attributed)
  cite_key: Lee2012
  issue: Review says "Lee et al. demonstrated divisive gain control" but 
         Lee 2012 actually reported subtractive modulation
  action: CORRECT THE CLAIMING SENTENCE
  context_lines: ±10 lines around \citep{Lee2012} in .tex
  actual_finding: "Lee et al. 2012 reported subtractive, not divisive, modulation"
  note_to_fixer: "Rewrite the sentence to accurately describe what Lee 2012 found.
                  Do NOT change the citation — the paper is correct, the description is wrong."
```

**For FIGURE_MISLEADING issues (from Phase 16 figure-level verification):**
```
FIX REQUEST (FIGURE_MISLEADING — visual implies invalid comparison)
  figure_label: fig:sec2-type-counts
  issue: Figure plots domain-specific metrics from specific studies
         alongside whole-brain all-cell-type cluster counts (Yao 2023) on the same axis,
         implying a 15→5,322 progression that conflates scope, population, and taxonomic level.
  action: REDESIGN FIGURE or ADD PROMINENT CAVEAT
  suggested_fix: "Either (a) restrict comparison to cortex-specific studies at comparable
                  taxonomic levels, or (b) add caption text: 'Note: Yao 2023 value represents
                  whole-brain clusters across all cell types at the finest taxonomic level, not
                  directly comparable to similar metrics in other studies.'"
```

**For CRITIC findings (from Phase 8, severity SHOULD_CAVEAT, deferred to Phase 10):**
These are passed through to Phase 18 only if Phase 10 integration did not address them. Check each deferred SHOULD_CAVEAT against the post-integration text. If still present → create a fix request:
```
FIX REQUEST (SCOPE_INFLATION — claim broader than evidence)
  cite_keys: [A, B, C]
  issue: "In [broad domain], X is established" but all cited papers are [specific subdomain]-only
  action: ADD QUALIFIER
  context_lines: ±5 lines around the claim
  suggested_fix: "In [specific context], X is established \citep{A, B, C}; whether this extends
                  to other domains/contexts remains untested."
```

**CRITICAL:** The fixer never receives the full document. Only the ±10 line context window + the fix request. This prevents unintended changes elsewhere and limits the fixer's hallucination surface.


## Phase 19: Fix Application

**Agent:** DATAML

Apply fixes in **reverse document order** (last occurrence first) to prevent offset shifting when multiple fixes are near each other:

1. **Apply bib fixes:** For each `{cite_key, old_bib_entry, new_bib_entry}`, replace the entry in the `.bib` file
2. **Apply text fixes:** For each `{cite_key, old_text, new_text}`, use string matching on the context lines to locate and replace in the `.tex` file
3. **Add new bib entries:** For any replacement citations, add their database-fetched bib entries to the `.bib` file
4. **Remove orphaned bib entries:** If a hallucinated citation was removed (not replaced), delete its bib entry
5. **Verify integrity:**
   - Zero orphaned `\citep{}`/`\citet{}` keys (cited in `.tex`/`.md` but not in `.bib`)
   - Zero orphaned bib entries (in `.bib` but never cited in `.tex`/`.md`)
   - All DOIs in `.bib` resolve (spot-check 10%)
   - Run output hygiene check one final time
   - **Citation-deletion cleanup audit (MANDATORY):** After applying all text fixes,
     grep for `,,` (double commas from deleted list items) and for sentences that
     begin with a lowercase verb immediately after a period (`. show`, `. report`,
     `. demonstrate`, etc. — orphaned predicates from deleted `{cite:t}` subjects).
     Any match is a Phase 18 fix-execution failure: the LITREVIEW agent deleted a
     citation without cleaning up the dependent prose. Send the affected lines back
     to the Phase 18 agent via `send_message` for sentence-level repair before
     proceeding to Phase 20.
6. **Save** final `.tex` and `.bib` files.


## Phase 20: Repository Push

**Agent:** DATAML

Use git clone + file copy, NOT the GitHub Contents API (which has proven unreliable 
for bulk uploads — it can push wrong file contents to multiple paths).

**Push protocol:**
1. `git clone` the repository
2. `git rm -r` ONLY the pipeline output directories: content/, figures/, evidence/, 
   provenance/, latex/, scripts/
3. Copy pipeline artifacts to their correct paths using `shutil.copy2` with 
   `{{artifact:VID}}` markers (which resolve correctly at execution time)
4. **Preserve** all pre-existing repo files: .github/, myst.yml, authors.yml, 
   00_frontmatter.md, authorship-widget.*, authorship-plugin.mjs, deploy.yml, 
   LICENSE, README.md, skills/, evidence-explorer-*
5. **Verify file signatures** after copy:
   - Every .png: first 8 bytes match PNG magic (89 50 4E 47 0D 0A 1A 0A)
   - Every .tex: first non-empty line starts with `%` or `\\`
   - Every .bib: contains `@article` or `@misc`
   - Every .md: first non-empty line starts with `#` or `---`
   - If ANY signature check fails → abort push, report which files are wrong
6. `git add -A && git commit && git push`
7. Save gate_repository_push.json with file counts and signature check results

**GATE ARTIFACT:** After all files are pushed:

```python
gate_data = {
    'repo': REPO,
    'branch': BRANCH,
    'files_pushed': file_count,
    'sections_pushed': section_count,
    'figures_pushed': figure_count,
    'notebooks_pushed': notebook_count,
}
json.dump(gate_data, open('gate_repository_push.json', 'w'), indent=2)
advance_phase('14_github_push', '<saved_version_id>')
```

---

---


**Post-push verification (MANDATORY):**
After `git push`, verify:
a) `myst.yml` `project.toc` entry count matches the number of `.md` files in `content/`
b) `site.nav` structure is preserved from the repo scaffold (do not restructure existing nav)
c) Run `myst build --html` if available and confirm zero "Could not link citation" and zero "Cannot find image" errors


## Repository Structure

All pipeline outputs are pushed to a GitHub repository with this structure:

```
repo-root/
├── myst.yml                    # MyST config (project metadata, bibliography)
├── _toc.yml                    # Table of contents for MyST build
├── content/
│   ├── 00_frontmatter.md       # Title, authors, abstract
│   ├── 01_introduction.md      # Section 1 (MyST markdown)
│   ├── ...                     # Sections 2–12
│   ├── 13_conclusion.md
│   └── M_methods.md            # Methods section (coordinator-written)
├── figures/
│   ├── fig_sec2_*.png           # Figure PNGs (300 DPI)
│   ├── notebooks/               # One Jupyter notebook per figure
│   │   └── fig_secN_name.ipynb
│   └── _figure_registry.json   # Per-figure provenance
├── evidence/
│   ├── section_NN_evidence.json # Per-section evidence packages
│   └── citation_key_map.json   # DOI → cite_key mapping
├── provenance/
│   ├── phase_ledger.json        # Pipeline execution log
│   ├── gate_*.json              # Gate artifacts
│   └── critic_reports/          # Phase 6 + 8 critic findings
├── scripts/
│   ├── retrieve_fulltext.py     # Full-text retrieval function
│   ├── build_figures.py         # Rebuild all figures from evidence
│   └── shared_style.py          # Canonical color palette + style
├── latex/
│   ├── review.tex               # Assembled LaTeX document
│   ├── bibliography.bib         # Consolidated BibTeX
│   └── section_*.tex            # Per-section LaTeX files
├── README.md
├── LICENSE
└── requirements.txt
```

The MyST markdown files in `content/` are the **primary** output — they render via GitHub Pages or Jupyter Book. The `latex/` directory contains the parallel LaTeX version for PDF compilation.

---

---
