### Resolving standards conflicts

When `standards sync` exits 2, a rule changed both upstream and in this project.
Each entry in `.standards/conflicts.json` names the `rule`, the `path` to write,
and three texts: `mine` (the project's), `theirs` (new upstream) and `base` (the
upstream text `mine` was last reconciled against). Diff `base → mine` for the
project's change and `base → theirs` for upstream's; without `base`, merge
two-way and more carefully.

When the entry has a `region`, the texts cover only the part sync owns: a block
between `>>> standards` and `<<< standards` marker lines in `AGENTS.md` or
`Cargo.toml` — write it back between the same markers, keeping both — or, in
`.claude/settings.json`, the hooks that run a script from `.standards/hooks/`.
Leave the rest of the file alone.

Merge one rule at a time:

- Upstream changed a part the project did not touch: take upstream's version
- The project added an exception or example: keep it, re-attached to the matching
  part of the new text
- Both edited the same sentence: keep upstream's wording and re-apply the
  project's intent on top
- They genuinely contradict: keep the project's version; a local override is a
  deliberate decision

Never drop a project-specific exception silently. After writing each merge, run
`standards resolve <rule>`, then `standards check` once all are done. Report one
line per rule — what upstream changed, what the project kept — and flag any merge
you were unsure about.
