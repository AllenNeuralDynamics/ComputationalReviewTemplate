# Computational Review Template

Template repository for producing comprehensive AI-assisted critical literature reviews using the Expert Review Pipeline v25.

## Pipeline Overview

![Expert Review Pipeline v25](figures/fig_methods_pipeline.png)

The pipeline executes 20 phases with **actor-critic separation** — section writers cannot see how they will be critiqued, figure auditors cannot see the argument arc, and citation verifiers cannot see the fix protocol. This prevents agents from gaming evaluation criteria.

## Quick Start

1. **Create a new repo** from this template (Use this template → Create a new repository)
2. **Clone the new repo** and update `myst.yml` with your review title and description
3. **Open in Claude** and provide your review prompt:

```
Start a comprehensive critical literature review titled: "[YOUR TITLE]"

The three files in skills/ define the complete pipeline:

skills/comprev-orchestrator-v25.md — The orchestrator protocol. Read this FIRST.
It defines all 20 phases, the coordinator protocol, gate artifacts, and the plan structure.
Follow it phase by phase.

skills/comprev-reviewer-agent.md — The worker skill for EXPERT agents.
Pass this to every EXPERT delegation so the agent can load it.

skills/comprev-figure-construction.md — Already published as a skill on EXPERT agents.
Section writers load it for figure production.

GitHub Repository: https://github.com/[YOUR-ORG]/[YOUR-REPO]
Push all outputs to this repo in Phase 20.

Table of Contents:
1. Introduction
2. [Your Section 2]
3. [Your Section 3]
...
N. Conclusion
```

4. The pipeline populates `content/`, `evidence/`, `figures/`, and `provenance/`
5. GitHub Actions auto-builds and deploys the MyST site to GitHub Pages

## What's Included

### Skills (17 files in `skills/`)

The pipeline is split into role-specific skills with **information barriers** to enforce actor-critic separation. Worker skills produce content; validator skills run after each phase as blinded gates that emit named pass/fail checks into the gate JSON.

**Worker skills (12):**

| Skill | Phase | Role | Barrier |
|-------|-------|------|---------|
| `comprev-orchestrator-v25` | All | Coordinator | Sees everything |
| `comprev-evidence-gathering` | 2 | EXPERT | Cannot see critic/writing criteria |
| `comprev-scaffold` | 4 | EXPERT | Cannot see critic criteria |
| `comprev-figure-audit` | 6 | EXPERT | Blinded — no scaffold or argument arc |
| `comprev-section-writing` | 7 | EXPERT | Cannot see critic criteria |
| `comprev-critic` | 8, 12 | EXPERT | Blinded — no scaffold or writing template |
| `comprev-integration` | 10–11 | EXPERT | Full visibility (integration role) |
| `comprev-verification` | 15–17 | EXPERT | Cannot see fix protocol |
| `comprev-fix-execution` | 18 | EXPERT | Cannot see verification criteria |
| `comprev-dataml-phases` | 3, 5, 9, 13–15, 17, 19–20 | DATAML | No barriers (mechanical work) |
| `comprev-reviewer-agent` | 2, 4, 6–8, 10–12, 16, 18 | EXPERT | Evidence & writing procedures |
| `comprev-figure-construction` | 7 | EXPERT | Figure production |

**Validator skills (5):**

| Skill | Phase | Role | What it gates |
|-------|-------|------|---------------|
| `comprev-evidence-validator` | 2V, 5V | DATAML | Evidence-package schema, per-cluster coverage, fulltext rate |
| `comprev-curation-validator` | 5V | DATAML | Per-section evidence package size, conflict and figure-data presence |
| `comprev-citation-validator` | 9V | DATAML | BibTeX entry well-formedness, DOI resolution, key uniqueness |
| `comprev-triples-validator` | 15V | DATAML | One triple per `{cite:p}`/`{cite:t}` occurrence, no sampling |
| `comprev-myst-validator` | 7V, 14V, 19V, 20V | DATAML | MyST build, structural checks, figure/heading consistency, plugin-directive invocation, evidence-package population |

### Plugins (4 files in `plugins/`)

| Plugin | What it does |
|--------|-------------|
| `authorship-plugin.mjs` | Renders interactive CRediT authorship widget |
| `evidence-explorer-plugin.mjs` | Loads evidence packages into interactive browser |
| `citation-annotation-plugin.mjs` | Adds CiTO annotation tooltips on citation hover |
| `figure-lightbox-plugin.mjs` | Click-to-zoom lightbox for inline figures |

### Content placeholders (`content/`)

Pre-configured pages that the pipeline populates:
- `00_frontmatter.md` — Abstract + authorship explorer
- `01_introduction.md` — Placeholder (written in Phase 11)
- `M_methods.md` — Methods template with pipeline figure
- `evidence_database.md` — Interactive evidence explorer
- `provenance.md` — Pipeline execution summary

### Site infrastructure

- `myst.yml` — MyST configuration with top-bar navigation (Review | Methods | Evidence | Provenance | GitHub)
- `.github/workflows/deploy.yml` — Auto-builds MyST site and deploys to GitHub Pages
- `scripts/shared_style.py` — Common figure style (colors, fonts, 300 DPI)
- `content/authors.yml` — Author metadata for the authorship widget (extended into `myst.yml`)

## Pipeline Architecture

**Act 1 — Evidence & Infrastructure** (Phases 1–6): Define scope, gather evidence from literature databases (PubMed, OpenAlex, bioRxiv), build citation infrastructure from CrossRef, construct the review scaffold, curate per-section evidence packages, and audit figure comparisons for methodological validity.

**Act 2 — Drafting & Criticism** (Phases 7–13): Draft sections in parallel (max 4 agents), run blinded 6-track criticism, build bibliography from CrossRef, perform 6-pass integration for consistency, write introduction/conclusion/abstract, run blinded bookend critic on intro/conclusion, and generate the methods section.

**Act 3 — Assembly, Verification & Deploy** (Phases 14–20): Assemble the complete document, exhaustively extract citation triples (every citation occurrence), verify ALL citations with full-text-first claim checking (DOI resolution, title/author/metadata match, full-text claim verification with supporting passage audit trail), prepare and execute fixes for non-verified citations, apply fixes, and push to GitHub.

### Key Design Principles

- **Mechanical citation infrastructure**: All citation keys and author names come from CrossRef API — never from LLM memory. This prevents hallucinated references.
- **Actor-critic separation**: Writers don't know how critics will evaluate them. Critics don't know the intended argument. This prevents gaming.
- **Incremental artifact saves**: Agents save intermediate work before expensive operations. If an agent crashes, partial work survives.
- **Max 4 parallel agents**: Prevents system resource exhaustion from too many simultaneous heavy agents.
- **Gate checkpoints**: Each phase transition requires a named gate artifact. The coordinator verifies compliance before advancing.
- **Full-text citation verification**: Every citation-claim pair is verified against the cited paper's full text (not just abstract). VERIFIED status requires a verbatim supporting passage from the paper. This catches interpretive mismatches where the abstract is topically compatible but the paper's findings contradict the review's claim.

## Customization

- **Title and metadata**: Edit `myst.yml` project title, description, and keywords
- **Authors**: Edit `content/authors.yml` to add human contributors alongside the AI author
- **Figure style**: Edit `scripts/shared_style.py` to change colors, fonts, and figure aesthetics
- **Navigation**: The top bar (Review | Methods | Evidence | Provenance | GitHub) is configured in `myst.yml` site.nav

## License

MIT
