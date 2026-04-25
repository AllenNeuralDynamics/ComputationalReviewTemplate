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

## Build Checks (Phase 14, 19, 20)

9. **MYSTMD_INSTALLED**: `npm install -g mystmd` succeeds? **pass/fail**
10. **BUILD_PASSES**: `myst build --html` exits with zero ⛔ errors? **pass/fail**
11. **ZERO_CITATION_ERRORS**: Zero "Could not link citation" in output? **pass/fail**
12. **ZERO_IMAGE_ERRORS**: Zero "Cannot find image" in output? **pass/fail**

## Structural Checks (Phase 14, 20)

13. **TOC_MATCHES_FILES**: Every myst.yml toc file exists on disk? **pass/fail**
14. **EVIDENCE_JSONS_EXIST**: `evidence/section_XX_evidence_package.json` for XX=02-13? **pass/fail**
15. **FIGURE_NOTEBOOK_MATCH**: Every `:::{figure} ../figures/<name>.png` referenced in any
    `content/*.md` has a corresponding `figures/notebooks/<name>.ipynb` on disk, AND every
    such notebook contains ≥1 non-empty code cell (i.e., is not a stub)? **pass/fail**
    (Block check that catches the failure mode where Phase 6 saved PNGs without notebooks
    and Phase 14 had nothing to embed in dropdowns.)
16. **AUTHORS_YML_EXISTS**: `content/authors.yml` exists? **pass/fail**
17. **ALL_PLUGINS_LISTED**: myst.yml lists all 4 plugins? **pass/fail**
18. **HEADING_STYLE_CONSISTENT**: Run `audit_headings()` (defined in `comprev-critic.md`)
    across all `content/*.md` files. Zero problems of any type:
    `MANUAL_NUMBER_PREFIX`, `WRAPPED_HEADING`, `MULTI_SPACE_AFTER_NUMBER`,
    `INCONSISTENT_DASH`, `MIXED_H1_H2_STYLE`, `INCONSISTENT_ACROSS_SECTIONS`?
    **pass/fail**
    (Block check that catches the failure mode where Phase 8 per-section critics
    cannot see cross-section heading inconsistencies — e.g. §4 numbered H1 alongside
    §5 unnumbered H1 + numbered H2, or a wrapped `## heading\nundermined` orphan.)

19. **METHODS_LEDGER_FRESH** *(Phase 20V only)*: `content/M_methods.md` must
    reflect the final pipeline state, not the Phase-13 draft snapshot.
    Three sub-checks, all must pass:

    1. **No forbidden stale phrasings.** Grep `M_methods.md` for any of:
       `\bare scheduled\b`, `\bhad not yet executed\b`,
       `\bin progress \(this document\b`,
       `\bwill be captured in the final\b`,
       `\bPhases? 1[4-9].20 \(scheduled\)`. Zero hits required.
    2. **M.6 frame count matches live ledger.** Parse the integer that
       follows `Total session frames: \*\*` in the M.6 section. Must equal
       `len(operon.frames(project_id=PROJECT_ID, roots_only=False, has_task=False)['frames'])`
       within ±1 (allow for the validator's own frame).
    3. **M.6 phases-completed wording is final.** The phrase
       "All 20 pipeline phases completed" (case-sensitive) must appear in
       the M.6 section.
    4. **M.0 figure is post-Phase-13.** Open
       `figures/notebooks/fig_methods_pipeline.ipynb` and parse the
       `phases` list inside the notebook source; assert that no tuple
       carries the status `"scheduled"` or `"in_progress"`. Also assert
       that `figures/fig_methods_pipeline.png` mtime is later than the
       Phase 13 gate artifact's `created_at`. (The figure is regenerated
       by Phase 20a step (4); this sub-check verifies it ran.)

    Block check that catches the failure mode where M_methods.md or
    fig_methods_pipeline.png were rendered at Phase 13 with provisional
    numbers and never refreshed.
    The Phase 20a Methods Ledger Refresh step in `comprev-dataml-phases.md`
    is what populates the final values; this gate verifies the refresh ran.
    **pass/fail**

20. **PLUGIN_DIRECTIVES_INVOKED** *(Phase 14V, 20V)*: For every plugin
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

21. **EVIDENCE_PACKAGES_POPULATED** *(Phase 14V, 20V)*: Strengthens
    check #14 (EVIDENCE_JSONS_EXIST). For each section XX in 02..13:
    `evidence/section_XX_evidence_package.json` must exist, be at least
    1024 bytes, and parse as a JSON object containing the top-level key
    `section_title`. Catches the failure mode where Phase 14 created
    only the `.gitkeep` placeholder and the evidence-explorer widget had
    nothing to load. **pass/fail**.

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
    "...": "every other check in this skill, by exact NAME"
  },
  "gate_passed": bool
}
```

**Mandatory:** `structural_results` MUST contain a key for **every numbered check defined in this skill that applies to the current phase**. Omitting a check key is itself a gate failure — the orchestrator MUST treat any missing expected key as `"fail"`. This prevents the silent-skip pattern where the validator agent runs only a subset of checks and reports `gate_passed: true` because the missing checks were never evaluated.

If a check is genuinely not applicable to the current phase, emit `"<CHECK_NAME>": "n/a"` with a one-line `"<CHECK_NAME>_reason"` sibling key explaining why.
