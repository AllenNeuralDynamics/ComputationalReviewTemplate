# Unreleased

- A hard check that could not be run is no longer recordable as passed. New gate verdict
  `pass_with_deferred` with a `deferred_checks` list; `gate_passed: true` is forbidden while
  any hard check is deferred. Every downstream gate that can run a deferred check must run it
  and record its own verdict — citing the upstream result, fallback or `pass_with_deferred`
  is forbidden, and an entry still deferred at Phase 20 is an open failure.
- Any claim that a tool is unavailable must carry the captured output of the commands that
  establish it, recorded in the gate under `tool_probe`, and must probe every environment
  available to the session rather than only the active one. In the reference run an
  unsupported "no node/npm" note was false and deferred the first real build by five phases.
- `comprev-myst-validator` states that Phase 14V runs a real build: it is the first gate that
  can, 19V and Phase 21 repeat rather than replace it, and a 14V gate whose build never
  executed is `pass_with_deferred` at best. The `BIB_CITE_KEYS_RESOLVE` fallback is admissible
  only with a `tool_probe` record, and records checks 10-13 as deferred, never as pass.
- Two new rows in the orchestrator's failure-mode table: deferred check inherited as passed,
  and unsupported capability claim.

# Unreleased

- Data-binding verification moves from Phase 21 to Phase 14. New
  `PLUGIN_PAYLOAD_MATCHES_SOURCE` (`comprev-myst-validator` #26) runs each
  file-reading plugin's document transform and requires the bound payload to **equal** its
  source files — sections, findings, conflicts and figure_data against
  `evidence/evidence_section_*.json` — rather than merely be non-empty. At 14V the pipeline
  previously confirmed only that the directive was invoked and that the packages were
  populated; both passed while the Evidence Database page published empty, and the only
  binding check ran after deployment. Phase 21's `PLUGIN_DATA_BOUND` is now explicitly a
  deployed re-check and also requires equality.
- New `DATA_PLUGIN_NEGATIVE_TEST` (#27): every file-reading plugin must ship an executable
  test that the validator runs, covering both directions of emptiness — an empty data
  directory renders the placeholder and the build survives; unmatched or unreadable input
  fails the build.
- New `scripts/test_evidence_explorer.mjs` with committed fixtures under
  `scripts/test_fixtures/evidence_explorer/` (10 KB, no dependencies), run by the new
  `Plugin tests` workflow on every push and pull request. Eight cases covering the populated
  bind, cite-key strings staying out of findings, the un-instantiated template, unmatched
  JSON, a missing directory, legacy filenames, an interior gap and a `:sections:` mismatch.
  Verified to fail 8/8 against the plugin revision that shipped the empty explorer.

# v1.1.1

Documentation only; no change to the pipeline protocol or the site build.

- `evidence/README.md` taught the superseded naming: `section_NN_evidence_package.json`
  numbered from 02, asserting the Introduction had no evidence package. Corrected to
  `evidence_section_NN.json` numbered from 01 and covering every section. Its JSON schema
  listed four top-level keys that no real package contains and omitted the 25 that Phase 5
  writes; it now documents only the explorer's contract (`section_title`, `findings[]`,
  `conflicts[]`, `figure_data[]`) and names the Phase 5 spec as authoritative.
- The Quick Start named three files to make a new repo yours; six carry this template's
  identity. Added `README.md` (DOI badge and How to Cite, both pointing at this template's
  Zenodo record), `LICENSE` (copyright holder) and `.github/ISSUE_TEMPLATE/config.yml`.
- Added the GitHub Pages step — Settings → Pages → Source: GitHub Actions, which a template
  instantiation does not set and without which the deploy job fails — plus a Requirements
  paragraph (node ≥ 18, npm, python ≥ 3.9) and a Platform paragraph stating that the
  protocol is portable but the `host.*` orchestration calls are not.
- Removed the hardcoded contact link from `config.yml`: it pointed at this template's
  Discussions, which are not enabled, so it was dead here and misdirected in every review
  created from it.
- Dropped the literal release number from the Versioning section and the pinned version from
  the citation line; both were stale within hours and the DOI is the concept DOI, which
  always resolves to the newest release.

# v1.1.0

- **Renamed:** `skills/comprev-orchestrator-v29.md` → **`skills/comprev-orchestrator.md`**
  (frontmatter `name` likewise). A generation bump no longer renames a file or breaks the
  cross-references in four other skills. Saved prompts and bookmarks naming the old path
  must be updated; nothing depends on this repository programmatically, and reviews already
  produced carry their own frozen copy of `skills/`, so they are unaffected.
- New `skills/manifest.json` — single source of truth for the pipeline generation plus the
  sha256 and byte count of every skill file. Generated and verified by
  `scripts/build_skill_manifest.py`; the new `Skill manifest` GitHub Actions workflow runs
  `--check` on every push and pull request.
- The pipeline generation and the repository release version are now explicitly separate: the
  generation lives only in the manifest, the release only in git tags. `README.md` gains a
  `Versioning` section stating this.
- Session setup verifies the manifest and writes `provenance/pipeline_version.json`
  (generation, template commit, template tag, manifest hash, skill artifact ids). Phase 1's
  `review_request.md` header, Phase 13/20a Methods M.8 and `pipeline_metrics.json` now read
  the version from that file instead of carrying a typed-in number.
- `comprev-deploy-polish.md` gains the shared `Expert Review Pipeline v29
  (ComputationalReviewTemplate):` description prefix, which the manifest check enforces.

# v29 — Claude Science runtime compatibility

- Runs on the current Claude Science product with nothing to install: the coordinator saves
  `skills/*.md` as artifacts at session start and hands sub-agents the skill files they need
  (new "Runtime: Claude Science" section in `comprev-orchestrator-v29.md`).
- LITREVIEW / DATAML are documented as roles delegated to default sub-agents, not profiles.
- Legacy calls updated: `delegate_to` → `host.delegate`, `operon.*` / `pipeline.*` → `host.*`.
  Phase 20 push via `git push` only.
- Fix: Phase 13/20a Methods text no longer hardcodes `claude-sonnet-4-5` or names "Operon"
  (which tripped the FORBIDDEN_LEXICON check at 19V/20V); model id now passed as `MODEL_ID`.
- Phase 6 figure-audit critic: told not to search the network rather than assumed unable to.
- Fix: `evidence-explorer-plugin.mjs` never followed the `evidence_section_NN.json` rename
  below, read sections `02..13`, treated `argument_groups.*.supporting_findings` cite-key
  strings as finding records, and swallowed every read failure in `catch { continue }` — so a
  complete evidence set bound an empty explorer with a green build. It now discovers the
  section files present (no hardcoded count), prefers `ev.findings`, and throws when nothing
  loads; `:sections:` optionally declares the expected count. An evidence directory with no
  JSON at all is treated as an un-instantiated template and renders a placeholder, so the
  template's own build still passes; JSON files present but matching no package name stay
  fatal.
- All 20 skill files gain `name`/`description` YAML frontmatter (optional publishing).
- README Quick Start rewritten (template → edit 3 files → connect GitHub → paste prompt).

# Skill catalogue v28 → v29

## File changes

- `comprev-orchestrator-v28.md` → **`comprev-orchestrator-v29.md`** (rename)
- All other skill filenames unchanged
- Cross-references updated from `comprev-orchestrator-v28` to `comprev-orchestrator-v29` in:
  - `comprev-dataml-phases.md`
  - `comprev-deploy-polish.md`
  - `comprev-myst-validator.md`
  - `comprev-reviewer-agent.md`

## Filename conventions (Phase 5 + 14 outputs)

- Per-section evidence package: was `section_NN_evidence_package.json`, now `evidence_section_NN.json`
- Per-section scaffold extract: was `section_NN_scaffold_extract.json`, now `scaffold_section_NN.json`

The two filename stems are now distinct enough that VID-swap errors at delegation time are immediately visible.

## New validator checks (`comprev-myst-validator.md`)

| Check | Phases | What it asserts |
|---|---|---|
| `BIBLIOGRAPHY_PATH_MATCHES_MYSTYML` | 14V, 20V | Every path in `myst.yml` `project.bibliography` exists, ≥1 KB, ≥100 `@`-entries |
| `BIB_CITE_KEYS_RESOLVE` | 14V, 20V (fallback) | When `myst build` is deferred, every `{cite:[pt]}` and `\cite[pt]` key in `content/*.md` + `latex/manuscript.tex` resolves in the declared bibliography |
| `EVIDENCE_FINDINGS_ARE_OBJECTS` | 14V, 20V | `findings` arrays contain finding objects, not cite_key strings |
| `FIGURE_NOTEBOOK_SELF_CONTAINED` | 14V, 20V | Notebooks are runnable in a vanilla SciPy environment; only `shared_style` may be project-local, and every symbol it exports is actually defined |
| `NO_WRITER_SCRATCHPAD` | 7V, 14V, 19V, 20V | Body prose contains no LLM-thinking markers |
| `CITE_DIRECTIVE_SYNTAX_CLEAN` | 7V, 14V, 19V, 20V | No stray backtick before `{cite:[pt]}`; no missing opening backtick after |

## New validator checks (`comprev-curation-validator.md`)

- **Pre-flight shape check**: Phase 5V rejects `WRONG_ARTIFACT_TYPE` (e.g., a scaffold-extract VID where an evidence-package VID was expected) and `SCHEMA_INVALID` before running downstream checks
- `FINDINGS_ARE_OBJECTS`: same rule, now also at Phase 5V

## New validator checks (`comprev-scoping-validator.md`)

- `CLUSTER_SECTION_MAPPING_CONSISTENT`: the new `cluster_to_section_assignment` field in `gate_scope.json` is bidirectionally consistent with `clusters[].section_targets` and `sections[].cluster_ids`

## New canonical helpers

- `scan_prose(md_text, terms)` in `comprev-myst-validator.md` — code-block-aware prose scanner (mandatory for every prose-text check)
- `extract_cite_keys(md_text)` in `comprev-critic.md` — multi-key-decomposing cite-key extractor (mandatory for every cite-key-counting check)
- Canonical `figures/notebooks/shared_style.py` content baked into `comprev-figure-construction.md`

## Phase rule changes

- **Phase 5** (`comprev-dataml-phases.md`): explicit canonical schema for per-section evidence packages — `findings` is the array of finding objects; `argument_groups[*].supporting_findings` are cite-key strings
- **Phase 11** (`comprev-integration.md`): `master_citation_list` is computed as the union of cite-keys across body sections; Introduction and Conclusion may only cite from this set, asserted before `submit_output`. Frontmatter and AI-Disclosure are held to the same `FORBIDDEN_LEXICON` standard as bodies
- **Phase 14** (`comprev-dataml-phases.md`): bibliography file MUST be written to every path declared in `myst.yml` `project.bibliography` — and a stub at `content/references.bib` MUST be overwritten with the full Phase-9 bibliography
- **Phase 6** (`comprev-figure-audit.md`): SPLIT and REDESIGN verdicts permit two resolution routes — full figure-construction re-delegation, OR coordinator downgrade to `CAVEAT_FORCED` with the `suggested_restructure` injected as a `Phase 7 writer:` caveat (only when the restructure needs no new data)
- **Phase 6**: fabrication-flag resolution policy explicit — a flag is resolved when the figure caption cites via the canonical cite_key resolved from the DOI, the colloquial label is replaced, or the figure is rebuilt
- **Phase 2** (`comprev-evidence-gathering.md`): continuation children MUST treat `findings`, `conflicts`, `figure_data` as append-only with explicit shrink-prevention assertions
- **Phase 20** (`comprev-orchestrator-v29.md`): push child receives `section_md_vids_final` from the most recent validator gate (14V or 19V, with 19V taking precedence per-filename) and uses it verbatim; never calls `operon.artifacts(latest=True)` for content
- **Phase 20** (`comprev-deploy-polish.md`): canonical `deploy.yml` template that does NOT re-execute figure notebooks, plus a Pages-enable step that POSTs to `/repos/{owner}/{repo}/pages` before the first push

## Process hygiene additions (`comprev-orchestrator-v29.md`)

- "Save-after-write race" section: prefer `language="bash"` when saving a file immediately after a python-kernel write
- "Canonical Artifact Maps Across Phases" section: validator gate JSONs MUST publish `section_md_vids_final` so Phase 20 push has an authoritative source

## Removed

- Historical justification sentences ("earlier deployments shipped with…", "pipeline runs prior to this revision…", "v1.0 dead widgets", "VIP v2 audit") — they added length without changing behavior

## Skill size delta

| Skill | v28 size | v29 size | Δ |
|---|---:|---:|---:|
| comprev-orchestrator | 36,403 | 39,341 | +2,938 |
| comprev-dataml-phases | 58,155 | 61,882 | +3,727 |
| comprev-myst-validator | 13,637 | 18,819 | +5,182 |
| comprev-figure-construction | 19,263 | 21,679 | +2,416 |
| comprev-evidence-gathering | 40,314 | 40,888 | +574 |
| comprev-curation-validator | 1,616 | 3,476 | +1,860 |
| comprev-deploy-polish | 9,516 | 12,406 | +2,890 |
| comprev-integration | 8,612 | 10,092 | +1,480 |
| comprev-critic | 30,533 | 31,348 | +815 |
| comprev-figure-audit | 6,789 | 8,455 | +1,666 |
| comprev-scoping | 9,411 | 10,195 | +784 |
| comprev-scoping-validator | 3,816 | 4,277 | +461 |
| comprev-section-writing | 35,426 | 36,617 | +1,191 |
| all others | (unchanged) | (unchanged) | 0 |
