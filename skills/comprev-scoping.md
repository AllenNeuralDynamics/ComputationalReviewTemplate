# Scoping Protocol — Phase 1 (LITREVIEW actor)

## Purpose

Phase 1 scientific scoping. The LITREVIEW agent loaded with this skill reads the
user's prompt at `provenance/review_request.md` and produces a structured
`scope.json` plus a populated 21-phase `plan_content` list that downstream
phases consume. The agent does NOT call `generate_plan` — it returns the
`plan_content` so the coordinator can submit it for user approval.

## Inputs

- `provenance/review_request.md` — the user's task description (captured verbatim by the coordinator at session start)
- The 21-phase template (below) and the `evidence_parameters` parsing rules (below)

## Scoping Rules

Define: central question/thesis, audience, length target, section count, sub-topics. The user's initial task description (including the table of contents) serves as Phase 1 approval — do NOT use `ask_user` here.

**Required outputs (BOTH must be written before any other phase runs):**

1. **`provenance/review_request.txt`** — The user's task description, byte-for-byte, exactly as submitted. No reflow, no reformatting, no annotation. This is the legally-canonical record of the request.

2. **`provenance/review_request.md`** — A human-readable rendering of the same request, structured into three labelled sections:
   - A short header naming the project ID, capture timestamp, and pipeline version
   - A `## Verbatim user prompt` section presenting the request as a blockquote, with light mechanical reflow permitted (split a chat-collapsed TOC into a numbered list; split a chat-collapsed bullet list into bullets) but no edits to wording, ordering, or punctuation
   - An `## Editorial note` section that documents every mechanical reflow applied above, or states "No edits applied" if the rendering is byte-identical to `.txt`

3. **`gate_scope.json`** — As before. Add a top-level `"review_request_path": "provenance/review_request.md"` field so downstream phases can find it.

The template ships scaffold versions of both files containing `[PIPELINE FILLS THIS]` placeholders. Validator check `REVIEW_REQUEST_CAPTURED` (Phase 14V) hard-fails if those placeholders are still present at assembly time.

## Evidence Parameters

The coordinator extracts evidence-density parameters from the user's prompt and writes them into `gate_scope.json` under an `evidence_parameters` key. If the user's prompt does not specify a parameter, use the default. These parameters govern Phase 2 evidence gathering and Phase 2V/14V validation.

```yaml
evidence_parameters:
  min_papers_per_cluster: 70        # minimum unique papers per topic cluster
                                    # user may set higher (e.g. 200, 500)
  saturation_criterion: null        # optional stopping rule, e.g. "<2% new unique in last 100"
                                    # when set, agents continue searching until this fires
                                    # AND min_papers_per_cluster is met (whichever is later)
  snowball_rounds: 0                # citation-chasing rounds (forward + backward via OpenAlex)
                                    # 0 = keyword search only; 1+ = snowball after initial search
  total_bibliography_target: null   # optional floor for the total bibliography across all clusters
                                    # when set, coordinator redistributes shortfalls across clusters
```

**Parsing rules:**
- If the user says "saturate the literature" or "cover all papers" without a number, set `min_papers_per_cluster: null` (no floor — saturation criterion alone governs), `saturation_criterion: "<2% new unique in last 100"`, `snowball_rounds: 2`.
- If the user gives a number ("≥200 papers per section"), set `min_papers_per_cluster: 200`, leave `saturation_criterion: null`.
- If the user gives both, both apply: the agent must meet the floor AND the saturation criterion.
- `snowball_rounds` defaults to 0 for backward compatibility. Any `saturation_criterion` implies `snowball_rounds: 1` at minimum (saturation without snowballing is meaningless).

The coordinator passes `evidence_parameters` verbatim in every Phase 2 delegation task description. The evidence-gathering agent reads it and adapts its search depth accordingly.

## Plan Content Construction

The Phase 1 LITREVIEW actor produces a Python-serializable list of plan phase dicts ready to pass into `generate_plan`. Each entry includes name, depends_on, agent, and steps with title+description embedding compliance hints.

### Plan Phase Template

Use this structure for each of the 21 phases:

```
Phase name: "Phase N: [Title]"
depends_on: ["phase for N-1"]  (except Phase 1)
delegations:
  - agent: DATAML or LITREVIEW
    steps:
      - title: [what the agent does]
        description: [1-3 sentences: task + inputs + key compliance checks.
                      Include "Coordinator verifies: [specific gate checks]" 
                      at the end of the last step in each phase.]
```

### The 21 Phases to Include

| Phase | Title | Agent | Key Steps |
|-------|-------|-------|-----------|
| 1 | Scope and Thesis | Coordinator | Define clusters, sections, targets from user TOC |
| 2 | Evidence Gathering | LITREVIEW (parallel) | Search databases, extract findings, papers ≥ min_papers_per_cluster (from evidence_parameters), ≥50% fulltext |
| 3 | Citation Infrastructure | DATAML | CrossRef queries → citation_key_map + author_name_table |
| 4 | Scaffold Construction | LITREVIEW | Argument arc, section plans, figure specs, style guide |
| 5 | Evidence Curation | DATAML | Cluster→section assignment, per-section packages, scaffold extracts |
| 6 | Figure Comparability Audit | LITREVIEW (parallel) | Blinded review of figure_data, verdicts: PASS/CAVEAT/SPLIT/REDESIGN |
| 7 | Section Drafting | LITREVIEW (parallel) | One writer per section, MyST + LaTeX + figures + notebooks |
| 8 | Section Critics | LITREVIEW (parallel) | Blinded prose review, 6 tracks, MUST_FIX/SHOULD_CAVEAT/MINOR |
| 9 | Bibliography | DATAML | CrossRef → BibTeX, ASCII-only, dedup, contamination scan |
| 10 | Integration | LITREVIEW | 6 passes: transitions, cross-refs, terminology, continuity, figures, hygiene |
| 11 | Introduction and Conclusion | LITREVIEW | Written LAST, after all body sections, may only cite existing papers |
| 12 | Bookend Critic | LITREVIEW | Blinded critic on intro/conclusion; novel claim-citation pairs verified |
| 13 | Methods | DATAML | Pipeline metadata → Methods.md + architecture figure |
| 14 | Document Assembly | DATAML | Collect files, verify paths, build LaTeX preamble, run assertions |
| 15 | Citation Triples | DATAML | Exhaustive extraction: one triple per cite key occurrence, no sampling |
| 16 | Citation Verification | LITREVIEW (parallel) | 5-step deep check on every triple: DOI → title → authors → metadata → full-text claim verification (no tiering) |
| 17 | Fix Preparation | DATAML | Build fix requests with ±10 line context per non-VERIFIED triple |
| 18 | Fix Execution | LITREVIEW (parallel) | Apply bib fixes and text fixes per fix request |
| 19 | Fix Application | DATAML | Apply diffs in reverse order, verify zero orphans |
| 20a | Methods Ledger Refresh | DATAML | Re-render M.6 + M.5 phase outcomes from final operon.frames ledger |
| 20 | Repository Push | DATAML | Push all files via Contents API |
| 21 | Deploy Polish | DATAML | Post-deployment UX gate: tier-A static checks against built Pages-artifact tarball; tier-B live-URL checks (or manual checklist if sandbox cannot reach the deploy URL) |

The plan phases use ONLY `DATAML` and `LITREVIEW` as agents. The coordinator NEVER appears as an agent. Coordinator work (gate checks, compliance inspection, send-backs) happens BETWEEN plan phases and is described in the step descriptions as "coordinator verifies X before advancing."

Step descriptions must embed the enforcement rules. Each step should include what to check and what to send back — not just "draft sections" but "draft sections, verify ≥35 citations per core section, check brace balance, send back if citations_per_paragraph < 3.0."

## Output Schema

Return via `submit_output` (saved as artifact `scope.json`):

```json
{
  "title": "...",
  "thesis_question": "...",
  "audience": "...",
  "length_target": {"sections": 14, "pages_estimate": "30-50"},
  "clusters": [
    {"id": "cluster_01", "name": "...", "topics": [...], "section_targets": ["section_02"]}
  ],
  "sections": [
    {"id": "section_02", "title": "...", "cluster_ids": ["cluster_01"], "scope_notes": "..."}
  ],
  "evidence_parameters": {
    "min_papers_per_cluster": 70,
    "saturation_criterion": "<2% new unique in last 100",
    "snowball_rounds": 0,
    "total_bibliography_target": null
  },
  "plan_content": [
    {"name": "Phase 1: ...", "delegations": [{"agent": "...", "steps": [...]}]}
  ]
}
```

## Guardrails

1. **Use the prompt's TOC verbatim; do not invent sections.** Every heading the user supplies must map to one entry in `sections[]`; do not collapse, expand, or rename headings.
2. **Cluster boundaries reflect topical coherence, not paper-count balance.** Do not split a coherent topic to hit a paper-density floor; do not merge unrelated topics to fill a cluster.
3. **`evidence_parameters` interpretation is the agent's only judgment call; everything else is mechanical.** Apply the parsing rules above literally to the user's prompt language.
