# agent-standards

Portable coding standards with one source of truth per rule. Prose, lint rules, and
agent hooks are all generated from the same directory, so they cannot drift apart.

```sh
node packages/cli/src/index.js init ~/code/my-project
```

## Commands

| Command | Does |
|---|---|
| `init [dir]` | Detect language and stack, infer a layer map, install everything |
| `sync [dir]` | Add missing rules, update stale ones, prompt on local edits |
| `check [dir]` | Report drift without writing; exits 1 when out of date (CI) |
| `list` | Show every rule in the source |

## How a rule is stored

One directory per standard. See [docs/rule-schema.md](docs/rule-schema.md).

```
standards/typescript/base/no-type-assertions/
├─ rule.md            prose + frontmatter — the source of truth
├─ rule.js            optional ESLint implementation
├─ hook.sh            optional agent-time nudge
└─ __fixtures__/      valid/ + invalid/
```

From that, sync generates `.cursor/rules/*.mdc`, an `AGENTS.md` section, a flat
ESLint config, and hook wiring for both Cursor and Claude Code.

## Layers, not paths

A rule declares *what kind of code* it governs — `any`, `backend`, `frontend`,
`schema`, `test` — never a path. Each project maps those layers to its own globs in
`.standards/config.json`, so the same rule works in a single-package repo and a
monorepo. A project with no `backend` layer never installs backend rules.

## Cross-language principles

Rules under `standards/core/` are language-neutral: the principle is written once,
with per-language expression files supplying examples and enforcement.

```
standards/core/prefer-get-over-find/
├─ rule.md
└─ languages/
   ├─ typescript.md
   └─ rust.md
```

Editing the principle updates every language at once.

## Drift

`init` records a hash of every file it writes. On later syncs:

- **unchanged** files update silently
- **locally edited** files stop and show a diff — keep mine, take theirs, or skip
- **kept** edits are pinned and stay quiet until the upstream rule changes, then ask again

## Presets

`base` is always installed. The rest are detected from dependencies and can be
opted into early:

`prisma` · `hono` · `react` · `react-query` · `react-hook-form` · `tailwind` ·
`testing` · `zod` · `next`

## Tests

```sh
npx vitest run
```

Every ESLint rule ships RuleTester fixtures. Drift-state transitions are covered
directly, since that logic decides whether someone's local edit survives a sync.
