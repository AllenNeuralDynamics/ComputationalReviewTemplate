#!/usr/bin/env python3
"""Audit the template for internal consistency.

    python scripts/check_template_consistency.py

Checks that the repository agrees with itself: skill counts, skills referenced
but absent, orphan skills, README tables and phase columns against the
orchestrator's phase index, gate artifacts named in a skill but not routed,
generation numbers, versioned filenames, and referenced scripts and plugins.

Exit status is non-zero when any check fails. Standard library only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load():
    skills = {p.name[:-3]: p.read_text(encoding="utf-8")
              for p in sorted((ROOT / "skills").glob("*.md"))}
    manifest = json.loads((ROOT / "skills" / "manifest.json").read_text(encoding="utf-8"))
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    return skills, manifest, readme


def phase_index(orchestrator):
    """phase id -> set of skills named in that row."""
    index = {}
    pattern = r"^\|\s*(\d+[A-Za-z]?V?)\s*\|[^|]*\|[^|]*\|([^|]*)\|"
    for m in re.finditer(pattern, orchestrator, re.M):
        for skill in re.findall(r"comprev-[a-z0-9-]+", m.group(2)):
            index.setdefault(skill, set()).add(m.group(1))
    return index


def audit():
    skills, manifest, readme = load()
    orchestrator = skills["comprev-orchestrator"]
    index = phase_index(orchestrator)
    failures = []

    def check(name, ok, detail=""):
        print("  {:34s} {}".format(name, "ok" if ok else "FAIL " + detail))
        if not ok:
            failures.append((name, detail))

    # counts agree across every place that states one
    m = re.search(r"### Skills \((\d+) files", readme)
    worker = re.search(r"\*\*Worker skills \((\d+)\):\*\*", readme)
    validator = re.search(r"\*\*Validator skills \((\d+)\):\*\*", readme)
    counts = {
        "on disk": len(skills),
        "manifest": manifest["skill_count"],
        "README heading": int(m.group(1)) if m else None,
        "README tables": (int(worker.group(1)) + int(validator.group(1))) if worker and validator else None,
    }
    check("SKILL_COUNTS_AGREE", len(set(counts.values())) == 1, str(counts))

    # every skill named anywhere exists, and every skill file is referenced
    named = set()
    for text in list(skills.values()) + [readme]:
        named |= {n.rstrip("-") for n in re.findall(r"\bcomprev-[a-z0-9-]+", text)}
    check("NO_MISSING_SKILLS", not (named - set(skills)), str(sorted(named - set(skills))))
    orphans = [k for k in skills
               if not any(k in v for j, v in skills.items() if j != k) and k not in readme]
    check("NO_ORPHAN_SKILLS", not orphans, str(orphans))

    # README tables list exactly the skills that exist
    rows = dict(re.findall(r"^\|\s*`(comprev-[a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|", readme, re.M))
    check("README_TABLES_COMPLETE", set(rows) == set(skills),
          str(sorted(set(skills) ^ set(rows))))

    # each README phase column overlaps the orchestrator's phase index
    drift = []
    for skill, claim in rows.items():
        listed = index.get(skill)
        if not listed or claim.strip().lower() == "all":
            continue
        claimed = set(re.findall(r"\d+", claim))
        actual = {re.match(r"\d+", p).group() for p in listed}
        if not claimed & actual:
            drift.append((skill, claim.strip(), sorted(actual)))
    check("README_PHASES_MATCH_INDEX", not drift, str(drift))

    # gates: anything a skill names should be routed by the orchestrator
    gates_orc = set(re.findall(r"gate_[a-z0-9_]+\.json", orchestrator))
    gates_other = set()
    for k, v in skills.items():
        if k != "comprev-orchestrator":
            gates_other |= set(re.findall(r"gate_[a-z0-9_]+\.json", v))
    check("GATES_ROUTED", not (gates_other - gates_orc), str(sorted(gates_other - gates_orc)))
    unproduced = sorted(g for g in gates_orc - gates_other)
    check("NO_PHANTOM_GATES", not unproduced, str(unproduced))

    # generation number stated in exactly one place and quoted consistently
    generation = manifest["pipeline_version"]
    prefix = "Expert Review Pipeline v{} (ComputationalReviewTemplate):".format(generation)
    bad = [k for k, v in skills.items() if prefix not in v.split("---")[1]]
    check("DESCRIPTIONS_QUOTE_GENERATION", not bad, str(bad))
    readme_gens = set(re.findall(r"Expert Review Pipeline v(\d+)", readme))
    check("README_GENERATION", readme_gens <= {generation}, str(sorted(readme_gens)))
    check("NO_VERSIONED_FILENAMES", not [k for k in skills if re.search(r"-v\d+$", k)])

    # referenced scripts and plugins exist
    body = readme + "".join(skills.values())
    refs = set(re.findall(r"scripts/([A-Za-z0-9_.-]+\.(?:py|mjs))", body))
    present = {p.name for p in (ROOT / "scripts").glob("*")}
    check("SCRIPTS_EXIST", not (refs - present), str(sorted(refs - present)))
    local_plugins = {p.name for p in (ROOT / "plugins").glob("*.mjs")}
    declared = set(re.findall(r"plugins/([A-Za-z0-9_.-]+\.mjs)", (ROOT / "myst.yml").read_text(encoding="utf-8")))
    check("PLUGINS_DECLARED", not (local_plugins - declared), str(sorted(local_plugins - declared)))

    print("\n{}/{} checks passed".format(12 - len(failures), 12))
    return 1 if failures else 0


if __name__ == "__main__":
    print("Template consistency audit\n")
    sys.exit(audit())
