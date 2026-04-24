# Evidence Validator — Binary Gate for Phase 2

**Purpose:** Validate evidence-gathering output before advancing to Phase 3.
**Agent:** DATAML (mechanical checks only, no LLM judgment)

## Inputs
- Evidence JSON artifact(s) from Phase 2
- Europe PMC API: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:{doi}&format=json&resultType=core`

## Per-Finding Checks (every finding, no sampling)

1. **DOI_RESOLVES**: Europe PMC returns ≥1 result for this DOI? **pass/fail**
2. **SOURCE_PROVENANCE**: Check where the source sentence actually came from:
   - If `text_access = "abstract_only"`: `claim_source_sentence` IS a substring of the abstract? **pass/fail**
   - If `text_access = "fulltext"`: `claim_source_sentence` is NOT a substring of the abstract? **pass/fail** (fulltext findings must come from the paper body, not the abstract. If found in abstract, the actor extracted lazily.)
3. **SOURCE_NOT_TITLE**: `claim_source_sentence` ≠ paper title? **pass/fail**
4. **SOURCE_LENGTH**: `claim_source_sentence` > 50 characters? **pass/fail**
5. **FULLTEXT_HONEST**: If `text_access = "fulltext"`, retrieved doc >15KB with `<body>` tag? **pass/fail**
6. **CLAIM_DIFFERS_FROM_SOURCE**: `claim` ≠ `claim_source_sentence`? **pass/fail**
7. **HAS_CITE_KEY**: Finding has non-empty `cite_key` field (assigned during Phase 5, but if present in Phase 2 output, must be valid)? **pass/fail**

## Aggregate Gates
- **PAPER_COUNT**: Unique DOIs ≥ target? **pass/fail**
- **CONFLICT_COUNT**: Conflicts > 0? **pass/fail**
- **FIGURE_DATA**: figure_data ≥ 2 per cluster? **pass/fail**
- **COMPLIANCE_RATE**: ≥95% of findings pass all per-finding checks? **pass/fail**

## Output Schema
```json
{
  "phase": 2, "gate": "pass|fail", "total_findings": N,
  "checks": {"DOI_RESOLVES": {"pass": N, "fail": N, "failures": [...]}, ...},
  "aggregates": {"PAPER_COUNT": "pass|fail", "COMPLIANCE_RATE": {"rate": 0.XX, "verdict": "pass|fail"}}
}
```

## Rate Limiting
Europe PMC: max 10 req/s. Use 200ms delay between requests.
