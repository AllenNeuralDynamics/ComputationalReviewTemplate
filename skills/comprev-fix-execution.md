# Citation Fix Execution Protocol

Phase 17 delegation template. Execute citation fixes: replace bib entries, correct claiming sentences, verify replacements against databases.

**Information barrier:** This skill contains ONLY fix execution instructions. You cannot see the verification protocol (Phase 15). You receive structured fix requests and execute them — the verification was done independently.

---

## Phase 17: Fix Execution

**Agent:** LITREVIEW (parallel — one per fix batch)

Two types of fixes, handled differently:

**BIB FIXES (for MINOR and CHIMERIC):**
- Replace the bib entry in the `.bib` file with database-fetched metadata
- Output: `{cite_key, old_bib_entry, new_bib_entry}`
- For CHIMERIC where the paper identity changed: also check if the citing sentence still makes sense and produce a text fix if needed

**TEXT FIXES (for HALLUCINATED and MISATTRIBUTED):**
- Receive ONLY the ±10 line context window around the citation
- For HALLUCINATED: either remove the citation and adjust the sentence, or find a real paper that supports the claim (must be verified against database with valid DOI — do NOT replace one hallucination with another)
- For MISATTRIBUTED: rewrite the claiming sentence to accurately describe what the cited paper actually found
- Must preserve surrounding text exactly — only modify the flagged sentence
- Output: `{cite_key, old_text, new_text, new_bib_entry (if replacement)}`

**Citation discipline in fixes:** Any NEW citation introduced as a replacement must have a DOI verified against PubMed, Europe PMC, or CrossRef. Include the DOI comment: `\citep{NewKey} % doi:10.1234/verified`


