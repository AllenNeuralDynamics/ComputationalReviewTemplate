# Triples Validator — Binary Gate for Phases 15 and 17

**Purpose:** Validate citation triple extraction and fix preparation.
**Agent:** DATAML (counting + string matching)

## Phase 15 Checks: Citation Triples

1. **EXHAUSTIVE_COUNT**: Triple count ≥ `{cite:p}` + `{cite:t}` occurrences in text (splitting compound citations)? **pass/fail**
2. **NON_EMPTY_SENTENCES**: Every triple has non-empty `claim_sentence`? **pass/fail**
3. **KEY_IN_BIB**: Every triple's `cite_key` exists in references.bib? **pass/fail**
4. **SENTENCE_IN_FILE**: Every triple's `claim_sentence` is substring of its `section_file`? **pass/fail**
5. **BATCH_SIZE**: All batches ≤ 18 triples? **pass/fail**

## Phase 17 Checks: Fix Preparation

6. **FULL_COVERAGE**: Every non-VERIFIED triple has a fix request? **pass/fail**
7. **CONTEXT_EXISTS**: Every fix request's context is substring of target file? **pass/fail**
8. **CORRECT_METADATA**: METADATA_ERROR fixes match CrossRef? **pass/fail**

## Output Schema
```json
{"phase": 15|17, "gate": "pass|fail", "checks": {...}, "failures": [...]}
```
