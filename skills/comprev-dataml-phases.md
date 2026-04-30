# DATAML Phase Protocols

> **Template-aware:** This pipeline assumes the repo was created from `ComputationalReviewTemplate`. All directory structure, plugins, widgets, `myst.yml`, `deploy.yml`, and `authors.yml` already exist. Phase 14 UPDATES existing files (adds section entries to `myst.yml` toc, populates `content/provenance.md`). Phase 20 pushes content into the existing structure — it does NOT create directories or deploy infrastructure.


Delegation templates for all DATAML mechanical phases: citation infrastructure (3), evidence curation (5), bibliography (9), methods (13), document assembly (14), citation triples (15), fix preparation (17), fix application (19), and repository push (20).

**Information barrier:** No information barrier. DATAML performs mechanical work (database queries, JSON manipulation, file assembly, git operations). Seeing all phase templates does not bias scientific judgment because DATAML does not make scientific judgments.

---



## Universal DATAML Actor Rules

Every DATAML actor (every phase below) MUST honour these rules. They are
enforced by binary checks in the corresponding validator skill — failing any
of them returns the actor's gate to `FAIL_*` regardless of the phase-specific
output.

**Forbidden-lexicon scope.** Any actor that writes to `content/*.md`,
`content/*.yml`, or `manuscript.tex` MUST scrub the FORBIDDEN_LEXICON list
(defined in `comprev-myst-validator` check #9) from its own output before
emitting. This includes Methods (Phase 13), authors.yml (Phase 1/14),
frontmatter (Phase 14), and verification summaries (Phase 20a). The scrub
runs in the actor — the validator only catches misses.

**No author placeholders.** Any actor that writes to `content/authors.yml`,
the `authors:` block in `myst.yml`, or any author-byline block in `content/*.md`
MUST emit real names (or no entry at all) — not `Human Supervisor`, `Anonymous`,
`TBD`, `[NAME]`, `<placeholder>`, or `Author N`. Phase 14V and 20V validators
flag violations via `AUTHOR_IDENTITY_NOT_PLACEHOLDER`.

**Directive whitelist.** Section-body MyST directives are restricted to the
whitelist documented in `comprev-orchestrator-v27` §Directive Whitelist.
Notably, section writers and assemblers MUST NOT emit `{contents}`,
`{toctree}`, or `{include}` directives in body files — the project-level
`myst.yml` and Phase 14 assembly emit the global TOC. Phase 7V and 19V
validators flag violations as `DIRECTIVE_WHITELIST_VIOLATION`.

---


## Phase 1: Scoping Materialisation (DATAML actor)

**Agent:** DATAML actor (mechanical only)

After the LITREVIEW Phase 1 scoper returns `scope.json` and the `plan_content`
list, a DATAML actor materialises the on-disk artifacts that downstream phases
depend on. This is mechanical work only — no rewriting of the user's prompt,
no reinterpretation of `evidence_parameters`.

**Inputs.**
- `scope.json` (from the LITREVIEW scoper)
- The user's submitted prompt as captured by the coordinator (raw bytes)

**Mechanical steps.**
1. Write `provenance/review_request.txt` — the user's prompt, byte-for-byte, no reflow, no normalisation. Compute and record SHA256 alongside.
2. Write `provenance/review_request.md` — three labelled sections (header with project ID + timestamp + pipeline version; `## Verbatim user prompt` blockquote; `## Editorial note` listing every mechanical reflow applied or stating "No edits applied").
3. Write `gate_scope.json` derived directly from `scope.json`. Required keys: `title`, `clusters[]`, `sections[]`, `evidence_parameters{}`, `review_request_path: "provenance/review_request.md"`.
4. Verify NO `[PIPELINE FILLS THIS]` placeholders or `<...>` template tokens remain in any of the four files.

**Output:** `gate_scope.json` plus the two provenance files. Triggered by the
coordinator after Phase 1 LITREVIEW returns; followed by Phase 1V validation
via `comprev-scoping-validator`.

---

## Author Table Continuity (Phase 17/18 fix flow)

The `author_name_table.json` produced in Phase 3 is the SOLE source for
author-name strings used in `{cite:t}` rendering. During Phase 17 fix
preparation and Phase 18 fix execution, any new bibliography entry created or
modified must update `author_name_table.json` synchronously. Specifically:

- When Phase 18 adds a bib entry for a previously-unseen DOI, append the
  CrossRef-derived author surname to `author_name_table.json` immediately;
  do not defer to Phase 19.
- When Phase 18 modifies an existing entry's author family name (e.g. correcting
  ASCII collation), update both `references.bib` and `author_name_table.json`
  in the same diff bundle.
- The Phase 19 fix-application gate verifies row-count parity between
  `references.bib` and `author_name_table.json`; mismatch → fail.

Failure mode this prevents: bib entry written without the author table being
updated, leading to `{cite:t}` rendering empty author placeholders or stale
names downstream.

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
  Read `evidence_parameters` from `gate_scope.json` to determine the Phase 2 gathering target (`min_papers_per_cluster`, default 70). Curation floors scale proportionally:
  - Core sections (the main cell-type or function sections identified in the scaffold): ≥ 60% of `min_papers_per_cluster` unique papers (e.g. ≥42 at default 70, ≥120 at 200)
  - Supporting sections (methods, classification, development, species, modeling): ≥ 40% of `min_papers_per_cluster` unique papers (e.g. ≥28 at default 70, ≥80 at 200)
  - Synthesis/conclusion sections: ≥ 30% of `min_papers_per_cluster` unique papers (these re-cite from earlier sections)
  - If `min_papers_per_cluster` is null (saturation mode), use the actual per-cluster paper count from Phase 2 as the reference and apply the same percentages.
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

**MANDATORY — Per-section uniqueness (`NO_INTRA_SECTION_DUPLICATES`):**
Within a single section's evidence package, no two findings may share an identical `claim_source_sentence`. If the same DOI contributes multiple findings to one section, each must cite a different sentence from the paper.

**MANDATORY — Cross-section differentiation (`CROSS_SECTION_DIFFERENTIATION`):**
When the same DOI appears in multiple sections, each section's finding for that DOI MUST cite a *different* `claim_source_sentence`. A paper used in two sections that quotes the same sentence in both is a duplication, not differentiated reuse — re-extract or drop one.

**MANDATORY — Lossless aggregation (`ZERO_LOSS`):**
The total finding count summed across all per-section evidence packages MUST be ≥ the Phase 2 total. Findings may be duplicated across sections (with different source sentences per the rule above), but never silently dropped. If any cluster's findings cannot be assigned to a section, log them in a `unassigned_findings.json` artifact and send back to scoping, do not delete.

**MANDATORY — Conflict coverage (`ALL_CONFLICTS_ASSIGNED`):**
Every conflict in the Phase 2 cluster evidence MUST appear in ≥1 per-section evidence package. Conflicts cannot be silently lost during cluster→section reassignment. If a conflict's two papers are split across sections that don't both surface it, replicate the conflict entry into each affected section's package.


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

**GATE ARTIFACT:** After bibliography is written, save `gate_bibliography.json`:

```python
gate_data = {
    'bib_artifact_id': '<saved_version_id>',
    'entry_count':     N,
    'unfindable_dois': [...],   # cite_keys whose DOI failed CrossRef + Europe PMC
    'ascii_clean':     True,
    'bhatt_contamination_matches': 0,   # from grep scan above
}
json.dump(gate_data, open('gate_bibliography.json', 'w'), indent=2)
advance_phase('5_bibliography', '<saved_version_id>')
```


## Phase 13: Methods

**Agent:** DATAML

The Methods section is a transparency document describing how the review was produced. The coordinator delegates this to DATAML with all gate artifacts and the phase ledger as inputs. DATAML writes it using pipeline metadata — no LLM-generated claims about the pipeline. Save as `content/Methods.md`.

**Subsections (referenced internally as M.1–M.8 in this skill; the
rendered template drops the `M.` prefix from H2 headings):**

**M.1 Search Strategy:**
- Databases searched (with URLs)
- Date range of searches
- Actual search queries used (extracted from Phase 2 delegation artifacts)
- Number of results per query
- Total unique papers after deduplication

**M.2 Inclusion/Exclusion Criteria:**
- Criteria applied (from Phase 1 scope + Phase 2 compliance checks)
- Papers excluded and reasons (from `search_failures`)
- Papers excluded because neither full text nor abstract could be retrieved

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

**M.6 Pipeline Execution (DRAFT SNAPSHOT — refreshed at Phase 20):**

This block is rendered at Phase 13 with whatever numbers the ledger reports
*at draft time* (Phases 1-12 only). It MUST be labeled as a snapshot and
re-rendered at Phase 20 just before push, when the ledger covers the entire
run including all downstream phases. Treat the Phase-13 numbers as
provisional placeholders and do not delete the snapshot label until the
Phase-20 refresh has overwritten the values.

```python
# Phase 13 draft-time render. Note explicit snapshot labeling.
methods_data = {
    'model_version': 'claude-sonnet-4-5',
    'snapshot_phase': 13,
    'snapshot_at': datetime.now(timezone.utc).isoformat(),
    'total_frames': len(operon.frames(project_id=PROJECT_ID, roots_only=False, has_task=False)['frames']),
    'phases_completed_at_draft_time': [p for p, v in phase_ledger.items() if v['status'] == 'complete'],
    'wall_clock_hours_at_draft_time': (datetime.now(timezone.utc) - first_frame_at).total_seconds() / 3600,
}
# Phase 13 MUST emit a `**Phases 14-20 (pending refresh).**` placeholder
# paragraph at the end of M.5 with explicit text the Phase-20 refresh will
# scan for and replace. Forbidden stale phrasings ("are scheduled", "had not
# yet executed", "in progress") are blocked at Phase 20V.
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
Methods file, immediately after the chapter intro paragraph and before `## Search Strategy`:

```markdown
:::{figure} ../figures/fig_methods_pipeline.png
:name: fig-methods-pipeline
:width: 100%
**Pipeline architecture.** Twenty-phase orchestrator for computational reviews.
Green: coordinator-owned mechanical phases. Orange: agent delegations. Purple: blinded
critic phases. Numbers show actual execution metrics from this run.
:::
```

Note: use `:name:` not `:name:` (MyST canonical; `{numref}` resolves labels first).
The caption MUST start with a short bold title phrase — this is a global template rule,
audited at the Phase 8 gate.

Also create a Jupyter notebook (`figures/notebooks/fig_methods_pipeline.ipynb`) that
regenerates the figure from `provenance/pipeline_metrics.json`.

**M.8 Pipeline Skills section (MANDATORY, inserted before Reproducibility Statement):**

The Methods file must include a `## Pipeline Skills` subsection describing the
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
topic. The Pipeline Skills subsection slots in just before the Reproducibility
Statement subsection at the end of Methods.

The template scaffold at `content/Methods.md` already contains the skeleton for
this section — fill in the table from the live `skills/` directory rather than
retyping the template literal.

**GATE ARTIFACT:** After `Methods.md` is written, save `gate_methods.json`:

```python
gate_data = {
    'methods_artifact_id': '<saved_version_id>',
    'subsection_count':    8,             # M.1–M.8 must all be present
    'pipeline_skills_table_rows': N,      # auto-generated row count
    'reproducibility_statement_present': True,
}
json.dump(gate_data, open('gate_methods.json', 'w'), indent=2)
advance_phase('13_methods', '<saved_version_id>')
```


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

Verify MyST build: install mystmd (`npm install -g mystmd`) then run `myst build --html`. Must complete with zero ⛔ errors. This is a hard gate — do NOT proceed to Phase 20 if the build fails.

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
Install mystmd if not already present: `npm install -g mystmd`
Then run `myst build --html` on the assembled content and parse stdout/stderr:
- Assert: 0 lines containing "Could not link citation"
- Assert: 0 lines containing "Cross reference target was not found"  
- Assert: 0 lines containing "Cannot find image"
- Assert: 0 lines containing "Unknown Directive"
If any assertions fail, return the specific warnings. The coordinator routes fixes to the 
appropriate agent (citation issues → Phase 9 rebuild, cross-ref issues → Phase 7 writers, 
image issues → path fixes).

**Mechanical Notebook→Dropdown Embedding (HARD GATE — must not be downgraded to a note):**
Section writers do NOT embed dropdown code. Phase 14 DATAML does it mechanically:
1. For each figure PNG, find the matching `.ipynb` in `figures/notebooks/`.
2. Read the notebook JSON, extract ALL code cells (not just one).
3. For each cell, join source lines: `'\n'.join(line.rstrip('\n') for line in cell['source'])`.
4. Combine cells with `'\n\n# ---\n\n'` separator.
5. Insert immediately after the figure directive as `:::{dropdown} 📓 Figure code` followed
   by a python code block and a closing `:::`.
6. Validate: no single line > 200 chars (catches concatenation bugs).
7. Validate: in every section .md file, `count(':::{figure}') == count(':::{dropdown} 📓 Figure code')`.

**Dropdown injection (MANDATORY).** When injecting `:::{dropdown} 📓 Figure code` blocks from the saved notebooks, do NOT set `:icon:` or `:color:` properties — these are blocked by `comprev-myst-validator`'s `NO_ICON_COLOR` check. Use the bare `:::{dropdown} 📓 Figure code` form. The injected dropdown count per section MUST equal the `:::{figure}` count (verified by `FIGURE_DROPDOWN_MATCH` at 14V).

**Figure width declaration (MANDATORY).** Every `:::{figure}` directive in the assembled `content/*.md` MUST carry a `:width:` property (e.g. `:width: 100%` or `:width: 600px`). If a section writer omitted `:width:` at Phase 7, the assembler MUST inject a default before emitting the assembled file — `comprev-myst-validator`'s `FIGURE_WIDTH_DECLARED` check rejects bare `:::{figure}` directives at 14V/20V.

**Missing-notebook policy (MANDATORY).** If `figures/notebooks/<fig>.ipynb` is missing for
any figure referenced in a section .md:
  a. FIRST attempt to reconstruct the notebook from `pipeline.lineage[figure_vid]` — extract
     the generation code, clean workspace-specific paths, write a proper `.ipynb` to
     `figures/notebooks/`, and re-run the embedding step for that figure.
  b. If lineage reconstruction fails (no recorded code, or the code does not produce the
     PNG), FAIL the phase by writing `gate_assembly.json` with `gate_passed: false` and
     `missing_notebooks: [<fig_name>, ...]`. The coordinator must route the failure back
     to Phase 6 (figure construction) for the named figures before Phase 14 is retried.
  c. Do NOT mark the phase as passed with a `note` field describing the absence — that
     pattern silently ships a non-reproducible repository and was the failure mode
     observed in pipeline runs prior to this revision.

If notebooks exist but are stubs (e.g., contain only "see main workspace" or no code
cells), treat them as missing and apply the missing-notebook policy above.

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
- **Split evidence database into per-section files for the evidence-explorer plugin.**
  The evidence-explorer plugin reads `evidence/section_XX_evidence_package.json` files
  (XX = 02 through 13), NOT the combined `evidence_database.json`. Phase 14 MUST:
  1. Read the combined evidence database (or section_evidence_packages.json from Phase 5)
  2. For each section 02–13, extract that section's findings, conflicts, and figure_data
  3. Save as `evidence/section_XX_evidence_package.json` with required keys:
     `section_title`, `findings`, `conflicts`, `figure_data`, `unique_papers`, `total_findings`
  4. Verify all 12 files exist and are non-empty before proceeding
a) Create `content/evidence_database.md` with `:::{evidence-explorer}` directive
b) Create `content/provenance.md` with pipeline summary from gate artifacts
c) Add `:::{authorship-explorer}` with `:authors: ../authors.yml` to `content/00_frontmatter.md` ONLY (after the abstract, before the body)
d) Verify `myst.yml` `project.toc` lists ALL `content/*.md` files (count must match)
e) Deploy plugin files: `evidence-explorer-plugin.mjs`, `evidence-explorer-widget.mjs` — all using the anywidget pattern (NEVER raw HTML/CSS/JS injection)
f) Insert the Phase 11 Abstract into `content/00_frontmatter.md`

**MANDATORY — Pre-validator self-check (Phase 14, before emitting `gate_assembly.json`):**

DATAML MUST run these mechanical checks itself and re-do any failed step
before handing off to the validator. Treat these as a hard gate:

1. **Plugin invocation form.** For every directive registered by a plugin
   in `myst.yml` `project.plugins`, run:
   ```bash
   grep -rE '^\{<directive-name>\}\s*$' content/   # MUST be empty
   grep -rE ':::\{<directive-name>\}'      content/   # MUST be ≥1 hit
   ```
   If a registered directive has zero `:::{...}` invocations, the widget
   is dead — re-do step (a)/(c)/(d). If a `{name}` line on its own
   appears, MyST will silently render it as literal text (role lookup
   fails when only a directive of that name exists) — convert to
   `:::{name}` ... `:::` block syntax.

2. **Evidence package population.** After the per-section split:
   ```python
   for xx in range(2, 14):
       p = pathlib.Path(f"evidence/section_{xx:02d}_evidence_package.json")
       assert p.exists() and p.stat().st_size > 1024, p
       data = json.loads(p.read_text())
       assert "section_title" in data and "findings" in data, p
   ```
   If any file is missing, undersized, or malformed, re-run the split
   (don't proceed with empty placeholders — the evidence-explorer widget
   will load nothing).

3. **MyST build smoke test.** `myst build --html` MUST exit 0 and emit
   the rendered widgets in `_build/html/`. Grep the rendered HTML for
   `class="anywidget"` (or the plugin's marker) — if the build succeeds
   but the marker is absent, the directive was registered but never
   invoked at the markdown layer.

These three checks correspond to validator checks `PLUGIN_DIRECTIVES_INVOKED`
(#21), `EVIDENCE_PACKAGES_POPULATED` (#22), and the existing build/structural
checks. Running them at Phase 14 *before* validator handoff catches the
silent-render failure mode that produced the v1.0 dead widgets.

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

**MANDATORY — `correct_metadata` populated for every METADATA_ERROR fix.** The `correct_metadata` field MUST be a non-empty object whose values come from a fresh CrossRef/Europe PMC lookup of the DOI — never paraphrased from the existing bib entry, never elided. The 17V validator's `CORRECT_METADATA` check rejects any MINOR fix request whose `correct_metadata` is null, empty, or contains placeholder values.

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


## Phase 20a: Methods Ledger Refresh (pre-push)

**Agent:** DATAML

Before pushing, the Methods file must reflect the *final* pipeline state
(Phase-13 snapshot numbers cover only Phases 1-12). This step re-renders
M.6 and replaces any draft-time placeholder paragraphs in M.5.

**Procedure:**

> **Wholesale-replacement contract.** The template ships §M.6 as a 13-row
> placeholder ledger ending with one combined `14–20 | Remaining phases |
> Pending` row. Phase 20a does NOT patch this in place — it **replaces the
> entire Pipeline Execution block** (everything between
> `## Pipeline Execution` and `## Figure Reproducibility`) with a fully-rendered ledger that has **20 individual rows**,
> one per phase, each carrying its real status and key outputs from the
> corresponding gate artifact. Validator check `METHODS_LEDGER_FRESH` (see
> `comprev-myst-validator.md` #20) asserts: (a) zero rows in §M.6 contain
> the literal word `Pending`, (b) the row count equals 20, and (c) no
> row spans a phase range like `14–20`.

```python
import re, json, pathlib
from datetime import datetime, timezone
from collections import Counter

frames = operon.frames(project_id=PROJECT_ID, roots_only=False, has_task=False, max_results=500)['frames']
agent_counts = Counter(f['agent_name'] for f in frames)
status_counts = Counter(f['status'] for f in frames)
first_at = min(f['created_at'] for f in frames)
# Use the Phase-20 release gate timestamp if available (more meaningful than
# last frame); fall back to last frame timestamp if release gate not yet
# stamped.
release_gate = pathlib.Path('provenance/gate_phase_20_release.json')
end_at = json.loads(release_gate.read_text())['released_at'] if release_gate.exists() else max(f['created_at'] for f in frames)
elapsed_h = (datetime.fromisoformat(end_at.replace('Z','+00:00'))
             - datetime.fromisoformat(first_at.replace('Z','+00:00'))).total_seconds() / 3600

methods = pathlib.Path('content/Methods.md').read_text()

# (1) Replace the entire Pipeline Execution block, keyed on the H2 heading
#     and the next H2 (Figure Reproducibility).
m6_pattern = re.compile(
    r'^## Pipeline Execution\n.*?(?=^## Figure Reproducibility)',
    re.MULTILINE | re.DOTALL,
)
agent_table = '\n'.join(f'| `{a}` | {n} |' for a, n in agent_counts.most_common())
m6_block = f'''## Pipeline Execution

**Model version.** `claude-sonnet-4-5` (Anthropic Claude), invoked via the
Operon agent runtime.

**Frame counts and agent breakdown.** Derived from the project's `frames`
ledger (project `{{PROJECT_ID}}`, read via `operon.frames(project_id=...)`).
Total session frames: **{sum(agent_counts.values())}**.

| Agent | Frames |
|---|---:|
{agent_table}
| **Total** | **{sum(agent_counts.values())}** |

**Frame-status breakdown.** `{dict(status_counts)}`.

**Wall-clock.** First frame created at **{first_at}**; final timestamp
(release gate or last frame) **{end_at}**. Elapsed: **{elapsed_h:.2f} h**.

**Phases completed.** All 20 pipeline phases completed; gate artifacts saved
in `provenance/gate_*.json`. The orchestrator's `FINAL_GATE_master.json`
records `status: PUBLISHED`.

'''
methods = m6_pattern.sub(m6_block, methods)

# (2) Replace the Phase-13 placeholder paragraph in Citation Verification.
#     The Phase-13 step
#     MUST emit a paragraph starting `**Phases 14-20 (pending refresh).**`
#     so this regex can find it.
placeholder_pattern = re.compile(
    r'\*\*Phases 14[-–]20 \(pending refresh\)\.\*\*.*?(?=\n## )',
    re.DOTALL,
)
gate_files = {
    # Phase: canonical output artifact (matches orchestrator Phase Index "Output" column).
    # Phases 16/18/19 produce per-batch artifacts rather than a single gate JSON; the
    # renderer (`render_phase_outcomes_table`, supplied by the orchestrator) summarises
    # those directories. Phase 20's outcome is captured by the 20V repository-push gate.
    14: 'gate_assembly.json',          # Phase 14V (myst-validator)
    15: 'citation_triples.json',       # Phase 15 (dataml-phases)
    16: 'verification/',                # Phase 16 (verification): per-batch reports (dir)
    17: 'fix_requests.json',           # Phase 17 (dataml-phases)
    18: 'fixes/',                       # Phase 18 (fix-execution): per-batch diffs (dir)
    19: 'updated_files/',               # Phase 19 (dataml-phases): applied diffs (dir)
    20: 'gate_repository_push.json',   # Phase 20V (myst-validator)
}
# Build the outcomes table from each gate artifact's headline number.
# (Implementations should map gate keys to one-line outcome strings.)
outcomes_md = render_phase_outcomes_table(gate_files)  # supplied by orchestrator
new_para = f'''**Phases 14-20 (executed).** All downstream phases ran to completion;
gate artifacts in `provenance/gate_*.json` record the outcomes:

{outcomes_md}

'''
methods = placeholder_pattern.sub(new_para, methods)

# (3) Hard-block forbidden stale phrasings.
forbidden = [r'\bare scheduled\b', r'\bhad not yet executed\b',
             r'\bin progress \(this document', r'\bwill be captured in the final\b']
for pat in forbidden:
    if re.search(pat, methods, re.IGNORECASE):
        raise RuntimeError(f'Stale phrasing not cleaned: {pat}')

pathlib.Path('content/Methods.md').write_text(methods)

# (4) Re-render the Pipeline Architecture figure (top of Methods). The Phase-13 snapshot
#     marks Phases 13-20 as in_progress/scheduled with dashed/faded boxes;
#     after the full run, the figure must show every phase complete with the
#     real gate-derived metric annotations. The notebook at
#     `figures/notebooks/fig_methods_pipeline.ipynb` reads pipeline_metrics.json
#     and re-renders fig_methods_pipeline.png.
#     Update pipeline_metrics.json first (executed-phase outcomes + final
#     ledger numbers) and flip the seven 'scheduled' tuples in the notebook's
#     `phases` list to 'complete' before re-executing it.
import subprocess
subprocess.run(['jupyter','nbconvert','--to','notebook','--execute',
                'figures/notebooks/fig_methods_pipeline.ipynb',
                '--output','fig_methods_pipeline.ipynb'], check=True)
# Verify the regenerated PNG mtime is newer than the source notebook's edit time.
```

**GATE ARTIFACT:** Save `gate_phase_20a_methods_refresh.json` with
`{frame_count, agent_counts, status_counts, elapsed_hours, forbidden_hits: 0,
figure_regenerated: true, figure_md5_changed: bool}` before advancing to the push.

---

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
c) Install mystmd (`npm install -g mystmd`) and run `myst build --html`. Assert zero "Could not link citation" and zero "Cannot find image" errors. This is MANDATORY, not optional.


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
│   └── Methods.md            # Methods section (coordinator-written)
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


