# Citation Verification Protocol

Phase 16 delegation template. Verify citation triples: DOI resolution, title match, author match, metadata match, claim verification.

**Information barrier:** This skill contains ONLY verification instructions. You cannot see how citation issues will be fixed (Phases 16-17). Your job is to find problems, not solve them. This separation ensures verification is independent of the fix process.

---

## Phase 16: Citation Verification

**Agent:** LITREVIEW (parallel — one per batch of 18 triples — ALL triples must be verified, no sampling)

**AGENT ENFORCEMENT:** Phase 16 MUST be delegated to LITREVIEW, 
NOT to DATAML. The 5-step verification requires abstract-level semantic checking that 
DATAML cannot perform. A mechanical DOI-exists check is NOT a substitute for verifying 
that the claimed finding actually matches the paper's abstract.


**Delegation template:**

> "For each citation-claim-bib triple below, perform these verification checks **IN ORDER**. Stop at the first failure and report the issue category.
>
> **Step 1 — DOI Resolution:** Look up the DOI from the bib entry. Does it resolve to a real page?
> - If DOI is missing → go to Step 2 using title search instead
> - If DOI returns 404 or error → flag as `BROKEN-DOI`, go to Step 2
> - If DOI resolves → record the title from the resolved page, continue
> - **Preprint DOIs:** DOIs starting with `10.1101/` are bioRxiv or medRxiv preprints; DOIs starting with `10.48550/arXiv.` are arXiv preprints. These are legitimate and resolve via doi.org. If the DOI resolves to a bioRxiv/medRxiv/arXiv page, treat it as valid and continue. Do NOT flag preprints as suspicious solely because they lack journal publication. Note: older arXiv papers may lack DOIs — use the arXiv ID (e.g., `arXiv:2301.12345`) as the identifier instead.
>
> **Step 2 — Title Match:** Compare the bib entry title with the database record (from DOI resolution, or from a PubMed/Europe PMC search by title).
> - **Preprint fallback:** If PubMed returns no result, search Europe PMC (which indexes bioRxiv/medRxiv preprints), bioRxiv API (`api.biorxiv.org/details/biorxiv/{doi}`), and arXiv API (`export.arxiv.org/api/query`) before concluding a paper does not exist. Many recent papers (especially last 1–2 years) may only exist as preprints.
> - If no database record found at all (including preprint servers) → category: **HALLUCINATED**
> - If found but title similarity < 0.5 → category: **CHIMERIC** (The bib says "Paper A" but the DOI points to "Paper B" — this happens when the LLM combines metadata from two papers it partially remembers)
> - If title matches → continue
>
> **Step 3 — Author Match:** Compare bib authors with database-fetched authors.
> - Watch for INJECTED authors (names present in bib but not in the real paper)
> - Watch for MISSING authors (real authors omitted from bib)
> - **Bhatt contamination check:** Specifically scan for "Bhatt" (Dheeraj, Devika, or Mira) appearing as a co-author. This is a known LLM failure pattern — when the model is uncertain about an author list, it frequently injects "Bhatt" as a placeholder or confabulated co-author. If "Bhatt" appears in the bib but NOT in the database-fetched author list → category: **MINOR** (author list corrupted), and replace the ENTIRE author field with the database-fetched version. Do not attempt to fix individual names — replace the whole list.
> - Minor author discrepancies (initials, transliteration) → category: **MINOR**
> - Completely wrong author list → category: **CHIMERIC**
>
> **Step 4 — Metadata Match:** Compare year, journal, volume, pages from bib vs database.
> - Wrong year (off by 1–2) → **MINOR**, provide correct value
> - Wrong journal → **CHIMERIC**
> - Wrong volume/pages → **MINOR**, provide correct values
> - **Preprint metadata:** Preprints have no volume/pages — this is expected, not an error. The "journal" field should be "bioRxiv", "medRxiv", or "arXiv preprint arXiv:XXXX.XXXXX". If the bib entry lists a journal name but the paper is actually a preprint (or vice versa), check whether the preprint has since been published in a journal — if so, update the bib entry to the published version with full metadata.
>
> **Step 5 — Claim Verification (every triple, no tiering):**
>
> **ALL triples receive the full check.** There is no Tier A/B split.
> Every citation-claim pair in the review is verified to the same standard.
> For each triple:
> - **Fetch full text first, abstract as fallback.** Use the full-text
>   retrieval protocol from `comprev-reviewer-agent` (Elsevier API →
>   Springer API → PMC efetch → Europe PMC OA → `fetch_article_fulltext`).
>   If full text is obtained, search it for passages supporting the
>   specific claim. If full text is unavailable, fall back to abstract
>   from PubMed or Europe PMC — but record `verification_depth:
>   "abstract_only"` on that triple (see output schema below).
> - Does the paper (full text or abstract) support the SPECIFIC claim, not just the topic?
>   When full text is available, search for the claim's key terms
>   (method names, cell types, effect directions, numerical values)
>   in the Results and Discussion sections. A claim not findable
>   anywhere in the paper is stronger evidence of misattribution
>   than the same result from an abstract-only check.
> - If the review text includes a NUMBER attributed to this paper
>   (percentage, fold-change, cell count, latency, etc.), is that
>   number present in the abstract? If not → category: **MISATTRIBUTED**
>   (with note: "value not found in abstract")
> - Is the study system correct? ("mouse region-A" in review vs "rat region-B
>   cortex" in abstract → flag)
> - Is the confidence level appropriate? Review says "demonstrated" but
>   abstract says "suggests" or "is consistent with" → category: **MINOR**
>   (overclaimed confidence)
> - **Interpretive-mismatch check (CRITICAL):** Does the cited paper
>   actually advance the specific interpretation the review places on it,
>   or does the review impose a conclusion the authors do not draw?
>   A paper can be topically relevant yet not support the claim as stated.
>   Example failure mode: a paper reports 91% Cre-line specificity
>   (arguing the line is reliable), but the review cites it as evidence
>   that some Cre-captured cells "express the marker only transiently
>   during development" — an interpretation the paper never makes and
>   arguably contradicts. If the paper's data could be reinterpreted
>   to support the claim but the authors do not do so, flag as
>   **MISATTRIBUTED** with note: "review imposes interpretation not
>   advanced by the cited paper."
> - **General-caveat check:** If the claim is a theoretical possibility
>   or general methodological caveat (e.g., "Cre lines can capture
>   transiently expressing cells"), verify that the cited paper actually
>   discusses this caveat — not merely uses the tool in question.
>   Citing a paper that uses a Cre line is not evidence that the line
>   has the caveat. Flag as **MISATTRIBUTED** with note: "paper uses
>   the tool but does not discuss the caveat attributed to it."
> - **Direction check:** Does the review's claim match the direction
>   of the paper's finding? A paper reporting high specificity (positive)
>   cannot support a claim about off-target labeling (negative) unless
>   the paper explicitly discusses the discrepancy. If the abstract argues
>   the opposite direction → category: **MISATTRIBUTED** (with note:
>   "paper argues opposite of the attributed claim")
>
> **Databases to use (in order):**
> 1. CrossRef (primary for DOI resolution — universal across domains)
> 2. **Full-text retrieval** (Elsevier/Springer/PMC/Europe PMC OA/`fetch_article_fulltext` — see `comprev-reviewer-agent` protocol). Full text enables claim verification against the actual paper, not just the abstract.
> 3. Domain-appropriate abstract/metadata database as fallback (e.g., PubMed/Europe PMC for biomedical, ADS for astronomy, DBLP for CS, Semantic Scholar for general)
> 4. Domain-appropriate preprint servers (e.g., bioRxiv/medRxiv for biomedical, arXiv for STEM, SSRN for social sciences)
> 5. arXiv API (`export.arxiv.org/api/query`) for computational, physics, math, and CS preprints
>
> For each triple, return:
> ```json
> {
>   "cite_key": "Smith2022",
>   "category": "VERIFIED | MINOR | CHIMERIC | HALLUCINATED | MISATTRIBUTED",
>   "failed_at_step": null or 1-5,
>   "verification_depth": "fulltext | abstract_only",
>   "supporting_passage": "verbatim sentence(s) from the paper that support the claim (null if MISATTRIBUTED or not found)",
>   "details": "specific description of the issue",
>   "trust_cap_trigger": "none | unsupported_citation | direction_mismatch | contradicted_without_caveat | invented_reference | missing_doi_empirical | overextended_scope",
>   "correct_metadata": {
>     "title": "database-fetched title (if different)",
>     "author": "database-fetched authors (if different)",
>     "journal": "...", "year": "...", "volume": "...", "pages": "...", "doi": "..."
>   },
>   "suggested_action": "description of what should change"
> }
> ```
>
> **Verification depth reporting (MANDATORY):**
> - `fulltext`: full paper text was retrieved and searched. Highest confidence.
> - `abstract_only`: only abstract available. Claim verification is limited —
>   a claim can appear supported by the abstract but contradicted by the
>   paper's actual results or discussion. Flag in the gate summary.
>
> If neither full text nor abstract was retrieved for a triple, the
> triple cannot be verified — categorize as MISATTRIBUTED (or skip with
> a manual-review flag). Do NOT record `verification_depth = "metadata_only"`;
> that value is not allowed.

> **TRUST cap rule (mechanical):**
> - If any triple is flagged with `unsupported_citation`, `direction_mismatch`,
>   `contradicted_without_caveat`, `invented_reference`, `missing_doi_empirical`,
>   or `overextended_scope`, the linked claim's TRUST overall score is capped at 60
>   unless a validator-provided explicit justification is recorded.
> - Writers do not override this cap.
>
> **Supporting passage requirement:** For every VERIFIED triple checked at
> fulltext depth, include the verbatim passage (≤2 sentences) from the
> paper that supports the claim. This creates an auditable evidence chain
> from review claim → cited paper → specific passage. If no supporting
> passage can be found in the full text, the triple cannot be VERIFIED —
> it must be MISATTRIBUTED regardless of whether the abstract seemed
> compatible."

**Contamination confirmation scan (final safety net):**

Run BEFORE per-triple verification on the assembled document:
```bash
grep -in "bhatt" bibliography.bib
grep -oP '\\\\cite[pt]\{Bhatt[^}]*\}' review_document.tex | sort -u
grep -inE "and Bhatt|Bhatt and|Bhatt et al|Bhatt's|, Bhatt,|\(Bhatt|Bhatt [0-9]|De Bhatt|Bhatt colleagues" review_document.tex
```
For each match: verify against CrossRef whether "Bhatt" is a real author on that paper.
- If `crossref_data[doi]['author'][0]['family'].lower() == 'bhatt'` → legitimate, no action.
- If fabricated → pipeline compliance failure. Fix mechanically using author_name_table. Log incident.

In a compliant pipeline run, these scans should return zero fabricated matches. If they return >0, the preventive controls (mechanical cite_key assignment in Phase 2 compliance, author_name_table in Phase 7) failed and the root cause must be investigated before the document is delivered.

> **Note:** "Bhatt" IS a real surname — some matches may be legitimate. Always verify against the database. The diagnostic is: does this person appear in the database-fetched author list for this paper's DOI? If yes → legitimate. If no → contamination.

**Issue category definitions:**

| Category | Meaning | Typical cause |
|---|---|---|
| **VERIFIED** | All 5 steps pass | Paper is correctly cited |
| **MINOR** | Paper is real and correctly identified, but metadata has small errors (wrong year, pages, overclaimed confidence) | LLM approximated metadata instead of looking it up |
| **CHIMERIC** | Bib entry combines metadata from two different papers (e.g., title from Paper A, DOI from Paper B) | LLM merged partial memories of two papers |
| **HALLUCINATED** | Paper does not exist in any database (including bioRxiv, medRxiv, and arXiv) | LLM fabricated the reference entirely |
| **MISATTRIBUTED** | Paper exists and is correctly identified, but the claimed finding is not from this paper | LLM confused which paper showed what |

**FIGURE-LEVEL VERIFICATION (run after per-triple checks):**

In addition to verifying individual citation triples, run one check per multi-source figure in the document:

> "For each figure that plots data from multiple papers on the same axis:
> 1. Extract the metric labels from the axis labels and caption
> 2. Do all plotted values measure the same quantity at the same scope?
> 3. Does the visual presentation (same axis, implied progression or comparison) match what the data actually supports?
> 4. Does the caption adequately note any scope differences?
> 5. Are sample size annotations consistent in definition?
>
> Return:
> ```json
> {
>   "figure_label": "fig:secN-name",
>   "verdict": "VALID | MISLEADING | CAVEAT_MISSING",
>   "issues": ["description of any visual-vs-data mismatches"],
>   "missing_caveats": ["caveats that should be in the caption"]
> }
> ```"

Figures flagged as MISLEADING are added to Phase 17 fix requests as a new category: **FIGURE_MISLEADING**. The fix request includes the specific issue and suggested caption amendment or figure redesign.



