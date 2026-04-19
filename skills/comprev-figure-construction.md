## Purpose
Worker skill for building publication-quality figures in scientific reviews and analyses. Covers both general figure design and review-specific requirements (cross-study comparison figures, figure_data usage, document style guide compliance).


### Output Format (MANDATORY pair)

Every figure MUST produce TWO outputs:
1. **PNG file** (300 DPI, white background)
2. **A `:::{dropdown} 📓 Figure code` block** containing the complete, executable Python code

The dropdown block format:
```
:::{dropdown} 📓 Figure code
:icon: code
:color: light

```python
# [complete generation code here — NOT a stub]
```
:::
```

A figure without its accompanying code block is incomplete. The code must reproduce the figure when executed with the evidence JSON as input. The section writer is responsible for placing this dropdown immediately after the `:::{figure}` directive in the .md file.

## Jupyter Notebook Per Figure

In addition to the PNG file, every figure MUST have an accompanying Jupyter
notebook saved to `figures/notebooks/`. The notebook:

- Loads data from the evidence JSON files (not hardcoded values)
- Uses `scripts/shared_style.py` for consistent colors and formatting
- Is self-contained and executable
- Includes markdown cells documenting the data source and any caveats

This enables full figure reproducibility from the evidence data.

**Notebook completeness (MANDATORY):**
Every notebook MUST contain the actual figure generation code — not a placeholder.
- MUST have ≥1 code cell with `plt.subplots`, `fig =`, or `ax.` 
- MUST NOT contain only comments like "see main workspace" or "see main generation code"
- The notebook must be self-contained: running all cells in order must reproduce the figure
- Include ALL code: imports, data definition, plotting, and save_figure call
- If the figure was generated in the agent's kernel workspace, capture that code into the 
  notebook before saving — do not save a stub


## MyST Figure Integration 

When producing figures for the review, generate BOTH LaTeX and MyST syntax:

**LaTeX (for PDF):**
```latex
\begin{figure}[H]
\centering
\includegraphics[width=\textwidth]{fig_secN_name.png}
\caption{Caption text \citep{Source2020}.}
\label{fig:secN-name}
\end{figure}
```

**MyST (for GitHub site):**
```markdown
:::{figure} ../figures/fig_secN_name.png
:name: fig-secN-name
:width: 100%
Caption text {cite:p}`Source2020`.
:::
```

Both formats reference the same PNG file. The MyST version goes in the `.md` file, 
the LaTeX version goes in the `.tex` file.


## Input Handoff — What This Skill Receives
- Data source: `figure_data` entries from your section's evidence package (provided by the orchestrator via Phase 3)
- Each `figure_data` entry contains: `comparison_id`, `papers` (with DOI, metric, value, value_source_sentence, CI/error, n, n_analyzed, n_definition, study_system, experimental_conditions, method, text_access, scope_region, scope_population, taxonomic_level), `comparison_type`, `suggested_plot_type`, `homogeneity_check`
- Style guide: document-wide color palette, fonts, DPI from the scaffold
- Use ONLY data from the evidence package — do not fabricate or extrapolate data points
- **Text-access annotation:** For cross-study comparison figures, if all values come from full-text extraction (`text_access` = `fulltext`), add footnote: "All values extracted from source papers' full text." If some come from abstracts only, annotate those entries with * and add footnote: "* Value extracted from abstract; full text was not accessible."
- **Judgment-based figures** (evidence scorecards, cross-area heatmaps, replication matrices): Each cell must be traceable to specific papers. Annotate each cell with the paper count behind the rating (e.g., "3 studies, 2 labs"). Add footnote: "Ratings of 'replicated' require ≥2 studies from independent laboratories cited in the evidence base."
- **Phase 6 comparability verdicts:** If your evidence package includes comparability verdicts from Phase 6, respect them: CAVEAT comparisons must include the specified `mandatory_caption_caveats` verbatim in the figure caption. SPLIT comparisons have been restructured into comparable subgroups — plot them as provided. REDESIGN comparisons have been removed from the evidence package.

## Co-Loading with Literature Review
1. **Write prose first** — identify where each figure belongs in the argument
2. **Produce figure** — using `figure_data` from the evidence package for that section
3. **Write caption** — self-contained, interpretable without main text
4. **Integrate** — ensure \ref{} in text points to the figure, and the surrounding prose interprets what the figure shows
5. **Cross-check** — does the figure support the specific argument identified in the scaffold? If not, revise the figure or flag a mismatch
6. **Filename check** — Verify that every `\includegraphics{}` path is a plain filename (e.g., `fig_sec4_gain_control.png`), NOT an artifact marker. If any `\includegraphics` contains `{{artifact:` or `{{`, the output is NON-COMPLIANT and will fail LaTeX compilation.

The lit review skill owns the prose and argument; this skill owns the visual execution. Neither should contradict the other.

---

## Core Principle: Every Element Is Signal

A figure is a carefully constructed visual argument. Every panel, axis, annotation, and color choice serves the argument. Anything that does not contribute to understanding is noise and must be removed.

## Part I: Figure Types in Reviews

### Type A: Raw/Example Data
Shows what a phenomenon looks like. Example traces, images, recordings.

### Type B: Cross-Study Comparison (MOST VALUABLE)
Synthesizes quantitative results across multiple papers — information no single paper contains. Forest plots, grouped bars comparing effect sizes across studies, or heatmaps showing results across conditions, study systems, or methods.

**These figures are the analytical core of a review.** They require pre-extracted quantitative data — specifically the `figure_data` entries from your section's evidence package (curated in Phase 3). Each entry contains per-paper metrics, effect sizes, sample sizes, and DOIs. Use ONLY these provided data points. Without figure_data in your evidence package, comparison figures cannot be produced — flag this to the coordinator rather than inventing values.

**Completeness principle:** Cross-study comparison figures should include ALL available data points from the evidence package, not a representative subset. If 8 studies measured the same metric, plot all 8. If 12 studies across 4 conditions measured a related quantity, include all 12 with condition as a grouping variable. Completeness IS the analytical value of a review figure — a forest plot with 3 studies is a summary; a forest plot with 12 studies is a contribution. When the number of data points exceeds what fits cleanly in one panel, use multi-panel layouts (e.g., by condition, by experimental context, or by method) rather than dropping studies.


**HARD RULE — All Figure Data Must Come From the Evidence Package:**

Every data point, study label, and value in a figure MUST be traceable to the evidence 
package. There are NO exceptions.

- **Study labels:** Use ONLY the author_name_table for "Author et al. Year" labels. 
  Never generate author names from memory. If a study isn't in the evidence package, 
  it cannot appear in the figure.
- **Data values:** Every plotted value (effect size, count, proportion, etc.) MUST have 
  a corresponding `value_source_sentence` in the evidence package. Never estimate, 
  approximate, or recall values from memory.
- **Study inclusion:** Only papers in the per-section evidence package may appear in 
  figures. If you need a paper that isn't there, report: "Figure requires data from 
  [topic] but the evidence package doesn't include it. Request supplementary search."
- **No padding:** If you have data for 4 studies but the figure would look better with 
  6, plot 4. Do NOT invent additional data points to fill the figure.
- **Verification step:** Before saving any cross-study comparison figure, list every 
  study label and verify each one has a matching cite_key in the citation_key_map. 
  Any label without a match → remove from figure.

Why this matters: The "Bhatt et al. 2005" failure was a fabricated data point that 
appeared in a published figure because the code included a study label generated from 
LLM memory. This rule prevents that entirely.

### Type C: Conceptual Schematic
System diagrams, process/pathway models, classification schemes. Important for communication but lower analytical value than Type B.

### Type D: Summary/Synthesis
Evidence scorecards, timeline of discoveries, overview tables rendered as figures.

**A review with only Type C figures is incomplete.** Type B figures are where reviews add analytical value beyond what individual papers provide.

---

## Part II: Panel Architecture — Telling a Story

1. **Context panel**: What was measured? Setup, schematic, or example raw data
2. **Example panel**: Individual cases showing the effect
3. **Quantification panel**: The metric applied to individual cases
4. **Summary panel**: The metric across the full dataset
5. **Statistical panel**: Formal test — after the reader is already convinced by data

### Layout
- Left-to-right, top-to-bottom logical flow
- Size encodes importance — most important panel largest
- Whitespace = structure — spacing indicates logical breaks
- 8+ panels → probably two figures

---

## Part III: Plot Type Selection

### For distributions (always prefer over bar plots):
- **Violin plot**: Full distribution shape. Reveals bimodality, skewness
- **Strip/swarm plot**: Every data point visible. Essential for n < 30
- **Box plot**: Median, quartiles, outliers. Good for many groups
- **ECDF**: Precise distribution comparison

### For relationships:
- **Scatter plot**: Default for two continuous variables
- **Line plot with error band**: Time series or dose-response
- **Heatmap**: Matrices. Sequential colormap for magnitude, diverging for difference

### For cross-study comparisons (Type B):
- **Forest plot**: Effect sizes ± CI across studies. Gold standard for meta-comparison
- **Grouped bar/dot plot**: Comparing a metric across studies, conditions, or study systems
- **Heatmap**: Studies × conditions matrix

### Anti-patterns:
- **Bar plot with error bars** → hides distribution. Use violin + strip
- **Pie chart** → use bar chart
- **3D plots** → almost always make data harder to read
- **Dual y-axes** → misleading visual correlations. Use two panels

---

## Part IV: Honest Representation

### Examples Must Match Statistics
- If population effect is 15%, example should show ~15%, not best 40% case
- Show multiple examples: clear case, typical case, weak/absent case
- Rank all cases by metric, pick near the median

### Error Bars and Uncertainty
- Always define in legend: SD, SEM, 95% CI, or bootstrap CI
- For n < 10: show all individual data points
- 95% CI is generally most informative

### Data Points Must Be Measured

Every data point in a comparison figure must come from a reading you
made — a `value_source_sentence` copied from a paper. You do not
interpolate, estimate, or recall data points to fill gaps, for the same
reason a scientist does not fabricate measurements to complete a graph.

### Axis Integrity
- Start at zero for magnitude plots
- Matched axes across compared panels
- Label everything: variable name AND units

---

## Part V: Visual Design

### Color
- Perceptually uniform colormaps: viridis, cividis, inferno. NEVER rainbow/jet
- Colorblind accessible: avoid red-green without redundant cues (shapes, patterns)
- Consistent color mapping across all panels and all figures in the document
- Restrained palette: 2-4 colors for most figures
- Follow the document style guide colors when provided by the orchestrator

The canonical color palette and style settings are defined in
`scripts/shared_style.py` in the repository. All figure notebooks
import from this module:

```python
from shared_style import COLORS, apply_style, save_figure
apply_style()
```

Cell-type colors (when applicable to the review domain):
- Category A: `#E41A1C` (red)
- Category B: `#377EB8` (blue)
- Category C: `#4DAF4A` (green)
- Category D: `#984EA3` (purple)
- Category F: `#FF7F00` (orange)
- Category E: `#A65628` (brown)

### Clutter Reduction
- Remove chart junk: unnecessary gridlines, box borders, background shading
- Remove redundant labels
- For each element: if removed, does the figure lose information? If no → remove

### Font Sizes and Readability

Figures are rendered at column width (~3.5 inches) or page width (~7 inches) in the final document. Text that looks readable in a large matplotlib window becomes illegible when scaled down to publication size.

**Minimum font sizes (at final rendered size):**
- **Axis labels:** ≥10 pt
- **Tick labels:** ≥8 pt
- **Legend text:** ≥8 pt
- **Annotation text:** ≥8 pt
- **Panel labels (a, b, c):** ≥12 pt bold
- **Caption text:** handled by LaTeX/MyST, not the figure

**In matplotlib, set these explicitly:**
```python
import matplotlib.pyplot as plt
plt.rcParams.update({
    'font.size': 10,
    'axes.labelsize': 11,
    'axes.titlesize': 12,
    'xtick.labelsize': 9,
    'ytick.labelsize': 9,
    'legend.fontsize': 9,
    'figure.titlesize': 13,
})
```

**These should be set in `shared_style.py`** so all figures are consistent. If the document style guide specifies different sizes, follow those instead.

### Overlap and Crowding Prevention

Overlapping text is the most common readability failure in programmatically generated figures. Prevent it:

**Labels:**
- If axis tick labels overlap → rotate 45° or 90°, or reduce tick count
- If bar/point labels overlap → use horizontal layout, abbreviate, or stagger vertically
- If legend overlaps data → move legend outside the plot area (`bbox_to_anchor`)
- Long study names or identifiers → truncate to ~30 characters with "..." or use short codes with a legend mapping

**Data points:**
- If scatter points overlap → use `alpha=0.5` for transparency, or jitter
- If error bars overlap → offset groups slightly on the x-axis
- If too many groups for one panel → split into subpanels rather than cramming

**Concrete test:** After generating the figure, check for overlap programmatically:
```python
fig.savefig('temp_check.png', dpi=300, bbox_inches='tight')
# If bbox_inches='tight' changes the figure size substantially,
# elements were extending outside the intended area
```

**When content exceeds space:**
- Do NOT shrink fonts below the minimums. Instead:
  1. Increase figure dimensions (`figsize`)
  2. Split into multiple panels or sub-figures
  3. Abbreviate labels and add a legend/key
  4. Rotate to horizontal orientation for bar charts with many categories

### Review-Specific Style Compliance
When the orchestrator provides a document-wide style guide:
- Use the specified color palette (category colors, condition colors)
- Use specified fonts and sizes
- Match DPI requirement (typically 300)
- Ensure consistency across all figures in the document

---

## Part VI: Captions

Every caption must be interpretable WITHOUT reading the main text:
- What data is shown (source, n, conditions)
- What axes/colors/symbols represent
- Key takeaway or statistical result
- Caveats (e.g., "note log scale", "area X excluded due to n=4")
- Error bar definition
- Statistical test named explicitly

---

## Part VII: Output Standards

### The Process Is Invisible
- Never reference this skill or its checklist in captions
- Never label panels as "context," "example," "quantification" — the structure should be evident
- Never reference version numbers. Each figure is self-contained.

### Technical Requirements
- Save as PNG at ≥300 DPI (or PDF/SVG for vector)
- Use \label{fig:secN-descriptive-name} — NEVER hard-coded figure numbers
- Use fig.savefig() — NEVER plt.savefig() (for reproducibility lineage)
- Produce one figure file per figure environment
- ALL `\includegraphics` commands MUST include `[width=\textwidth]`. Bare `\includegraphics{file.png}` without a width option causes figures to overflow page margins in compiled documents. Always write `\includegraphics[width=\textwidth]{file.png}`.
- NEVER use `{{artifact:...}}` markers inside `.tex` source code. These are platform references that do not resolve during LaTeX compilation — use plain filenames only (e.g., `fig_sec4_gain_control.png`).
- When saving a figure with `fig.savefig('name.png')`, the SAME string `name.png` must appear in `\includegraphics[width=\textwidth]{name.png}`. Do not transform, prefix, or wrap the filename in any way.
- Use `\begin{figure}[H]` for ALL figures in review documents.

**MyST figure directive format:**
When including figures in .md files, use this exact format:
```
:::{figure} ../figures/fig_secN_name.png
:name: fig-secN-name
:width: 100%
Caption text here.
:::
```
Note: `../figures/` prefix (content files are in content/ subdirectory).
Note: dashes in `:name:` (fig-secN not fig:secN).
Do NOT add dropdown code blocks — Phase 14 assembly will do this mechanically from notebooks.
 The [H] specifier (from the float package) prevents LaTeX from deferring figure placement, ensuring figures appear inline with the text that references them.

### Checklist
- [ ] Every panel is necessary
- [ ] Examples show typical cases, not cherry-picked
- [ ] Statistics consistent with examples
- [ ] All axes labeled with variable names AND units
- [ ] Compared panels share same scales
- [ ] Individual data points visible where n permits
- [ ] Colorblind-accessible
- [ ] All text ≥8 pt at final rendered size (axis labels ≥10 pt)
- [ ] No overlapping labels, annotations, or legend entries
- [ ] Figure tested at actual publication column width (~3.5 in) for readability
- [ ] Follows document style guide
- [ ] Caption is self-contained
