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

    Block check that catches the failure mode where M_methods.md was
    rendered at Phase 13 with provisional numbers and never refreshed.
    The Phase 20a Methods Ledger Refresh step in `comprev-dataml-phases.md`
    is what populates the final values; this gate verifies the refresh ran.
    **pass/fail**

## Output Schema
```json
{"phase": 7|14|19|20, "gate": "pass|fail", "per_file_results": {...}, "build_result": {...}, "structural_results": {...}}
```
