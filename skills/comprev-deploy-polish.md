---
name: comprev-deploy-polish
description: Phase 21 (post-deployment) UX validation skill. Runs after Phase 20 push to main confirms green build. Catches deployment-class defects (per-page rendering, plugin data-binding, figure dropdown completeness, link health, asset paths, frontmatter visibility) that compile-time checks miss. Loaded by a DATAML validator sub-frame; produces gate_phase21_deploy_polish.json and (on FAIL) a structured fix-list returned to coordinator. Coordinator opens at most one targeted fix-loop iteration before final user sign-off.
---

# Deploy Polish — Phase 21 Post-Deployment UX Validation

## Purpose

Phase 20 closes when the MyST build succeeds and the push to `main` is
green. That confirms the manuscript *compiles* — it does **not** confirm
the deployed site *renders correctly* per page. Compile-time checks miss
deployment-class defects: missing plugin data, broken figure dropdowns,
wrong asset paths, leaked frontmatter, unrendered directives that escaped
the source-side directive whitelist. Phase 21 brings these under gate
governance.

Phase 21 is the **only** phase the coordinator may open after Phase 20
PASS. Any further fix-loop iterations require user sign-off via
`ask_user`.

## Loaded by

DATAML validator sub-frame, delegated by the coordinator immediately
after Phase 20 PASS. The actor and validator are the **same** frame for
this phase — there is no separate "actor" producing the deployed site;
the deployed site is the input.

> *"Load `comprev-deploy-polish`. The site is deployed at <url> on
> <repo>. Validate Phase 21 UX checks. Return
> `gate_phase21_deploy_polish.json` + fix-list."*

## Input Acquisition (Tiered)

The validator runs in a network-sandboxed environment and may not be able
to reach the deployed URL directly (private repo, internal domain,
allowlist restriction). Acquire inputs in this order:

1. **Built-Pages-artifact tarball (preferred).** Use `gh api` with the
   project's `GITHUB_TOKEN` to list workflow runs on `main`, find the
   most recent successful Pages-deployment workflow, and download its
   `github-pages` artifact (an `artifact.tar` containing the rendered
   HTML/CSS/JS). Works for private repos. Extract to a temp dir.
   ```bash
   gh api "/repos/$REPO/actions/runs?branch=main&status=success&per_page=5" \
     --jq '.workflow_runs[] | select(.name | test("pages|Pages")) | .id' \
     | head -1 \
     | xargs -I {} gh api "/repos/$REPO/actions/runs/{}/artifacts" \
       --jq '.artifacts[] | select(.name=="github-pages") | .archive_download_url' \
     | xargs -I {} gh api {} > artifact.tar
   ```
2. **Live deploy URL (fallback / for live-only checks).** `curl -sf` the
   URL. If a 401/403/timeout/connection-refused is returned, mark
   `DEPLOY_ACCESSIBLE=false` and downshift live-only checks (see Tier B
   below).
3. **Neither available.** Emit verdict `BLOCKED_DEPLOY_INACCESSIBLE`
   with a manual-checklist artifact (`manual_phase21_checklist.md`) that
   the user runs in their browser; the coordinator escalates via
   `ask_user`.

## Repo & Manifest Inputs

- `myst.yml` (deployed config)
- `manuscript.tex` (compiled artifact, for cross-comparison)
- `provenance/artifact_manifest.json` (for figure VID → file mapping)
- `content/*.md`, `content/*.yml`

## Binary Checks

Each check is tagged **Tier A** (runs against built-artifact tarball; no
live URL needed) or **Tier B** (requires `DEPLOY_ACCESSIBLE=true`).

| Check | Tier | Rule | Pass condition |
|---|---|---|---|
| `BUILD_GREEN_AT_HEAD` | A | `gh run list --branch main --limit 1 --json conclusion` returns `success` for the most recent build of `main`. | Latest build conclusion = `success` |
| `DEPLOY_ARTIFACT_AVAILABLE` | A | At least one of: built-Pages-artifact tarball downloaded successfully, OR live URL returns HTTP 200. | True |
| `PER_PAGE_HTTP_200` | B | Every `content/*.md` rendered to a page returns HTTP 200 from the deployed site. Use `curl -sf -o /dev/null -w "%{http_code}"` on each page URL derived from the MyST TOC. | All pages return 200; zero 4xx/5xx |
| `NO_FRONTMATTER_LEAK` | A | No deployed page contains rendered YAML frontmatter (regex `^---\s*$.*?^---\s*$` in HTML body, or visible `title:` / `subtitle:` lines). | Zero matches |
| `FIGURE_DROPDOWN_COMPLETE` | A | If the site uses a figure-index plugin, the figure dropdown / index page lists every figure declared in `provenance/artifact_manifest.json` with `phase` matching figure-construction. Counts must match. | `len(dropdown_entries) == len(manifest_figures)` |
| `FIGURE_ASSETS_RESOLVE` | A | Every `<img src=...>` in the deployed HTML resolves to a file present in the built-artifact tarball (relative paths) or returns HTTP 200 (absolute URLs, only if Tier B available). | All image paths/URLs resolve |
| `INTERNAL_LINK_HEALTH` | A | Every internal anchor (`#section-id`, cross-section links, `[[wikilink]]` resolutions) resolves to an existing page or anchor in the built-artifact tarball. | Zero broken internal links |
| `EXTERNAL_LINK_HEALTH` | B | Every external `https?://` link in deployed HTML returns 2xx or 3xx (HEAD request, 10s timeout, 1 retry). Soft-fail allowed for known-rate-limited domains (configurable). | ≤2% failure rate excluding allowlisted domains |
| `PLUGIN_DATA_BOUND` | A | If MyST plugins (figure-index, citation-index, glossary) declare data bindings in `myst.yml`, each binding resolves to non-empty data in the built-artifact tarball (rendered HTML inspection). | All declared plugins emit non-empty data |
| `DIRECTIVE_RENDERED_OK` | A | No section page contains an unrendered MyST directive (regex `\{[a-z]+\}` followed by directive syntax, in built HTML body). | Zero unrendered directives |
| `FORBIDDEN_LEXICON_DEPLOYED` | A | Re-run the `FORBIDDEN_LEXICON` glob against the rendered HTML (not just source). Catches cases where the build copied through a stale render. | Zero hits |
| `AUTHOR_IDENTITY_DEPLOYED` | A | Re-run `AUTHOR_IDENTITY_NOT_PLACEHOLDER` against the rendered authors block / about page. | Zero placeholder names |

When `DEPLOY_ACCESSIBLE=false`, every Tier B check is reported as
`BLOCKED_DEPLOY_INACCESSIBLE` (not `FAIL`) — the gate verdict aggregates
to `PASS_WITH_BLOCKED_TIER_B` if all Tier A checks pass, and the manual
checklist artifact lists the Tier B items for the user to verify in
their browser.

## Fix-List Output

On any FAIL, the validator emits a structured fix-list keyed by check:

```json
{
  "gate": "phase_21_deploy_polish",
  "verdict": "PASS | PASS_WITH_BLOCKED_TIER_B | FAIL_REQUIRES_FIX | FAIL_REQUIRES_USER_SIGNOFF | BLOCKED_DEPLOY_INACCESSIBLE",
  "deploy_accessible": true,
  "input_source": "pages_artifact_tarball | live_url | none",
  "checks": { "<CHECK_NAME>": {"verdict": "PASS|FAIL|BLOCKED", "tier": "A|B", "evidence": [...] } },
  "fix_list": [
    {"check": "FIGURE_DROPDOWN_COMPLETE",
     "scope": "myst.yml or figure-index plugin config",
     "missing": ["fig-clusters-3d", "fig-saturation-curve"],
     "remediation": "Add missing figure entries to plugin source array."},
    ...
  ],
  "manual_checklist_artifact_id": "..."  // present when verdict involves BLOCKED Tier B
}
```

## Coordinator Loop Discipline

- The coordinator MAY open **one** targeted fix iteration in response to a
  Phase 21 FAIL. The fix is delegated to a fresh DATAML actor sub-frame
  (not coordinator-as-actor).
- After the fix is applied and pushed, the coordinator re-runs Phase 21
  in a fresh validator sub-frame.
- If the second Phase 21 attempt also FAILs, the coordinator MUST
  escalate via `ask_user` with the residual fix-list. No further
  unsupervised fix loops.
- On `BLOCKED_DEPLOY_INACCESSIBLE` or `PASS_WITH_BLOCKED_TIER_B`, the
  coordinator delivers the manual-checklist artifact to the user via
  `ask_user` and waits for explicit confirmation that Tier B checks
  passed in the user's browser before marking the run complete.
- Every Phase 21 invocation appends a gate JSON to `provenance/`
  and an entry to `provenance/artifact_manifest.json`.

## Outputs

- `provenance/gate_phase21_deploy_polish.json` (verdict + checks)
- (On FAIL → fix → re-validate path) one additional gate JSON per
  iteration, suffixed `_attempt_2`, etc.
- `manual_phase21_checklist.md` (when Tier B blocked)
- Manifest entries for every artifact this phase produces.

## Verdict Semantics

- `PASS` — all checks (Tier A + Tier B) passed. Coordinator marks the
  run complete and notifies the user.
- `PASS_WITH_BLOCKED_TIER_B` — all Tier A passed; Tier B checks blocked
  by deploy inaccessibility. Coordinator delivers manual checklist via
  `ask_user`; user confirmation closes the run.
- `FAIL_REQUIRES_FIX` — at least one Tier A check failed; coordinator
  opens one targeted fix iteration as described above.
- `FAIL_REQUIRES_USER_SIGNOFF` — second attempt also failed; coordinator
  escalates via `ask_user` and does NOT iterate further without
  explicit user direction.
- `BLOCKED_DEPLOY_INACCESSIBLE` — neither built-artifact tarball nor live
  URL was retrievable; no checks could run. Coordinator escalates via
  `ask_user` with the manual checklist.

## Cross-references

- `comprev-orchestrator-v28` §Phase 21 row (Phase Index) — phase wiring + gate transitions
- `comprev-orchestrator-v28` §Directive Whitelist — source-side companion of `DIRECTIVE_RENDERED_OK`
- `comprev-myst-validator` checks #9, #18 — repo-wide forbidden-lexicon and author-identity rules that this phase re-runs against rendered HTML
