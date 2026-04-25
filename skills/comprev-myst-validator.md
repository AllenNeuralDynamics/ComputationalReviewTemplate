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

## Output Schema
```json
{"phase": 7|14|19|20, "gate": "pass|fail", "per_file_results": {...}, "build_result": {...}, "structural_results": {...}}
```
