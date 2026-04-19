# Section Writing Protocol

> **Template provides:** `scripts/shared_style.py` is available for figure styling. Import it in your figure code: `from shared_style import COLORS, apply_style, save_figure`. Widget assets (`authorship-widget.mjs`, `evidence-explorer-widget.mjs`, `citation-annotation-widget.mjs`) are already deployed in `content/`. Do not recreate them.


Phase 7 delegation template for section writers. Draft one section of the review in MyST markdown with figures, citations, and evidence synthesis.

**Information barrier:** This skill contains ONLY writing instructions. You cannot see how your section will be critiqued (Phase 8), how figures were audited (Phase 6), or how citations will be verified (Phase 16). Write the best section you can from the evidence — the evaluation criteria are not your concern.

---

## Phase 7: Section Drafting

**Agent:** LITREVIEW (parallel — one per section)

Section writers load `comprev-figure-construction` for figure production.

**PREREQUISITE:** Before launching ANY Phase 7 delegation, the coordinator
MUST verify:

```python
require_phase('3b_figure_audit')  # Asserts Phase 6 is complete
audit_gate_vid = check_gate('gate_figure_audit.json')
```

Each Phase 7 delegation template MUST include the Phase 6 verdicts artifact: `{{artifact:<audit_gate_vid>}}`. If the artifact doesn't exist, the delegation cannot be assembled — this is the structural enforcement.

**MANDATORY — Each section writer receives:**
1. Their per-section scaffold extract from Phase 5 (artifact reference) — NOT the full scaffold
2. Their section's curated evidence package from Phase 5
3. The document figure style guide
4. Adjacent section summaries (1-2 paragraphs each for N-1 and N+1)
5. Explicit opening and closing constraints
6. Cross-reference instructions
7. Voice/tone guide
8. Phase 6 verdicts for all figure_data comparisons in this section, including mandatory_caption_caveats
9. The `citation_key_map` artifact: `{{artifact:<citation_key_map_vid>}}` — maps DOI → canonical cite_key
10. The `author_name_table` artifact: `{{artifact:<author_name_table_vid>}}` — maps cite_key → author names for prose mentions

**MANDATORY — Delegation template must include:**
> "Your output is a SECTION of a larger document. Do NOT include \documentclass, \usepackage, \begin{document}, \end{document}, \begin{thebibliography}, or \bibitem. Use \citep{CiteKey} for parenthetical citations and \citet{CiteKey} for textual (e.g., "\citet{Author2020} showed…"). Do NOT use bare \cite{}. Start directly with \section{...}. Load `comprev-figure-construction` for figure production. Use ONLY the canonical citation keys provided in the citation_key_map from Phase 5. Do NOT invent new keys — no Unknown, Fix, or Placeholder keys. If a paper is not in the key map, skip the citation rather than fabricating a key.
>
> CITATION DENSITY SELF-CHECK: Before saving your .tex file, count
> your \citep{}/\citet{} commands and divide by the number of substantial
> paragraphs (exclude figure environments, single-sentence transitions,
> and subsection-opening topic sentences that are followed by elaboration).
> Report this as `citations_per_paragraph` in your structured output.
> If below 4.0, you MUST restructure: merge consecutive single-paper
> paragraphs into synthesis paragraphs that cite 5–8 papers in dialogue
> before each paragraph's concluding synthesis sentence."

**MyST format requirements (MANDATORY):**
- Citations: `` {cite:p}`AuthorYear` `` and `` {cite:t}`AuthorYear` `` — backticks AFTER the closing brace
- Figure directives: `:::{figure} ../figures/fig_secN_name.png` — note the `../` prefix
- Figure labels: use DASHES not colons: `:name: fig-secN-name` (NOT `fig:secN`)
- Section label: Start the file with `(sec-LABEL)=` on line 1, before the heading
- Cross-references: `` {ref}`sec-target-label` `` — no wrapping parentheses
- No double backticks except in code blocks
- Include `{authorship-explorer}` directive at end of file (before any code dropdowns)

**MANDATORY — Citation discipline:**
- Only cite papers provided in the evidence package for your section. Do NOT introduce new citations from LLM memory.
- **Claim-citation alignment:** When citing a paper for a specific claim, the paper must actually make or directly support that claim — not merely be topically related. If you are stating a general methodological caveat (e.g., "Cre lines may capture transiently expressing cells"), cite a paper that explicitly discusses that caveat, not one that merely uses the tool. If no paper in the evidence package supports the specific claim, either (a) drop the claim, (b) hedge it as "a general concern" without a citation, or (c) flag it for the coordinator to source an appropriate reference.
- **Direction check:** Before attaching a citation, verify that the cited paper argues in the same direction as your claim. A paper reporting high tool specificity cannot be cited as evidence of tool unreliability.
- Use \citep{CiteKey} (or \citet{CiteKey} for textual) with the DOI as a comment on first use: `\citep{Pouille2001} % doi:10.1126/science.1060342` — this ensures every citation is traceable during bibliography assembly.
- Never fabricate or guess bibliographic metadata.
- **Author names from table ONLY:** When writing prose-style author mentions (e.g., "Pouille and Scanziani (2001) established..."), you MUST look up the author names in the `author_name_table` provided with your evidence package. Use the `display` field for two-author papers, `et_al` for three or more. NEVER write author names from memory. If a cite_key is not in the author_name_table, use citation-only format: "It has been shown \citep{Key} that..." — do NOT guess the authors.
- **Hard prohibition:** Do NOT write "and Bhatt", "Bhatt et al.", "Bhatt and", or any author name not present in the author_name_table for that cite_key. Any occurrence of an author name not in the table is a compliance failure.

**MANDATORY — Section writers must NOT:**
- Write a standalone introduction to the field
- Define terms already in the terminology conventions
- Re-present findings already covered in earlier sections
- Write a section-level conclusion as if the document is ending
- Cite any paper not present in their evidence package

**MANDATORY — Section writers MUST:**
- Write paragraphs organized by argument, not by paper. Each paragraph makes a claim and marshals multiple papers as evidence. Example structure: "Claim sentence citing \citep{A, B}. \citet{A} established X with method M1. \citet{B} extended this to Y but found a discrepancy in Z. \citet{C} resolved this by showing condition-dependence. Together, these studies establish [synthesis]."
- Synthesize across papers within paragraphs. A paragraph citing 3–5 papers in dialogue is stronger than three paragraphs each covering one paper.
- Do not add specific quantitative values (numbers, fold-changes, percentages) that are not present in your evidence package. If the evidence package describes a finding qualitatively, describe it qualitatively in the prose.
- Reserve single-paper paragraphs for landmark studies that require detailed methodological exposition (e.g., the 2012 gain control trio where each paper's specific methods explain the discrepancy).

**MANDATORY — Figure production:**
- Every scaffold-specified figure MUST be produced
- Figures use \label{fig:secN-name}, text uses \ref{fig:secN-name} — NEVER hard-coded numbers
- Cross-study comparison figures use pre-extracted data from evidence packages
- Follow document style guide (colors, fonts, DPI)
- Save figures as PNG files alongside the .tex section file

**MANDATORY — Figure filename discipline:**
- The filename in `\includegraphics{}` MUST exactly match the filename passed to `save_artifacts`. No path prefixes, no extension mismatches.
- Example: if you save `fig_sec4_gain_control.png`, your LaTeX must contain `\includegraphics{fig_sec4_gain_control.png}` — not `figures/fig_sec4_gain_control` or `gain_control_fig`.
- In your structured output, return a `figure_filenames` list mapping each `\includegraphics` path to the saved artifact filename:
  ```json
  [{"latex_path": "fig_sec4_gain_control.png", "artifact_filename": "fig_sec4_gain_control.png"}]
  ```
- NEVER use `{{artifact:...}}` markers inside `.tex` source code. These are platform references that do not resolve during LaTeX compilation — they will appear as literal broken paths. Use plain filenames only (e.g., `fig_sec4_gain_control.png`).

**MANDATORY — Figure placement:**
- ALL figures MUST use `\begin{figure}[H]` (requires `\usepackage{float}` in preamble — the coordinator handles this). This forces figures to appear exactly where they are placed in the source, preventing drift to section boundaries in long documents.
- Never use `[t]`, `[b]`, `[p]`, or `[htbp]` — in a 200+ page document with 35 figures, deferred placement causes figures to accumulate far from their textual references.
- Never use bare `\begin{figure}` without a placement specifier

**MANDATORY — Output filenames must match the repository's myst.yml toc entries:**

The GitHub repository's `myst.yml` expects these EXACT filenames. Section writers MUST use these names — not generic `section_NN.md`:

```python
SECTION_FILENAMES = {
    1:  '01_introduction',
    2:  '02_classification',
    3:  '03_tools',
    4:  '04_section_topic',
    5:  '05_section_topic',
    6:  '06_section_topic',
    7:  '07_noncardinal_types',
    8:  '08_invivo_processing',
    9:  '09_section_topic',
    10: '10_plasticity_development',
    11: '11_species_translation',
    12: '12_computational_models',
    13: '13_synthesis',
}
# MyST file: content/{name}.md
# LaTeX file: latex/{name}.tex
# Figure format: figures/fig_sec{N}_{descriptive_name}.png
```

The coordinator MUST include the correct filename in each Phase 7 delegation: "Save your MyST output as `{name}.md`" — not as `section_NN.md` or any other variant. Mismatched filenames cause the MyST build to miss sections.

**MANDATORY — Figure path format in MyST markdown:**

All figure directives MUST use this exact format:
```markdown
:::{figure} ../figures/fig_secN_descriptive_name.png
:name: fig-secN-descriptive-name
:width: 100%
Caption text.
:::
```

The `../figures/` prefix is required because content files are in `content/` and figures are in `figures/` (sibling directories). MyST resolves paths relative to the file. A bare filename like `fig_sec2_type_counts.png` will NOT resolve — it must be `../figures/fig_sec2_type_counts.png`.

**Each writer produces:**

1. **`section_NN.md`** — MyST markdown (primary, for the GitHub repo). Format:
   - Parenthetical citations: `` {cite:p}`CiteKey` `` (equivalent to `\citep{CiteKey}`)
   - Textual citations: `` {cite:t}`CiteKey` `` (equivalent to `\citet{CiteKey}`)
   - Figures:
     ```markdown
     :::{figure} ../figures/fig_secN_name.png
     :name: fig-secN-name
     :width: 100%
     Caption text with {cite:p}`Source2020` attribution.
     :::
     ```
   - Evidence conflicts:
     ```markdown
     :::{admonition} Evidence Conflict
     :class: warning
     Description of the conflict...
     :::
     ```
   - Provenance annotations on key claims:
     ```markdown
     :::{margin} Provenance
     **Source:** verbatim sentence from Paper2020 (fulltext)
     **Replication:** independently_replicated (3 labs)
     :::
     ```

2. **`section_NN.tex`** — LaTeX (for PDF compilation). Same content, LaTeX syntax.

3. **Figure PNGs** — 300 DPI, saved to `figures/`

4. **One Jupyter notebook per figure** — saved to `figures/notebooks/fig_secN_name.ipynb`:
   - Cell 1: Import `shared_style` and load evidence JSON
   - Cell 2: Extract the relevant comparison data
   - Cell 3: Create the figure using style guide colors/fonts
   - Cell 4: Save as PNG
   - Must be self-contained and runnable with: `jupyter execute figures/notebooks/fig_secN_name.ipynb`
   ```python
   import sys; sys.path.insert(0, '../scripts')
   from shared_style import COLORS, apply_style, save_figure
   ```

5. **Structured output:** `figure_filenames` mapping, `citations_per_paragraph`, word count

**Compliance checks:**
- grep for \begin{thebibliography} → NON-COMPLIANT
- grep for \documentclass → NON-COMPLIANT
- All scaffold figures produced?
- Opening connects to previous section?
- Closing sets up next section?
- At least one conflict/tension present?
- Key papers receive substantive treatment (not just a one-sentence citation), either within a synthesis paragraph or — for singular landmarks — in a dedicated paragraph?
- Paragraphs organized by argument, not by paper? Each paragraph should advance ONE claim or sub-argument and cite MULTIPLE papers as converging evidence, conflicting results, or methodological comparisons. Target: 5–8 citations per synthesis paragraph. A paragraph that discusses only one paper is acceptable only when that paper is a singular landmark requiring detailed methodological exposition. A section where most paragraphs map 1:1 to individual papers is catalog-style, not synthetic — send back: "Restructure paragraphs around arguments, not individual papers."
- Tiered treatment applied? Check that the section uses three levels of paper treatment: (1) landmark papers with detailed discussion of methods and results, (2) core papers with substantive 2–3 sentence treatment within synthesis paragraphs, (3) confirmatory papers cited as converging evidence. If all cited papers receive equal-depth treatment, the section will be either too long or too shallow — send back: "Apply tiered treatment. Not every paper needs a full paragraph — integrate core and confirmatory papers into synthesis paragraphs at higher density."
- Minimum citations per section: core sections ≥35, supporting sections ≥25? If a section writer uses fewer citations than provided in their evidence package, send back: "Your evidence package contained N papers but you only cited M. Key papers that should receive treatment: [list uncited papers from the package]."
- Citation density: the writer's self-reported `citations_per_paragraph`
  must be ≥ 4.0. The coordinator independently verifies by counting
  `\cite` commands and dividing by paragraph count in the .tex file.
  If either measure is below 3.0 → send back: "Synthesis density too
  low (X citations / Y paragraphs = Z). Merge consecutive single-paper
  paragraphs into synthesis paragraphs. Each synthesis paragraph should:
  (1) open with a claim sentence citing 2–3 papers, (2) elaborate with
  evidence from 2–3 more papers, (3) close with a synthesis sentence
  that integrates the cited papers. Target: 5–8 unique citations per
  paragraph." If between 3.0 and 4.0 → accept with a warning logged
  in the phase ledger.
- grep for `{{artifact:` in .tex files → NON-COMPLIANT. Send back: "Replace artifact markers with plain filenames in \includegraphics."
- grep for `% doi:` inside \caption{} blocks → NON-COMPLIANT. Send back: "Remove % doi: comments from inside captions — they break LaTeX brace matching."
- Brace balance check: count { and } in each section .tex file. If unbalanced → NON-COMPLIANT. Common cause: truncated captions from output limits. Send back: "Unbalanced braces — check all \caption{} arguments for missing closing braces."
- **Caption caveat enforcement:** For each figure_data comparison with Phase 6 verdict = CAVEAT, verify that ALL mandatory_caption_caveats appear in the figure's \caption{} text. If any are missing → send back: "Phase 6 required the following caveats in the caption for [figure_label]: [missing caveats]. Add them."

**MyST Format Validation (MANDATORY — run on every returned .md file before accepting):**

The coordinator delegates this to DATAML as a mechanical validation step. For each section .md file:

1. **Citation format:** Every `{cite:p}` and `{cite:t}` must use the pattern `` {cite:p}`key1, key2` ``. 
   Reject if: `` {cite:p`key `` (missing `}` before backtick), `{cite:p}key` (missing backtick wrapper), 
   or `` ({cite:p}`key`) `` (extra wrapping parens).
   Regex to catch malformed: `\{cite:[pt][^}]\`` or `\{cite:[pt]\}[A-Z]`

2. **Cross-reference format:** No `({numref}` or `({ref}` wrapping. 
   Regex: `\(\{numref` or `\(\{ref` → send back.

3. **Double backticks:** No `` `` `` outside of code blocks. Regex: `` [^`]``[^`] ``

4. **Figure paths:** All figure directives must use `../figures/` prefix (files are in content/).
   Pattern: `:::{figure} ../figures/fig_secN_name.png`
   Reject if: `:::{figure} figures/` (missing `../`)

5. **Label format:** All figure and section labels must use dashes, not colons.
   Reject if: `fig:sec` anywhere (should be `fig-sec`).

6. **Section labels present:** Each section .md must start with `(sec-LABEL)=` before the first heading.
   The canonical labels are defined in the Phase 4 scaffold.

7. **Word count:** Assert word count ≥ scaffold target for this section. If below 80% of target, 
   send back: "Section is N words, target is M. Expand coverage of [specific undertreated topics 
   from evidence package]."

8. **Notebook quality:** Every saved .ipynb must have ≥1 code cell containing `plt.subplots` 
   or `fig =` or `ax.`. Reject notebooks with only comments like "see main workspace".

If ANY check fails, `send_message` back to the writer with the specific regex matches and line numbers.
9. **No uncited mechanistic claims:** Grep for mechanistic verbs without adjacent citations.
   Patterns: sentences containing "targets", "inhibits", "drives", "gates", "modulates",
   "mediates", "provides", "controls", "generates", "stabilizes" that lack a `{cite:p}` or
   `{cite:t}` within the same sentence or the immediately preceding/following sentence.
   If found without citation, send back: "Line N contains a mechanistic claim without a
   primary data citation. Either add a citation to the paper that experimentally demonstrated
   this, or qualify with 'commonly described as...' / 'widely assumed to...' if no primary
   source can be identified. The absence of a citable primary source is itself a finding
   worth noting in the review."

Do NOT accept the section until all 9 checks pass.



**MANDATORY — Figure code reproducibility:**
For EACH figure produced, include a `:::{dropdown} 📓 Figure code` block immediately after the `:::{figure}` directive containing the COMPLETE Python code used to generate it. The code must be the actual executed code, not a stub or placeholder.

**MANDATORY — No authorship-explorer in sections:**
Do NOT include `{authorship-explorer}` in section files. It belongs only on the frontmatter page (added during Phase 14 assembly).

**Gate check — dropdown count:**
After the writer returns, the coordinator verifies: the number of `:::{dropdown}` blocks equals the number of `:::{figure}` blocks. If not, send back.




---

# Writing Standards and Format (from comprev-reviewer-agent)

## Part IV: Writing Standards



### False Consensus Detection (Critical)

**Never state a mechanistic claim as established fact without a primary data citation.**

- If you write "X targets Y" or "A drives B" or "C mediates D", you MUST cite a paper that
  **experimentally demonstrated** this mechanism (electrophysiology, imaging, anatomy, etc.)
  — not a review that repeats the claim.
- If you cannot find a primary experimental source: use qualifiers like "commonly described as...",
  "widely assumed to...", or "the prevailing model holds that..." and note the absence of primary
  data: "though the primary experimental demonstration of this specific mechanism is rarely cited."
- The absence of a citable primary source IS itself a finding worth noting in the review.
  A sentence like "Despite widespread repetition in reviews, the primary data supporting X
  is surprisingly thin" is more valuable than confidently asserting X.
- Be especially vigilant about "textbook facts" — claims you feel certain about but cannot
  trace to a specific experiment. These are the highest-risk claims for false consensus.

### Write at Colleague Level
- Precise: "observed in [specific system] under [specific conditions]" not "happens in [broad domain]"
- Hedging: "suggests" vs "demonstrates" — calibrate to evidence strength
- When presenting a model, always follow with what it does not account for

### Depth Floors
Every paragraph discussing a specific paper must include:
1. **What was measured** — study system, n, experimental conditions, technique
2. **What was found** — quantitative results (effect sizes, not just "significant")
3. **What it means and what it doesn't** — interpretation AND limitations
4. **Replication status** — woven into narrative naturally

**Tiered treatment based on paper importance:**
- **Landmark papers (~15–20% of citations):** Full dedicated treatment — detailed methods, quantitative results, and limitations — either within a multi-paper synthesis paragraph or, for singular milestones, as a standalone paragraph.
- **Core papers (~40–50% of citations):** Substantive mention (2–3 sentences) integrated into synthesis paragraphs. The paragraph's argument comes first; papers are marshaled as evidence.
- **Confirmatory/replication papers (~30–40% of citations):** Cited as converging evidence within synthesis sentences. These papers matter for establishing replication breadth, not for individual exposition.

**One-sentence summaries of LANDMARK papers are unacceptable.** But not every cited paper needs its own paragraph — most should appear within multi-paper synthesis paragraphs averaging 5–8 citations each. The goal is dense integration, not sequential coverage.

**Target density:** 3,000–6,000 words per major section. A comprehensive review targeting literature saturation: 50,000–80,000 words total. Length grows sub-linearly with citation count because most additional papers are integrated at the core or confirmatory tier, not the landmark tier.

**Quantitative fidelity:** Your evidence package is your lab notebook.
During writing, work from the notebook. Your synthesis, your argument,
your critical assessment — write those freely. But numbers come only
from the notebook. Every number you write should make you pause: is this
in my notebook? Can I trace it?

  ✅ "[Intervention X] increased [outcome Y] (Author et al. 20XX)"
  ✅ "The evidence for this claim is weaker than commonly assumed,
     resting primarily on a single experimental preparation"
  ❌ "[Intervention X] increased [outcome Y] by 43% (Author et al. 20XX)"
     [if 43% is not in the evidence package with a source sentence]

The first two earn trust — one reports an observation, one offers
reasoned assessment. The third spends trust by presenting an unverified
number as a measured fact.

### Section Writing (Phase 7)
When writing sections for a larger review:
- Before saving any .tex file, verify that all braces are balanced. In particular, check that every \caption{ has a matching closing }. An unclosed caption will cause LaTeX to read past the end of the file.
- Follow the scaffold's argument arc
- Use the curated evidence package, not raw Phase 1 output
- Begin where the previous section left off (opening constraint)
- End by setting up the next section (closing constraint)
- Include cross-references specified in the scaffold
- Do NOT write a standalone introduction to the field
- Do NOT re-present findings from earlier sections
- Do NOT cite any paper not present in your evidence package. If a claim needs a source you don't have, write the claim without a citation.
- Use \citep{CiteKey} (or \citet{CiteKey} for textual) with a DOI comment on first use: `\citep{Smith2022} % doi:10.1234/example` — this ensures traceability during bibliography assembly
- EXCEPTION: Inside \caption{} arguments, do NOT use % doi comments. The % character comments out the rest of the LaTeX line, which will break the caption's closing brace. In captions, use bare \citep{CiteKey} without the DOI comment.
- **Author names from table ONLY:** When writing prose-style author mentions (e.g., "Smith and Jones (2022) established..."), look up names in the `author_name_table` provided with your evidence package. Use the `display` field for 1–2 authors, `et_al` for 3+. NEVER write author names from memory. If a cite_key is not in the table, use citation-only format: "It has been shown \citep{Key} that..." — do NOT guess.
- If your evidence package includes `mandatory_caption_caveats` for any figure, include ALL of them verbatim in the figure's \caption{}.

**HARD RULE — You May ONLY Cite From Your Evidence Package:**

This applies to initial writing AND to all revisions:
- Every cite_key you use MUST come from your per-section evidence package
- Every author name you write MUST come from the author_name_table
- You MUST NOT generate, recall, or invent citations from memory — EVER
- If you need a paper that is not in your evidence package, report it:
  "I need evidence on [specific topic] but it's not in my package. Request 
  supplementary search." The coordinator will handle the search.
- If a critic says "cite both sides" and one side's papers aren't in your 
  package, report the gap — do NOT fill it from memory
- This rule exists because memory-generated citations are the #1 source of 
  hallucination in automated reviews. The citation_key_map was built from 
  CrossRef metadata — it's the only trustworthy source of cite_keys.


### Co-Loading with Figure Construction
When `comprev-figure-construction` is loaded (Phase 7):
- You own the prose and argument; figure construction owns the visual execution
- Identify where each figure belongs in your argument before producing it
- Pass `figure_data` from your evidence package to the figure production step
- After figure production, write surrounding prose that interprets what the figure shows
- Ensure \ref{fig:secN-name} in text matches the figure's \label{}


**Figure paths in .md files:**
- `:::{figure} ../figures/fig_secN_name.png` (note: ../figures/ prefix from content/ dir)
- `:name: fig-secN-name` (dashes not colons)
- Start each section file with `(sec-LABEL)=` label directive before the first heading

### Managing Long Documents
- Write each section as a complete, deep unit before moving to the next
- Never compress to fit output limits — split and continue
- Save each completed section as a checkpoint
- Maintain consistent voice across sections

---

## Output Format: MyST Markdown

When writing review sections, produce BOTH formats:
1. **`section_NN.md`** — MyST markdown (primary, for the GitHub repo)
2. **`section_NN.tex`** — LaTeX (for PDF compilation)

MyST citation syntax:
- Parenthetical: `` {cite:p}`CiteKey` `` (equivalent to `\citep{CiteKey}`)
- Textual: `` {cite:t}`CiteKey` `` (equivalent to `\citet{CiteKey}`)

**MyST citation syntax (CRITICAL — must be exact):**
- Parenthetical: `` {cite:p}`AuthorYear` `` (e.g., `` {cite:p}`Cardin2009` ``)
- Textual: `` {cite:t}`AuthorYear` `` (e.g., `` {cite:t}`Cardin2009` ``)
- Multiple: `` {cite:p}`Author2009, Author2012, Author2020` ``
- The backtick MUST come AFTER the closing brace: `{cite:p}` then backtick
- Do NOT wrap in parentheses: `` ({cite:p}`key`) `` is WRONG
- Do NOT use LaTeX citation commands (\citep{}, \citet{}) in .md files


MyST figure syntax:
```markdown
:::{figure} ../figures/fig_secN_name.png
:label: fig-secN-name
:width: 100%
**Short descriptive title.** Caption body with {cite:p}`Source2020` attribution.
:::
```

**Figure caption rules (enforced in Phase 8 critic audit):**

1. **Use `:label:` not `:name:`.** MyST resolves `{numref}` against `:label:` first; using `:name:` in addition produces a duplicate-key warning. Pick one, and standardise on `:label:` everywhere.
2. **No manual figure numbering in captions.** Never write `**Figure 10.2** —` at the start of a caption. MyST auto-numbers figures from document order, and a manual prefix of `10.2` placed before `10.1` in source order produces a contradiction that the build cannot resolve. Let `{numref}` do the work.
3. **Caption MUST open with a short bold title phrase.** Format: `**Five-or-fewer-word title.** Body of caption...` The bold title is rhetorical — it tells the reader at a glance what the figure shows. The body sentence(s) that follow explain the mechanism or evidence and attach citations.
4. **One `:label:` directive per figure, no aliases.** If the same figure needs multiple xref anchors, use MyST target syntax (`(sec-fig-alt)=`) above the figure rather than duplicate `:label:` directives.

**Heading numbering rule:** Section headings must NOT embed manual numbers (`## 10.2 Mechanisms`). Use plain titles (`## Mechanisms`) plus an invisible label above (`(sec-10-mechanisms)=`) for cross-references. Numbering is the build system's responsibility.

**Cross-references between sections:**
- Use `` {ref}`sec-target-label` `` (no parentheses wrapping)
- Use `` {numref}`fig-secN-name` `` for figure references (dashes, not colons)
- Labels are defined at the top of each target section as `(sec-label)=`
- Never use double backticks: `` {numref}`fig-name` `` not `` {numref}`fig-name`` ``

**NEVER use hardcoded section numbers in prose.** Do not write §8.4, §10.2,
"Section 3.1", "see §10", or any variant that embeds a manual number. These
break when sections are reordered, render as opaque numbers to the reader,
and do not produce clickable links in the built site. Always use
`` {ref}`sec-label` `` instead. If you are referencing a subsection within
your own section, add a `(sec-NN-subsection-slug)=` label above the target
heading first, then reference it with `` {ref}`sec-NN-subsection-slug` ``.


For evidence conflicts, use admonitions:
```markdown
:::{admonition} Evidence Conflict
:class: warning
Description of the conflict...
:::
```

For provenance on key claims, use margin notes:
```markdown
:::{margin} Provenance
**Source:** verbatim sentence from Paper2020 (fulltext)
**Replication:** independently_replicated (3 labs)
:::
```

---

## Figure Notebooks

For each figure you produce, also create a Jupyter notebook that generates it:

1. Save as `figures/notebooks/fig_secN_name.ipynb`
2. Cell 1: Import `shared_style` and load evidence JSON
3. Cell 2: Extract the relevant comparison data from the evidence
4. Cell 3: Create the figure using the style guide colors/fonts
5. Cell 4: Save as PNG

The notebook must be self-contained and runnable with:
`jupyter execute figures/notebooks/fig_secN_name.ipynb`

Import the style module:
```python
import sys; sys.path.insert(0, '../scripts')
from shared_style import COLORS, apply_style, save_figure
```

---


**Figure code embedding (MANDATORY):** After producing each figure, you MUST embed the COMPLETE Python generation code in a `:::{dropdown} 📓 Figure code` block immediately following the `:::{figure}` directive in the section .md file. The code must be the actual executed code — not a placeholder or stub. A figure without its code block is incomplete and will be sent back.
