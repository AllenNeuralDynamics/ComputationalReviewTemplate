# Figure Comparability Audit Protocol

Phase 6 delegation template for BLINDED figure auditors. Evaluate whether cross-study comparisons are methodologically valid.

**Information barrier:** This skill contains ONLY audit instructions. You do NOT receive the scaffold, argument arc, section theses, or comparison_name fields. You evaluate comparability without knowing the narrative purpose. This blinding is intentional — you are the critic, not the author.

---

## Phase 6: Figure Comparability Audit

**Agent:** LITREVIEW (parallel — one per ~4 comparisons)

**PREREQUISITE:**
```python
require_phase('3_curation')
check_gate('gate_evidence_curated.json')
```

**Purpose:** Actor-critic separation for figure data. The Phase 2 agents that built the comparisons optimized for narrative value. This phase checks whether the comparisons are methodologically valid. The same agent type is used, but with different inputs and a different objective.

**CRITICAL — Information blinding:** Each critic agent receives ONLY:
- The raw figure_data comparisons (with homogeneity_check fields)
- Paper abstracts for each paper in the comparisons (coordinator fetches these via Europe PMC before delegation)

The critic does NOT receive:
- The scaffold or argument arc
- The section thesis
- The comparison_name or what_it_reveals fields (strip these before passing)
- Any framing of what the figure is supposed to show

This blinding is the mechanism that breaks narrative bias. The scaffold says "show dramatic expansion of types" — that framing caused the Yao 2023 error. The critic evaluates comparability without knowing what story the figure serves.

**Delegation template:**

> "For each cross-study comparison below, you are given the per-paper metric labels, values, scope fields, source sentences, and paper abstracts. Your job is to identify every way these entries are NOT directly comparable when plotted on the same axis.
>
> For each comparison, check:
>
> 1. **SCOPE — Region:** Do all entries cover the same brain region? 'Whole system' vs 'Subregion X' cannot be plotted as a simple progression without prominent caveat.
>
> 2. **SCOPE — Population:** Do all entries count the same cell population? 'All items' vs 'suberneurons only' inflates apparent differences and is not a valid comparison.
>
> 3. **TAXONOMIC LEVEL:** Are all entries at the same level of the classification hierarchy? 'Clusters' (finest grain, thousands) vs 'types' (coarser, tens) inflates apparent differences by orders of magnitude.
>
> 4. **METRIC DEFINITION:** Read each entry's value_source_sentence. Are these sentences describing the same kind of measurement? Ignore the metric labels (which may be sanitized) — read the actual source sentences.
>
> 5. **SAMPLE SIZE CONSISTENCY:** Is 'n' defined the same way across entries? 'Cells profiled' vs 'cells post-QC' can differ by 2x. Check n_definition fields and flag inconsistency.
>
> 6. **STUDY SYSTEM / CONDITIONS:** Cross-system comparisons (e.g., different species, materials, model organisms, datasets, or experimental conditions) require explicit caveat.
>
> For each comparison, return:
> ```json
> {
>   "comparison_id": "",
>   "verdict": "PASS | CAVEAT | SPLIT | REDESIGN",
>   "issues": [
>     {
>       "dimension": "scope_region | scope_population | taxonomic_level | metric_definition | sample_size | study_system",
>       "description": "what is incomparable and why",
>       "entries_affected": ["cite_key_1", "cite_key_2"]
>     }
>   ],
>   "mandatory_caption_caveats": ["text that MUST appear in the figure caption"],
>   "suggested_restructure": "for SPLIT/REDESIGN: how to fix the comparison"
> }
> ```
>
> **Calibration:** A comparison that looks dramatic is MORE likely to contain a scope mismatch than one that looks boring. An order-of-magnitude difference between entries should trigger extra scrutiny — is the difference real biology or an artifact of comparing different scopes/levels?"

**Gate:**
- PASS: comparison proceeds to Phase 7 unchanged.
- CAVEAT: comparison proceeds but `mandatory_caption_caveats` are added to the section evidence package and the Phase 7 writer MUST include them in the figure caption.
- SPLIT: coordinator restructures the comparison into comparable subgroups before Phase 7. If restructuring reduces a comparison below 3 entries, merge it into a related comparison or flag for the scaffold to remove the figure.
- REDESIGN: comparison does NOT proceed to Phase 7. Coordinator must either redesign the comparison (e.g., use a different taxonomic level, restrict to a common scope) or remove it from the scaffold and adjust the section figure count.


**Study label verification:** For each paper entry in figure_data comparisons, verify that 
the study label (author name + year) can be traced to the DOI via the citation_key_map. 
If a study label contains an author name not present in the CrossRef metadata for that DOI 
→ flag as potential fabrication. This catches fabricated data points like "Bhatt et al. 2005" 
that have no corresponding real paper.

**Compliance:** Every figure_data comparison must pass through Phase 6. No comparison may reach Phase 7 without a verdict. This is not optional — it is a gate.

**ACTOR-CRITIC SEPARATION ENFORCEMENT:**

The coordinator MUST verify that Phase 6 critic child_frame_ids are
DIFFERENT from any Phase 2 evidence-gathering child_frame_ids. After
launching Phase 6 critics:

**Blinding verification:** Assert critic child IDs ≠ Phase 2 evidence IDs ≠ Phase 7 writer IDs.

If a Phase 7 section writer's completion notification mentions 'audit', 'comparability', or 'critic' in its step_statuses or _completion_bullets, the coordinator MUST send_message: "You were not assigned critic duties. A separate blinded agent will review your work. Discard any audit results you produced." Then launch the actual blinded critic for that section's figures.

**GATE ARTIFACT:** After all verdicts are collected and REDESIGN figures are resolved, save `gate_figure_audit.json`:

*(Save gate_figure_audit.json with verdict counts, zero REDESIGN remaining)*


