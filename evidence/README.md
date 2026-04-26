# Evidence Directory

This directory contains the structured evidence packages that power the
interactive Evidence Explorer widget on the review site.

## Expected File Format

The `evidence-explorer-plugin.mjs` scans this directory for per-section
JSON files named:

```
section_02_evidence_package.json
section_03_evidence_package.json
...
section_NN_evidence_package.json
```

One file per core review section. Section numbering starts at 02 (the
Introduction is section 01 and has no evidence package); the upper bound is
set by the user's table of contents — typical reviews land between section_08
and section_13, but the orchestrator is agnostic to the exact section count.

## JSON Schema

Each per-section file must contain:

```json
{
  "section_title": "Human-readable section title",
  "findings": [
    {
      "claim": "What the paper found",
      "claim_source_sentence": "Verbatim sentence from paper",
      "effect_size": "Quantitative magnitude (or 'not reported')",
      "effect_size_source_sentence": "Verbatim sentence supporting the effect size",
      "n": 0,
      "study_system": "mouse | human | ...",
      "replication_status": "independently_replicated | replication_unknown | contested",
      "replication_evidence_dois": ["10.xxxx/..."],
      "doi": "10.xxxx/...",
      "text_access": "fulltext | abstract_only",
      "evidence": "Optional supporting context"
    }
  ],
  "conflicts": [
    {
      "paper_a_doi": "10.xxxx/...",
      "paper_b_doi": "10.xxxx/...",
      "nature_of_conflict": "Description",
      "resolution_status": "unresolved | partially_resolved | resolved"
    }
  ],
  "figure_data": [],
  "unreplicated_claims": [],
  "evidence_gaps": [],
  "strongest_evidence": {},
  "weakest_evidence_cited": {},
  "unique_papers": 0,
  "total_findings": 0
}
```

## How Files Are Generated

The pipeline's Phase 5 (Evidence Curation) builds per-section evidence
packages from the raw cluster evidence. Phase 14 (Assembly) should split
and copy these into this directory.

A combined `evidence_database.json` may also be generated, but the
evidence-explorer plugin does **not** read it directly — it requires
the individual per-section files.

