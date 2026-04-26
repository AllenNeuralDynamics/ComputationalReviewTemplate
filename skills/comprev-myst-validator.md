# MyST Validator — Binary Gate for Phases 7, 14, 19, 20

**Purpose:** Validate MyST markdown syntax and build integrity.
**Agent:** DATAML (grep + myst build)

## Per-File Checks (all .md in content/)

1. **NO_LABEL_DIRECTIVE**: Zero `:label:` (should be `:name:`)? **pass/fail**
2. **NO_DUPLICATE_NAME**: No `:name:` value appears twice in same file? **pass/fail**
3. **NO_ICON_COLOR**: Zero `:icon:` or `:color:` in dropdowns? **pass/fail**
4. **FIGURE_DROPDOWN_MATCH**: `:::{figure}` count == `:::{dropdown}` count per section? **pass/fail**
5. **FIGURE_HAS_IMAGE_PATH**: Every `:::{figure}` points to `../figures/*.png`, not `#label`? **pass/fail**
6. **NO_PROCESS_LANGUAGE**: Zero "scaffold", "evidence package", "orchestrator" in prose? **pass/fail**
7. **CITE_KEYS_EXIST**: Every `{cite:p}` and `{cite:t}` key in references.bib? **pass/fail**
8. **NO_BARE_AUTHOR_NAMES**: Zero "X and colleagues" or "X et al." without adjacent `{cite:t}`? **pass/fail**

9. **FORBIDDEN_LEXICON**: Zero matches across all `content/*.md` for the forbidden review-text vocabulary: Operon, scaffold, evidence package, framework failure, adversarial search, verdict, orchestrator, batch, sub-agent, revision manifest, prediction error, replication scorecard (as section title), paper weight, epistemic checkpoint. Allowed scientific uses ("phase" oscillation, "convergence" convergent evidence, "scaffold" developmental scaffolding, "recursive" recursive processing) are NOT flagged — match on whole-token boundaries with the explicit forbidden senses only. **pass/fail**

## Build Checks (Phase 14, 19, 20)

10. **MYSTMD_INSTALLED**: `npm install -g mystmd` succeeds? **pass/fail**
11. **BUILD_PASSES**: `myst build --html` exits with zero ⛔ errors? **pass/fail**
12. **ZERO_CITATION_ERRORS**: Zero "Could not link citation" in output? **pass/fail**
13. **ZERO_IMAGE_ERRORS**: Zero "Cannot find image" in output? **pass/fail**

## Structural Checks (Phase 14, 20)

14. **TOC_MATCHES_FILES**: Every myst.yml toc file exists on disk? **pass/fail**
15. **EVIDENCE_JSONS_EXIST**: `evidence/section_XX_evidence_package.json` for XX=02-13? **pass/fail**
16. **FIGURE_NOTEBOOK_MATCH**: Every `:::{figure} ../figures/<name>.png` referenced in any
    `content/*.md` has a corresponding `figures/notebooks/<name>.ipynb` on disk, AND every
    such notebook contains ≥1 non-empty code cell (i.e., is not a stub)? **pass/fail**
    (Block check that catches the failure mode where Phase 6 saved PNGs without notebooks
    and Phase 14 had nothing to embed in dropdowns.)
17. **AUTHORS_YML_EXISTS**: `content/authors.yml` exists? **pass/fail**
18. **ALL_PLUGINS_LISTED**: myst.yml lists all 4 plugins? **pass/fail**
19. **HEADING_STYLE_CONSISTENT**: Run `audit_headings()` (defined in `comprev-critic.md`)
    across all `content/*.md` files. Zero problems of any type:
    `MANUAL_NUMBER_PREFIX`, `WRAPPED_HEADING`, `MULTI_SPACE_AFTER_NUMBER`,
    `INCONSISTENT_DASH`, `MIXED_H1_H2_STYLE`, `INCONSISTENT_ACROSS_SECTIONS`?
    **pass/fail**
    (Block check that catches the failure mode where Phase 8 per-section critics
    cannot see cross-section heading inconsistencies — e.g. §4 numbered H1 alongside
    §5 unnumbered H1 + numbered H2, or a wrapped `## heading\nundermined` orphan.)

20. **METHODS_LEDGER_FRESH** *(Phase 20V only)*: `content/Methods.md` must
    reflect the final pipeline state, not the Phase-13 draft snapshot.
    Three sub-checks, all must pass:

    1. **No forbidden stale phrasings.** Grep `Methods.md` for any of:
       `\bare scheduled\b`, `\bhad not yet executed\b`,
       `\bin progress \(this document\b`,
       `\bwill be captured in the final\b`,
       `\bPhases? 1[4-9].20 \(scheduled\)`. Zero hits required.
    2. **Pipeline Execution frame count matches live ledger.** Parse the integer that
       follows `Total session frames: \*\*` in the Pipeline Execution section. Must equal
       `len(operon.frames(project_id=PROJECT_ID, roots_only=False, has_task=False)['frames'])`
       within ±1 (allow for the validator's own frame).
    3. **Pipeline Execution phases-completed wording is final.** The phrase
       "All 20 pipeline phases completed" (case-sensitive) must appear in
       the Pipeline Execution section.
    4. **Pipeline Architecture figure is post-Phase-13.** Open
       `figures/notebooks/fig_methods_pipeline.ipynb` and parse the
       `phases` list inside the notebook source; assert that no tuple
       carries the status `"scheduled"` or `"in_progress"`. Also assert
       that `figures/fig_methods_pipeline.png` mtime is later than the
       Phase 13 gate artifact's `created_at`. (The figure is regenerated
       by Phase 20a step (4); this sub-check verifies it ran.)
    5. **Pipeline Execution ledger has 20 individual rows, no combined ranges.**
       Parse the markdown table immediately under `## Pipeline
       Execution` and assert: (a) exactly 20 data rows; (b) no row's
       Phase column contains a range delimiter (`–`, `-`, `to`, `,`)
       — every phase number is a single integer 1..20; (c) zero rows
       carry the literal token `Pending` in any column. Catches the
       failure mode where Phase 20a patches the placeholder ledger
       in place instead of replacing it wholesale (the template ships
       a 13-row placeholder with one combined `14–20` row).

    Block check that catches the failure mode where Methods.md or
    fig_methods_pipeline.png were rendered at Phase 13 with provisional
    numbers and never refreshed.
    The Phase 20a Methods Ledger Refresh step in `comprev-dataml-phases.md`
    is what populates the final values; this gate verifies the refresh ran.
    **pass/fail**

21. **PLUGIN_DIRECTIVES_INVOKED** *(Phase 14V, 20V)*: For every plugin
    file listed in `myst.yml` `project.plugins`, parse the plugin source
    (`*.mjs`) and extract every `name: '<directive-name>'` literal whose
    value appears in a `directives: [...]` array (i.e., every directive
    the plugin registers). For each such name:

    1. **Invocation present.** At least one `content/*.md` file must
       contain `:::{<directive-name>}` (block fence). Zero invocations
       across the corpus = fail. Catches the case where a plugin loads
       but no markdown calls it.
    2. **No role-syntax mis-invocation.** `grep -rE '^\{<directive-name>\}\s*$'
       content/*.md` must return **zero** matches. A bare `{name}` on
       its own line is *role* syntax — MyST silently fails the role
       lookup when only a directive of that name exists, and the line
       renders as literal text. Authors MUST use `:::{name}` (or
       backtick-fenced `\`\`\`{name}`) for directives.

    Block check; **pass/fail**.

22. **EVIDENCE_PACKAGES_POPULATED** *(Phase 14V, 20V)*: Strengthens
    check #14 (EVIDENCE_JSONS_EXIST). For each section XX in 02..13:
    `evidence/section_XX_evidence_package.json` must exist, be at least
    1024 bytes, and parse as a JSON object containing the top-level key
    `section_title`. Catches the failure mode where Phase 14 created
    only the `.gitkeep` placeholder and the evidence-explorer widget had
    nothing to load. **pass/fail**.

23. **REVIEW_REQUEST_CAPTURED** *(Phase 14V, 20V)*: The Coordinator MUST
    have written the user's task description verbatim to provenance at
    Phase 1. All five sub-checks must pass:
    1. **`provenance/review_request.txt` exists.** Non-empty, plain UTF-8.
    2. **`provenance/review_request.md` exists.** Non-empty, contains the
       three required H2 headings: `## Verbatim user prompt`, `## Editorial
       note`, and a top-level `# Original Review Request` H1.
    3. **No scaffold placeholders remain.** Grep both files for any of
       `[PIPELINE FILLS THIS]`, `[PIPELINE INSERTS`, `[PIPELINE OVERWRITES`,
       `[Document each mechanical reformat`. Zero matches required.
    4. **`gate_scope.json` references the prompt.** Must contain key
       `review_request_path` whose value is `provenance/review_request.md`
       and resolves to an existing file.
    5. **Methods.md includes the prompt.** `content/Methods.md` must contain
       a literal `{include} ../provenance/review_request.md` directive (in
       a `## Review Request` subsection placed before the first body H2).
    Catches the failure mode where the prompt — the upstream provenance
    of the entire review — exists only in the conversation transcript
    and is lost when the session ends. **pass/fail**.


24. **FIGURE_WIDTH_DECLARED** *(Phase 7V, 14V, 20V)*: Every `:::{figure}`
    directive in `content/*.md` MUST declare an explicit `:width:` option
    in its option block (the lines between the directive opener and the
    caption body). MyST's default LaTeX renderer emits
    `\\includegraphics[width=0.7\\linewidth]` when `:width:` is absent,
    producing under-sized PDF figures. The canonical value is
    `:width: 100%` per the section-writing skill; non-default values
    (e.g. `:width: 80%` for narrow plots) are acceptable, but a missing
    `:width:` is a fail. **pass/fail** with `figures_missing_width`
    listing offenders as `path:line`.


25. **EVIDENCE_PARAMETERS_HONORED** *(Phase 2V, 14V)*:
    Read `evidence_parameters` from `gate_scope.json`. For each cluster
    evidence package (`evidence/section_*_evidence_package.json`):

    - If `min_papers_per_cluster` is set and non-null: verify
      `unique_paper_count` (or `len(set(f['doi'] for f in findings))`)
      ≥ `min_papers_per_cluster`. **HARD FAIL** if any cluster is below.
    - If `saturation_criterion` is set and non-null: verify that a
      `saturation_log.json` artifact exists for each cluster AND that the
      log shows the criterion firing in two consecutive passes. **HARD FAIL**
      if the log is missing or the criterion never fired.
    - If `total_bibliography_target` is set and non-null: verify that the
      sum of unique DOIs across all clusters ≥ `total_bibliography_target`.
      **HARD FAIL** if below.
    - If `evidence_parameters` is absent from `gate_scope.json` or all
      fields are null/default: emit `"EVIDENCE_PARAMETERS_HONORED": "n/a"`
      with reason "no custom evidence parameters set" (backward
      compatibility with v24/v25 pipelines).

## Output Schema

The validator's gate JSON (e.g. `gate_assembly.json`, `gate_post_publish.json`) MUST be a single JSON object containing — at minimum — these keys:

```json
{
  "phase": 7|14|19|20,
  "gate": "pass|fail",
  "per_file_results": {...},
  "build_result": {"myst_errors": int, "myst_warnings": int},
  "structural_results": {
    "TOC_MATCHES_FILES": "pass|fail",
    "UNRESOLVED_CITE_KEYS": int,
    "BROKEN_FIGURE_REFS": int,
    "FIGURE_DROPDOWN_MATCH": "pass|fail",
    "FIGURE_NOTEBOOK_MATCH": "pass|fail",
    "HEADING_STYLE_CONSISTENT": "pass|fail",
    "METHODS_LEDGER_FRESH": "pass|fail",
    "EVIDENCE_JSONS_EXIST": "pass|fail",
    "EVIDENCE_PACKAGES_POPULATED": "pass|fail",
    "PLUGIN_DIRECTIVES_INVOKED": "pass|fail",
    "FIGURE_WIDTH_DECLARED": "pass|fail",
    "EVIDENCE_PARAMETERS_HONORED": "pass|fail|n/a",
    "...": "every other check in this skill, by exact NAME"
  },
  "gate_passed": bool
}
```

**Mandatory:** `structural_results` MUST contain a key for **every numbered check defined in this skill that applies to the current phase**. Omitting a check key is itself a gate failure — the orchestrator MUST treat any missing expected key as `"fail"`. This prevents the silent-skip pattern where the validator agent runs only a subset of checks and reports `gate_passed: true` because the missing checks were never evaluated.

If a check is genuinely not applicable to the current phase, emit `"<CHECK_NAME>": "n/a"` with a one-line `"<CHECK_NAME>_reason"` sibling key explaining why.
