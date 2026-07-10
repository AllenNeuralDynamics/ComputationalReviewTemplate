# TRUST Score Validator - Binary Gate for Dedicated TRUST Scoring

**Purpose:** Compute and validate claim-level TRUST scores from structured claim contexts using deterministic rules.
**Agent:** DATAML (mechanical scoring only)

This validator is intentionally separate from section writing and criticism.
Writers do not assign final TRUST scores.

## Inputs

- `knowledge/claim_seed_index.json`
- `knowledge/claim_graph.json` (optional prior state)
- `knowledge/schemas/claim_context.schema.json`
- `knowledge/schemas/trust_score.schema.json`
- Verification artifacts from citation checking (Phase 16 outputs)

## Scoring Model

Each claim receives five component scores, each integer 0-4:

- **T (Traceability)**
- **R (Robustness)**
- **U (Uncertainty calibration)**
- **S (Source integrity)**
- **T (Transferability / scope control)**

Overall score:

`overall = round(100 * (sum(component_scores) / 20))`

Trust label:

- `85-100` -> `high_trust`
- `70-84` -> `moderate_trust`
- `50-69` -> `low_trust`
- `<50` -> `critical_or_unreliable`

## Mandatory Cap Rule

Cap `overall_score` at 60 (unless explicit validator justification is recorded)
when any trigger is present:

- unsupported citation
- direction mismatch
- contradicted claim without caveat
- invented reference
- missing DOI for cited empirical claim
- overextended biological/clinical/generalization scope

## Mechanical Checks

1. **CLAIM_SCHEMA_VALID**: every claim validates against `claim_context.schema.json`.
2. **TRUST_SCHEMA_VALID**: produced `trust_score` objects validate against `trust_score.schema.json`.
3. **ALL_COMPONENTS_SCORED**: all five components have integer score 0-4 plus rationale/evidence/failure modes/recommended fix.
4. **OVERALL_FORMULA_CORRECT**: stored `overall_score` equals formula output.
5. **LABEL_BAND_CORRECT**: `trust_label` matches score band.
6. **CAP_RULE_ENFORCED**: if any trigger exists and no explicit override justification, `overall_score <= 60`.
7. **EMPIRICAL_DOI_RULE**: empirical claims with missing DOI are capped and flagged for human review.
8. **PROVENANCE_FIELDS_PRESENT**: `created_by_phase`, `updated_by_phase`, and `validation_status` present on every claim.
9. **CLAIM_ID_STABLE**: deterministic `claim_id` recomputes from section id + normalized claim + sorted citation keys.

## Output Artifacts

- `knowledge/trust_score_report.json`
- Updated `knowledge/claim_graph.json` with finalized trust scores
- Gate artifact `provenance/gate_trust_scores.json`

## Output Schema

```json
{
  "phase": "trust-score-validation",
  "gate": "pass|fail",
  "claims_checked": 0,
  "checks": {
    "CLAIM_SCHEMA_VALID": "pass|fail",
    "TRUST_SCHEMA_VALID": "pass|fail",
    "ALL_COMPONENTS_SCORED": "pass|fail",
    "OVERALL_FORMULA_CORRECT": "pass|fail",
    "LABEL_BAND_CORRECT": "pass|fail",
    "CAP_RULE_ENFORCED": "pass|fail",
    "EMPIRICAL_DOI_RULE": "pass|fail",
    "PROVENANCE_FIELDS_PRESENT": "pass|fail",
    "CLAIM_ID_STABLE": "pass|fail"
  },
  "failures": [
    {
      "claim_id": "clm_...",
      "check": "CAP_RULE_ENFORCED",
      "details": "direction mismatch detected but score not capped"
    }
  ]
}
```

Gate is `pass` only when all checks pass.
