# agent-standards

Portable coding standards with one source of truth per rule. Prose, lint rules
(ESLint and Oxlint for TypeScript; Cargo lint levels, Clippy and ast-grep for
Rust), and agent hooks are all generated from the same directory, so they cannot
drift apart.

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

Oxlint gets the same rules. Own implementations load through Oxlint's JS plugin
API; mapped ESLint rules become native Oxlint rules (`ts/…` → `typescript/…`).
The generated file only enables standards rules — it does not change Oxlint's
default categories:

```json
// .oxlintrc.json
{
  "extends": ["./.standards/.oxlintrc.json"]
}
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
├─ rule.js            optional ESLint / Oxlint implementation
├─ hook.sh            optional agent-time nudge
├─ rule.yml           optional ast-grep rule (Rust)
└─ __fixtures__/      valid/ + invalid/
```

From that, sync generates `.cursor/rules/*.mdc`, an `AGENTS.md` section, a flat
ESLint config, an Oxlint config, and hook wiring for both Cursor and Claude Code.
For Rust it also writes a managed lint block in `Cargo.toml`, a `clippy.toml`,
ast-grep rules, and a quality gate that runs when the agent stops — see
[Rust](#rust).

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
`.ts` files and Rust rules match `.rs` files. An id both trees define, such as
`no-banner-comments`, gets one rule file per language
(`no-banner-comments-rust.mdc`, `no-banner-comments-typescript.mdc`).

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
| Rust | 8 | 12 across 2 presets (`base`, `bevy`) |

A Rust project gets the 8 cross-language principles with Rust examples, plus:

| Rule | Enforced by |
|---|---|
| `strict-clippy` | Clippy `pedantic` at warn, priority -1 |
| `no-lint-suppression` | `allow_attributes`, `allow_attributes_without_reason` — exceptions are `#[expect(lint, reason = "…")]` |
| `error-handling` | `unwrap_used`, `expect_used`, `panic`, `map_err_ignore`, `let_underscore_must_use`; allowed in tests via `clippy.toml` |
| `no-debug-leftovers` | `dbg_macro`, `todo`, `unimplemented`; `print_stdout`, `print_stderr` at warn |
| `no-unsafe-code` | rustc `unsafe_code` forbid |
| `no-deprecated-apis` | rustc `deprecated` deny |
| `no-lossy-casts` | the `cast_*` lints, except `cast_precision_loss` |
| `no-banner-comments` | ast-grep |
| `private-submodules` | ast-grep: `pub mod` only in `src/lib.rs` |
| `bevy-system-params` | allows `needless_pass_by_value`, `too_many_arguments`, `type_complexity` |
| `bevy-fallible-systems` | `bevy_lint` `panicking_methods` deny |
| `bevy-lints` | `bevy_lint` `pedantic` and `missing_reflect` at warn |

TypeScript rules deliberately not translated to Rust:

| Rule | Why not |
|---|---|
| `no-null` | Rust has no null; `Option` already is the single absent value |
| `no-single-property-params` | Rust has no object-param idiom to police |
| `no-handler-response-type`, `no-to-response-helper` | Backend handler rules; there is no Rust web preset (such as axum) yet |
| `no-result-type` | Folded into `error-handling`: use `Result`/`Option`, never an `{ ok, error }` struct |
| `no-type-assertions` | Becomes `no-lossy-casts`, the Rust cast that silently changes a value |
| `no-cross-module-deep-import` | Becomes `private-submodules` |

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

## Rust

A Rust rule enforces itself in one of three ways, chosen by the cheapest tool that
can see the problem:

| Output | Lands in | Use for |
|---|---|---|
| `cargo-lints` | managed block in `Cargo.toml` | rustc, Clippy and `bevy_lint` lint levels |
| `clippy-config` | `clippy.toml` | Clippy settings such as `allow-unwrap-in-tests` |
| `ast-grep` | `.standards/ast-grep/rules/` | syntactic checks no lint covers |

Lint levels go in `Cargo.toml` rather than rustflags: rustflags collide with
Bevy's `.cargo/config.toml` and rebuild every dependency whenever they change.
Sync owns only the block between these markers and leaves the rest of the
manifest alone:

```toml
# >>> standards (managed by `standards sync`)
…
# <<< standards
```

In a workspace, the block sets `[workspace.lints.*]`; each member crate opts in
with `[lints] workspace = true`. Sync refuses to write a table the manifest
already defines — move a hand-written `[lints.clippy]` into a rule instead.

### When checks run

- **After each edit** — `.standards/hooks/ast-grep.sh` scans the edited `.rs` file
  with the ast-grep rules only. It is fast enough to run on every edit.
- **When the agent stops** — `.standards/hooks/rust-gate.sh`, registered as a
  Claude Code `Stop` hook and a Cursor `stop` hook, runs in order and stops at the
  first failure:
  1. `cargo fmt --all --check`
  2. `cargo clippy --workspace --all-targets -- -D warnings`
  3. `ast-grep scan -c .standards/sgconfig.yml`
  4. `bevy lint`, with the `bevy` preset; any warning fails
  5. `cargo nextest run --workspace`
  6. `cargo machete`
  7. `typos`

  The gate skips when no `.rs` file or `Cargo.toml` has changed. A failure sends
  the agent back to work with the output: exit 2 and stderr for Claude Code, a
  `followup_message` for Cursor.

The gate treats a missing tool as a failure and prints how to install it:

```sh
rustup component add rustfmt clippy
cargo install ast-grep cargo-nextest cargo-machete typos-cli --locked
# bevy preset only
cargo install --git https://github.com/TheBevyFlock/bevy_cli --tag cli-v0.1.0-alpha.2 --locked bevy_cli
bevy lint install v0.6.0
```

## Adding a language

1. `mkdir -p standards/<language>/base`
2. Add `standards/<language>/presets.json` with at least `{"base": {"always": true}}`
3. Add a `languages/<language>.md` expression to each rule in `standards/core/`
4. Extend `LANGUAGE_LAYERS` in `packages/cli/src/lib/layers.js` with its layer globs
5. Extend `LANGUAGE_MARKERS` in `packages/cli/src/lib/detect.js` with its marker file
6. Teach `detectDependencies` in `packages/cli/src/lib/detect.js` to read its
   manifest, so presets can be detected (Rust reads `Cargo.toml`)
7. Give its rules an enforcement output. Prefer the language's own lint
   configuration, the way Rust uses `cargo-lints`; add a region-managed artefact
   when that configuration lives in a file the project also edits by hand

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

A managed block inside a larger file is tracked on its own, keyed as
`Cargo.toml#standards`: only the block is hashed, and a conflict carries only the
block.

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

TypeScript: `prisma` · `hono` · `react` · `react-query` · `react-hook-form` ·
`tailwind` · `testing` · `zod` · `next`

Rust: `bevy`

TypeScript presets are detected from `package.json`; Rust presets from the
`[dependencies]`, `[dev-dependencies]` and `[workspace.dependencies]` of the root
`Cargo.toml`.

Presets are scoped to a language, so `hono` only ever applies to TypeScript files.
In a polyglot project each preset is labelled with the language that supplies it.

## Publishing

See [docs/publishing.md](docs/publishing.md) — npm login, the pre-publish check,
version semantics, and CI tokens.

## Tests

```sh
npx vitest run
```

Every ESLint rule ships RuleTester fixtures, and every ast-grep rule's fixtures run
through `ast-grep scan`. Drift-state transitions are covered
directly, since that logic decides whether someone's local edit survives a sync.
