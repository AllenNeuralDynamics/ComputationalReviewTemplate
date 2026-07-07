# TRUST Scoring Rubric

This rubric is mechanical and validator-driven. Writers do not assign final TRUST scores.

## Components

Each component is scored 0-4 and carries:
- score
- rationale
- evidence
- failure_modes
- recommended_fix

### T - Traceability
Can the claim be traced to exact citations, DOIs, supporting passages, and evidence-package entries?

### R - Robustness
Is the claim supported by multiple independent sources, convergent methods, adequate replication, or strong design?

### U - Uncertainty calibration
Does wording correctly calibrate uncertainty, conflict, limitations, and scope?

### S - Source integrity
Are cited sources primary, verified, full-text checked when available, non-retracted where possible, and bibliographically consistent?

### T - Transferability / scope control
Does the claim avoid overextending beyond evidence context (organism, dataset, method, population, region, or conceptual domain)?

## Overall Score

Compute:

overall = round(100 * (sum(component_scores) / 20))

Trust labels:
- 85-100: high_trust
- 70-84: moderate_trust
- 50-69: low_trust
- <50: critical_or_unreliable

## Mandatory Cap Rule

Unless explicitly justified in `manual_override_justification`, cap `overall_score` at 60 if any condition is true:
- unsupported citation
- direction mismatch
- contradicted claim without caveat
- invented reference
- missing DOI for an empirical claim
- overextended biological, clinical, or generalization scope

## Mechanical Workflow Intent

- Section writers may emit provisional trust-claim tags and metadata.
- Validators compute or revise component scores using citation checks, claim-context checks, and scope checks.
- Final TRUST values are assigned only after verification and consistency checks.
