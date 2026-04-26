# Section Critic Protocol

Phase 8 delegation template for BLINDED section critics. Evaluate sections for unsupported claims, misrepresented evidence, and ignored counter-evidence.

**Information barrier:** This skill contains ONLY critique instructions. You do NOT receive the scaffold, argument arc, or the writing template that authors followed. You evaluate the section as-is against its evidence package. This blinding is intentional — if you knew the intended argument, you might excuse weaknesses that align with it.

---

## Phase 8: Section Critics

**Agent:** LITREVIEW (parallel — one per 1–2 sections)

**Purpose:** Actor-critic separation for section prose. The Phase 7 agents optimized for narrative coherence. This phase checks whether the prose accurately represents the evidence. Like Phase 6, this uses the same agent type with different inputs and a different objective.

**Critic receives:**
- The section .tex file
- The section evidence package (including conflicts, evidence_gaps, unreplicated_claims)
- Paper abstracts for all papers cited in the section AND all papers in the evidence package (including uncited ones)

**Critic does NOT receive:**
- The scaffold or argument arc
- Other sections
- The section thesis or intended argument

**Conflict Survival Pre-Check (MANDATORY before launching Phase 8 critics):**

Before delegating to the blinded critic, the coordinator runs a mechanical pre-check on each section. This catches blatant conflict suppression cheaply, before spending critic agent tokens:

```python
import re

def conflict_precheck(section_tex, evidence_package):
    """Check that both DOIs from each conflict appear in the section .tex."""
    conflicts = evidence_package.get('conflicts', [])
    if not conflicts:
        return True, []
    
    missing = []
    for conflict in conflicts:
        doi_a = conflict['paper_a_doi']
        doi_b = conflict['paper_b_doi']
        # Map DOIs to cite_keys
        key_a = citation_key_map.get(doi_a, '')
        key_b = citation_key_map.get(doi_b, '')
        
        has_a = key_a and (key_a in section_tex)
        has_b = key_b and (key_b in section_tex)
        
        if not (has_a and has_b):
            missing.append({
                'conflict': conflict['nature_of_conflict'][:100],
                'paper_a': key_a or doi_a,
                'paper_b': key_b or doi_b,
                'a_cited': has_a,
                'b_cited': has_b,
            })
    
    survival_rate = 1 - (len(missing) / len(conflicts))
    return survival_rate >= 0.50, missing

# Run for each section before Phase 8
for sec_num, writer_id in section_to_writer_id.items():
    tex_content = open(f'section_{sec_num:02d}.tex').read()
    passed, missing = conflict_precheck(tex_content, section_packages[sec_num])
    
    if not passed:
        msg = (f"Conflict survival pre-check FAILED: {len(missing)} of "
               f"{len(section_packages[sec_num].get('conflicts', []))} "
               f"conflicts have missing citations. Add both sides:\n")
        for m in missing:
            msg += (f"\n- Conflict: {m['conflict']}\n"
                    f"  Paper A ({m['paper_a']}): {'cited' if m['a_cited'] else 'MISSING'}\n"
                    f"  Paper B ({m['paper_b']}): {'cited' if m['b_cited'] else 'MISSING'}\n")
        send_message(writer_id, msg)
        # Wait for revision before proceeding to Phase 8 for this section
```

**Delegation template:**

> "Read this section and its evidence package. Your job is to find claims in the text that are not supported by the evidence, and evidence in the package that the text misrepresents or ignores. Check six tracks:
>
> **TRACK 1 — Cross-Paper Compositional Claims:**
> Find every sentence that synthesizes, compares, or draws a conclusion across ≥2 papers.
> - Synthesis claims ('Studies A, B, C converge on X'): verify from abstracts that ALL cited papers support X. Flag if any cited paper contradicts or is irrelevant to the claim.
> - Progression claims ('X increased from [value in A] to [value in B]'): verify the values measure the same thing at the same scope and taxonomic level.
> - Contrast claims ('Unlike A, paper B found Y'): verify A actually found not-Y, not just something different.
> - Causal chains ('A established X, which B showed causes Y'): verify B actually builds on A's finding and the causal link is in the papers.
>
> **TRACK 2 — Single-Citation Deep Check:**
> Select the 20 most consequential claims in the section — topic sentences, paragraph conclusions, claims that other claims build on. For each:
> - Does the abstract support the SPECIFIC claim, not just the general topic?
> - Is the study system/scope/experimental context correct?
> - Is the confidence level appropriate? ('established' vs 'suggested' vs 'is consistent with')
> - Are quantitative values attributed correctly?
> - **Interpretive-mismatch:** Does the cited paper actually advance the
>   interpretation the review places on it? A paper can be topically
>   relevant (same tool, same system) yet not support the specific claim.
>   Watch for: review says "Paper X showed Y" when Paper X reported data
>   that the review reinterprets as Y but the paper itself interprets as
>   not-Y or does not discuss Y. This is especially common for
>   methodological caveats (e.g., "some Cre-captured cells may not
>   express the marker in adulthood") attributed to papers that actually
>   argue the tool is reliable. Flag as: "interpretive mismatch —
>   paper supports [actual finding], review attributes [different claim]."
>
> **TRACK 3 — Conflict Survival:**
> The evidence package contains explicit conflicts. For each:
> - Does the section mention both sides?
> - If one side is omitted: flag.
> - If both sides are mentioned but the text presents a contested finding as resolved: flag.
> Also check: are unreplicated_claims presented with appropriate hedging? Are evidence_gaps acknowledged?
>
> **TRACK 4 — Scope Inflation:**
> Find claims that generalize beyond what the cited evidence supports:
> - Scope inflation: 'in [broad domain]' citing only [narrow subdomain] studies
> - System inflation: unqualified claims citing only one study system (species, material, dataset, etc.)
> - Condition inflation: general claims citing only one experimental condition or methodology
> - Type/category inflation: claims about a broad category citing only one specific subtype or variant
> - Temporal inflation: 'established' citing a single unreplicated study
>
> **TRACK 5 — Unused Counter-Evidence:**
> Compare the papers in the evidence package against the papers cited in the section. For the uncited papers:
> - Do any contradict claims made in the section?
> - Do any provide important nuance (different species, region, or result) that the section ignores?
> - Are any replication studies for claims presented as unreplicated?
> Most uncited papers will be confirmatory — only flag those that would change the section's conclusions if included.
>
> **TRACK 6 — Trace-to-Primary-Data (False Consensus Detection):**
> For each major mechanistic claim in the section (e.g., "X targets Y", "A drives B",
> "C mediates D"), ask: is there a paper in the evidence package that **experimentally
> measured** this specific mechanism, or is the claim repeated from reviews/textbooks
> without primary data?
> - Check: does the cited paper contain original experimental data (electrophysiology,
>   imaging, anatomy, etc.) demonstrating the claimed mechanism? Or is it itself a review
>   that repeats the claim without new data?
> - If ALL citations for a mechanistic claim are reviews or secondary sources: flag as
>   `SHOULD_CAVEAT` — "This claim is widely repeated but no primary experimental evidence
>   is cited. Either find the original paper or qualify: 'commonly described as... though
>   the primary experimental demonstration is [cite] / has recently been challenged [cite]'."
> - If the claim is uncited entirely: flag as `MUST_FIX` — "Uncited mechanistic claim.
>   This is the most dangerous failure mode: a 'textbook fact' that may reflect false
>   consensus rather than established evidence."
> - Specifically look for RECENT papers (last 2-3 years) that revise or contradict
>   long-standing mechanistic claims. These are high-value findings for the review.
>
> For each finding, return:
> ```json
> {
>   "track": 1-6,
>   "severity": "MUST_FIX | SHOULD_CAVEAT | MINOR",
>   "location": "subsection or line identifier",
>   "claim_text": "the problematic sentence(s)",
>   "cite_keys_involved": [],
>   "issue": "description of the problem",
>   "evidence": "what the abstracts/evidence package actually say",
>   "suggested_fix": "specific rewrite or caveat language"
> }
> ```
>
> Also return a summary:
> ```json
> {
>   "conflicts_in_package": N,
>   "conflicts_represented_in_text": M,
>   "conflicts_suppressed": N-M,
>   "suppressed_conflicts": [{"paper_a": "", "paper_b": "", "topic": ""}],
>   "papers_in_package": N,
>   "papers_cited": M,
>   "uncited_counter_evidence_count": K
> }
> ```
>
> **Calibration:** Be aggressive on Tracks 3 and 5. A section that presents a clean consensus when the evidence package contains conflicts is MORE problematic than a section with minor imprecisions. Conflict suppression is the most important failure mode to catch."

**Gate:**
- MUST_FIX findings block Phase 9. The section writer (the original Phase 7 actor) receives the findings via `send_message` and must revise. The fix is targeted: provide the specific sentences to change and why, not a request to rewrite the section.
- SHOULD_CAVEAT findings are collected and passed to Phase 10 integration for text amendments during the integration passes.
- MINOR findings are logged in the review metadata but do not block.
- **Conflict survival threshold:** If conflicts_represented / conflicts_in_package < 0.5, send back to the section writer: "More than half the conflicts in your evidence package are absent from the section. The following conflicts must be represented: [list]. Revise to include both sides of each."

**Interaction with Phase 16:** Phase 8 checks whether the text accurately represents the relationship between papers (using abstracts). Phase 16 performs exhaustive full-text verification of every citation-claim pair — checking that each cited paper's actual content supports the specific claim. Both are needed — a claim can pass Phase 8 (abstract seems compatible) and fail Phase 16 (the paper's full text contradicts the claim), or vice versa.

**ACTOR-CRITIC SEPARATION ENFORCEMENT:**

Phase 8 critics MUST be different child frames from Phase 7 section
writers. The coordinator verifies after launching:

```python
for critic_id in phase_4b_critic_ids:
    assert critic_id not in phase_4_writer_ids, \
        f'Critic {critic_id} is the same agent as a section writer — blinding violated'
```

**Figure Caption Mechanical Audit (MANDATORY — runs before the gate artifact is saved):**

Alongside the prose critic, the coordinator runs a regex audit on every figure
directive across the section .md files. This catches four caption-formatting bugs that
appeared in the VIP review and required a late cleanup pass:

```python
import re, pathlib

CAP_RE = re.compile(r':::\{figure\}[^\n]*\n((?::[^\n]+\n)+)([^\n]+)\n:::', re.M)

def audit_figures(md_paths):
    problems = []
    for path in md_paths:
        text = pathlib.Path(path).read_text()
        for m in CAP_RE.finditer(text):
            opts_block, caption_line = m.group(1), m.group(2)
            opts = dict(re.findall(r':([a-z]+):\s*(.*)', opts_block))

            # Bug 1: manual 'Figure N.M' prefix in caption
            if re.match(r'\*\*Figure\s+\d+(\.\d+)?\*\*', caption_line):
                problems.append((path, 'MANUAL_NUMBERING', caption_line[:80]))

            # Bug 2: missing bold title lead
            if not caption_line.lstrip().startswith('**'):
                problems.append((path, 'NO_BOLD_TITLE', caption_line[:80]))

            # Bug 3: both :name: and :label: declared with same value
            if 'name' in opts and 'label' in opts and opts['name'] == opts['label']:
                problems.append((path, 'REDUNDANT_NAME_LABEL', opts.get('label', '')))

            # Bug 4: neither :label: nor :name: (un-referenceable figure)
            if 'name' not in opts and 'label' not in opts:
                problems.append((path, 'NO_ANCHOR', caption_line[:80]))
    return problems
```

If `audit_figures` returns any problems, the coordinator fixes them in-place
(mechanical — does not require critic judgment) before emitting
`gate_critic_complete.json`. These are not claims about evidence; they are
formatting bugs that MyST cannot resolve at build time.

**Heading style audit (MANDATORY mechanical pass — same gate):**

The Phase 8 prose critic CANNOT see across sections, so heading-style consistency
must run as coordinator code (paralleling `audit_figures` above). The audit
catches the cross-section failure mode where one section ships numbered headings
and another ships unnumbered ones, plus four narrower bugs that have shipped to
production reviews.

```python
import re, pathlib

# Lines inside fenced code blocks or :::{...}::: directive blocks must be excluded —
# Python comments (`# panel A`) and ASCII rules look like headings to a naive grep.
_FENCE = re.compile(r"^(`{3,}|~{3,})")
_OPEN  = re.compile(r"^:::\{[a-z]+\}")
_CLOSE = re.compile(r"^:::\s*$")

def _skip_mask(lines):
    """True for lines inside fenced code or :::{}::: blocks."""
    mask = [False] * len(lines)
    in_fence, dir_depth = None, 0
    for i, ln in enumerate(lines):
        f = _FENCE.match(ln)
        if in_fence is None and f:
            in_fence = f.group(1); mask[i] = True; continue
        if in_fence and ln.startswith(in_fence):
            mask[i] = True; in_fence = None; continue
        if in_fence is not None:
            mask[i] = True; continue
        if _OPEN.match(ln):
            dir_depth += 1; mask[i] = True; continue
        if dir_depth and _CLOSE.match(ln):
            dir_depth -= 1; mask[i] = True; continue
        if dir_depth:
            mask[i] = True
    return mask

def audit_headings(md_paths):
    """
    Returns list of (path, type, detail) problems.

    Bug types:
      MANUAL_NUMBER_PREFIX         - heading begins with N. or N.M
      WRAPPED_HEADING              - heading where the next line is non-blank text
                                     (orphaned word that belongs in the heading)
      MULTI_SPACE_AFTER_NUMBER     - 2+ spaces after the number prefix
      INCONSISTENT_DASH            - en-dash or em-dash inside heading text
      MIXED_H1_H2_STYLE            - within a section, H1 numbered XOR H2 numbered
      INCONSISTENT_ACROSS_SECTIONS - body sections do not share one H1 style
    """
    problems = []
    h1_styles = {}

    for path in md_paths:
        text = pathlib.Path(path).read_text()
        lines = text.splitlines()
        skip = _skip_mask(lines)
        h1_numbered = None
        h2_numbered = None

        for i, line in enumerate(lines):
            if skip[i]:
                continue
            m = re.match(r"^(#{1,6})\s+(.*)$", line)
            if not m:
                continue
            level, body = len(m.group(1)), m.group(2)
            stripped = body.rstrip()

            nxt = lines[i + 1] if i + 1 < len(lines) else ""
            if (nxt.strip() and i + 1 < len(skip) and not skip[i + 1] and
                    not nxt.lstrip().startswith(("#", ":", "-", "|", "`", "*", ">", "1.", "2."))):
                problems.append((path, "WRAPPED_HEADING",
                                 f"L{i+1}: {stripped[:70]} -> {nxt[:40]}"))

            num_match = re.match(r"^(\d+(\.\d+)*)\.?\s+", stripped)
            if num_match:
                problems.append((path, "MANUAL_NUMBER_PREFIX",
                                 f"L{i+1} H{level}: {stripped[:70]}"))
                if re.match(r"^\d+(\.\d+)*\.?\s{2,}", stripped):
                    problems.append((path, "MULTI_SPACE_AFTER_NUMBER",
                                     f"L{i+1}: {stripped[:70]}"))

            if "\u2013" in stripped or "\u2014" in stripped:
                problems.append((path, "INCONSISTENT_DASH",
                                 f"L{i+1} H{level}: {stripped[:70]}"))

            if level == 1 and h1_numbered is None:
                h1_numbered = bool(num_match)
                h1_styles[path] = "numbered" if h1_numbered else "unnumbered"
            if level == 2 and h2_numbered is None:
                h2_numbered = bool(num_match)

        if (h1_numbered is not None and h2_numbered is not None
                and h1_numbered != h2_numbered):
            problems.append((path, "MIXED_H1_H2_STYLE",
                             f"H1 {'numbered' if h1_numbered else 'unnumbered'} but H2 {'numbered' if h2_numbered else 'unnumbered'}"))

    body = {p: s for p, s in h1_styles.items()
            if not (str(p).endswith("00_frontmatter.md") or str(p).endswith("Methods.md"))}
    if body and len(set(body.values())) > 1:
        for p, s in body.items():
            problems.append((p, "INCONSISTENT_ACROSS_SECTIONS",
                             f"H1 is {s}; siblings disagree"))

    return problems
```

If `audit_headings` returns any problems the coordinator either auto-strips
manual numbers and dashes (fully mechanical, see Phase 14V validator wiring)
or `send_message`s the writer for a re-roll. As with figures, these are
formatting bugs MyST cannot resolve at build time, so they must be eliminated
before `gate_critic_complete.json` is written.


**Hardcoded cross-reference audit (same gate):** grep each section .md for
`§\d+`, `Section \d+\.\d+`, and `[Ss]ec\.\s*\d+`. Any match in prose (not
inside a code block or dropdown) is a formatting violation: these must be
`{ref}` cross-references with `(label)=` anchors on the target headings.
Flag as MUST_FIX — hardcoded references break on reorder and don't render
as clickable links.

**GATE ARTIFACT:** After all MUST_FIX issues are resolved (via `send_message` back to Phase 7 writers), save `gate_critic_complete.json`:

**MUST_FIX enforcement loop (coordinator executes):**
1. Collect MUST_FIX findings from all critic batches, group by section.
2. For each section with MUST_FIX: `send_message` to original Phase 7 writer with specific findings.
3. Wait for revision. Re-evaluate.
4. Repeat up to 3 iterations. Assert `total_must_fix == 0` before proceeding.

**Citation constraint during MUST_FIX revisions:**
**HARD RULE — Evidence Package Is the Only Source of Truth:**

Writers may ONLY cite papers from their per-section evidence package. Every cite_key they 
use MUST exist in the citation_key_map. There are NO exceptions.

- Writers MUST NOT generate, recall, or invent cite_keys from memory — ever.
- Writers MUST NOT "find more papers" when told a section is below the paper count floor.
- If a section's evidence package has too few papers to meet the floor, the writer reports 
  this back: "Section N has only M papers in the evidence package — below the floor of F."
- The COORDINATOR then runs a **supplementary Phase 2 search** to expand the evidence 
  package for that topic. The supplementary search follows the same Phase 2 protocol 
  (database queries, fulltext retrieval, DOI verification) and produces additional findings.
- The COORDINATOR then runs the new findings through Phase 3 (CrossRef validation) and 
  Phase 5 (curation into the section's evidence package) before sending them to the writer.
- Only AFTER the expanded evidence package is delivered does the writer revise the section.

The same rule applies during MUST_FIX revisions: if a critic says "add counter-evidence" 
or "cite both sides of this conflict" and the papers aren't in the evidence package, the 
writer reports the gap — the coordinator initiates a supplementary search, NOT the writer.

**Why this matters:** Every time a writer generates a citation from memory, it creates a 
hallucination vector. The citation_key_map exists precisely to prevent this. Keys in the map 
are mechanically derived from CrossRef metadata — no LLM involved. Keys from memory are 
unverifiable and frequently contaminated (the "Bhatt" failure mode).

After EACH MUST_FIX revision returns:
1. Extract all cite_keys from the revised .tex and .md files
2. Check every key against the citation_key_map
3. Any key not in the map → send back: "Key [X] not in citation_key_map. Remove it or 
   request a supplementary evidence search."
4. Run Bhatt contamination scan on the revision


**HARD BLOCK — Execute before any Phase 9 delegation:**

**HARD BLOCK:** `assert total_must_fix == 0` before any Phase 9 delegation.

**MANDATORY — Bibliography rebuild trigger:**
If the Phase 8 MUST_FIX loop produced ANY text revisions, Phase 9 MUST re-extract cite_keys 
from ALL section files (not just the original set). The MUST_FIX process may have added new 
citations that need .bib entries.

Gate check before Phase 10: assert orphaned_keys == 0 (cited in .tex/.md but not in .bib).





---


## Red Flags Checklist

The Phase 8 critic must scan each section for these patterns. Any hit is a finding:

- Zero conflicts or caveats in a section
- Clean unanimous narrative
- Replication status never mentioned
- All papers summarized in one sentence
- Most paragraphs discuss exactly one paper (catalog-style)
- Section delivered without figures
- Only conceptual schematics, no cross-study comparisons
- Hard-coded figure numbers instead of \ref{}
- Process language in output

## MUST_FIX Categorisation and Deferral Rule

The critic categorises every issue as `MUST_FIX`, `SHOULD_CAVEAT`, or `MINOR`.
**The Phase 8 → 9 gate fails if any `MUST_FIX` is unaddressed in the next pass.**
Coordinator action: hard block before Phase 9 with `assert total_must_fix == 0` after the
re-pass. Do not advance with deferred MUST_FIX items.

## Conflict Survival Pre-Check

For every section, the critic must verify that `conflicts[]` from the section's
evidence package were addressed in the section text and not silently dropped.
Mechanical pre-check: both DOIs from each conflict entry must appear (as
`{cite:p}` keys) in the section prose. Missing → MUST_FIX with the offending
conflict id and DOIs.

## Phase 12: Bookend Critic

## Bookend Citation Attribution Check (Phase 12)

The Phase 12 bookend critic adds a citation-attribution check: novel
claim-citation pairs in the introduction and conclusion must be verified
against the cited paper's abstract or full text. Inherited pairs (already
verified in Phase 16 for body sections) are skipped. Misattribution — a bib
key attached to a claim it does not support — is `MUST_FIX`.


**Agent:** LITREVIEW (parallel — one for Introduction, one for Conclusion)

**Information barrier:** This skill contains ONLY bookend-critic instructions. The Phase 12 critic is a different child frame from the Phase 11 writer and cannot see the Phase 11 task prompt. This separation ensures the critic evaluates the output independently.

**ACTOR-CRITIC SEPARATION ENFORCEMENT:**

Phase 12 critics MUST be different child frames from the Phase 11 bookend
writer. The coordinator verifies after launching:

```python
for critic_id in phase_12_critic_ids:
    assert critic_id not in phase_11_writer_ids, \
        f'Bookend critic {critic_id} is the same agent as bookend writer — blinding violated'
```

**Critic receives:**
- The section .md file (Introduction or Conclusion)
- Paper abstracts for ALL papers cited in the section
- The body-section summaries that the Phase 11 writer received (so the critic can verify the bookends accurately represent the body)
- The master citation list with per-paper claim summaries from body sections (so the critic can distinguish inherited vs novel claim-citation pairs)

**Critic does NOT receive:**
- The Phase 11 task prompt (blinding)
- Phase 8 critic findings (independence)

**Delegation template:**

> "Read this bookend section (Introduction or Conclusion) and the cited-paper abstracts. Your job is to find claims not supported by the cited evidence. Check three tracks:
>
> **TRACK 1 — Novel Claim-Citation Pairs (CRITICAL):**
> For every `{cite:p}` / `{cite:t}` in the section, check: was this exact
> claim-citation pairing already used in a body section? If so, it was
> validated by Phase 8 — mark as INHERITED and skip.
>
> For each NON-INHERITED pairing (new claim attached to existing citation):
> - Fetch full text using the retrieval protocol from `comprev-reviewer-agent`
>   (Elsevier → Springer → PMC → Europe PMC OA → `fetch_article_fulltext`).
>   Fall back to abstract if full text unavailable.
> - Does the abstract support the SPECIFIC claim, not just the topic?
> - Interpretive-mismatch check: does the paper advance the interpretation
>   the review places on it, or does the review impose a conclusion the
>   authors do not draw? Example: a paper reporting high tool specificity
>   cannot support a claim about tool unreliability unless the paper
>   explicitly discusses the discrepancy.
> - Direction check: does the paper argue in the same direction as the claim?
> - General-caveat check: if the claim is a methodological caveat, does
>   the cited paper actually discuss that caveat — or does it merely use
>   the tool in question?
>
> This is the critical track. Phase 11 can create novel claim-citation
> pairs because it has bibliography access without evidence-package
> constraints. Any claim-citation pair not inherited from the body
> sections must be independently verified here.
>
> **TRACK 2 — Accuracy of Body Summaries:**
> The Introduction and Conclusion summarize the body sections' findings.
> For each summary statement, verify it accurately represents what the
> body section says. Flag if the bookend overstates, understates, or
> misrepresents a body finding.
>
> **TRACK 3 — Scope Inflation:**
> Find claims that generalize beyond what the cited evidence supports:
> - Scope inflation: 'in [broad domain]' citing only [narrow subdomain]
> - System inflation: unqualified claims citing only one study system
> - Temporal inflation: 'established' citing a single unreplicated study
>
> Bookend sections are particularly prone to scope inflation because they
> synthesize across the entire review.
>
> For each finding, return:
> ```json
> {
>   "track": "1-3",
>   "severity": "MUST_FIX | SHOULD_CAVEAT | MINOR",
>   "location": "subsection or line identifier",
>   "claim_text": "the problematic sentence(s)",
>   "cite_keys_involved": [],
>   "issue": "description of the problem",
>   "evidence": "what the abstract actually says",
>   "suggested_fix": "specific rewrite or caveat language"
> }
> ```
>
> Also return a summary:
> ```json
> {
>   "total_citation_pairs": 0,
>   "inherited_pairs": 0,
>   "novel_pairs_checked": 0,
>   "must_fix_count": 0,
>   "should_caveat_count": 0
> }
> ```

**Gate:**
- MUST_FIX findings block Phase 13. The Phase 11 writer receives the findings via `send_message` and must revise.
- SHOULD_CAVEAT findings are logged in the gate artifact.
- Save `gate_bookend_critic.json` with: per-section MUST_FIX count (must be 0), novel pairs checked, findings list.

**HARD BLOCK:** `assert total_must_fix == 0` before any Phase 13 delegation.
