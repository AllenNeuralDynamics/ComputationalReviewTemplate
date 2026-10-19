---
name: comprev-writing-style
description: "Expert Review Pipeline v30 (ComputationalReviewTemplate): Writing Style — prose rules for review sections. Loaded by LITREVIEW writers at Phases 7 and 11. Applied as a standard by the critics at Phases 8 and 12 and by the fix executor at Phase 18."
---

# Writing Style — Prose Rules for Review Sections

**Purpose:** make independently written sections read as one review, without
diluting what makes them worth reading — every claim tied to a source sentence, every
caveat stated where the claim is made.

These rules are the standard. Where general writing advice disagrees with a rule here,
follow the rule here.

## The one thing this skill will not do

It will not shorten prose by removing qualification. A sentence that reports a finding
and the reason the finding is uncertain is doing this review's central job. Where
conventional advice to simplify collides with a stated caveat, **the caveat wins**.
Deleting a caveat is a defect rather than a style improvement. The Phase 8 critic treats
it as one.

## A. Order of argument: state the finding, then question it

Let a finding stand before you doubt it. Give the positive claim its own sentence and its own
paragraph. Present the evidence. Only then raise what the evidence cannot settle.

**Weak opening** — doubt bundled into the claim, before the reader knows what is doubted:

> Almost all of the field evidence linking soil carbon to tillage regime is evidence about a
> bulk pool, not about the microbial biomass that turns it over.

**Strong opening** — the finding, in eight words, with the doubt deferred:

> Reduced tillage raises soil carbon.

The doubt then lands as its own move, after the evidence has stood up:

> What none of these measurements does is weigh a microbe.

This is an ordering rule, not a sentence rule. A paragraph can open on a claim and still
get the order wrong.

## B. One move per paragraph

A paragraph makes one move: states a finding, presents a body of evidence, raises a
problem, or resolves one. When the move changes, the paragraph ends.

A 300-word paragraph usually holds four moves: the claim, the evidence that supports it,
the convergent work that makes it plausible, and what none of it establishes. Split into
four paragraphs, each move becomes visible, and an over-long sentence inside one of them
becomes obvious.

## C. Enumerations are lists. Write them as lists.

When three or more items are parallel, use a bullet list. Do not write a list as a
comma series inside a sentence.

This is the most frequent prose defect in agent-written reviews. The construction is a
bullet list with its bullets deleted, and it survives an instruction to write "prose only",
because forbidding the list does not remove the enumeration — it hides it. Expect to write
one without noticing.

**Flattened** (four items, no main verb, 46 words):

> Candidate fixes - draw worked examples from a field the review does not cover, mark
> examples as structural with phrasing explicitly out of scope, give two or three
> alternative repairs per rule so there is no single attractor, and have the critic
> measure cross-section phrase overlap.

**Restored:**

> Four fixes are candidates:
> - draw worked examples from a field the review does not cover
> - mark examples as structural, with phrasing out of scope
> - give two or three alternative repairs per rule, so no single phrasing attracts
> - have the critic measure cross-section phrase overlap

A sentence is a disguised list when **three or more of its comma-separated segments each
begin with a verb**. Two parallel items are prose; three are a list.

The test is grammatical, not punctuational. Counting commas instead flags ordinary
constructions that are not lists at all, and does so constantly:

| Not a list | Why it looks like one |
|---|---|
| The two criteria in use, reconstructed axonal morphology and retrograde labelling from layer 1, are different operational definitions, and they have not been applied to the same cells | an apposition with a trailing clause |
| Carbon stocks are lower under conventional tillage and under bare fallow, although among the measured depth intervals only the topsoil difference reached significance | a subordinate clause after the comma |
| A halving of cell number came with p = 0.0066, t = 3.640, df = 8 and no per-group size | a statistics series |
| Under no-till 17.5 g/kg, and 16.4 g/kg where residue was removed, against 23.1 g/kg in the reference plots | a value comparison |

Counting commas alone flags appositions, subordinate clauses, statistics series and value
comparisons at a far higher rate than it flags real lists. A check at that precision teaches
writers to ignore it, and the one real instance goes with the rest.

## D. After splitting, restore the relation

Splitting sentences destroys the logical relations that semicolons and appositives were
carrying. Restore them with an explicit connective — `Indeed`, `In fact`, `In addition`,
`But`, `So` — placed at the front of the sentence whose relation needs marking.

This contradicts advice to strip such connectives as markers of machine prose. Follow
this skill: unmarked juxtaposition of short sentences leaves the reader to reconstruct
the argument, and in dense evidence they will not.

A connective is not a transition for its own sake. If you cannot name the relation it
marks, the sentence does not need one.

## E. One idea per sentence — cited or not

A sentence carries one idea. Two citations supporting the *same* claim stay together;
two findings do not.

The count is of ideas, not of citations. An uncited sentence asserting four things is
the more common failure and no citation-based check will see it.

The diagnostic is not word count. A sentence is too long when it offers more candidates
for the emphatic final slot than the slot can hold. One finding with its caveat has one
candidate and may run to forty words.

**Before** — four findings, each with its own caveat, chained into one sentence:

> Baseline measurements complicate both accounts: mean respiration in the no-till plots does
> not differ from the reference, though that value is tabulated inside a study whose reported
> measurements are from an adjacent site and whose sampling depth is not stated
> {cite:p}`KeyA2019`, enzyme activity is altered in a substrate-specific direction, with
> cellulase reduced in the surface horizon {cite:p}`KeyB2020`; aggregate-size distribution
> shifts between fractions, although the reported change is shared by treated and untreated
> plots rather than being treatment-specific {cite:p}`KeyC2021`; and in one simulation a
> gradual decline in effective turnover rate is the form that progressive carbon loss would
> take {cite:p}`KeyD2022`.

**After** — one finding per sentence, every caveat intact, nothing shortened:

> Baseline measurements complicate both accounts. Mean respiration in the no-till plots does
> not differ from the reference — though that value is tabulated inside a study whose reported
> measurements come from an adjacent site, and which does not state its sampling depth
> {cite:p}`KeyA2019`. Enzyme activity is altered in a substrate-specific direction, with
> cellulase reduced in the surface horizon {cite:p}`KeyB2020`. Aggregate-size distribution
> shifts between fractions, but treated and untreated plots share the change, so it is not
> treatment-specific {cite:p}`KeyC2021`. In one simulation, a gradual decline in effective
> turnover rate is the form progressive carbon loss would take {cite:p}`KeyD2022`.

Note what did **not** happen: no caveat was shortened, no number moved, no citation was
merged. The sentences carrying a finding plus its caveat still run to thirty or forty words,
and should.

**Rhythm.** Vary length deliberately: a paragraph of uniform 20-word sentences has no
emphasis, because a short sentence takes its force from contrast with longer neighbours.
"None of these measurements weighs a microbe" carries because its neighbours do not. Do not
treat "at least one short sentence" as a quota of one.

**Do not glue the pieces back together.** Two bad repairs follow splitting:

| Glue | Repair |
|---|---|
| comma splice — "Biomass moves with it, respiration ranking fourth among measured fluxes" | "Biomass moves with it. Respiration ranked fourth among the measured fluxes." |
| absolute participial — "Neither deficit tracked severity, the reduction holding at p < 0.05" | "Neither deficit tracked severity. The reduction held at p < 0.05." |

## F. End on the finding; let the citation follow

The reader takes the end of a sentence as the point. State the finding, the number or the
qualification last. Let the citation sit after it as a closing token.

Ending on a citation is normal. Ending on *nothing but* a citation is the fault: delete
the citation role and read the last four words aloud. If they are filler — "as has been
described", "in that study" — the sentence has no stress position and must be rebuilt.

A sentence must also end on the claim it opened with. A second, different finding bolted
to the end displaces the point and belongs in its own sentence, or nowhere.

## G. Subjects name agents; verbs carry the action

| Nominalised | Agent and action |
|---|---|
| a 10-fold reduction of microbial biomass was observed in the topsoil | microbial biomass fell 10-fold in the topsoil |
| the correlate of the peptide deficit is fibre plexuses distorted and thinned | the deficit sits in the fibre plexuses, not in the cell bodies |

Technical nouns naming real entities — `immunoreactivity`, `density`, `stereology` — are
not nominalisations. The target is a verb hidden inside a noun.

A clause may open a sentence where the emphasis earns it. "What none of these measurements
does is weigh a microbe" earns it: the cleft puts the whole weight on the final three words.

What goes wrong is not the clause but the delay: in "That both cerebrospinal-fluid deficits
are uncoupled from dementia severity further loosens the inference", the main verb arrives
twelve words in and the reader holds an unresolved clause until it does. No mechanical rule
separates that from "That finding has not been replicated", which is ordinary English, so
this is a judgement for the critic and not a check.

## H. Write about the literature, never about this review's retrieval

Body prose makes claims about the published record. It never describes how this review
obtained its material. This is the most common way a pipeline-written review leaks its own
construction into its findings.

Banned in body prose:

```
retrieved here        not retrieved by these searches     read here
available as full text    at abstract level only          abstract-only
in this literature        reaches this literature         the retrieved text
retrieval depth is recorded for    N of M findings        one dominant full-text index
```

Three cases, treated differently:

1. **The limitation belongs to the paper.** State it as such. "The paper does not state
   whether these are counts or densities" is a claim about the source, and publishable.
2. **The limitation belongs to this review's search.** Do not convert it into a claim about the
   literature — failing to find a primary report is not evidence that none exists.
   Downgrade the claim it qualifies, or drop the claim.
3. **Aggregate coverage statistics** — how many findings were full text, which index was
   searched, whether citation chasing ran — belong in Methods and the provenance page.

The epistemic honesty these phrasings reach for is right and must survive. It survives by
hedging the claim, not by narrating the process.

## I. Vocabulary and typography

`rather than` is precise, and it becomes a tic through repetition. Vary it: `and not`,
`instead of`, `in place of`, or a full stop and a new sentence. The same applies to any
construction you find yourself reaching for in consecutive paragraphs.

One convention per document, enforced as a post-check rather than by the writer:

- `±` for dispersion, never `+/-`
- `−` for negative numbers, never a hyphen
- `—` for a parenthetical dash, never ` - `
- `–` for ranges: `30–76%`, `layers II–III`

## Using the examples

The examples above show **structure, not wording**. Do not reuse their phrasing.

Worked examples drive compliance and identical phrasing in the same breath: writers given a
shared standard converge on its example sentences, and parallel sections carrying the same
borrowed phrase read as a tic. If a sentence of yours matches an example here, rewrite it.

## Verifying that an edit changed no evidence

Any pass that rewrites existing prose — a restyle, a fix round, a critic remediation — must
prove it changed no evidence. Run `scripts/check_prose_fidelity.py before after`. It compares
citation roles as ordered key tuples, so a multi-key role cannot be split or merged; numeric
values, with range dashes distinguished from minus signs; and cross-reference targets.

**Trust it only after `--self-test` passes.** The self-test pairs edits that must register
as equivalent — a range rewritten as an en dash, a negative number given a true minus sign,
material moved into a bullet list — against corruptions that must be caught, including a
flipped sign, a rounded value, a split multi-key role and a retargeted cross-reference.

The self-test is not optional ceremony. A comparator that normalises every dash to a hyphen
before extracting signed numbers will read the en dash in `45-65%` as a minus sign — and the
mirror of that error is the dangerous one: the same comparator can call `-2.2` and `2.2`
equal, inverting an effect direction with no warning. A checker that has never been shown to
fail is not evidence.

## What the critic checks

| Rule | Check | Verdict |
|---|---|---|
| A | The section states each finding before raising what it cannot settle | editorial |
| B | No paragraph makes two moves | editorial |
| C | No sentence has three or more comma-separated segments that each begin with a verb | mechanical, **hard fail** |
| D | Every short-sentence run has its relations marked | editorial |
| E | No sentence carries two distinct findings; none exceeds 45 words | mechanical |
| E | Sentence lengths vary; not every sentence sits within 5 words of the mean | mechanical |
| E | No comma splices, no absolute participials | editorial |
| F | No sentence ends on a citation preceded by filler | editorial |
| G | A clause-opening sentence reaches its main verb without stranding the reader | editorial |
| H | Zero banned retrieval phrases in body prose | mechanical, **hard fail** |
| I | Zero `+/-`, ` - ` as dash, hyphen as minus | mechanical, post-check |
| all | Every cite key, numeric value and cross-reference present before an edit is present after, by `scripts/check_prose_fidelity.py` | mechanical, **hard fail** |
| all | No sentence matches a worked example in this skill | mechanical |

The last two rows govern the others. A rewrite that improves any metric while dropping a
key, a number, or a caveat is rejected.
