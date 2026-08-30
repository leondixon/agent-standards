---
id: no-backwards-compatibility
title: No backwards-compatibility shims
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md]
---

In a project whose environments are rebuilt on deploy, do not preserve old shapes,
values, or rows. Change the schema, API, and callers to the new shape in one move.

## Do not add

- Migrations that rename or backfill existing enum values or rows purely to keep old data readable
- Old enum members, error codes, or field names kept as aliases beside the new ones
- Dual-read parsers accepting both the old and new payload
- Optional grace windows so in-flight tokens keep working after a field becomes required

## When this does not apply

This rule assumes disposable environments. Once a project holds data you cannot
recreate, a real migration is required and this rule is void — say so explicitly in
the project's config rather than working around it silently.
