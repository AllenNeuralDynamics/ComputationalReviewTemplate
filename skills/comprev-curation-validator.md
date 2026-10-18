---
name: comprev-curation-validator
description: "Expert Review Pipeline v30 (ComputationalReviewTemplate): Curation Validator — Binary Gate for Phase 5"
---

# Curation Validator — Binary Gate for Phase 5

**Purpose:** Validate evidence curation — correct assignment of findings to sections.
**Agent:** DATAML (set operations only)

## Pre-flight Shape Check (HARD GATE)

Before any of the per-section or aggregate checks below run, the validator MUST verify it loaded the correct artifact type for each input. The Phase 5 actor emits two artifacts per section that look superficially similar:

- `evidence_section_NN.json` — the per-section evidence package (top-level keys include `section_id`, `findings`, `argument_groups`, `conflicts`, `figure_data`, `cluster_source`).
- `scaffold_section_NN.json` — the per-section scaffold extract (top-level keys include `section_id`, `section_plan`, `previous_section`, `next_section`, `figure_specs`, `figure_style_guide`, `cross_cutting_elements`).

For each VID handed to the validator, parse the top-level keys and assert:

```python
def assert_is_evidence_package(path, data):
    keys = set(data.keys())
    if {"section_plan", "figure_specs", "figure_style_guide"} & keys and "findings" not in keys:
        raise RuntimeError(
            f"WRONG_ARTIFACT_TYPE at {path}: expected evidence package, "
            f"got scaffold extract (top-level keys: {sorted(keys)})"
        )
    required = {"section_id", "findings", "argument_groups", "conflicts", "figure_data"}
    missing = required - keys
    if missing:
        raise RuntimeError(
            f"SCHEMA_INVALID at {path}: missing required keys {sorted(missing)} "
            f"(top-level keys present: {sorted(keys)})"
        )
```

A `WRONG_ARTIFACT_TYPE` or `SCHEMA_INVALID` exception fails the gate immediately with the diagnostic in the gate JSON — do not attempt to run the downstream checks against a stub or the wrong artifact.

## Per-Section Checks

1. **TRACEABLE**: Every finding's DOI exists in Phase 2 cluster evidence? **pass/fail**
2. **NO_INTRA_SECTION_DUPLICATES**: No two findings in same section have identical `claim_source_sentence`? **pass/fail**
3. **CROSS_SECTION_DIFFERENTIATION**: Same DOI in multiple sections → different `claim_source_sentence`? **pass/fail**
4. **CITE_KEY_ASSIGNED**: Every finding has non-empty `cite_key`? **pass/fail**
5. **HAS_DOI**: Every finding has non-empty `doi`? **pass/fail**
6. **TEXT_ACCESS_VALID**: Every finding's `text_access` is one of `fulltext` or `abstract_only`? **pass/fail** (papers with neither full text nor abstract MUST be excluded entirely — never recorded with a placeholder)
7. **FINDINGS_ARE_OBJECTS**: Top-level `findings` array contains finding objects (`dict` entries with `cite_key`, `doi`, `claim`), not cite_key strings. Cite_key strings belong in `argument_groups[*].supporting_findings`. **pass/fail**

## Aggregate Checks

8. **ANTI_COMPRESSION**: Each section retains ≥75% of source cluster findings? **pass/fail**
9. **ZERO_LOSS**: Total findings across sections ≥ Phase 2 total? **pass/fail**
10. **ALL_CONFLICTS_ASSIGNED**: Every Phase 2 conflict in ≥1 section? **pass/fail**

## Cross-Package Coherence Checks

Sections are curated independently, so a paper cited in several of them is
described several times. Each description can be internally consistent while
disagreeing with its siblings, and no per-section check can see that. All three
checks below are **HARD FAIL**; each one is a defect that reached the draft in
the reference run.

11. **DOI_ATTRIBUTE_COHERENCE**: Build the set of findings per DOI across all
    section packages. Every finding sharing a DOI MUST agree on `study_system`
    and on any recorded species, region or preparation. Disagreement is a fail,
    and the resolution is the paper's own metadata — title, abstract, methods —
    never a majority vote between packages.

    Reference-run defect: Ouellet2014 was recorded as "mouse cerebral cortex"
    in one package and "rat primary auditory cortex" in another. The paper's
    title settles it (rat). An uncaught species swap propagates into prose as a
    claim about the wrong organism. **pass/fail**.

12. **SHARED_KEY_SOURCE_UNION**: When a cite key appears in more than one
    package, source sentences MUST be merged across them, not partitioned. For
    every finding whose `claim` or `effect_size` carries a quantitative value,
    a sentence containing that value MUST be present in the **same** package
    (`claim_source_sentence` or `effect_size_source_sentence`). Where a sibling
    package holds the sentence and this one does not, the curator MUST copy it
    in; a value that reads as unsourced here while being sourced next door is a
    curation defect, not evidence that the value is unsupported.

    Reference-run defect: Hofling2019's "30 to 76%" and Frankowski2022's
    "~65%" and "48.0 ± 3.7 → 9.4 ± 0.9" each read as unsourced in one package
    while a sibling carried the sentence. Both were proposed for deletion as
    unsourceable; both were sourced. Deleting a value on this evidence removes
    a real finding. **pass/fail**.

13. **CLAIM_DOES_NOT_EXCEED_SOURCE**: A finding's `claim` MUST NOT assert more
    than its `claim_source_sentence` supports. General entailment is not
    mechanically decidable, so this check is a targeted contradiction screen
    rather than a proof, and it fails on either of two patterns:

    1. The source sentence states an explicit null — "no significant
       difference", "did not differ", "was unchanged", "no consistent
       relationship" — while the claim asserts an effect, a loss or a direction.
    2. The quantity or structure the claim is about is absent from the source
       sentence, i.e. the sentence measures one thing and the claim reports
       another.

    Reference-run defect: Davies1990's source sentence reported a null for a
    fibre-length measure while the claim extended it to perikaryal counts —
    inverting the paper, which found significantly fewer somatostatin-like
    immunoreactive neurones in Alzheimer temporal cortex. Pattern 1 and pattern
    2 both fire on it. Flagged findings go back to the curator with the sentence
    and the claim side by side; a critic resolves what the screen cannot.
    **pass/fail**.

## Output Schema
```json
{"phase": 5, "gate": "pass|fail", "sections_checked": N, "per_section_results": {...}, "aggregate_results": {...}, "cross_package_results": {...}}
```

`gate` is `"pass"` only when every per-section check passes AND every aggregate check passes AND every cross-package coherence check passes.

## Gate Artifact

The orchestrator saves this structured output as `provenance/gate_evidence_curated.json` (the named gate that closes the 5 → 6 transition). Phase 6 cannot start without it.
