# Rule schema

Every standard lives in one directory. Consumable artefacts are generated from it,
so prose and enforcement cannot drift.

```
standards/<language>/<preset>/<rule-id>/
├─ rule.md            required — prose + frontmatter
├─ rule.js            optional — ESLint / Oxlint JS-plugin implementation
├─ hook.sh            optional — agent-time nudge
├─ rule.yml           optional — ast-grep rule (Rust)
└─ __fixtures__/      required when rule.js or rule.yml exists
   ├─ valid/*.js      (*.rs for ast-grep rules)
   └─ invalid/*.js
```

Cross-language principles live in `standards/core/<rule-id>/` with a
language-neutral `rule.md` and per-language expressions:

```
standards/core/<rule-id>/
├─ rule.md
└─ languages/
   ├─ typescript.md
   └─ rust.md
```

## Frontmatter

```yaml
---
id: no-type-assertions          # kebab-case, matches directory name
title: No type assertions       # sentence case, used as the H1
layer: any                      # any | backend | frontend | schema | test
presets: [base]                 # which presets include this rule
severity: error                 # error | warn
outputs: [mdc, agents-md, eslint, oxlint, hook]
eslint:                         # only when this rule maps to a lint rule
  rule: ts/consistent-type-assertions
  options: { assertionStyle: never }
oxlint:                         # optional — derived from eslint: when omitted
  rule: typescript/consistent-type-assertions
  options: { assertionStyle: never }
---
```

A Rust rule enforced through Cargo lint levels:

```yaml
---
id: error-handling
title: Propagate errors, never panic
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, cargo-lints, clippy-config]
lints:
  rust:   { unsafe_code: forbid }
  clippy: { pedantic: { level: warn, priority: -1 }, unwrap_used: deny }
  bevy:   { panicking_methods: deny }   # → metadata.bevy_lint
clippy:
  allow-unwrap-in-tests: true
---
```

### Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable identifier. Must equal the directory name. |
| `title` | yes | Human title. Becomes the `.mdc` H1. |
| `layer` | yes | **Semantic** target, never a path. Resolved to globs at sync time from the consuming repo's `.standards/config.json`. |
| `presets` | yes | Presets that install this rule. `base` is always installed. |
| `severity` | yes | Severity in generated ESLint and Oxlint configs. |
| `outputs` | yes | Which artefacts to generate: `mdc`, `agents-md`, `eslint`, `oxlint`, `hook`, `cargo-lints`, `clippy-config`, `ast-grep`. An `eslint` output also writes `.standards/.oxlintrc.json` on sync. |
| `eslint` | no | Maps to an existing lint rule (`rule` + `options`), or set `own: true` when `rule.js` in this directory provides the implementation. |
| `oxlint` | no | Same shape as `eslint`. Own implementations reuse `rule.js` via Oxlint JS plugins. Mapped names such as `ts/foo` become `typescript/foo`. Omit to derive from `eslint`. |
| `lints` | with `cargo-lints` | Lint levels by tool: `rust` (rustc), `clippy`, `bevy` (`bevy_lint`). A level is `allow`, `expect`, `warn`, `deny` or `forbid`, or a map with `level` plus Cargo's other keys (`priority`, `check-cfg`). `bevy` takes a level only — `bevy_lint` has no priority. |
| `clippy` | with `clippy-config` | `clippy.toml` settings, e.g. `allow-unwrap-in-tests: true`. |
| `options` | no | JSON Schema defaults fed to an own-implementation rule. Values sourced from `.standards/config.json` use `$layer` / `$modules` placeholders. |

## Rust outputs

### `cargo-lints`

Cargo only reads lint levels from `Cargo.toml` or rustflags, and rustflags collide
with Bevy's `.cargo/config.toml` and rebuild every dependency on each change. So
sync owns one managed block in the root `Cargo.toml`:

```toml
# >>> standards (managed by `standards sync`)
[lints.clippy]
pedantic = { level = "warn", priority = -1 }
unwrap_used = "deny"

[package.metadata.bevy_lint]
panicking_methods = "deny"
# <<< standards
```

- Only the block is hashed, locked (as `Cargo.toml#standards`), stored as base and
  put in a conflict. Edits anywhere else in the manifest are never drift.
- The first sync appends the block at the end of the file, so no hand-written key
  can fall into its last table.
- A root with `[workspace]` gets `[workspace.lints.*]` and
  `[workspace.metadata.bevy_lint]`; if it is also a `[package]`, the block adds
  `[lints] workspace = true`. Member crates opt in with their own
  `[lints] workspace = true`. Otherwise the block writes `[lints.*]` and
  `[package.metadata.bevy_lint]`.
- Sync stops if the manifest already defines a table the block would define (a
  hand-written `[lints.clippy]`, say), or if two selected rules set one lint to
  different levels. It names the table or both rules.

### `clippy-config`

Every selected rule's `clippy:` map merges into a whole-file `clippy.toml` at the
project root. Two rules giving one key different values is an error.

### `ast-grep`

For checks no compiler lint covers. `rule.yml` is an
[ast-grep rule](https://ast-grep.github.io/reference/rule.html) with
`language: rust`; sync copies it to `.standards/ast-grep/rules/<id>.yml` and writes
`.standards/sgconfig.yml`. Fixtures are required: every `invalid/*.rs` must match
at least once and every `valid/*.rs` never, checked by `ast-grep scan --rule` in
the test suite.

## Layers

A rule declares what kind of code it governs, not where that code sits.

| Layer | Meaning |
|---|---|
| `any` | All source files in the project. |
| `backend` | Server-side request handling and domain logic. |
| `frontend` | UI components and client code. |
| `schema` | Data model definitions (Prisma schema, migrations). |
| `test` | Test files. |

Sync renders each layer to concrete globs using the target repo's layer map. A
repo with no `backend` layer never installs `layer: backend` rules.

## Body

Markdown after the frontmatter. Convention:

1. One-paragraph statement of the rule.
2. `## Prefer` / `## Bad` / `## Good` with short examples.
3. `## Exceptions` when real ones exist.

The body is copied verbatim into `.mdc`. The first paragraph is condensed into
the `AGENTS.md` bullet, so keep it self-contained.
