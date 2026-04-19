# Citation Fix Execution Protocol

Phase 18 delegation template. Execute citation fixes: replace bib entries, correct claiming sentences, verify replacements against databases.

**Information barrier:** This skill contains ONLY fix execution instructions. You cannot see the verification protocol (Phase 16). You receive structured fix requests and execute them — the verification was done independently.

---

## Phase 18: Fix Execution

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

**Evidence-type matching (MANDATORY for replacement citations):**
When replacing a misattributed citation with a different paper, the
replacement must match the **evidence type** required by the claim:
- An electrophysiology claim ("recordings show...", "AP kinetics", "Rin")
  must be supported by a paper containing patch-clamp or in-vivo
  electrophysiology data — not a transcriptomic or anatomical study.
- A transcriptomic claim ("transcriptomic types are conserved across
  species") must be supported by an RNA-seq study — not a slice
  electrophysiology paper.
- A behavioral claim must cite a behavioral study, a modeling claim must
  cite a computational study, and so on.

Before committing a replacement, check: does the replacement paper contain
the **kind** of data the sentence claims? A paper can be topically related
(same cell type, same species) yet be the wrong evidence type. If no
paper of the correct evidence type is available in the bibliography, flag
the fix as `needs_review` rather than substituting a wrong-type paper.

**SENTENCE CLEANUP AFTER CITATION DELETION (MANDATORY):**
When removing a `{cite:t}` (textual citation), check whether it serves as the
**grammatical subject** of the sentence (e.g., "{cite:t}\`Smith2020\` show that…").
If so, deleting the citation leaves an orphaned predicate with no subject.
You MUST either:
1. Remove the entire sentence/clause that depended on the deleted citation, OR
2. Rewrite the sentence with a different subject.

Never leave fragments like " show, in earlier work, that…" or ", and demonstrate…"
after a deletion. Similarly, when deleting a citation from a comma-separated list,
clean up double commas (`,,`) and orphaned conjunctions (`and show that` with no
preceding subject).

**Citation discipline in fixes:** Any NEW citation introduced as a replacement must have a DOI verified against PubMed, Europe PMC, or CrossRef. Include the DOI comment: `\citep{NewKey} % doi:10.1234/verified`


