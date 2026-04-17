# Scaffold Construction Protocol

Phase 4 delegation template. Build the architectural scaffold (argument arc, section plans, figure specs, style guide) from condensed evidence.

**Information barrier:** This skill contains ONLY scaffold construction instructions. You cannot see how sections are written, critiqued, or verified.

---

## Phase 4: Scaffold Construction

**Agent:** LITREVIEW

**Input:** The condensed scaffold input from the Phase 3 transition (not the raw evidence artifacts).

The scaffold is the architectural blueprint constraining all subsequent writing. It MUST contain:

**2a. Central Argument Arc:**
```
- Act 1 (Sections 1–N): What is established
- Act 2 (Sections N+1–M): Where complications/conflicts arise
- Act 3 (Sections M+1–end): Resolution, synthesis, open questions
```

**2b. Section-by-Section Plan** (for EACH section):
```
Section [N]: [Title]
- Thesis: [what this section argues]
- Key evidence: [specific findings from Phase 2]
- Conflicts to present: [from Phase 2 conflict data]
- Connection to previous section: [how this follows from N-1]
- Connection to next section: [what this sets up for N+1]
- Cross-references: [specific refs to other sections]
- Word count target: [number]
- Figures: [label, type, argument supported, data source from figure_data]
- Canonical cross-reference label: (sec-LABEL)= 
  [The scaffold MUST define the label for each section. Example labels:
   sec-topic-1, sec-topic-2, sec-topic-3, etc. — derived from the table of contents.
   Use lowercase-with-dashes format matching the section's primary topic.]
```

**2c. Cross-Cutting Elements:**
- Recurring themes across sections
- Terminology conventions (define once, use consistently)
- Abbreviation glossary
- Voice and tone guide

**2d. Integration Points:**
- Shared evidence map (which findings appear in multiple sections)
- Developing debates (conflicts introduced early, revisited later)
- Narrative callbacks (later sections referencing earlier ones)

**2e. Document Figure Style Guide:**
```
- Color palette: [hex codes with semantic meaning]
- Cell-type/category colors: [consistent mapping]
- Font: [family, sizes]
- Line weights, DPI: 300, background: white
- Colorblind accessible with redundant cues
```

**2f. Figure Specifications** (for EACH planned figure):
```
Figure [label: fig:secN-descriptive-name]:
- Type: cross-study comparison | conceptual schematic | data summary | timeline
- Section: N
- Argument supported: [specific argument]
- Data source: [comparison_id from Phase 2 figure_data]
- What it reveals that text alone cannot: [analytical value]
- Caption draft: [self-contained]
```

**Citation discipline:** The scaffold may only reference papers present in Phase 2 evidence outputs. Do not introduce new papers during scaffold construction.

**Gate:** Coordinator verifies scaffold before proceeding:
- Every section has connections to adjacent sections?
- Cross-references are specific (not "relates to Section 5")?
- Argument arc is clear?
- Phase 2 conflicts represented?
- Figure specifications present for at least two figures per section, with at least one cross-study comparison (Type B) per section?
- All referenced papers traceable to Phase 2 evidence?

**GATE ARTIFACT:** After scaffold passes all checks, the coordinator saves
`gate_scaffold_approved.json`:

```python
# MANDATORY — run after scaffold passes gate checks
gate_data = {
    'scaffold_artifact_id': scaffold_vid,
    'sections_with_connections': True,  # verified above
    'cross_refs_specific': True,
    'conflicts_represented': True,
    'figures_per_section_met': True,  # ≥2 per section, ≥1 Type B
}
json.dump(gate_data, open('gate_scaffold_approved.json', 'w'), indent=2)
advance_phase('2_scaffold', '<saved_version_id>')
```


