(sec-methods)=
# Methods

:::{figure} ../figures/fig_methods_pipeline.png
:label: fig-methods-pipeline
:width: 100%

Overview of the 20-phase Expert Review Pipeline v27. Green boxes indicate LITREVIEW agents (scientific judgment), blue boxes indicate DATAML agents (mechanical work), and the gray box is the coordinator. Red dashed lines mark information barriers where actor-critic separation is enforced. Orange diamonds indicate gate checkpoints where the coordinator verifies compliance before advancing.
:::


This review was produced through a structured, multi-phase computational pipeline. All claims in this section are derived from recorded pipeline metadata and gate artifacts; no post-hoc characterizations have been added.

(sec-methods-review-request)=
## Review Request

This review was initiated by a single user request that fixed the topic, scope, and high-level argument arc. The full text of that request is preserved verbatim in [`provenance/review_request.md`](../provenance/review_request.md) and quoted below. Phase 1 (Scope and Thesis) translated this request into the structured `gate_scope.json` (title, audience, target paper count, cluster definitions, and table of contents) that drove all subsequent phases.

```{include} ../provenance/review_request.md
:start-after: ## Verbatim user prompt
:end-before: ## Editorial note
```

(sec-methods-search)=
## Search Strategy

Literature searches were conducted across four databases: **PubMed**, **Europe PMC**, **OpenAlex**, and **bioRxiv**. Searches were organized around topic clusters defined in the scope document, each corresponding to a body section of the review:

| Cluster | Topic | Papers Retrieved | Full-Text Obtained |
|---------|-------|------------------|-------------------|
| 1 | [PIPELINE FILLS THIS] | — | — |
| **Total** | | **—** | **—** |

Paper counts above are pre-deduplication totals across all clusters.

(sec-methods-inclusion)=
## Inclusion and Exclusion Criteria

The scope document specified the following inclusion criteria:

- **Target corpus size:** [PIPELINE FILLS THIS] unique papers across all evidence clusters.
- **Full-text target:** ≥50% of all retrieved papers.
- **Per-section minimum:** [PIPELINE FILLS THIS] papers per major topic cluster.
- **Citation density target:** ≥4.0 citations per synthesis paragraph.
- **Figure requirement:** ≥2 figures per section, with ≥1 cross-study comparison per section.

Papers were excluded if they did not address the review topic or related circuit mechanisms. Preprint–journal duplicate pairs were resolved during integration by replacing preprints with their published journal versions where identified.

(sec-methods-retrieval)=
## Full-Text Retrieval

Full-text retrieval was attempted for all retrieved papers using open-access sources (Unpaywall, Semantic Scholar, PubMed Central), publisher APIs (Elsevier, Springer Nature), and institutional proxy access. The overall full-text retrieval rate was **[PIPELINE FILLS THIS]**.

(sec-methods-extraction)=
## Evidence Extraction

Structured evidence extraction was performed for each cluster, producing evidence packages containing:

- **Findings:** Quantitative and qualitative claims extracted from each paper.
- **Conflicts:** Contradictions or disagreements between studies on the same topic.
- **Figure comparisons:** Cross-study data comparisons suitable for figure generation.
- **Research gaps:** Identified areas lacking sufficient evidence.

| Metric | Count |
|--------|-------|
| Total findings | [PIPELINE FILLS THIS] |
| Total conflicts | [PIPELINE FILLS THIS] |
| Total figure comparisons | [PIPELINE FILLS THIS] |

Each evidence package was stored as a versioned artifact linked to its cluster, enabling traceability from any claim in the review back to its source evidence.

(sec-methods-citation-verification)=
## Citation Verification

[PIPELINE FILLS THIS — citation verification results from Phase 16]

(sec-methods-pipeline)=
## Pipeline Execution

The review was produced through a 20-phase pipeline. Key execution metadata from completed phases:

| Phase | Description | Status | Key Outputs |
|-------|-------------|--------|-------------|
| 1 | Scope definition | Pending | — |
| 2 | Evidence gathering & compliance | Pending | — |
| 3 | Deduplication & conflict resolution | Pending | — |
| 4 | Scaffold approval | Pending | — |
| 5 | Figure comparison design | Pending | — |
| 6 | Figure audit | Pending | — |
| 7 | Section drafting | Pending | — |
| 8 | Critic review | Pending | — |
| 9 | Bibliography assembly | Pending | — |
| 10 | Integration | Pending | — |
| 11 | Introduction & Conclusion | Pending | — |
| 12 | Bookend Critic | Pending | — |
| 13 | Methods | Pending | — |
| 14–20 | Remaining phases | Pending | — |

(sec-methods-figures)=
## Figure Reproducibility

[PIPELINE FILLS THIS — figure reproducibility details from pipeline execution]

Figure generation notebooks are preserved in `figures/notebooks/` and can be re-executed against the archived evidence packages to reproduce all figures.

(sec-methods-skills)=
## Pipeline Skills

The full pipeline is encoded as nineteen version-controlled skill files committed
to this repository under [`skills/`](./skills): thirteen worker skills that produce
content and six validator skills that gate each phase with named pass/fail checks.
Each skill is a markdown specification that was loaded by the relevant agent at the
relevant phase — re-running a phase from scratch requires only the skill plus the
upstream artifacts. Information barriers are enforced by *omission*: writer agents
cannot see critic rubrics, figure auditors cannot see the argument arc, and
citation verifiers cannot see the fix protocol. Validator skills are loaded only
by their gate frames and never by the actor frames they evaluate.

| Skill | Role | Phase(s) |
|---|---|---|
| `comprev-orchestrator-v27.md` | Coordinator protocol governing phase routing, delegation, and gate artifacts | 0–20 (all) |
| `comprev-scoping.md` | Worker protocol for LITREVIEW scoping: clusters, sections, length targets, evidence parameters, plan content | 1 |
| `comprev-evidence-gathering.md` | Worker protocol for LITREVIEW evidence-gathering frames (one per topic cluster) | 2 |
| `comprev-reviewer-agent.md` | Universal LITREVIEW core — how to evaluate literature and write review prose | 2, 4, 6–8, 10–12, 16, 18 |
| `comprev-scaffold.md` | Scaffold construction: argument arc, section plans, figure specs, style guide | 4 |
| `comprev-figure-construction.md` | Worker skill for producing publication-quality figures from `figure_data` JSON | 6–7 |
| `comprev-figure-audit.md` | Blinded figure-auditor protocol — cross-study comparison validity | 6 |
| `comprev-section-writing.md` | Writer protocol: MyST formatting, citation discipline, synthesis rules | 7 |
| `comprev-critic.md` | Blinded section-critic protocol — unsupported claims, misrepresented evidence | 8, 12 |
| `comprev-integration.md` | Cross-section integration passes; Introduction, Conclusion, and Abstract drafting | 10, 11 |
| `comprev-verification.md` | Citation-triple verification against CrossRef and full-text sources | 15–17 |
| `comprev-fix-execution.md` | Fix-application protocol: replace bib entries, correct claim sentences | 18 |
| `comprev-dataml-phases.md` | Worker protocol for DATAML agents — Phase 1 materialisation, citation infrastructure, BibTeX, CrossRef | 1, 3, 5, 9, 13–15, 17, 19–20 |
| `comprev-scoping-validator.md` | Phase 1 scope JSON, evidence-parameters consistency, plan structure, prompt-verbatim provenance gate | 1V |
| `comprev-evidence-validator.md` | Evidence-package schema and coverage gate | 2V, 5V |
| `comprev-curation-validator.md` | Per-section evidence package size and content gate | 5V |
| `comprev-citation-validator.md` | BibTeX well-formedness, DOI resolution, key-uniqueness gate | 9V |
| `comprev-triples-validator.md` | Citation-triples extraction-completeness gate | 15V |
| `comprev-myst-validator.md` | MyST build, structural, figure, heading, plugin-directive, and evidence-population gate | 7V, 14V, 19V, 20V |

To re-run this pipeline against a different topic, clone the
[ComputationalReviewTemplate](https://github.com/AllenNeuralDynamics/ComputationalReviewTemplate)
repository (which ships these same nineteen skills), update `myst.yml` with a new title
and table of contents, and issue a single coordinator prompt — the orchestrator skill
then drives all twenty phases to completion.

(sec-methods-reproducibility)=
## Reproducibility Statement

All pipeline artifacts are preserved and versioned, enabling full reproduction of this review:

- **Scope document:** Defines the topic clusters, inclusion criteria, and structural targets.
- **Evidence packages:** Cluster-level evidence JSONs containing all extracted findings, conflicts, figure comparisons, and research gaps.
- **Figure audit:** Gate artifact recording all figure comparison dispositions with verdicts and caveats.
- **Section drafts:** Body sections with citations.
- **Critic reports:** Reports documenting MUST_FIX, SHOULD_CAVEAT, and SUGGESTION items.
- **Bibliography:** Validated BibTeX entries with full DOI traceability.
- **Integration log:** Tracked changes including orphan citation removal, terminology standardization, and structural fixes.
- **Phase ledger:** Records the status and gate artifact for each of the 20 pipeline phases.

The pipeline used no manual curation steps. All evidence extraction, section drafting, critic review, and integration were performed computationally, with gate artifacts serving as checkpoints between phases.
