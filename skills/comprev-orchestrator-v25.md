# Expert Review Orchestrator v25

# Expert Review Orchestrator v25

## Purpose
Coordinator-level skill governing how specialist agents compose outputs into unified long-form scientific reviews (30–200+ pages).


## Agents and Roles

```
COORDINATOR
    Orchestration only: delegate, check gates, inspect, send back.
    NEVER enters a for-loop or makes >5 API calls in a single python cell.
    Delegates ALL gate validation to DATAML validator agents.

DATAML (actor)
    Mechanical work: metadata queries, evidence curation, bibliography,
    document assembly, citation triple extraction, diff application, 
    repository push. Receives task + input artifacts, returns output artifacts.

DATAML (validator)
    Binary gate validation: runs pass/fail checks on actor output.
    Loads comprev-*-validator skills. Makes unlimited API calls to
    Europe PMC, CrossRef, myst build. Returns structured pass/fail results.
    MUST be a separate agent from the actor — never the same child frame.

LITREVIEW
    Scientific work: evidence gathering, section writing, blinded criticism,
    citation verification.
    Loads: comprev-reviewer-agent (evidence + writing), comprev-figure-construction (figures).
```

The coordinator defines WHAT and WHEN. DATAML does mechanical HOW. The review agent does scientific HOW.


## First Action: Build and Approve the Plan

Before any execution, the coordinator MUST build a complete execution plan using `generate_plan` and get user approval. This plan is the pipeline's external memory — it survives context compression across 400+ messages and serves as the roadmap the coordinator re-reads at every phase boundary.

### How to Build the Plan

1. **Read the user's task description.** This is Phase 1 (Scope): the title, table of contents, section structure, target paper count, and any domain-specific instructions.

2. **Call `generate_plan` with ALL 20 phases as separate plan phases.** Each phase maps to one `generate_plan` phase with `depends_on` chains enforcing sequential execution. Include the agent, the key steps, and the compliance checks for each phase.

3. **The plan phases use ONLY `DATAML` and `LITREVIEW` as agents.** The coordinator NEVER appears as an agent. Coordinator work (gate checks, compliance inspection, send-backs) happens BETWEEN plan phases and is described in the step descriptions as "coordinator verifies X before advancing."

4. **Step descriptions must embed the enforcement rules.** Each step should include what to check and what to send back — not just "draft sections" but "draft sections, verify ≥35 citations per core section, check brace balance, send back if citations_per_paragraph < 3.0."

### Plan Phase Template

Use this structure for each of the 20 phases:

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

### The 20 Phases to Include

| Phase | Title | Agent | Key Steps |
|-------|-------|-------|-----------|
| 1 | Scope and Thesis | Coordinator | Define clusters, sections, targets from user TOC |
| 2 | Evidence Gathering | EXPERT (parallel) | Search databases, extract findings, ≥70 papers/cluster, ≥50% fulltext |
| 3 | Citation Infrastructure | DATAML | CrossRef queries → citation_key_map + author_name_table |
| 4 | Scaffold Construction | EXPERT | Argument arc, section plans, figure specs, style guide |
| 5 | Evidence Curation | DATAML | Cluster→section assignment, per-section packages, scaffold extracts |
| 6 | Figure Comparability Audit | EXPERT (parallel) | Blinded review of figure_data, verdicts: PASS/CAVEAT/SPLIT/REDESIGN |
| 7 | Section Drafting | EXPERT (parallel) | One writer per section, MyST + LaTeX + figures + notebooks |
| 8 | Section Critics | EXPERT (parallel) | Blinded prose review, 6 tracks, MUST_FIX/SHOULD_CAVEAT/MINOR |
| 9 | Bibliography | DATAML | CrossRef → BibTeX, ASCII-only, dedup, contamination scan |
| 10 | Integration | EXPERT | 6 passes: transitions, cross-refs, terminology, continuity, figures, hygiene |
| 11 | Introduction and Conclusion | EXPERT | Written LAST, after all body sections, may only cite existing papers |
| 12 | Bookend Critic | EXPERT | Blinded critic on intro/conclusion; novel claim-citation pairs verified |
| 13 | Methods | DATAML | Pipeline metadata → M_methods.md + architecture figure |
| 14 | Document Assembly | DATAML | Collect files, verify paths, build LaTeX preamble, run assertions |
| 15 | Citation Triples | DATAML | Exhaustive extraction: one triple per cite key occurrence, no sampling |
| 16 | Citation Verification | EXPERT (parallel) | 5-step deep check on every triple: DOI → title → authors → metadata → full-text claim verification (no tiering) |
| 17 | Fix Preparation | DATAML | Build fix requests with ±10 line context per non-VERIFIED triple |
| 18 | Fix Execution | EXPERT (parallel) | Apply bib fixes and text fixes per fix request |
| 19 | Fix Application | DATAML | Apply diffs in reverse order, verify zero orphans |
| 20 | Repository Push | DATAML | Push all files via Contents API |

### After Plan Approval

Once the user approves the plan:
1. Store the plan's `version_id` as `PLAN_VID`
2. Store this orchestrator's `version_id` as `ORCHESTRATOR_VID`
3. Initialize the phase ledger
4. Begin Phase 1 immediately — no further user interaction until Phase 20 completes or a gate fails

The plan is the coordinator's external memory. At every phase boundary, re-read it.


## Coordinator Protocol

This section consolidates all rules governing coordinator behavior: gate enforcement, context management, session boundaries, compliance, and output standards.

### Gate Artifacts

Each phase transition requires a named gate artifact. The coordinator saves it before launching the next phase. If the artifact doesn't exist, the next phase cannot start.

| Phase Transition | Gate Artifact | Key Contents |
|-----------------|---------------|--------------|
| 2 → 3 | `gate_evidence_compliance.json` | Per-cluster: pass/fail, paper count, conflicts, fulltext rate |
| 3 → 4 | `gate_citation_infrastructure.json` | citation_key_map VID (null blocks all downstream), DOI count, failures |
| 4 → 5 | `gate_scaffold_approved.json` | Connections, cross-refs, conflicts represented, ≥2 figures/section |
| 5 → 6 | `gate_evidence_curated.json` | Per-section paper count, anti-compression ≥75% |
| 6 → 7 | `gate_figure_audit.json` | All verdicts, zero REDESIGN remaining, critic frame IDs |
| 7 → 8 | `gate_sections_drafted.json` | Per-section: artifact IDs, citation count, word count |
| 8 → 9 | `gate_critic_complete.json` | MUST_FIX count = 0, SHOULD_CAVEAT count, conflict survival |
| 9 → 10 | `gate_bibliography.json` | .bib artifact ID, entry count, failures |
| 10 → 11 | `gate_integration.json` | Passes 10a-10f, filename mismatches, structural hygiene |
| 11 → 12 | `gate_intro_conclusion.json` | Section artifact IDs, citation count |
| 12 → 13 | `gate_methods.json` | Methods artifact ID |
| 13 → 14 | `gate_assembly.json` | All verification assertions passed |
| 19 gate | `gate_repository_push.json` | Repo URL, file counts |

### Phase Ledger

```python
import json
phase_ledger = {f'phase_{i}': {'status': 'pending', 'gate_artifact_id': None, 'child_ids': []}
                for i in range(1, 20)}

def advance_phase(phase_num, gate_artifact_id, child_ids=None):
    key = f'phase_{phase_num}'
    phase_ledger[key]['status'] = 'complete'
    phase_ledger[key]['gate_artifact_id'] = gate_artifact_id
    if child_ids:
        phase_ledger[key]['child_ids'] = child_ids
    json.dump(phase_ledger, open('phase_ledger.json', 'w'), indent=2)

def require_phase(phase_num):
    key = f'phase_{phase_num}'
    assert phase_ledger[key]['status'] == 'complete', \
        f"BLOCKED: Phase {phase_num} not complete."
    return phase_ledger[key]['gate_artifact_id']
```

### Re-Read Protocol

Before executing ANY phase, the coordinator executes ONE Python cell that:

1. **Reads the orchestrator phase section** from disk into a kernel variable (NOT via `read_file` tool call)
2. **Extracts the delegation template** and compliance checklist into variables
3. **Prints ONLY the compliance checklist** (~500 bytes) — not the full section text
4. **Asserts the prerequisite phase** is complete in the ledger

This puts the full phase rules in kernel memory (usable for delegation templates) while adding only the checklist to the coordinator's context window. Cost: 1 message per phase, not 6.

```python
# Example: Phase 7 re-read (SINGLE python cell)
import json, os

# Read orchestrator into kernel memory (NOT into context)
orch_path = os.path.expandvars(".../skills/orchestrator_v25.md")
with open(orch_path) as f:
    orch_lines = f.readlines()

# Extract Phase 7 section into kernel variable
phase7_text = ''.join(orch_lines[855:1126])

# Print ONLY the checklist (this enters context — keep it small)
print("Phase 7 checklist:")
print("  □ MyST colon fences: :::{figure} not ```{figure}")
print("  □ Citations: {cite:p}`Key` and {cite:t}`Key`")
print("  □ :::{dropdown} with REAL code after EVERY figure")
print("  □ NO {authorship-explorer} (frontmatter only)")
print("  □ ≥4.0 citations per synthesis paragraph")
print("  □ Gate: word_count, citation_count, citations_per_paragraph, figures")

# Assert prerequisite
ledger = json.load(open('phase_ledger.json'))
assert ledger['phase_6']['status'] == 'complete'
```

All three are tool calls, not Python functions. They produce visible output in context and cannot be stubbed.

### Context Budget

- **No loops** in coordinator python cells. >5 iterations → delegate to DATAML.
- **No API calls** in coordinator python cells. CrossRef, databases, repository APIs → DATAML.
- **Inspection cells ≤20 lines.** Read JSON, check fields, print pass/fail.
- **Gate checks ≤5 lines.** `pipeline.artifacts(filename='gate_X.json')` + assert.
- **Re-read the orchestrator before each phase.** This is the most important use of context.

**No opportunistic phase completion:** When sending a follow-up to DATAML (e.g., 
"build scaffold extracts"), DATAML must complete ONLY the requested task. If DATAML 
also attempts later-phase work (bibliography, assembly) in the same resumption, those 
results are INVALID — the gate prerequisites have not been met. The coordinator must 
verify that only the requested deliverables were produced.



### Parallelism and Resource Limits

- **Maximum 4 parallel agents.** Never delegate to more than 4 agents simultaneously. For Phase 2 (12 clusters) and Phase 7 (12 sections), batch into groups of 4. Wait for each batch to complete before launching the next.
- **Incremental artifact saves.** All agents producing large outputs (section writers, evidence gatherers) MUST save intermediate artifacts. Section writers: save .md text BEFORE generating figures. Evidence agents: save findings JSON every 30 papers. This prevents total work loss if an agent is terminated.
- **Filter per-agent input size.** `citation_key_map` and `author_name_table` passed to Phase 7 writers MUST be filtered to only the DOIs/keys in that section's evidence package. Do not pass the full map to a writer who only needs ~70 keys. This reduces per-agent input from ~500KB to ~200KB, preventing resource exhaustion.

### Session Boundaries

A single session should not exceed ~120 messages. Break at gate boundaries:

| Session | Phases | Ends With |
|---------|--------|-----------|
| A | 1–2 (Scope + Evidence) | `gate_evidence_compliance.json` |
| B | 3–7 (Infrastructure + Scaffold + Writing) | `gate_sections_drafted.json` |
| C | 8–13 (Critics + Integration + Assembly) | `gate_assembly.json` |
| D | 14–19 (Verification + Push) | `gate_repository_push.json` |

**Handoff:** Save `phase_ledger.json` at session end. New session starts with `read_file` on plan + ledger + orchestrator section for current phase.

**Enforcement:** At each session boundary, the coordinator MUST:
1. Save phase_ledger.json as an artifact
2. Save a handoff context JSON with: current phase, pending child IDs, key VIDs
3. If continuing in the same session (context allows), log a warning but proceed
4. The re-read protocol (3 read_file calls) is MANDATORY regardless of session breaks


### Continuous Execution

After plan approval, execute all phases continuously. No `ask_user` between phases. No presenting intermediate outputs. Only pause if a gate check fails, an agent errors, or a network request needs approval.

"Continuous" means no unnecessary pauses — NOT skip enforcement. Every compliance check, gate script, and send-back loop is part of the continuous pipeline.

### Send-Back Protocol

When output is non-compliant:
1. Identify specific failure
2. `send_message` to child (NOT new delegation — child has context)
3. State specific requirement and what is missing
4. Ask for specific remediation

### Output Hygiene

FORBIDDEN in review text: Operon, scaffold, evidence package, framework failure, adversarial search, verdict, orchestrator, batch, sub-agent, revision manifest, prediction error, replication scorecard (as section title), paper weight, epistemic checkpoint.

Allowed scientific uses: "phase" (oscillation), "convergence" (convergent evidence), "scaffold" (developmental scaffolding), "recursive" (recursive processing).

**Test:** Could a reader tell this was produced by an automated system? If yes → fail.

### Red Flags

- Zero conflicts or caveats in a section
- Clean unanimous narrative
- Replication status never mentioned
- All papers summarized in one sentence
- Most paragraphs discuss exactly one paper (catalog-style)
- Section delivered without figures
- Only conceptual schematics, no cross-study comparisons
- Hard-coded figure numbers instead of \ref{}
- Process language in output


## Evidence Schema

Every evidence-gathering agent returns a JSON matching this schema. The coordinator validates compliance on return.

```json
{
  "findings": [{"claim": "", "claim_source_sentence": "verbatim sentence from abstract (if text_access=abstract_only) or paper body (if text_access=fulltext)", "evidence": "", "effect_size": "", "effect_size_source_sentence": "verbatim sentence containing the number, or null if qualitative only", "n": 0, "study_system": "what was studied: e.g. species, material, model organism, dataset, language, market — domain-dependent", "replication_status": "", "replication_evidence_dois": ["doi1", "doi2"], "doi": "", "text_access": "fulltext | abstract_only"}],
  "conflicts": [{"paper_a_doi": "", "paper_b_doi": "", "nature_of_conflict": "", "likely_reason": "", "conflict_source": "describe which sentences in which papers' abstracts/text establish the conflict"}],
  "unreplicated_claims": [{"claim": "", "source": "", "years_since_publication": 0}],
  "evidence_gaps": [{"topic": "", "what_is_missing": "", "why_it_matters": ""}],
  "strongest_evidence": {"claim": "", "why_strong": ""},
  "weakest_evidence_cited": {"claim": "", "why_weak": ""},
  "papers_reviewed_count": 0,
  "evidence_artifact_id": "",
  "figure_data": [
    {
      "comparison_id": "descriptive-slug",
      "comparison_name": "Human-readable name",
      "papers": [
        {"doi": "", "metric": "", "value": "", "value_source_sentence": "verbatim sentence from abstract or full text containing this number", "ci_or_error": "", "n": 0, "n_analyzed": "number that passed QC or was actually used in analysis, if different from n", "n_definition": "what n counts: items profiled | items post-QC | subjects | samples", "study_system": "", "experimental_conditions": "", "method": "", "text_access": "fulltext | abstract_only", "scope_region": "domain/region scope: e.g., whole system | specific region | subregion | ...", "scope_population": "population scope: all items | all category-X | subtype-Y only | ...", "taxonomic_level": "granularity of the classification: broad category | subcategory | fine type | cluster | other"}
      ],
      "comparison_type": "cross-study conflict | convergent evidence | dose-response | timeline",
      "what_it_reveals": "Why this comparison matters",
      "suggested_plot_type": "forest plot | grouped bar | heatmap | timeline | scatter",
      "homogeneity_check": {
        "scope_region_uniform": "true | false",
        "scope_population_uniform": "true | false",
        "taxonomic_level_uniform": "true | false",
        "n_definition_uniform": "true | false",
        "caveats": ["list any comparability issues across entries, e.g. 'Paper X is whole-brain while others are cortex-only'"]
      }
    }
  ],
  "search_failures": [
    {
      "suggested_reference": "description from coordinator task",
      "searches_tried": ["query1", "query2"],
      "result": "zero results in PubMed and Europe PMC",
      "action": "excluded from evidence"
    }
```


**MANDATORY — Evidence JSON compliance:**
- Conflicts MUST use exactly these fields: `paper_a_doi`, `paper_b_doi`, `paper_a_claim`, `paper_b_claim`, `nature_of_conflict`, `resolution_status`. No other field names. No nested objects for sides. No `papers[]` arrays. No custom field names per conflict type. Every conflict MUST have both DOIs.
- JSON values: use `null` for missing values, NEVER the Python string `"None"`. Agents must ensure None→null conversion during JSON serialization.
- `figure_data` papers arrays MUST have unique DOIs. Deduplicate before saving. If the same paper appears multiple times in a comparison, keep only the first entry.


## Repository Structure

The template repo (`ComputationalReviewTemplate`) provides the complete scaffold: `myst.yml`, plugins, widgets, `deploy.yml`, directory structure, and placeholder content files. Phases 13 and 19 UPDATE existing files — they do not create the scaffold from scratch.

See the template repo README for the full file inventory.

## Phase 1: Scope and Thesis

**Agent:** Coordinator

Define: central question/thesis, audience, length target, section count, sub-topics. The user's initial task description (including the table of contents) serves as Phase 1 approval — do NOT use `ask_user` here.




## Phase Index

The coordinator uses this table to delegate each phase. The full delegation template for each phase lives in a role-specific sub-skill loaded by the sub-agent — NOT in this file.

| Step | Role | Agent | Skills to load | Output | Key checks |
|------|------|-------|----------------|--------|------------|
| 1 | scope | Coordinator | — | `gate_scope.json` | clusters defined, TOC topics covered |
| 2 | **actor** | LITREVIEW | `comprev-evidence-gathering` + `comprev-reviewer-agent` | evidence JSONs | papers≥target, conflicts>0, figure_data≥2/cluster |
| 2V | **validator** | DATAML | `comprev-evidence-validator` | `gate_evidence_compliance.json` | source sentences in abstracts, DOI resolution, fulltext honesty |
| 3 | **actor** | DATAML | `comprev-dataml-phases` | citation_key_map, author_name_table | DOIs mapped, cite keys generated |
| 3V | **validator** | DATAML | `comprev-citation-validator` | `gate_citation_infrastructure.json` | CrossRef matching, key uniqueness, author match |
| 4 | actor | LITREVIEW | `comprev-scaffold` + `comprev-reviewer-agent` | scaffold JSON | `gate_scaffold_approved.json`: ≥2 figs/section, cross-refs |
| 5 | **actor** | DATAML | `comprev-dataml-phases` | section evidence packages | findings assigned, cite keys attached |
| 5V | **validator** | DATAML | `comprev-curation-validator` | `gate_evidence_curated.json` | no duplicates, anti-compression ≥75%, conflicts assigned |
| 6 | actor | LITREVIEW | `comprev-figure-audit` + `comprev-reviewer-agent` | audit verdicts | `gate_figure_audit.json`: 0 REDESIGN remaining |
| 7 | **actor** | LITREVIEW | `comprev-section-writing` + `comprev-reviewer-agent` + `comprev-figure-construction` | section .md files + figures | word count, citation count, figures |
| 7V | **validator** | DATAML | `comprev-myst-validator` | validation report | `gate_sections_drafted.json`: :name: not :label:, figure-dropdown match, cite keys exist |
| 8 | critic | LITREVIEW | `comprev-critic` + `comprev-reviewer-agent` | critic report | `gate_critic_complete.json`: MUST_FIX=0 after send-back |
| 9 | **actor** | DATAML | `comprev-dataml-phases` | references.bib | bib entries built from CrossRef |
| 9V | **validator** | DATAML | `comprev-citation-validator` | `gate_bibliography.json` | bib matches CrossRef, all keys present, 0 contamination |
| 10 | actor | LITREVIEW | `comprev-integration` + `comprev-reviewer-agent` | integrated sections | `gate_integration.json`: 6 passes documented |
| 11 | actor | LITREVIEW | `comprev-integration` + `comprev-reviewer-agent` | intro + conclusion | `gate_intro_conclusion.json`: no new citations |
| 12 | critic | LITREVIEW | `comprev-critic` + `comprev-reviewer-agent` | bookend critic report | `gate_bookend_critic.json`: MUST_FIX=0 |
| 13 | actor | DATAML | `comprev-dataml-phases` | M_methods.md | `gate_methods.json`: 8 subsections |
| 14 | **actor** | DATAML | `comprev-dataml-phases` | assembled manuscript | all files collected, toc updated |
| 14V | **validator** | DATAML | `comprev-myst-validator` | `gate_assembly.json` | myst build passes, structural checks, evidence JSONs exist |
| 15 | **actor** | DATAML | `comprev-dataml-phases` | citation_triples.json | all triples extracted |
| 15V | **validator** | DATAML | `comprev-triples-validator` | validation report | exhaustive count, sentences in files, keys in bib |
| 16 | critic | LITREVIEW | `comprev-verification` + `comprev-reviewer-agent` | verification results | ALL triples deep-checked |
| 17 | **actor** | DATAML | `comprev-dataml-phases` | fix_requests.json | fix requests for non-VERIFIED triples |
| 17V | **validator** | DATAML | `comprev-triples-validator` | validation report | full coverage, context exists |
| 18 | actor | LITREVIEW | `comprev-fix-execution` + `comprev-reviewer-agent` | fix diffs | fixes executed |
| 19 | **actor** | DATAML | `comprev-dataml-phases` | updated files | diffs applied |
| 19V | **validator** | DATAML | `comprev-myst-validator` | validation report | build passes, zero orphans |
| 20 | **actor** | DATAML | `comprev-dataml-phases` | pushed repo | git push |
| 20V | **validator** | DATAML | `comprev-myst-validator` | `gate_repository_push.json` | fresh clone builds, files match |

### Delegation Pattern

There are THREE distinct delegation types. Never combine them in a single delegation.

**1. Actor delegation (LITREVIEW):**
> "Load skills `comprev-[role-skill]` and `comprev-reviewer-agent`. Execute Phase N. Your inputs: [artifact references]."
The actor produces the phase output. The coordinator waits for completion.

**2. Actor delegation (DATAML):**
> "Load skill `comprev-dataml-phases` and execute Phase N. Your inputs: [artifact references]."
Or use `send_message` to resume an existing DATAML child.

**3. Validator delegation (DATAML — ALWAYS a separate agent from the actor):**
> "Load skill `comprev-[validator-skill]`. Validate the output of Phase N. Your inputs: [Phase N output artifacts]. Run ALL checks. Return structured pass/fail."
The validator MUST be a NEW `delegate_to` call — never `send_message` to the actor. Never load a validator skill and an actor skill in the same delegation. The validator agent has one job: check and report.

**Sequence for every phase with a validator (steps 2V, 3V, 5V, 7V, 9V, 14V, 15V, 17V, 19V, 20V):**
1. Delegate to actor → wait for completion
2. Delegate to validator (new agent) → wait for completion
3. If validator returns `gate: "fail"`: send failures to actor via `send_message` → actor fixes → re-delegate to validator
4. If validator returns `gate: "pass"`: save gate artifact → advance

**The coordinator does NOT copy phase templates into the task description.** The sub-agent reads its own template from its loaded skills.


## Phase 1: Scope and Thesis

**Agent:** Coordinator

Define: central question/thesis, audience, length target, section count, sub-topics. The user's initial task description (including the table of contents) serves as Phase 1 approval — do NOT use `ask_user` here.



## Phase Index

The coordinator uses this table to delegate each phase. The full delegation template for each phase lives in a role-specific sub-skill loaded by the sub-agent — NOT in this file.

*(See the unified phase table above. The Step column uses N for actor phases, NV for validator phases, and "critic" for LLM judgment phases.)*

### Delegation Pattern

*(See the delegation pattern above. Three types: actor-LITREVIEW, actor-DATAML, validator-DATAML. Never combine actor and validator skills in a single delegation.)*


## Failure Modes

These require active coordinator vigilance. Each maps to specific phase enforcement.

| # | Failure Mode | Caught By | Coordinator Action |
|---|---|---|---|
| 1 | Phase skipping — marking phases complete without work | Gate artifacts, phase ledger | Assert gate exists before advancing |
| 2 | Self-auditing — writers reviewing their own work | Actor-critic frame ID checks | Verify critic IDs ≠ writer IDs after launching |
| 3 | Author name contamination — LLM-generated names in citations | Citation key map (Phase 3), content inspection | Mechanical cite_key assignment; no author names from memory |
| 4 | Context compression — losing enforcement rules mid-pipeline | Re-read protocol, session boundaries | `read_file` on orchestrator + plan at every phase boundary |
| 5 | Plan step misassignment — coordinator steps orphaned in plan | Plan excludes coordinator | Plan phases use only DATAML and review agents |
| 6 | Step work displacing orchestration — loops consuming context | DATAML delegation, context budget | No loops in coordinator; delegate all data processing |
| 7 | Stub function definitions — mechanisms defined but never called | Tool-call-based re-reads (not Python functions) | All cross-turn mechanisms use `read_file`, not in-kernel functions |
| 8 | Silent fulltext false positives — metadata-only XML marked as fulltext | Size validation (>15KB + `<body>` tag) | Enforce in Phase 2 compliance checks |
| 9 | Misleading cross-study comparisons — incomparable data on same axis | Phase 6 blinded figure audit | Strip narrative framing before critic review |
| 10 | MUST_FIX deferral — advancing past unresolved critic findings | Hard block assertion before Phase 9 | `assert total_must_fix == 0` |
| 11 | Blind metadata resolution — guessing papers from author + year | Prohibition in Phase 14 | Unresolvable keys → send back to writers, never guess |
| 12 | Conflict suppression — presenting contested findings as resolved | Phase 8 conflict survival pre-check + Phase 8 critic Track 3 | Mechanical pre-check: both DOIs from each conflict must appear |
| 13 | Bookend citation misattribution — intro/conclusion attaches existing bib keys to unsupported claims | Phase 12 bookend critic Track 1 | Novel claim-citation pairs checked against abstracts; inherited pairs skipped |### Gate Validation Protocol (v26)

The coordinator MUST NOT run gate validation checks inline. The coordinator's ≤5 API call limit prevents it from verifying evidence, citations, or build integrity across hundreds of findings. Instead, the coordinator DELEGATES gate validation to a separate DATAML agent.

**Pattern for every phase transition:**

```
Actor finishes Phase N
  → Coordinator delegates to DATAML validator agent:
    "Load skill [validator-skill]. Validate Phase N output. Input: [artifacts]."
  → Validator runs ALL binary checks (can loop, can make unlimited API calls)
  → Validator returns: {gate: "pass"|"fail", failures: [...]}
  → If PASS: Coordinator saves gate artifact, advances to Phase N+1
  → If FAIL: Coordinator sends failure list to Actor via send_message
    → Actor fixes specific failures
    → Coordinator re-delegates to Validator (re-check only failed items)
    → Loop until PASS or max 3 iterations (then block for human review)
```

**CRITICAL: The validator MUST be a separate DATAML agent from the actor.** The validator cannot be the same agent that produced the output, and cannot be the coordinator running checks inline. This ensures independence — the validator has no incentive to pass its own work.

**Validator skill assignments:**

| Phase gate | Validator skill | Key checks |
|------------|----------------|------------|
| 2 → 3 | `comprev-evidence-validator` | Source sentences in abstracts, DOI resolution, fulltext honesty |
| 3 → 4 | `comprev-citation-validator` | CrossRef matching, key format, uniqueness |
| 5 → 6 | `comprev-curation-validator` | No duplicates, anti-compression, conflict assignment |
| 7 → 8 | `comprev-myst-validator` | MyST syntax: :name:, dropdowns, cite keys, no process language |
| 9 → 10 | `comprev-citation-validator` | Bib entries match CrossRef, all keys present |
| 14 → 15 | `comprev-myst-validator` | `myst build --html` passes, structural checks |
| 15 → 16 | `comprev-triples-validator` | Exhaustive count, sentences in files |
| 17 → 18 | `comprev-triples-validator` | Fix coverage, context exists |
| 19 → 20 | `comprev-myst-validator` | Build still passes after fixes |
| 20 (final) | `comprev-myst-validator` | Fresh clone builds, all files present |

**Phases with LLM judgment critics (existing pattern, unchanged):**

| Phase gate | Critic skill | Why LLM needed |
|------------|-------------|----------------|
| 4 → 5 | (coordinator inspection) | Scaffold quality is subjective |
| 6 → 7 | `comprev-figure-audit` | Data comparability requires judgment |
| 8 → 9 | `comprev-critic` | Evidence fidelity, conflict representation |
| 10 → 11 | (coordinator inspection) | Integration quality |
| 11 → 12 | (coordinator inspection) | Intro/conclusion basic checks |
| 12 → 13 | `comprev-critic` | Bookend novel claim verification |
| 16 → 17 | `comprev-verification` | Claim-paper support judgment |
| 18 → 19 | (coordinator inspection) | Fix quality |

**Delegation template for validator:**

> "Load skill `comprev-[validator-name]` and validate Phase N output.
> Your inputs: [artifact references for Phase N output].
> Run ALL checks defined in the skill. Return the structured output schema
> defined in the skill. Do NOT skip any check. Do NOT use truncated matching."


