---
name: resolve-standards-conflicts
description: >-
  Merge coding-standard rules that changed both upstream and locally, after
  `standards sync` reports conflicts. Reads .standards/conflicts.json, performs a
  three-way merge for each rule, writes the merged file, and marks it resolved
  with `standards resolve`. Use when the user says "/resolve-standards-conflicts",
  "resolve standards conflicts", "merge the rule conflicts", or when a sync run
  reports conflicts that need handling.
---

# Resolve standards conflicts

`standards sync` reports a conflict when a rule changed **upstream** and **in this
project** since the last reconcile. Your job is to merge the two, preserving the
project's intent and the upstream improvement.

## 1. Read the conflicts

```sh
cat .standards/conflicts.json
```

Each entry has four fields:

| Field | Meaning |
|---|---|
| `rule` | Rule id, e.g. `no-null` |
| `path` | File to write, e.g. `.cursor/rules/no-null.mdc` |
| `mine` | The project's current file |
| `theirs` | The new upstream rule |
| `base` | The upstream text `mine` was last reconciled against |

`base` makes this a real three-way merge. Diff `base → mine` to see what the
project changed, and `base → theirs` to see what upstream changed. When `base` is
absent the file was never synced cleanly — treat it as two-way and be more careful.

## 2. Merge each conflict

Work one rule at a time. For each:

- **Upstream changed a section the project did not touch** — take upstream's version
- **The project added an exception or example** — keep it, and re-attach it to the
  matching section of the new text rather than appending blindly
- **Both edited the same sentence** — keep the upstream wording and re-apply the
  project's intent on top; upstream phrasing stays consistent across all projects
- **They genuinely contradict** — keep the project's version and note why in the
  summary, since a local override is a deliberate decision

Preserve the frontmatter from `theirs`: `globs` and `alwaysApply` are generated
from the project's layer map and must not be hand-edited.

Never drop a project-specific exception silently. If you cannot place it in the new
structure, keep it under its own `## Exceptions` heading.

## 3. Write and mark resolved

Write the merged content to `path`, then:

```sh
standards resolve <rule-id>
```

That records the merge in `.standards/lock.json` against the upstream text you
merged with, so the rule stays quiet until it changes again. Resolve each rule as
you finish it, not all at the end — a partial run then leaves a correct record.

Verify when done:

```sh
standards check
```

## 4. Report

Summarise per rule in one line each: what upstream changed, what the project kept,
and anything you judged a genuine contradiction. Flag any merge you were unsure
about — a wrong merge to a standard is silently wrong in every file it governs.
