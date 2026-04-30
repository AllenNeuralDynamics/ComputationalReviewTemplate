# Expert Review Orchestrator v28

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


## First Action: Run Phase 1

Before `generate_plan`, the coordinator runs Phase 1 to produce the scope and plan content.

1. **Capture user prompt verbatim.** The coordinator copies the user's submitted task description, byte-for-byte, into a buffer that the Phase 1 DATAML materialiser will write to `provenance/review_request.txt`.

2. **Phase 1 LITREVIEW (scoping actor).** Delegate to a LITREVIEW agent loaded with `comprev-scoping`. The agent reads the captured prompt, defines clusters/sections/length targets, parses `evidence_parameters`, and returns `scope.json` containing the scope decisions plus a `plan_content` list of 20 phase entries ready for `generate_plan`. The LITREVIEW agent does NOT call `generate_plan` itself.

3. **Phase 1 DATAML (materialiser).** Delegate to a DATAML actor loaded with `comprev-dataml-phases` (Phase 1 Scoping Materialisation section). The actor materialises `provenance/review_request.txt` (verbatim bytes), `provenance/review_request.md` (three-section render), and `gate_scope.json` (derived from `scope.json` with `review_request_path`). No template placeholders may remain.

4. **Phase 1V validation.** Delegate to a separate DATAML validator agent loaded with `comprev-scoping-validator`. The validator runs the binary checks defined there (`REVIEW_REQUEST_VERBATIM`, `REVIEW_REQUEST_MD_PRESENT`, `NO_PLACEHOLDERS`, `GATE_SCOPE_FIELDS`, `EVIDENCE_PARAMETERS_VALID`, `EVIDENCE_PARAMETERS_CONSISTENT`, `CLUSTERS_NONEMPTY`, `SECTIONS_COVER_TOC`, `PLAN_CONTENT_PHASE_COUNT`, `PLAN_AGENTS_VALID`) and returns a structured pass/fail.

5. **On pass: build and approve the plan.** With `gate_scope.json` produced and `comprev-scoping-validator` returning `gate: "pass"`, the coordinator calls `generate_plan(plan_content=scope["plan_content"])` and waits for user approval. The plan is the pipeline's external memory — it survives context compression across 400+ messages and serves as the source of truth for sequencing.

On Phase 1V fail: `send_message` the failing actor (LITREVIEW scoper or DATAML materialiser, whichever owns the failed check) with the validator's `failures[]` list. Re-validate after the resubmission. Do not advance to `generate_plan` until Phase 1V passes.

## Phase Index

The coordinator uses this table to delegate each phase. The full delegation template for each phase lives in a role-specific sub-skill loaded by the sub-agent — NOT in this file.

| Step | Role | Agent | Skills to load | Output | Key checks |
|------|------|-------|----------------|--------|------------|
| 1 | **actor** | LITREVIEW | `comprev-scoping` | `scope.json` (clusters, sections, `evidence_parameters`, `plan_content`) | prompt parsed, clusters defined, TOC topics covered, `evidence_parameters` present with defaults filled, `plan_content` lists 21 phases |
| 1 | **actor** | DATAML | `comprev-dataml-phases` | `provenance/review_request.{md,txt}` + `gate_scope.json` | review_request.txt verbatim bytes, review_request.md three-section render, `gate_scope.json` carries `review_request_path`, no template placeholders remain |
| 1V | **validator** | DATAML | `comprev-scoping-validator` | structured pass/fail | `REVIEW_REQUEST_VERBATIM`, `REVIEW_REQUEST_MD_PRESENT`, `NO_PLACEHOLDERS`, `GATE_SCOPE_FIELDS`, `EVIDENCE_PARAMETERS_VALID`, `EVIDENCE_PARAMETERS_CONSISTENT`, `CLUSTERS_NONEMPTY`, `SECTIONS_COVER_TOC`, `PLAN_CONTENT_PHASE_COUNT`, `PLAN_AGENTS_VALID` all pass |
| 2 | **actor** | LITREVIEW | `comprev-evidence-gathering` + `comprev-reviewer-agent` | evidence JSONs (per cluster — may be assembled across multiple continuation children, see §"Phase 2 Continuation Pattern") | papers≥target, conflicts>0, figure_data≥2/cluster, every child returns `continuation_required: false` or hits the sanity cap |
| 2V | **validator** | DATAML | `comprev-evidence-validator` | `gate_evidence_compliance.json` | source sentences in abstracts, DOI resolution, fulltext honesty, `BIBLIOGRAPHY_FLOOR_HARD` (DOI count below `total_bibliography_target` returns `FAIL_REQUIRES_USER_SIGNOFF`) |
| 3 | **actor** | DATAML | `comprev-dataml-phases` | citation_key_map, author_name_table | DOIs mapped, cite keys generated |
| 3V | **validator** | DATAML | `comprev-citation-validator` | `gate_citation_infrastructure.json` | CrossRef matching, key uniqueness, author match |
| 4 | **actor** | LITREVIEW | `comprev-scaffold` + `comprev-reviewer-agent` | scaffold JSON | `gate_scaffold_approved.json`: ≥2 figs/section, cross-refs |
| 5 | **actor** | DATAML | `comprev-dataml-phases` | section evidence packages | findings assigned, cite keys attached |
| 5V | **validator** | DATAML | `comprev-curation-validator` | `gate_evidence_curated.json` | no duplicates, anti-compression ≥75%, conflicts assigned |
| 6 | **critic** | LITREVIEW | `comprev-figure-audit` + `comprev-reviewer-agent` | audit verdicts | `gate_figure_audit.json`: 0 REDESIGN remaining (coordinator MUST pre-fetch paper abstracts via Europe PMC and pass them inline; the critic cannot reach the network) |
| 7 | **actor** | LITREVIEW | `comprev-section-writing` + `comprev-reviewer-agent` + `comprev-figure-construction` | section .md files + figures | word count, citation count, figures |
| 7V | **validator** | DATAML | `comprev-myst-validator` | validation report | `gate_sections_drafted.json`: :name: not :label:, cite keys exist (dropdowns are NOT yet present — they are added at Phase 14) |
| 8 | **critic** | LITREVIEW | `comprev-critic` + `comprev-reviewer-agent` | critic report | `gate_critic_complete.json`: MUST_FIX=0 after send-back, **coverage gate**: every uncited paper classified, no unaddressed `SHOULD_CITE` |
| 9 | **actor** | DATAML | `comprev-dataml-phases` | references.bib | bib entries built from CrossRef |
| 9V | **validator** | DATAML | `comprev-citation-validator` | `gate_bibliography.json` | bib matches CrossRef, all keys present, 0 contamination |
| 10 | **actor** | LITREVIEW | `comprev-integration` + `comprev-reviewer-agent` | integrated sections | `gate_integration.json`: 6 passes documented |
| 11 | **actor** | LITREVIEW | `comprev-integration` + `comprev-reviewer-agent` | intro + conclusion | `gate_intro_conclusion.json`: no new citations |
| 12 | **critic** | LITREVIEW | `comprev-critic` + `comprev-reviewer-agent` | bookend critic report | `gate_bookend_critic.json`: MUST_FIX=0 |
| 13 | **actor** | DATAML | `comprev-dataml-phases` | Methods.md | `gate_methods.json`: 8 subsections |
| 14 | **actor** | DATAML | `comprev-dataml-phases` | assembled manuscript | all files collected, toc updated |
| 14V | **validator** | DATAML | `comprev-myst-validator` | `gate_assembly.json` | myst build passes, structural checks, **`EVIDENCE_PACKAGES_POPULATED`** (each `evidence/section_XX_evidence_package.json` ≥1 KB and parses with `section_title` key), **`REVIEW_REQUEST_CAPTURED`** (`provenance/review_request.{md,txt}` exist, no scaffold placeholders remain, `gate_scope.json` carries `review_request_path`, `content/Methods.md` includes the prompt block), **`PLUGIN_DIRECTIVES_INVOKED`** (every plugin directive registered in `myst.yml` has ≥1 `:::{name}` invocation in `content/*.md` and zero bare-`{name}` role-syntax mis-invocations), **`FIGURE_DROPDOWN_MATCH`** (`:::{dropdown} 📓 Figure code` count == `:::{figure}` count per section), **`FIGURE_NOTEBOOK_MATCH`** (every figure has a non-stub `.ipynb`), **`HEADING_STYLE_CONSISTENT`** (zero problems from `audit_headings`: no manual number prefixes, no wrapped headings, no en-/em-dashes, H1 and H2 styles match within each section, body sections share one H1 style). `structural_results` MUST contain a key for every check defined in the validator skill — missing key ⇒ fail. HARD FAIL — never downgrade to a `note`. |
| 15 | **actor** | DATAML | `comprev-dataml-phases` | citation_triples.json | all triples extracted |
| 15V | **validator** | DATAML | `comprev-triples-validator` | validation report | exhaustive count, sentences in files, keys in bib |
| 16 | **critic** | LITREVIEW | `comprev-verification` + `comprev-reviewer-agent` | verification results | ALL triples deep-checked |
| 17 | **actor** | DATAML | `comprev-dataml-phases` | fix_requests.json | fix requests for non-VERIFIED triples |
| 17V | **validator** | DATAML | `comprev-triples-validator` | validation report | full coverage, context exists |
| 18 | **actor** | LITREVIEW | `comprev-fix-execution` + `comprev-reviewer-agent` | fix diffs | fixes executed |
| 19 | **actor** | DATAML | `comprev-dataml-phases` | updated files | diffs applied |
| 19V | **validator** | DATAML | `comprev-myst-validator` | validation report | build passes, zero orphans, `FORBIDDEN_LEXICON` repo-wide (`content/*.md content/*.yml manuscript.tex`) |
| 20a | **actor** | DATAML | `comprev-dataml-phases` | refreshed `Methods.md` + `gate_phase_20a_methods_refresh.json` | re-render M.6 from live ledger; replace `Phases 14-20 (pending refresh)` placeholder with actual gate outcomes |
| 20 | **actor** | DATAML | `comprev-dataml-phases` | pushed repo | git push |
| 20V | **validator** | DATAML | `comprev-myst-validator` | `gate_repository_push.json` | fresh clone builds, files match, **`METHODS_LEDGER_FRESH`** (M.6 frame count matches live ledger; "All 21 pipeline phases completed" present; zero forbidden stale phrasings — `are scheduled`, `had not yet executed`, etc.), **`AUTHOR_IDENTITY_NOT_PLACEHOLDER`** (no `Human Supervisor`, `Anonymous`, `TBD`, or `<...>` placeholders in `content/authors.yml`, `myst.yml` `authors:`, or any author-byline block). HARD FAIL — the Phase 20a Methods Ledger Refresh in `comprev-dataml-phases.md` is what populates these; this gate verifies the refresh ran. |
| 21 | **validator** | DATAML | `comprev-deploy-polish` | `gate_phase21_deploy_polish.json` | post-deployment UX gate: tier-A static checks against the built Pages-artifact tarball (`NO_FRONTMATTER_LEAK`, `FIGURE_DROPDOWN_COMPLETE`, `FIGURE_ASSETS_RESOLVE`, `INTERNAL_LINK_HEALTH`, `PLUGIN_DATA_BOUND`, `DIRECTIVE_RENDERED_OK`, `FORBIDDEN_LEXICON_DEPLOYED`, `AUTHOR_IDENTITY_DEPLOYED`); tier-B live-URL checks (`PER_PAGE_HTTP_200`, `EXTERNAL_LINK_HEALTH`) gated by `DEPLOY_ACCESSIBLE` — fall through to a manual user checklist when the deploy URL is unreachable from the sandbox. ONLY phase the coordinator may open after Phase 20 PASS; one targeted fix iteration max, then `ask_user` escalation. |

## Coordinator Protocol

This section consolidates all rules governing coordinator behavior: gate enforcement, context management, session boundaries, compliance, and output standards.

### Gate Artifacts

Each phase transition requires a named gate artifact. The coordinator saves it before launching the next phase. If the artifact doesn't exist, the next phase cannot start.

| Phase Transition | Gate Artifact | Key Contents |
|-----------------|---------------|--------------|
| 1 → 2 | `gate_scope.json` | scope JSON, evidence_parameters, TOC, cluster definitions, prompt-verbatim provenance |
| 2 → 3 | `gate_evidence_compliance.json` | Per-cluster: pass/fail, paper count, conflicts, fulltext rate |
| 3 → 4 | `gate_citation_infrastructure.json` | citation_key_map VID (null blocks all downstream), DOI count, failures |
| 4 → 5 | `gate_scaffold_approved.json` | Connections, cross-refs, conflicts represented, ≥2 figures/section |
| 5 → 6 | `gate_evidence_curated.json` | Per-section paper count, anti-compression ≥75% |
| 6 → 7 | `gate_figure_audit.json` | All verdicts, zero REDESIGN remaining, critic frame IDs |
| 7 → 8 | `gate_sections_drafted.json` | Per-section: artifact IDs, citation count, word count |
| 8 → 9 | `gate_critic_complete.json` | MUST_FIX count = 0, SHOULD_CAVEAT count, conflict survival, coverage_review (per-uncited-paper classification), coverage_disputes (writer-waiver disagreements after 3 rounds) |
| 9 → 10 | `gate_bibliography.json` | .bib artifact ID, entry count, failures |
| 10 → 11 | `gate_integration.json` | Passes 10a-10f, filename mismatches, structural hygiene |
| 11 → 12 | `gate_intro_conclusion.json` | Section artifact IDs, citation count |
| 12 → 13 | `gate_bookend_critic.json` | MUST_FIX=0 on novel intro/conclusion citations |
| 13 → 14 | `gate_methods.json` | Methods.md artifact ID, ledger sub-block populated |
| 14 → 14V | (assembled manuscript) | LaTeX + content/*.md + figures + notebooks present |
| 14V → 15 | `gate_assembly.json` | All build/structural assertions passed |
| 15 → 16 | `citation_triples.json` | Triple count, batch IDs, schema version |
| 16 → 17 | (verification reports) | Per-triple verdicts, MUST_FIX count |
| 17 → 18 | `fix_requests.json` | Fix-request count, target files, contexts |
| 18 → 19 | (fix diffs) | Applied diffs, reverse-order verification |
| 19 → 19V | (updated files) | Patched .md and .bib |
| 19V → 20a | (myst rebuild report) | All structural checks pass on patched files |
| 20a → 20 | `gate_phase_20a_methods_refresh.json` | Methods.md M.5/M.6 fully rendered (no `Pending` rows) |
| 20 → 20V | (pushed repo) | Contents API push complete, commit SHA |
| 20V (release gate) | `gate_repository_push.json` | Fresh-clone build passes; files match local |
| 20V → 21 | (deployment context) | Build green at HEAD; deploy URL + repo identifier captured |
| 21 (deploy-polish gate) | `gate_phase21_deploy_polish.json` | Tier-A static checks PASS on built-Pages-artifact; Tier-B live checks either PASS or are reported as `BLOCKED_DEPLOY_INACCESSIBLE` with a manual checklist for the user |

### Phase Ledger

```python
import json
phase_ledger = {f'phase_{i}': {'status': 'pending', 'gate_artifact_id': None, 'child_ids': []}
                for i in list(range(1, 22)) + ['20a']}

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
orch_path = os.path.expandvars(".../skills/orchestrator_v28.md")
with open(orch_path) as f:
    orch_lines = f.readlines()

# Extract Phase 7 section into kernel variable
phase7_text = ''.join(orch_lines[855:1126])

# Print ONLY the checklist (this enters context — keep it small)
print("Phase 7 checklist:")
print("  □ MyST colon fences: :::{figure} not ```{figure}")
print("  □ Citations: {cite:p}`Key` and {cite:t}`Key`")
print("  □ figures/notebooks/<fig>.ipynb saved per figure (Phase 6 deliverable; Phase 14 will embed dropdowns from these notebooks)")
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
- **Phase 2 continuation loops are sequential within a cluster, parallel across clusters.** A continuation child needs the prior child's `search_state_artifact_id`, so children of one cluster run one at a time. The 4-parallel cap therefore applies to *cluster loops*, not individual children — launch up to 4 cluster-loops concurrently.

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

### Plan Step Status Protocol (CRITICAL)

**The plan UI shows step statuses to the user in real time.** Incorrect status updates cause the user to see "all phases complete" while agents are still running — a confirmed failure mode from prior runs.

**Rules:**
1. Call `update_step_status(step=..., status="in_progress")` when you **delegate** the step (issue the `delegate_to` or `send_message`).
2. Call `update_step_status(step=..., status="completed")` ONLY after `wait_for_notification` returns AND you have verified the output (gate check passed, or no gate required).
3. Never mark a step "completed" at delegation time. Never mark a step "completed" before its child frame has finished.
4. If a child fails: mark the step "blocked", re-delegate, and only mark "completed" when the retry succeeds.
5. For batched phases (Phase 2, 7, 8, 16): mark the FIRST batch step "in_progress" when the first batch launches. Mark it "completed" only when ALL batches in that step have returned. Do not mark batch 1 "completed" and batch 2 "in_progress" simultaneously — the plan step granularity is per-step, not per-batch.

**Anti-pattern (caused the v1 astrocyte bug):**
```python
# WRONG — marks completed before children finish
update_step_status(step="Gather evidence batch 1", status="completed")  # ← too early!
delegate_to(agent="LITREVIEW", task=batch_2_task)
```

**Correct pattern:**
```python
update_step_status(step="Gather evidence batch 1", status="in_progress")
delegate_to(agent="LITREVIEW", task=batch_1_task)
# ... wait_for_notification for all batch 1 children ...
# ... verify outputs ...
update_step_status(step="Gather evidence batch 1", status="completed")
update_step_status(step="Gather evidence batch 2", status="in_progress")
delegate_to(agent="LITREVIEW", task=batch_2_task)
```

### Send-Back Protocol

When output is non-compliant:
1. Identify specific failure
2. `send_message` to child (NOT new delegation — child has context)
3. State specific requirement and what is missing
4. Ask for specific remediation

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


**Sequence for Phase 2 (continuation-aware):**

Phase 2 children run under a **40-findings-per-frame budget** defined in `comprev-evidence-gathering`. When a child hits the budget without satisfying saturation or `min_papers_per_cluster`, it returns `continuation_required: true` plus a `search_state_artifact_id`. The coordinator then:

1. If `continuation_required: true`: build a fresh Phase 2 task with a `continuation_state` block carrying `{search_state_artifact_id, evidence_artifact_id, papers_so_far}` and delegate to a new LITREVIEW child. Do NOT `send_message` to the prior child — start a new frame so the budget resets.
2. If `continuation_required: false`: the cluster has terminated legitimately (saturation OR papers target met). Proceed to Phase 2V for that cluster.
3. **Sanity caps:** stop forking continuations for a cluster when `papers_so_far ≥ 2 × min_papers_per_cluster` OR after **6 continuation children** (240 findings ceiling). Log a warning and proceed to Phase 2V with whatever was gathered.
4. **Plan/ledger accounting:** the Phase 2 plan step stays `in_progress` across all continuation children for all clusters in the batch. Mark it `completed` only when every cluster's loop has terminated. Continuation children do NOT each get their own plan step.
5. **Validator timing:** delegate to `comprev-evidence-validator` (Phase 2V) only after every cluster's continuation loop has terminated. The validator sees one merged evidence JSON per cluster and is unaware of continuation.

### Delegation Task Construction (CRITICAL)

Two confirmed failure modes from prior runs require explicit mitigation:

**Failure mode A: Context compaction leaks into task descriptions.**
When the coordinator's context compacts mid-pipeline, the next `delegate_to` call may receive the compaction summary as its `task` parameter instead of the actual Phase instructions. The child agent then gets "This session is being continued from a previous conversation..." as its task.

**Mitigation:** Always build the full task string in a **single python cell** and pass it to `delegate_to` in the **same cell** or the immediately next tool call. Never rely on a task string surviving across multiple tool calls — context compaction can intervene between any two calls.

```python
# CORRECT — task built and used in one cell
task = f"""Execute Phase 7 (Section Drafting) for section {sec_num}.
Skills: comprev-section-writing + comprev-reviewer-agent.
Inputs: {{{{artifact:{evidence_vid}}}}} (evidence package), ..."""
# delegate_to happens in the next tool call with this exact string
```

**Failure mode B: Unresolved f-strings / string interpolation in delegation tasks.**
If the coordinator builds a list of task strings in Python but then references them with `{verifier_tasks[i]}` in a non-f-string, the child receives the literal `{verifier_tasks[i]}` as its task.

**Mitigation:** When batching delegations, build each task string as a complete Python string variable, not an index into a list rendered at call time. Print the first 100 characters of each task string before delegating to confirm it resolved correctly.

```python
# WRONG — the list reference may not resolve
for i in range(8):
    delegate_to(task=f"{verifier_tasks[i]}")  # ← {verifier_tasks[i]} is already
                                                #    inside an f-string, but if the
                                                #    outer string isn't f-prefixed, fails

# CORRECT — explicit variable
for i, task_str in enumerate(verifier_tasks):
    print(f"Delegating batch {i}: {task_str[:80]}...")  # verify it resolved
    delegate_to(agent="LITREVIEW", task=task_str)
```


### Gate Validation Protocol

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
    → Loop until PASS, max 3 iterations, or validator returns
      `FAIL_REQUIRES_USER_SIGNOFF` (then run User Sign-Off, below)
```

**User Sign-Off.** Some validator outcomes cannot be auto-accepted by the coordinator and require explicit user approval. When a gate JSON returns `verdict: "FAIL_REQUIRES_USER_SIGNOFF"` (or sets `user_signoff_required: true`), the coordinator MUST:

1. Pause downstream phases. Do not delegate Phase N+1 until sign-off resolves.
2. Call `ask_user` with the failing-check name, observed value, expected target, and a structured decision panel:
   - **Proceed** — accept the documented exit; record `user_signoff: {decision: "proceed", note: ...}` back into the gate JSON.
   - **Extend** — re-run the actor with relaxed/expanded inputs (e.g., extra snowball rounds for bibliography shortfalls).
   - **Abort** — terminate the pipeline and report the gap.
3. Never edit the gate JSON to flip `verdict` from `FAIL_REQUIRES_USER_SIGNOFF` to `PASS` without recording a `user_signoff` field. The verdict is structural; the override is a separate, audited field.

Canonical triggers (non-exhaustive):
- Phase 2V — `BIBLIOGRAPHY_FLOOR_HARD`: DOI count below `total_bibliography_target` despite saturation, when `bibliography_target_is_hard_floor` is true.
- Phase 5V — any cluster falls below `min_papers_per_cluster` after EXIT 1 (saturation) is invoked.
- Phase 7 — `n_failures > 0` after the maximum configured drafting iterations.
- Phase 8 — critic `iterations >= max_iterations` and `must_fix_count > 0`.

**CRITICAL: The validator MUST be a separate DATAML agent from the actor.** The validator cannot be the same agent that produced the output, and cannot be the coordinator running checks inline. This ensures independence — the validator has no incentive to pass its own work.

**Validator skill assignments:**

| Phase gate | Validator skill | Key checks |
|------------|----------------|------------|
| 1 → 2 | `comprev-scoping-validator` | Phase 1V — review_request, scope schema, plan_content, evidence_parameters validation |
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



### Directive Whitelist

Section-body MyST directives are restricted to a documented whitelist. Section writers (LITREVIEW prose actors at Phase 7) and assemblers (DATAML at Phase 14) may emit only the following block-directive forms inside `content/*.md` body files:

| Directive | Allowed in | Notes |
|---|---|---|
| `:::{figure}` | section bodies | Required `:width:` property; paired with `:::{dropdown} 📓 Figure code` |
| `:::{dropdown}` | section bodies | Auto-injected at Phase 14 to wrap figure code |
| `:::{admonition}` | section bodies | For sidebars / asides only; no `{contents}`, `{toctree}`, or `{include}` aliases |
| `:::{warning}` | section bodies | Same constraints as admonition |
| `:::{authorship-explorer}` | frontmatter only | Plugin-registered |
| `:::{evidence-explorer}` | section bodies | Plugin-registered |

Notably **forbidden** in section bodies (the assembler emits global versions): `:::{contents}`, `:::{toctree}`, `:::{include}`, `:::{tableofcontents}`. These build a per-section TOC that conflicts with the project-level `myst.yml` TOC and pollutes the rendered manuscript.

Phase 7V (`comprev-myst-validator`) and Phase 19V re-runs flag any non-whitelisted directive as `DIRECTIVE_WHITELIST_VIOLATION` and send the section back. Plugin-registered directives MUST also appear in `myst.yml` `project.plugins[]` — `PLUGIN_DIRECTIVES_INVOKED` (Phase 14V) is the dual check that ensures every registered plugin gets used.


## Coordinator Failure Modes

These require active coordinator vigilance. Each maps to specific phase enforcement.

| # | Failure Mode | Caught By | Coordinator Action |
|---|---|---|---|
| 1 | Phase skipping — marking phases complete without work | Gate artifacts, phase ledger | Assert gate exists before advancing |
| 2 | Self-auditing — writers reviewing their own work | Actor-critic frame ID checks | Verify critic IDs ≠ writer IDs after launching |
| 4 | Context compression — losing enforcement rules mid-pipeline | Re-read protocol, session boundaries | `read_file` on orchestrator + plan at every phase boundary |
| 5 | Plan step misassignment — coordinator steps orphaned in plan | Plan excludes coordinator | Plan phases use only DATAML and review agents |
| 6 | Step work displacing orchestration — loops consuming context | DATAML delegation, context budget | No loops in coordinator; delegate all data processing |
| 7 | Stub function definitions — mechanisms defined but never called | Tool-call-based re-reads (not Python functions) | All cross-turn mechanisms use `read_file`, not in-kernel functions |
| 14 | Premature step completion — plan shows "completed" before child returns | Plan Step Status Protocol | `update_step_status("completed")` only after `wait_for_notification` returns + gate passes |
| 15 | Context compaction corrupts delegation task — child gets compaction summary | Delegation Task Construction | Build task string + delegate in same cell; never rely on cross-cell string survival |
| 16 | Unresolved interpolation in delegation task — child gets literal `{var}` | Delegation Task Construction | Verify task string resolves before delegating; use explicit variables, not inline list indexing |
| 17 | Gate bypass — Phase N+1 runs after Phase N gate failed | Gate artifact assertion | `assert gate_passed is True` before any delegation for Phase N+1; never treat gate failure as "soft" |


