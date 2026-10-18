# Evidence Directory

This directory contains the structured evidence packages that power the
interactive Evidence Explorer widget on the review site.

## Expected File Format

The `evidence-explorer-plugin.mjs` scans this directory for per-section
JSON files named:

```
evidence_section_01.json
evidence_section_02.json
...
evidence_section_NN.json
```

One file per review section, numbered from **01** and covering every section in
the user's table of contents — the Introduction included. The plugin discovers
whichever sections are present rather than assuming a count, so the number of
sections is set by the table of contents alone.

Two earlier naming conventions, `section_NN_evidence_package.json` and
`section_NN_evidence.json`, are still read for older trees. New work should use
`evidence_section_NN.json`; the plugin prefers it.

## JSON Schema

What the explorer reads from each file is a small contract: `section_title`,
`findings[]`, `conflicts[]` and `figure_data[]`. Findings must be objects —
`argument_groups.*.supporting_findings` holds cite-key *strings* and is not a
source of finding records.

Phase 5 writes considerably more than this (`argument_groups`, `thesis`,
`subsections`, `citation_key_map`, `cross_references` and others); those keys are
carried for downstream phases and ignored by the explorer. The authoritative
shape is the Phase 5 section in `skills/comprev-dataml-phases.md` — this file
documents only the explorer's contract, so the two cannot drift.

The fields below are the ones the widget renders:

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

If this directory holds no JSON at all, the page renders a placeholder and the
build passes: that is an un-instantiated template awaiting a run. If it holds
JSON that matches none of the names above, or a file that cannot be read, the
build **fails** rather than publishing an empty explorer.

