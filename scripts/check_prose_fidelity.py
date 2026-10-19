#!/usr/bin/env python3
"""Verify that a prose edit changed no evidence.

Compares two versions of review prose and asserts that every citation role,
numeric value and cross-reference survived. Written for restyle passes, where the
wording changes freely and the evidence must not change at all.

    python scripts/check_prose_fidelity.py before.md after.md
    python scripts/check_prose_fidelity.py --self-test

Exit status is 0 only when the two texts carry identical evidence.

Why this file exists. A restyle rewrites every sentence a citation sits in, so the
only thing standing between it and silent evidence loss is this comparison. An
earlier version normalised every dash to a hyphen before extracting signed
numbers, which made it read the en dash in "45-65%" as a minus sign: it raised
three false alarms on a real pass, and -- the reason that mattered -- a comparator
that mangles signs can also miss a sign flip, which would invert an effect
direction without a word of warning. Hence --self-test, which must pass before any
result from this script is trusted.
"""
import argparse
import re
import sys

# Typographic conventions the style standard imposes. A range may be written with
# "to", a hyphen, or an en dash; a negative number may carry a hyphen or a true
# minus. None of those rewrites changes a value, and none may register as a
# difference.
_DASHES = str.maketrans({"\u2212": "-", "\u2013": "-", "\u2014": "-"})
_ROLE = re.compile(r"\{cite:([pt])\}`([^`\n]*)`")
_XREF = re.compile(r"\{(?:numref|ref)\}`([^`\n]*)`")
_NUMBER = re.compile(r"-?\d+(?:\.\d+)?")


def citation_roles(text):
    """Roles as (kind, ordered key tuple), so keys cannot be split or merged."""
    out = []
    for kind, body in _ROLE.findall(text):
        out.append((kind, tuple(k.strip() for k in body.split(",") if k.strip())))
    return sorted(out)


def cross_references(text):
    return sorted(_XREF.findall(text))


def numbers(text):
    """Numeric tokens, with range dashes distinguished from minus signs.

    A dash is a sign only where a value can begin. Between two digits, or after a
    unit marker such as % or a closing parenthesis, it separates a range.
    """
    text = _ROLE.sub(" ", text)
    text = _XREF.sub(" ", text)
    text = text.translate(_DASHES)
    text = re.sub(r"(?<=[\d%\)])\s*-\s*(?=\d)", " to ", text)
    return sorted(_NUMBER.findall(text))


CHECKS = (
    ("citation roles", citation_roles),
    ("numeric values", numbers),
    ("cross-references", cross_references),
)


def compare(before, after):
    """Return a list of (check, missing, added); empty means identical evidence."""
    problems = []
    for name, extract in CHECKS:
        a, b = extract(before), extract(after)
        if a == b:
            continue
        missing = [x for x in a if a.count(x) > b.count(x)]
        added = [x for x in b if b.count(x) > a.count(x)]
        problems.append((name, missing, added))
    return problems


# --------------------------------------------------------------------------
# Self-test. Two halves, and the second is the one that matters: a comparator
# that cannot fail is not evidence. Every corruption below must be caught.
# --------------------------------------------------------------------------

_BASE = (
    "Somatostatin fell 10-fold in frontal cortex {cite:p}`Sathe2020`, and the "
    "transcript fell with it, at log fold-change of -2.2 in precuneus "
    "{cite:p}`Guennewig2021`. Cell counts decreased by 45 to 65% in five of the "
    "11 areas examined {cite:p}`Davies1980, Dawbarn1986`, as {numref}`fig-one` "
    "shows; see {ref}`sec-human-evidence`."
)

_EQUIVALENT = [
    ("range written as an en dash",
     _BASE.replace("45 to 65%", "45\u201365%")),
    ("negative number given a true minus sign",
     _BASE.replace("-2.2", "\u22122.2")),
    ("range already hyphenated, now en dashed",
     _BASE.replace("45 to 65%", "45-65%").replace("45-65%", "45\u201365%")),
    ("sentences split and reordered",
     "Cell counts decreased by 45\u201365% in five of the 11 areas examined "
     "{cite:p}`Davies1980, Dawbarn1986`. Somatostatin fell 10-fold in frontal "
     "cortex {cite:p}`Sathe2020`. The transcript fell with it, at log fold-change "
     "of \u22122.2 in precuneus {cite:p}`Guennewig2021`. See "
     "{ref}`sec-human-evidence` and {numref}`fig-one`."),
    ("material moved into a bullet list",
     "Two platforms agree:\n\n- somatostatin fell 10-fold in frontal cortex "
     "{cite:p}`Sathe2020`\n- the transcript fell with it, at log fold-change of "
     "\u22122.2 in precuneus {cite:p}`Guennewig2021`\n\nCell counts decreased by "
     "45\u201365% in five of the 11 areas examined "
     "{cite:p}`Davies1980, Dawbarn1986`, as {numref}`fig-one` shows; see "
     "{ref}`sec-human-evidence`."),
]

_CORRUPT = [
    ("a citation key dropped",
     _BASE.replace(" {cite:p}`Guennewig2021`", "")),
    ("a citation key substituted",
     _BASE.replace("Sathe2020", "Sathe2021")),
    ("a multi-key role split into two roles",
     _BASE.replace("{cite:p}`Davies1980, Dawbarn1986`",
                   "{cite:p}`Davies1980` {cite:p}`Dawbarn1986`")),
    ("a key added that was not there",
     _BASE.replace("{cite:p}`Sathe2020`", "{cite:p}`Sathe2020, Invented2024`")),
    ("a sign flipped on an effect size",
     _BASE.replace("-2.2", "2.2")),
    ("a value rounded",
     _BASE.replace("-2.2", "-2.0")),
    ("a range endpoint altered",
     _BASE.replace("45 to 65%", "45 to 60%")),
    ("a count altered",
     _BASE.replace("11 areas", "12 areas")),
    ("a cross-reference retargeted",
     _BASE.replace("sec-human-evidence", "sec-introduction")),
    ("a figure reference dropped",
     _BASE.replace(", as {numref}`fig-one` shows", "")),
    ("role kind changed from p to t",
     _BASE.replace("{cite:p}`Sathe2020`", "{cite:t}`Sathe2020`")),
]


def self_test():
    failures = []
    print("Edits that must register as EQUIVALENT:")
    for label, variant in _EQUIVALENT:
        problems = compare(_BASE, variant)
        ok = not problems
        print("  {:48s} {}".format(label, "ok" if ok else "FALSE ALARM"))
        if not ok:
            failures.append((label, "false alarm", problems))
    print("\nCorruptions that must be CAUGHT:")
    for label, variant in _CORRUPT:
        problems = compare(_BASE, variant)
        caught = bool(problems)
        print("  {:48s} {}".format(label, "caught" if caught else "MISSED"))
        if not caught:
            failures.append((label, "missed", []))
    total = len(_EQUIVALENT) + len(_CORRUPT)
    print("\n{}/{} self-test cases behaved correctly".format(total - len(failures), total))
    for label, kind, problems in failures:
        print("  [{}] {} {}".format(kind, label, problems or ""))
    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("before", nargs="?", help="text before the edit")
    ap.add_argument("after", nargs="?", help="text after the edit")
    ap.add_argument("--self-test", action="store_true",
                    help="verify the comparator against known-equivalent and known-corrupt edits")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not (args.before and args.after):
        ap.error("give two files, or --self-test")

    with open(args.before, encoding="utf-8") as fh:
        before = fh.read()
    with open(args.after, encoding="utf-8") as fh:
        after = fh.read()

    problems = compare(before, after)
    for name, extract in CHECKS:
        print("{:18s} {:5d} tokens".format(name, len(extract(before))))
    if not problems:
        print("\nevidence identical: no citation role, numeric value or cross-reference changed")
        return 0
    print("\nEVIDENCE CHANGED ({} check(s) failed):".format(len(problems)))
    for name, missing, added in problems:
        print("  {}:".format(name))
        for x in missing[:20]:
            print("    lost:  {}".format(x))
        for x in added[:20]:
            print("    added: {}".format(x))
    return 1


if __name__ == "__main__":
    sys.exit(main())
