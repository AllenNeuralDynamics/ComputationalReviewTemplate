# Integration and Bookend Protocol

Phase 10 (six-pass integration across all sections) and Phase 11 (Introduction, Conclusion, and Abstract). The integration role sees the full document structure — this is intentional, as integration requires cross-section awareness.

**Information barrier:** No information barrier. The integrator needs full document visibility to ensure consistency, transitions, and cross-references.

---

## Phase 10: Integration

**Agent:** LITREVIEW

**PREREQUISITE:**
```python
require_phase('5_bibliography')
check_gate('gate_bibliography.json')
```

Single agent reads all sections, performs:

**Citation discipline for ALL integration passes:** Do NOT introduce new citations. Only rearrange, rephrase, or strengthen references to papers already cited in the sections.

#### 6a. Transition Pass
Rewrite boundary paragraphs between consecutive sections for natural flow. Ending of Section N should create expectation that Section N+1 answers.

#### 6b. Cross-Reference Resolution
Verify every scaffold cross-reference exists in text. Add missing ones. **Flag and convert any hardcoded §N.M or "Section N.M" references** — these must become `{ref}` cross-references with labels. Add `(label)=` anchors to target subsection headings as needed. Ensure references are specific ("As discussed in Section 3, the laminar distribution...") not vague ("As mentioned earlier...").

#### 6c. Terminology and Voice
Consistent terminology throughout. Fix terms used differently across sections. Abbreviations defined on first use. Smooth voice inconsistencies.

#### 6d. Argument Continuity Audit
Does the argument build as scaffold intended? Where does the logical chain break? Does conclusion follow from what sections actually contain?

#### 6e. Figure Consistency
Consistent color palette, fonts, line weights across all figures. No duplicate labels. All \ref{} resolve. Caption depth consistent.
- **File existence audit:** Verify every `\includegraphics{}` path corresponds to an actual figure file produced during Phase 7. Report any mismatches as a `filename_mismatches` list in the integration log.

#### 6f. Structural Hygiene
```
□ Zero \begin{thebibliography} blocks
□ Zero \documentclass in section files  
□ Zero \bibitem entries in section files
□ All \citep{}/\citet{} keys collected into master list
□ Consistent \citep{AuthorYear}/\citet{AuthorYear} format
□ No duplicate \label{} definitions
□ All \ref{} resolve to existing \label{}
```


**Output requirement:** The integration agent MUST save UPDATED versions of each section .md 
and .tex file. The coordinator verifies: diff between pre- and post-integration files must show 
changes in at least the transition paragraphs (first/last paragraphs of each section).
If the agent reports "6 passes completed" but the files are unchanged → send back.

**GATE ARTIFACT:** After all 6 passes complete, save `gate_integration.json`:

```python
gate_data = {
    'passes_completed': ['6a_transition', '6b_crossref', '6c_terminology',
                         '6d_continuity', '6e_figures', '6f_hygiene'],
    'filename_mismatches': [...],  # from 6e
    'structural_issues': [...],    # from 6f
}
json.dump(gate_data, open('gate_integration.json', 'w'), indent=2)
advance_phase('6_integration', '<saved_version_id>')
```


## Phase 11: Introduction and Conclusion

**Agent:** LITREVIEW

**MANDATORY:** Written AFTER all body sections are complete and integrated. Writing them first commits to conclusions before evidence is reviewed.

**PREREQUISITE:**
```python
require_phase('6_integration')
check_gate('gate_integration.json')
```

**Citation discipline:** Introduction and conclusion may ONLY cite papers already cited in the body sections.

**Post-writing critic (Phase 12):** After Phase 11 completes, the coordinator launches a blinded bookend critic (Phase 12, specified in `comprev-critic.md`). The critic is a different child frame from the Phase 11 writer. It checks all novel claim-citation pairs (those not inherited from body sections) against paper abstracts. MUST_FIX findings are sent back to the Phase 11 writer for revision before the pipeline advances to Phase 13 (Methods). The master citation list from Phase 10f must be provided to the writer. Do not introduce new references.

- **Introduction:** Receives 1-paragraph summaries of all sections + central argument + master citation list. Frames problem, explains why review is needed, previews argument arc naturally.
- **Conclusion:** Receives section summaries + key findings including conflicts and gaps + master citation list. Synthesizes (not summarizes), acknowledges limitations, identifies open questions.


**MANDATORY — Abstract and Frontmatter Assembly:**

Phase 11 writes a 250–400 word Abstract AND composes the final
`content/00_frontmatter.md` from the template scaffold. The Abstract body must:

- Cite the UNIQUE paper count from `citation_key_map` (not the pre-dedup count
  from evidence compliance).
- Summarize the central thesis, key findings, and methodology.
- Avoid inline citations (abstract is self-contained prose).
- Be one paragraph, or at most four short paragraphs.

The final frontmatter file MUST follow this fixed layout (the template ships a
scaffold with placeholders — fill them, do not reorder):

```
---
title: "<REVIEW TITLE>"
subtitle: A Reproducible Computational Review
---

# <REVIEW TITLE>

```{authorship-explorer}
:authors: ./authors.yml
:height: 600px
```

:::{admonition} AI-Generated Content Disclosure
:class: danger

**This review was generated with substantial AI assistance.** ...

**What the AI did:** <one paragraph, pipeline-filled>
**What the human did:** <one paragraph, pipeline-filled>
**All evidence is traceable:** ... links to Methods and Evidence Database ...
:::

## Abstract

<250–400 word abstract body>

**Keywords:** keyword1, keyword2, keyword3, ...
```

**Layout rules (enforced at gate):**
1. `subtitle` in frontmatter is required — the site header composes `title: subtitle`.
2. `{authorship-explorer}` widget MUST come immediately after the H1, before any
   other content. The widget binds to DOM anchors that MyST only emits when it
   follows the H1 in source order; placing it at the bottom of the file silently
   breaks rendering.
3. AI-Disclosure admonition is mandatory on every computational review produced
   by this pipeline. Fill in both "What the AI did" and "What the human did"
   paragraphs — do not delete the admonition block.
4. `## Abstract` heading must be present (some templates styled abstract as
   un-headed — don't; the reader and search index need the anchor).
5. Keywords line at bottom, bold label, comma-separated, 4–8 terms.

Save the assembled file directly to `content/00_frontmatter.md`. Phase 14
(assembly) verifies the five layout rules above and fails the gate if any are
violated.


