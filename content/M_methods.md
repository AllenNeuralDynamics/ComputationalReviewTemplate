(sec-methods)=
# Methods

:::{figure} ../figures/fig_methods_pipeline.png
:label: fig-methods-pipeline
:width: 100%

Overview of the 20-phase Expert Review Pipeline v25. Green boxes indicate EXPERT agents (scientific judgment), blue boxes indicate DATAML agents (mechanical work), and the gray box is the coordinator. Red dashed lines mark information barriers where actor-critic separation is enforced. Orange diamonds indicate gate checkpoints where the coordinator verifies compliance before advancing.
:::


This review was produced through a structured, multi-phase computational pipeline. All claims in this section are derived from recorded pipeline metadata and gate artifacts; no post-hoc characterizations have been added.

(sec-methods-search)=
## M.1 Search Strategy

Literature searches were conducted across four databases: **PubMed**, **Europe PMC**, **OpenAlex**, and **bioRxiv**. Searches were organized around topic clusters defined in the scope document, each corresponding to a body section of the review:

| Cluster | Topic | Papers Retrieved | Full-Text Obtained |
|---------|-------|------------------|-------------------|
| 1 | [PIPELINE FILLS THIS] | — | — |
| **Total** | | **—** | **—** |

Paper counts above are pre-deduplication totals across all clusters.

(sec-methods-inclusion)=
## M.2 Inclusion and Exclusion Criteria

The scope document specified the following inclusion criteria:

- **Target corpus size:** [PIPELINE FILLS THIS] unique papers across all evidence clusters.
- **Full-text target:** ≥50% of all retrieved papers.
- **Per-section minimum:** [PIPELINE FILLS THIS] papers per major topic cluster.
- **Citation density target:** ≥4.0 citations per synthesis paragraph.
- **Figure requirement:** ≥2 figures per section, with ≥1 cross-study comparison per section.

Papers were excluded if they did not address the review topic or related circuit mechanisms. Preprint–journal duplicate pairs were resolved during integration by replacing preprints with their published journal versions where identified.

(sec-methods-retrieval)=
## M.3 Full-Text Retrieval

Full-text retrieval was attempted for all retrieved papers using open-access sources (Unpaywall, Semantic Scholar, PubMed Central), publisher APIs (Elsevier, Springer Nature), and institutional proxy access. The overall full-text retrieval rate was **[PIPELINE FILLS THIS]**.

(sec-methods-extraction)=
## M.4 Evidence Extraction

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
## M.5 Citation Verification

[PIPELINE FILLS THIS — citation verification results from Phase 16]

(sec-methods-pipeline)=
## M.6 Pipeline Execution

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
| 13–19 | Remaining phases | Pending | — |

(sec-methods-figures)=
## M.7 Figure Reproducibility

[PIPELINE FILLS THIS — figure reproducibility details from pipeline execution]

Figure generation notebooks are preserved in `figures/notebooks/` and can be re-executed against the archived evidence packages to reproduce all figures.

(sec-methods-skills)=
## M.8 Pipeline Skills

The full pipeline is encoded as twelve version-controlled skill files committed to
this repository under [`skills/`](./skills). Each skill is a markdown specification
that was loaded by the relevant agent at the relevant phase — re-running a phase
from scratch requires only the skill plus the upstream artifacts. Information
barriers are enforced by *omission*: writer agents cannot see critic rubrics,
figure auditors cannot see the argument arc, and citation verifiers cannot see the
fix protocol.

| Skill | Role | Phase(s) |
|---|---|---|
| `comprev-orchestrator-v25.md` | Coordinator protocol governing phase DAG, delegation, and gate artifacts | 0–19 (all) |
| `comprev-evidence-gathering.md` | Worker protocol for EXPERT evidence-gathering frames (one per topic cluster) | 2 |
| `comprev-reviewer-agent.md` | Universal EXPERT core — how to evaluate literature and write review prose | 2, 7, 10, 11, 12 |
| `comprev-scaffold.md` | Scaffold construction: argument arc, section plans, figure specs, style guide | 4 |
| `comprev-figure-construction.md` | Worker skill for producing publication-quality figures from `figure_data` JSON | 6–7 |
| `comprev-figure-audit.md` | Blinded figure-auditor protocol — cross-study comparison validity | 6 |
| `comprev-section-writing.md` | Writer protocol: MyST formatting, citation discipline, synthesis rules | 7 |
| `comprev-critic.md` | Blinded section-critic protocol — unsupported claims, misrepresented evidence | 8, 12 |
| `comprev-integration.md` | Cross-section integration passes; Introduction, Conclusion, and Abstract drafting | 10, 11 |
| `comprev-verification.md` | Citation-triple verification against CrossRef and full-text sources | 14–16 |
| `comprev-fix-execution.md` | Fix-application protocol: replace bib entries, correct claim sentences | 17–18 |
| `comprev-dataml-phases.md` | Worker protocol for DATAML agents — citation infrastructure, BibTeX, CrossRef | 3, 5, 13, 15, 19 |

To re-run this pipeline against a different topic, clone the
[ComputationalReviewTemplate](https://github.com/AllenNeuralDynamics/ComputationalReviewTemplate)
repository (which ships these same twelve skills), update `myst.yml` with a new title
and table of contents, and issue a single coordinator prompt — the orchestrator skill
then drives all twenty phases to completion.

(sec-methods-reproducibility)=
## M.9 Reproducibility Statement

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
