# agent-standards

Portable coding standards with one source of truth per rule. Prose, lint rules, and
agent hooks are all generated from the same directory, so they cannot drift apart.

```sh
npx @leondixon/agent-standards init
```

That scaffolds the project and adds itself as a pinned devDependency, so later
syncs are reproducible:

```sh
npx standards sync      # apply rule updates after a version bump
npx standards check     # CI — exits non-zero when out of date
```

Wire the generated ESLint config into your own:

```js
// eslint.config.js
import { standardsConfig } from './.standards/eslint.config.js'

export default standardsConfig
```

## Commands

| Command | Does |
|---|---|
| `init [dir]` | Detect languages and stack, infer a layer map, install everything |
| `sync [dir]` | Add missing rules, update stale ones, prompt on local edits |
| `check [dir]` | Report drift without writing; exits 1 when out of date (CI) |
| `resolve <rule>` | Mark a conflict merged after editing the file |
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

`init` detects every language present and stores them in `.standards/config.json`.
A project can have more than one.

| Marker file | Language |
|---|---|
| `Cargo.toml` | `rust` |
| `package.json` | `typescript` |

Rules are selected in three passes — language, then preset, then layer:

```
standards/core/**          always installed, whatever the languages
standards/<language>/**    every detected language's tree
```

A Rust project installs `standards/core/` plus `standards/rust/`. A repo with both
`Cargo.toml` and `package.json` installs `core`, `rust` **and** `typescript` — each
tree keeps its own rules, and layer globs are the union, so TypeScript rules match
`.ts` files and Rust rules match `.rs` files.

In a polyglot project the shared principles carry both idioms:

```markdown
# Prefer get over find for queries

## In Rust
Applies to functions and module filenames (`get_searches.rs`, …)

## In TypeScript
Applies to functions and module filenames (`get-searches.ts`, …)
```

Single-language projects skip those headings. Edit the `languages` array in
`.standards/config.json` to override the detection.

### Current coverage

| Language | Core | Own rules |
|---|---|---|
| TypeScript | 8 | 38 across 10 presets |
| Rust | 8 | none yet — `standards/rust/` is scaffolding |

A Rust project today gets the 8 cross-language principles with Rust examples, and
nothing more. A Rust + TypeScript repo gets those principles in both idioms, plus
the full TypeScript tree. Rust-specific rules (an `unwrap`/`expect` policy, error handling)
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

Sync appends the expression for each of the project's languages, so the principle
reads in the idiom of the language it lands in. Editing `rule.md` updates every
language at once; a missing expression file falls back to the principle alone.

## Adding a language

1. `mkdir -p standards/<language>/base`
2. Add `standards/<language>/presets.json` with at least `{"base": {"always": true}}`
3. Add a `languages/<language>.md` expression to each rule in `standards/core/`
4. Extend `LANGUAGE_LAYERS` in `packages/cli/src/lib/layers.js` with its layer globs
5. Extend `LANGUAGE_MARKERS` in `packages/cli/src/lib/detect.js` with its marker file

Only step 1 and 2 are required to make the language selectable; the rest improve
what it installs.

## Drift and conflicts

Every file sync writes is recorded in `.standards/lock.json` as two hashes — the
file as it stands, and the upstream text it was reconciled against:

```json
".cursor/rules/no-null.mdc": {
  "local":  "498e953d51112a69",
  "source": "e7ab21768adbd20e"
}
```

Those two are what make each state distinguishable, **per rule**. Bumping a version
only touches rules whose content actually changed; the rest stay silent.

| Your file | Upstream | Result |
|---|---|---|
| untouched | changed | **stale** — applied silently |
| edited | unchanged | **pinned** — left alone |
| edited | changed | **conflict** — needs a merge |

### Resolving a conflict

Sync writes every conflict to `.standards/conflicts.json` and exits `2`:

```
  1 conflict(s) — these rules changed upstream and locally:

    ! no-null

  Run /resolve-standards-conflicts in your agent to merge them,
  or resolve by hand and run standards resolve <rule>.
```

Each conflict carries `mine`, `theirs`, and `base` — the upstream text you last
reconciled against — so the merge is genuinely three-way rather than a guess. The
`resolve-standards-conflicts` skill is installed into the project, so Claude Code
and Cursor pick it up without being told the procedure.

After merging, `standards resolve <rule>` records the merged file against the
upstream text it was merged with. That rule then stays quiet until it changes
again — at which point it conflicts once more, showing only the *new* change.

## Presets

`base` is always installed. The rest are detected from dependencies and can be
opted into early:

`prisma` · `hono` · `react` · `react-query` · `react-hook-form` · `tailwind` ·
`testing` · `zod` · `next`

Presets are scoped to a language, so `hono` only ever applies to TypeScript files.
In a polyglot project each preset is labelled with the language that supplies it.

## Publishing

See [docs/publishing.md](docs/publishing.md) — npm login, the pre-publish check,
version semantics, and CI tokens.

## Tests

```sh
npx vitest run
```

Every ESLint rule ships RuleTester fixtures. Drift-state transitions are covered
directly, since that logic decides whether someone's local edit survives a sync.
