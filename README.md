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
| `build` | Regenerate the ESLint plugin after adding or changing rules |

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

## Languages

A project has exactly one language, detected at `init` and stored in
`.standards/config.json`:

| Marker file | Language |
|---|---|
| `Cargo.toml` | `rust` |
| `package.json` | `typescript` |

Rules are then selected in three passes — language, then preset, then layer:

```
standards/core/**          always installed, whatever the language
standards/<language>/**    only the detected language's tree
```

So a Rust project installs `standards/core/` plus `standards/rust/`, and never
sees a TypeScript rule. Change the `language` field in `.standards/config.json` to
override the detection.

> A repo containing both `Cargo.toml` and `package.json` resolves to `rust` and
> installs nothing from the TypeScript tree. Run the CLI against each package
> directory separately, or set `language` by hand.

### Current coverage

| Language | Core | Own rules |
|---|---|---|
| TypeScript | 8 | 38 across 10 presets |
| Rust | 8 | none yet — `standards/rust/` is scaffolding |

A Rust project today gets the 8 cross-language principles with Rust examples, and
nothing more. Rust-specific rules (an `unwrap`/`expect` policy, error handling)
have no TypeScript analogue and are not written yet.

### Cross-language principles

Rules under `standards/core/` are language-neutral: the principle is written once,
with per-language expression files supplying the examples.

```
standards/core/prefer-get-over-find/
├─ rule.md                 the principle
└─ languages/
   ├─ typescript.md        getAccounts, get-accounts.ts
   └─ rust.md              get_accounts, get_accounts.rs
```

Sync appends the expression matching the project's language, so the same principle
reads in the idiom of the language it lands in. Editing `rule.md` updates every
language at once; a missing expression file falls back to the principle alone.

## Adding a language

1. `mkdir -p standards/<language>/base`
2. Add `standards/<language>/presets.json` with at least `{"base": {"always": true}}`
3. Add a `languages/<language>.md` expression to each rule in `standards/core/`
4. Extend `LANGUAGE_LAYERS` in `packages/cli/src/lib/layers.js` with its layer globs
5. Extend `detectLanguage` in `packages/cli/src/lib/detect.js` with its marker file

Only step 1 and 2 are required to make the language selectable; the rest improve
what it installs.

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
