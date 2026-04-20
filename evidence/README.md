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
section_13_evidence_package.json
```

Each file corresponds to one core review section (02 through 13).

## JSON Schema

Each per-section file must contain:

```json
{
  "section_title": "Human-readable section title",
  "findings": [
    {
      "claim": "What the paper found",
      "claim_source_sentence": "Verbatim sentence from paper",
      "doi": "10.xxxx/...",
      "study_system": "mouse | human | ...",
      "replication_status": "replicated | unreplicated | contested",
      "text_access": "fulltext | abstract_only"
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
