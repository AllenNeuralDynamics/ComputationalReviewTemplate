# MyST Validator — Binary Gate for Phases 7, 14, 19, 20

**Purpose:** Validate MyST markdown syntax and build integrity.
**Agent:** DATAML (grep + myst build)

## Canonical prose scanner

Every check in this skill that scans body text MUST use the following helper to skip code fences and directive option lines. Inline `grep` is disallowed — it produces false positives on fenced code blocks (e.g. the literal Python identifier `evidence_package` inside a figure notebook block).

```python
import re

def scan_prose(md_text, terms, *, case_insensitive=True):
    """Yield (line_no, term, line) tuples for term occurrences in prose only.

    Skips: ``` fenced code blocks, ::: directive openers and ::: option lines,
    indented (4-space) code blocks.
    """
    flag = re.IGNORECASE if case_insensitive else 0
    in_code = False
    for ln_no, line in enumerate(md_text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        if line.startswith(":::") or stripped.startswith(":") and stripped.endswith(":"):
            continue
        if line.startswith("    "):  # indented code
            continue
        for term in terms:
            for m in re.finditer(rf"\b{re.escape(term)}\b", line, flag):
                yield (ln_no, term, line)
```

Validators MUST import or inline this function rather than using `grep -E` over raw files.

## Per-File Checks (all .md in content/)

1. **NO_LABEL_DIRECTIVE**: Zero `:label:` (should be `:name:`)? **pass/fail**
2. **NO_DUPLICATE_NAME**: No `:name:` value appears twice in same file? **pass/fail**
3. **NO_ICON_COLOR** *(Phase 14V, 19V, 20V only — dropdowns absent at 7V)*: Zero `:icon:` or `:color:` in dropdowns? **pass/fail**
4. **FIGURE_DROPDOWN_MATCH** *(Phase 14V, 19V, 20V only — dropdowns are injected at Phase 14)*: `:::{figure}` count == `:::{dropdown}` count per section? **pass/fail**
5. **FIGURE_HAS_IMAGE_PATH**: Every `:::{figure}` points to `../figures/*.png`, not `#label`? **pass/fail**
6. **NO_PROCESS_LANGUAGE**: Zero "scaffold", "evidence package", "orchestrator" in prose (use `scan_prose`)? **pass/fail**

6b. **NO_WRITER_SCRATCHPAD** *(Phase 7V, 14V, 19V, 20V)*: Body prose MUST NOT contain LLM-thinking markers. Use `scan_prose` over `content/*.md` with the terms below; any hit fails. **pass/fail**

```
"Wait, I need to", "Let me reconsider", "Let me re-read", "Let me rewrite",
"The rules say", "The original has", "I need to keep", "I need to rewrite",
"I'll keep", "I'll rewrite", "I'll make sure", "Okay, let me", "OK, let me",
"reconsider the original"
```

6c. **CITE_DIRECTIVE_SYNTAX_CLEAN** *(Phase 7V, 14V, 19V, 20V)*: Citation directives must be well-formed. Run two regex scans over `content/*.md`:

```python
re.findall(r"`\{cite:[pt]\}", text)            # stray backtick BEFORE directive
re.findall(r"\{cite:[pt]\}[A-Za-z]", text)     # missing opening backtick AFTER directive
```

Any hit is a fail. Each hit converts a citation into a literal code span and breaks rendering. Report offenders as `path:line:fragment`. **pass/fail**

6a. **DIRECTIVE_WHITELIST_VIOLATION** *(Phase 7V, 19V)*: Every `:::{name}` directive in
    `content/*.md` body files matches the whitelist documented in `comprev-orchestrator-v29`
    §Directive Whitelist (`figure`, `dropdown`, `admonition`, `warning`, `authorship-explorer`
    in frontmatter only, `evidence-explorer`, `trust-claim`). Any `:::{contents}`, `:::{toctree}`,
    `:::{include}`, or `:::{tableofcontents}` in body sections is a hard fail — the build
    emits a global TOC. Bare-`{name}` role-syntax mis-invocations of plugin directives
    (e.g., `{evidence-explorer}` instead of `:::{evidence-explorer}`) are also failures.
    **pass/fail**
7. **CITE_KEYS_EXIST**: Every `{cite:p}` and `{cite:t}` key in references.bib? **pass/fail**
8. **NO_BARE_AUTHOR_NAMES**: Zero "X and colleagues" or "X et al." without adjacent `{cite:t}`? **pass/fail**

9. **FORBIDDEN_LEXICON**: Zero matches across the repository-wide glob `content/*.md content/*.yml content/*.yaml manuscript.tex` for the forbidden review-text vocabulary: Operon, scaffold, evidence package, framework failure, adversarial search, verdict, orchestrator, batch, sub-agent, revision manifest, prediction error, replication scorecard (as section title), paper weight, epistemic checkpoint. Coverage explicitly includes `content/Methods.md`, `content/00_frontmatter.md` (the AI-Disclosure admonition is NOT exempt), `content/authors.yml`, `provenance/*.md`, and `latex/manuscript.tex`. The frontmatter AI-Disclosure block must describe the pipeline using neutral terms ("directed specialist tools", "data-curation and literature-review components", "Phase 8 assessments") rather than internal vocabulary. Use `scan_prose` (defined above) so fenced code blocks and directive option lines are excluded from the scan. Allowed scientific uses ("phase" oscillation, "convergence" convergent evidence, "scaffold" developmental scaffolding, "recursive" recursive processing) are NOT flagged — match on whole-token boundaries with the explicit forbidden senses only. Per-phase exclusions MUST be declared in the gate JSON under `forbidden_lexicon.scoped_exclusions[]` with a justification string. **pass/fail**

## Build Checks (Phase 14, 19, 20)

10. **MYSTMD_INSTALLED**: `npm install -g mystmd` succeeds? **pass/fail**
11. **BUILD_PASSES**: `myst build --html` exits with zero ⛔ errors? **pass/fail**
12. **ZERO_CITATION_ERRORS**: Zero "Could not link citation" in output? **pass/fail**
13. **ZERO_IMAGE_ERRORS**: Zero "Cannot find image" in output? **pass/fail**

13a. **BIB_CITE_KEYS_RESOLVE** *(fallback when `myst build` cannot run)*: When the environment lacks `npm`/`mystmd` so checks 10–13 are deferred, the validator MUST run a mechanical citation-binding test in their place. Three sub-checks, all required:

```python
import yaml, re, json
from pathlib import Path

cfg = yaml.safe_load(Path("myst.yml").read_text())
bib_paths = cfg.get("project", {}).get("bibliography", [])
assert bib_paths, "myst.yml does not declare project.bibliography"

# 1. Every declared bib path exists, is > 1 KB, and contains ≥ 100 @-entries.
bib_keys = set()
for bp in bib_paths:
    p = Path(bp)
    assert p.exists(), f"bibliography missing on disk: {bp}"
    assert p.stat().st_size >= 1024, f"bibliography too small (stub?): {bp}"
    text = p.read_text()
    keys = re.findall(r"^@\w+\{([^,\s]+)", text, flags=re.MULTILINE)
    assert len(keys) >= 100, f"only {len(keys)} entries in {bp}"
    bib_keys.update(keys)

# 2. Every {cite:p}/{cite:t} key in content/*.md resolves in the bibliography.
unresolved = []
for md in Path("content").glob("*.md"):
    text = md.read_text()
    for m in re.finditer(r"\{cite:[pt]\}`([^`]+)`", text):
        for key in m.group(1).split(","):
            key = key.strip()
            if key and key not in bib_keys:
                unresolved.append((md.name, key))
assert not unresolved, f"{len(unresolved)} unresolved keys (first: {unresolved[:3]})"

# 3. Every \citep{}/\citet{} key in latex/manuscript.tex resolves likewise.
tex = Path("latex/manuscript.tex")
if tex.exists():
    for m in re.finditer(r"\\cite[pt]\{([^}]+)\}", tex.read_text()):
        for key in m.group(1).split(","):
            key = key.strip()
            assert key in bib_keys, f"unresolved in manuscript.tex: {key}"
```

This substitutes for the citation-linker that `myst build` runs. **pass/fail**

## Structural Checks (Phase 14, 20)

14. **TOC_MATCHES_FILES**: Every myst.yml toc file exists on disk? **pass/fail**

14a. **BIBLIOGRAPHY_PATH_MATCHES_MYSTYML** *(Phase 14V, 20V)*: Every path in `myst.yml`'s `project.bibliography` array must exist on disk, be at least 1 KB, and contain at least 100 BibTeX `@`-entries. Stubs (typically the upstream-template placeholder at `content/references.bib` containing only a comment line) are a hard fail — the build will silently emit "Could not link citation" for every cite key. **pass/fail**

15. **EVIDENCE_JSONS_EXIST**: For each section `NN` in `1..len(scope["sections"])` (from `gate_scope.json`), `evidence/evidence_section_NN.json` exists. **pass/fail**

15a. **EVIDENCE_FINDINGS_ARE_OBJECTS** *(Phase 14V, 20V)*: For each `evidence/evidence_section_NN.json`, the top-level `findings` value must be an array of JSON objects, not strings. Validators that assign per-section metadata onto each entry crash on primitive strings; cite-key strings belong in `argument_groups[*].supporting_findings`, not in `findings`. **pass/fail**

16. **FIGURE_NOTEBOOK_MATCH**: Every `:::{figure} ../figures/<name>.png` referenced in any `content/*.md` has a corresponding `figures/notebooks/<name>.ipynb` on disk, AND every such notebook contains ≥1 non-empty code cell (i.e., is not a stub). **pass/fail**

16a. **FIGURE_NOTEBOOK_SELF_CONTAINED** *(Phase 14V, 20V)*: Each figure notebook must be runnable in a vanilla SciPy environment without project-local imports. For every `figures/notebooks/*.ipynb`, parse its code cells and collect all top-level `import` / `from X import` statements. Every imported module must satisfy one of:

  - in the Python stdlib, OR
  - in the canonical scientific stack: `numpy`, `pandas`, `scipy`, `matplotlib`, `matplotlib.pyplot`, `seaborn`, `networkx`, `sklearn`, OR
  - imported as `shared_style` AND `figures/notebooks/shared_style.py` exists in the repository AND defines the symbols the notebooks use (the validator parses each notebook for `shared_style.<NAME>` or `from shared_style import <NAMES>` references and asserts each `<NAME>` is defined in `shared_style.py` via `ast.parse`).

Any other import is a fail. Reports offenders as `notebook:line:module`. **pass/fail**

17. **AUTHORS_YML_EXISTS**: `content/authors.yml` exists? **pass/fail**

18. **AUTHOR_IDENTITY_NOT_PLACEHOLDER** *(Phase 14V, 20V)*: Zero placeholder author tokens in
    `content/authors.yml`, `myst.yml` `authors:` block, or any author-byline block in
    `content/*.md`. Forbidden tokens (case-insensitive substring match on `name:` values
    and byline text): `Human Supervisor`, `Anonymous`, `TBD`, `[NAME]`, `<...>` template
    angle-brackets, `Author N` patterns. **pass/fail**
19. **ALL_PLUGINS_LISTED**: myst.yml lists all 4 plugins? **pass/fail**
20. **HEADING_STYLE_CONSISTENT**: Run `audit_headings()` (defined in `comprev-critic.md`)
    across all `content/*.md` files. Zero problems of any type:
    `MANUAL_NUMBER_PREFIX`, `WRAPPED_HEADING`, `MULTI_SPACE_AFTER_NUMBER`,
    `INCONSISTENT_DASH`, `MIXED_H1_H2_STYLE`, `INCONSISTENT_ACROSS_SECTIONS`?
    **pass/fail**

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
       "All 21 pipeline phases completed" (case-sensitive) must appear in
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
       carry the literal token `Pending` in any column.

    The Phase 20a Methods Ledger Refresh step in `comprev-dataml-phases.md`
    populates the final values; this gate verifies the refresh ran. **pass/fail**

21. **PLUGIN_DIRECTIVES_INVOKED** *(Phase 14V, 20V)*: For every plugin
    file listed in `myst.yml` `project.plugins`, parse the plugin source
    (`*.mjs`) and extract every `name: '<directive-name>'` literal whose
    value appears in a `directives: [...]` array (i.e., every directive
    the plugin registers). For each such name:

    1. **Invocation present.** At least one `content/*.md` file must
       contain `:::{<directive-name>}` (block fence). Zero invocations
       across the corpus = fail.
    2. **No role-syntax mis-invocation.** `grep -rE '^\{<directive-name>\}\s*$'
       content/*.md` must return **zero** matches. A bare `{name}` on
       its own line is *role* syntax — MyST silently fails the role
       lookup when only a directive of that name exists, and the line
       renders as literal text. Authors MUST use `:::{name}` (or
       backtick-fenced `\`\`\`{name}`) for directives.

    Block check; **pass/fail**.

22. **EVIDENCE_PACKAGES_POPULATED** *(Phase 14V, 20V)*: Strengthens
    check #15. For each section `NN` in `1..len(scope["sections"])`:
    `evidence/evidence_section_NN.json` must exist, be at least
    1024 bytes, and parse as a JSON object containing the top-level keys
    `section_id` and `findings` (array of objects, not strings). **pass/fail**.

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
    **pass/fail**.


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


25. **EVIDENCE_PARAMETERS_HONORED** *(Phase 14V, 20V)*:
    Read `evidence_parameters` from `gate_scope.json`. For each cluster
    evidence package (`evidence/evidence_section_*.json`):

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
      with reason "no custom evidence parameters set".

26. **CLAIM_KB_FILES_PRESENT** *(Phase 14V, 19V, 20V)*:
    Verify all required TRUST knowledge files exist and parse:
    - `knowledge/claim_seed_index.json`
    - `knowledge/claim_graph.json`
    - `knowledge/schemas/claim_context.schema.json`
    - `knowledge/schemas/trust_score.schema.json`
    - `knowledge/schemas/claim_graph.schema.json`
    Missing or invalid JSON is a hard fail. **pass/fail**

27. **TRUST_CLAIM_TAG_LINKAGE** *(Phase 14V, 19V, 20V)*:
    For every `:::{trust-claim}` in `content/*.md`:
    - if `:claim-id: != claim-id-placeholder`, it must resolve in `knowledge/claim_graph.json` `claims[].claim_id`
    - resolved claim must include `trust_score.overall_score` and `trust_score.trust_label`
    - directive options must include `:claim-id:`, `:claim:`, and `:cites:`
    Unresolved IDs or missing score fields are a hard fail. **pass/fail**

## Output Schema

The validator's gate JSON (e.g. `gate_sections_drafted.json` at 7V, `gate_assembly.json` at 14V, `gate_repository_push.json` at 20V — and the in-memory return value at 19V, which has no named gate file) MUST be a single JSON object containing — at minimum — these keys:

```json
{
  "phase": 7|14|19|20,
  "gate": "pass|fail",
  "per_file_results": {...},
  "build_result": {"myst_errors": int, "myst_warnings": int},
  "structural_results": {
    "TOC_MATCHES_FILES": "pass|fail",
    "BIBLIOGRAPHY_PATH_MATCHES_MYSTYML": "pass|fail",
    "UNRESOLVED_CITE_KEYS": int,
    "BROKEN_FIGURE_REFS": int,
    "FIGURE_DROPDOWN_MATCH": "pass|fail",
    "FIGURE_NOTEBOOK_MATCH": "pass|fail",
    "FIGURE_NOTEBOOK_SELF_CONTAINED": "pass|fail",
    "HEADING_STYLE_CONSISTENT": "pass|fail",
    "METHODS_LEDGER_FRESH": "pass|fail",
    "EVIDENCE_JSONS_EXIST": "pass|fail",
    "EVIDENCE_FINDINGS_ARE_OBJECTS": "pass|fail",
    "EVIDENCE_PACKAGES_POPULATED": "pass|fail",
    "NO_WRITER_SCRATCHPAD": "pass|fail",
    "CITE_DIRECTIVE_SYNTAX_CLEAN": "pass|fail",
    "PLUGIN_DIRECTIVES_INVOKED": "pass|fail",
    "FIGURE_WIDTH_DECLARED": "pass|fail",
    "BIB_CITE_KEYS_RESOLVE": "pass|fail|n/a",
    "EVIDENCE_PARAMETERS_HONORED": "pass|fail|n/a",
        "CLAIM_KB_FILES_PRESENT": "pass|fail",
        "TRUST_CLAIM_TAG_LINKAGE": "pass|fail",
    "...": "every other check in this skill, by exact NAME"
  },
  "gate_passed": bool
}
```

**Mandatory:** `structural_results` MUST contain a key for **every numbered check defined in this skill that applies to the current phase**. Omitting a check key is itself a gate failure — the orchestrator MUST treat any missing expected key as `"fail"`. This prevents the silent-skip pattern where the validator agent runs only a subset of checks and reports `gate_passed: true` because the missing checks were never evaluated.

If a check is genuinely not applicable to the current phase, emit `"<CHECK_NAME>": "n/a"` with a one-line `"<CHECK_NAME>_reason"` sibling key explaining why.

