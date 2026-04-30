# Scoping Validator — Binary Gate for Phase 1

## Purpose

Phase 1V binary gate. Validates the Phase 1 scope outputs and provenance
artifacts before `generate_plan` is called. Loaded by a DATAML validator
agent — never the same frame as the LITREVIEW scoper or the DATAML
materialiser.

## Loaded by

Phase 1V DATAML validator delegation. Coordinator delegates: *"Load
`comprev-scoping-validator`. Validate Phase 1 outputs. Inputs: `scope.json`,
`provenance/review_request.md`, `provenance/review_request.txt`,
`gate_scope.json`. Run ALL checks. Return structured pass/fail."*

## Inputs

- `scope.json` (LITREVIEW actor output)
- `gate_scope.json` (DATAML actor output, materialised from `scope.json`)
- `provenance/review_request.txt`, `provenance/review_request.md`

## Binary Checks

| Check | Rule | Pass condition |
|---|---|---|
| `REVIEW_REQUEST_VERBATIM` | `provenance/review_request.txt` exists; SHA256 matches the bytes of the user's submitted prompt as captured by the coordinator. | Hash match |
| `REVIEW_REQUEST_MD_PRESENT` | `provenance/review_request.md` exists with the three required sections (header, `## Verbatim user prompt` blockquote, `## Editorial note`). | All three sections detected |
| `NO_PLACEHOLDERS` | Files do not contain `[PIPELINE FILLS THIS]` or any `<...>` template tokens. | Zero matches across all four files |
| `GATE_SCOPE_FIELDS` | `gate_scope.json` contains: `title`, `clusters[]`, `sections[]`, `evidence_parameters{}`, `review_request_path`. | All keys present |
| `EVIDENCE_PARAMETERS_VALID` | `evidence_parameters` has the 4 required keys (`min_papers_per_cluster`, `saturation_criterion`, `snowball_rounds`, `total_bibliography_target`); types match schema. | All present, types correct |
| `EVIDENCE_PARAMETERS_CONSISTENT` | If `saturation_criterion != null` then `snowball_rounds >= 1`. If user prompt contains "saturate" or "cover all" or "every relevant" (case-insensitive substring), then `min_papers_per_cluster == null` and `saturation_criterion != null`. | Logical consistency |
| `CLUSTERS_NONEMPTY` | `clusters[]` length ≥ 1 and each cluster has non-empty `name` and `topics`. | All clusters valid |
| `SECTIONS_COVER_TOC` | Every section heading in the user's TOC has at least one matching entry in `sections[]` (substring match on title). | All TOC headings represented |
| `PLAN_CONTENT_20_PHASES` | `plan_content[]` length == 20; phase names match the canonical Phase Index; `depends_on` chains are valid (Phase N depends on N-1). | Structure valid |
| `PLAN_AGENTS_VALID` | Every delegation in `plan_content` uses `DATAML` or `LITREVIEW` only; coordinator never appears as an agent. | No `Coordinator` agent anywhere |

## Output Schema

```json
{
  "phase": 1,
  "gate": "pass|fail",
  "checks": {
    "REVIEW_REQUEST_VERBATIM": "pass",
    "REVIEW_REQUEST_MD_PRESENT": "pass",
    "NO_PLACEHOLDERS": "pass",
    "GATE_SCOPE_FIELDS": "pass",
    "EVIDENCE_PARAMETERS_VALID": "pass",
    "EVIDENCE_PARAMETERS_CONSISTENT": "pass",
    "CLUSTERS_NONEMPTY": "pass",
    "SECTIONS_COVER_TOC": "pass",
    "PLAN_CONTENT_20_PHASES": "pass",
    "PLAN_AGENTS_VALID": "pass"
  },
  "failures": [
    {"check": "...", "detail": "..."}
  ]
}
```

`gate` is `"pass"` if and only if every entry in `checks` is `"pass"`. Any
`"fail"` entry must have a corresponding object in `failures[]` naming the
check and a one-line `detail` describing what was wrong (e.g. file path,
missing key, mismatched hash, offending value).

## Send-Back

On any failure, the coordinator sends the `failures[]` list to the Phase 1
actor (LITREVIEW scoper or DATAML materialiser, whichever owns the failed
check) via `send_message` and re-runs this validator on the resubmission.
Never re-delegate; never validate self.
