# Citation Validator — Binary Gate for Phases 3 and 9

**Purpose:** Validate citation key map (Phase 3) and bibliography (Phase 9).
**Agent:** DATAML (CrossRef queries + string matching)

## Phase 3 Checks: Citation Key Map

Per entry in citation_key_map.json:
1. **CROSSREF_RESOLVES**: `GET https://api.crossref.org/works/{doi}` returns 200? **pass/fail**
2. **KEY_FORMAT**: cite_key matches `AuthorYEARword` pattern? **pass/fail**
3. **KEY_UNIQUE**: cite_key appears exactly once? **pass/fail**
4. **AUTHOR_MATCH**: Surname in cite_key matches CrossRef `author[0].family` (ASCII-normalized)? **pass/fail**
5. **YEAR_MATCH**: Year in cite_key matches CrossRef year (±1)? **pass/fail**

Aggregates: ≥95% pass? Zero collisions?

## Phase 9 Checks: Bibliography

Per entry in references.bib:
1. **HAS_DOI**: `doi = {...}` field present? **pass/fail**
2. **AUTHOR_CROSSREF_MATCH**: Bib first author matches CrossRef first author? **pass/fail**
3. **TITLE_SIMILARITY**: Jaccard similarity on lowercased words >0.85? **pass/fail**
4. **YEAR_MATCH**: Bib year matches CrossRef year (±1)? **pass/fail**
5. **ASCII_ONLY**: Author names contain only ASCII? **pass/fail**

Cross-checks:
6. **ALL_KEYS_IN_BIB**: Every cite key in .md files exists in .bib? **pass/fail**
7. **NO_ORPHAN_BIB**: Every bib entry cited in ≥1 .md file? (warning, not blocking)

TRUST linkage checks (Phase 9 and later):
8. **CLAIM_CONTEXT_KEYS_RESOLVE**: Every `citation_contexts[].cite_key` in `knowledge/claim_seed_index.json` exists in references.bib? **pass/fail**
9. **EMPIRICAL_CLAIM_DOI_PRESENT**: Any claim context with `claim_type = empirical` has at least one DOI unless marked `human_review_required = true`? **pass/fail**

## Output Schema

The validator emits a phase-specific gate file:

- **Phase 3V** writes `gate_citation_infrastructure.json` (validates `citation_key_map.json`).
- **Phase 9V** writes `gate_bibliography.json` (validates `references.bib`).

Both files share the same payload schema:

```json
{"phase": 3|9, "gate": "pass|fail", "total_entries": N, "per_entry_failures": [...], "cross_check_failures": [...]}
```

## Author-Name Contamination Check (Phase 3)

The Phase 3 validator must protect against author-name contamination — the
failure mode where an LLM fabricates an author name from prompt-mentioned text
rather than from the CrossRef-resolved metadata. Every cite_key surname must
derive from CrossRef `author[0].family` (ASCII-normalized) for that DOI; cite
keys whose surname appears nowhere in the CrossRef record fail
`AUTHOR_MATCH`. The validator also samples `citation_key_map.json` for keys
whose surname appears in the user's review-request prompt but not in CrossRef
metadata — these are flagged as suspected contamination and reported in
`per_entry_failures`. Mechanical cite_key assignment from CrossRef metadata is
the only allowed path; no author names from memory.

