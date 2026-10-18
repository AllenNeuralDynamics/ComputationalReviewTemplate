---
name: comprev-curation-validator
description: "Expert Review Pipeline v29 (ComputationalReviewTemplate): Curation Validator — Binary Gate for Phase 5"
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

## Output Schema
```json
{"phase": 5, "gate": "pass|fail", "sections_checked": N, "per_section_results": {...}, "aggregate_results": {...}}
```

`gate` is `"pass"` only when every per-section check passes AND every aggregate check passes.

## Gate Artifact

The orchestrator saves this structured output as `provenance/gate_evidence_curated.json` (the named gate that closes the 5 → 6 transition). Phase 6 cannot start without it.
