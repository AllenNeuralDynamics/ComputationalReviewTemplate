# Evidence Validator — Binary Gate for Phase 2

**Purpose:** Validate evidence-gathering output before advancing to Phase 3.
**Agent:** DATAML (mechanical checks only, no LLM judgment)

## Inputs
- Evidence JSON artifact(s) from Phase 2
- Europe PMC API: `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:{doi}&format=json&resultType=core`
- CrossRef API: `https://api.crossref.org/works/{doi}` (for `DOI_TITLE_CROSSCHECK`)
- `evidence_parameters` (from `gate_scope.json`, used to gate `SATURATION_LOGGED` and the per-cluster paper-count floor)

## Per-Finding Checks (every finding, no sampling)

1. **DOI_RESOLVES**: Europe PMC returns ≥1 result for this DOI? **pass/fail**
2. **SOURCE_PROVENANCE**: Check where the source sentence actually came from:
   - If `text_access = "abstract_only"`: `claim_source_sentence` IS a substring of the abstract? **pass/fail**
   - If `text_access = "fulltext"`: `claim_source_sentence` is NOT a substring of the abstract? **pass/fail** (fulltext findings must come from the paper body, not the abstract. If found in abstract, the actor extracted lazily.)
3. **SOURCE_NOT_TITLE**: `claim_source_sentence` ≠ paper title? **pass/fail**
4. **SOURCE_LENGTH**: `claim_source_sentence` > 50 characters? **pass/fail**
5. **FULLTEXT_HONEST**: If `text_access = "fulltext"`, retrieved doc >15KB with `<body>` tag? **pass/fail**
6. **FULLTEXT_HONEST_v2**: If `text_access = "fulltext"`, the retrieved XML/HTML must be size-validated (>15 KB) **and** contain a `<body>` tag — metadata-only XML payloads must NOT be marked `fulltext`. **pass/fail** (catches the silent-fulltext-false-positive failure mode: small metadata XML returned by Europe PMC marked as fulltext when no body was retrieved)
7. **CLAIM_DIFFERS_FROM_SOURCE**: `claim` ≠ `claim_source_sentence`? **pass/fail**
8. **HAS_CITE_KEY**: Finding has non-empty `cite_key` field (assigned during Phase 5, but if present in Phase 2 output, must be valid)? **pass/fail**

## Schema-Compliance Checks (binary)

These verify the evidence JSON structure as a hard requirement; any failure is a gate fail.

- **CONFLICT_FIELDS_EXACT**: Every entry in `conflicts[]` uses exactly these field names: `paper_a_doi`, `paper_b_doi`, `paper_a_claim`, `paper_b_claim`, `nature_of_conflict`, `resolution_status`. No other field names. No nested objects for sides. No `papers[]` arrays. No custom field names per conflict type. Every conflict MUST have both DOIs. **pass/fail**
- **NULLS_NOT_STRINGS**: JSON values for missing fields are `null`, not the Python string `"None"`. Agents must ensure None→null conversion during JSON serialization. **pass/fail**
- **FIGURE_DATA_DOIS_UNIQUE**: `figure_data` papers arrays MUST have unique DOIs. Deduplicate before saving. If the same paper appears multiple times in a comparison, keep only the first entry. **pass/fail**

## Compliance Checks

These are binary gate checks. Each returning cluster must satisfy every applicable check.

- **CONFLICTS_NONEMPTY**: `conflicts[]` non-empty per cluster. **pass/fail**
- **WEAKEST_EVIDENCE_SUBSTANTIVE**: `weakest_evidence_cited` substantive (not "all strong" / null / empty). **pass/fail**
- **FIGURE_DATA_PRESENT**: `figure_data[]` non-empty per cluster. **pass/fail**
- **PAPER_COUNT_FLOOR**: `papers_reviewed_count` ≥ `evidence_parameters.min_papers_per_cluster` (when not null). **pass/fail**
- **CROSS_CLUSTER_UNIQUE_DOIS**: Cross-cluster unique DOI count ≥ 80% of total target. **pass/fail**
- **BIBLIOGRAPHY_FLOOR_HARD**: When `evidence_parameters.total_bibliography_target` is set and `evidence_parameters.bibliography_target_is_hard_floor != false` (default: true), cross-cluster unique DOI count MUST be ≥ `total_bibliography_target`. If this check fails, the gate verdict is `FAIL_REQUIRES_USER_SIGNOFF` (NOT `PASS_WITH_DOCUMENTED_EXITS`) regardless of saturation status. The coordinator MUST escalate to the user via `ask_user` before any downstream phase consumes the evidence package — saturation-based exits below the absolute floor require an explicit user decision (proceed / extend search / abort). Record the user decision in `gate_evidence_compliance.json` under a top-level `user_signoff` field. **pass/fail/escalate**
- **EVERY_PAPER_HAS_DOI**: Every paper in findings/figure_data/conflicts has a DOI starting with `10.`. **pass/fail**
- **SEARCH_FAILURES_PRESENT**: `search_failures[]` is present and lists papers mentioned in delegation but not found in databases. Unfound papers MUST NOT appear in `findings` without a database-verified DOI. **pass/fail**
- **FULLTEXT_RATE_PER_CLUSTER**: Fulltext retrieval rate ≥ 20% per cluster. **pass/fail**
- **FULLTEXT_RATE_OVERALL**: Overall fulltext rate ≥ 50% across all clusters after fallback tiers. **pass/fail**
- **EFFECT_SIZE_RATE**: ≥ 30% of findings have non-null, non-empty `effect_size` (excluding "not reported", "N/A", "qualitative"). **pass/fail**
- **SAMPLE_SIZE_RATE**: ≥ 20% of findings have integer `n` > 0. **pass/fail**
- **REPLICATION_UNKNOWN_CEILING**: ≤ 70% of findings have `replication_status = replication_unknown`. **pass/fail**
- **CONTRADICTION_QUERIES_EXECUTED**: For each major topic, at least one query in the actor's search log explicitly searches for papers that challenge or revise the textbook narrative (e.g. "[mechanism X] challenged OR revised OR incorrect OR reconsidered", "[established claim] alternative OR reinterpretation"). **pass/fail**
- **FALSE_CONSENSUS_RISKS_IDENTIFIED**: `evidence_gaps[]` includes at least one entry per cluster with a claim that is "widely stated but primary experimental evidence is thin or absent." **pass/fail**

## Anti-Fabrication Checks

These checks catch fabrication signals in evidence packages.

- **SHAPE_NOT_UNIFORM**: Per-cluster paper counts must NOT be uniform within ±5
  papers across all clusters. (Catches the "12 × 166 papers per cluster"
  fabrication signal — a real evidence pass produces variation.) **pass/fail**
- **SATURATION_LOGGED**: When `evidence_parameters.saturation_criterion != null`,
  the actor's response must include a `search_passes` log with at least 2
  consecutive passes showing < 2% new-DOI rate (or whatever rate the
  saturation_criterion specifies). Missing log → fail. Insufficient passes →
  fail. **pass/fail**
- **DOI_TITLE_CROSSCHECK**: Random 10% sample (minimum 5 papers) per cluster:
  for each sampled DOI, fetch its CrossRef record and compare the title to the
  finding's reported title. The CrossRef title must contain ≥ 2 content words
  (length ≥ 4, not in a stop-word list) from the actor-reported title.
  Catches DOI/title mismatch produced by paper lists pre-populated from memory
  rather than search results. **pass/fail**

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
  "schema_compliance": {"CONFLICT_FIELDS_EXACT": "pass|fail", "NULLS_NOT_STRINGS": "pass|fail", "FIGURE_DATA_DOIS_UNIQUE": "pass|fail"},
  "compliance": {"CONFLICTS_NONEMPTY": "pass|fail", "...": "..."},
  "anti_fabrication": {"SHAPE_NOT_UNIFORM": "pass|fail", "SATURATION_LOGGED": "pass|fail", "DOI_TITLE_CROSSCHECK": "pass|fail"},
  "aggregates": {"PAPER_COUNT": "pass|fail", "COMPLIANCE_RATE": {"rate": 0.XX, "verdict": "pass|fail"}},
  "failures": [{"check": "...", "detail": "...", "cluster": "..."}]
}
```

`gate` is `"pass"` only when every per-finding, schema-compliance, compliance, and anti-fabrication check passes AND every aggregate is `"pass"`.

## Gate Artifact

The orchestrator saves this structured output as `provenance/gate_evidence_compliance.json` (the named gate that closes the 2 → 3 transition). Phase 3 cannot start without it.

## Rate Limiting
- Europe PMC: max 10 req/s. Use 200ms delay between requests.
- CrossRef: max 50 req/s with `mailto=` UA. Sample-based `DOI_TITLE_CROSSCHECK` keeps total CrossRef calls bounded; never call CrossRef for every paper.
