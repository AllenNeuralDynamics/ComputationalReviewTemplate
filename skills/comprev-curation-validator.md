# Curation Validator — Binary Gate for Phase 5

**Purpose:** Validate evidence curation — correct assignment of findings to sections.
**Agent:** DATAML (set operations only)

## Per-Section Checks

1. **TRACEABLE**: Every finding's DOI exists in Phase 2 cluster evidence? **pass/fail**
2. **NO_INTRA_SECTION_DUPLICATES**: No two findings in same section have identical `claim_source_sentence`? **pass/fail**
3. **CROSS_SECTION_DIFFERENTIATION**: Same DOI in multiple sections → different `claim_source_sentence`? **pass/fail**
4. **CITE_KEY_ASSIGNED**: Every finding has non-empty `cite_key`? **pass/fail**
5. **HAS_DOI**: Every finding has non-empty `doi`? **pass/fail**
6. **TEXT_ACCESS_VALID**: Every finding's `text_access` is either `fulltext` or `abstract_only`? **pass/fail**

## Aggregate Checks

7. **ANTI_COMPRESSION**: Each section retains ≥75% of source cluster findings? **pass/fail**
8. **ZERO_LOSS**: Total findings across sections ≥ Phase 2 total? **pass/fail**
9. **ALL_CONFLICTS_ASSIGNED**: Every Phase 2 conflict in ≥1 section? **pass/fail**

## Output Schema
```json
{"phase": 5, "gate": "pass|fail", "sections_checked": N, "per_section_results": {...}, "aggregate_results": {...}}
```
