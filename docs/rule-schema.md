# Rule schema

Every standard lives in one directory. Consumable artefacts are generated from it,
so prose and enforcement cannot drift.

```
standards/<language>/<preset>/<rule-id>/
├─ rule.md            required — prose + frontmatter
├─ rule.js            optional — ESLint implementation
├─ hook.sh            optional — agent-time nudge
└─ __fixtures__/      required when rule.js exists
   ├─ valid/*.js
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
outputs: [mdc, agents-md, eslint, hook]
eslint:                         # only when this rule maps to a lint rule
  rule: ts/consistent-type-assertions
  options: { assertionStyle: never }
---
```

### Fields

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | Stable identifier. Must equal the directory name. |
| `title` | yes | Human title. Becomes the `.mdc` H1. |
| `layer` | yes | **Semantic** target, never a path. Resolved to globs at sync time from the consuming repo's `.standards/config.json`. |
| `presets` | yes | Presets that install this rule. `base` is always installed. |
| `severity` | yes | Severity in generated ESLint config. |
| `outputs` | yes | Which artefacts to generate. |
| `eslint` | no | Maps to an existing lint rule (`rule` + `options`), or set `own: true` when `rule.js` in this directory provides the implementation. |
| `options` | no | JSON Schema defaults fed to an own-implementation rule. Values sourced from `.standards/config.json` use `$layer` / `$modules` placeholders. |

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
