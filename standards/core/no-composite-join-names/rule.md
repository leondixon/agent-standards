---
id: no-composite-join-names
title: No composite join names
layer: any
presets: [base]
severity: warn
outputs: [mdc, agents-md, hook]
---

Do not name types, functions, or modules `*With*` when the name only means
"entity plus joined relation". Those names describe query mechanics, not a domain
concept, and they multiply as joins change.

## Prefer, in order

1. **Inferred return types** — put the join on the query; do not export a composite alias for its shape
2. **A domain name** — when the join *is* a concept (`AuthorizedUser`, `OrderDetail`), name it that
3. **Split collaborators** — separate query from projection when the read shape differs from the domain record
4. **Boundary mapping** — map to the response shape inline; type what you return, not the join

## Exceptions

- Third-party and product APIs (`signInWithGoogle`)
- Builder locals (`schemaWithRefinements`)
- Test helpers (`renderWithProvider`, `passWithNoTests`)
- Unrelated English "with" phrases (`formatWithSlashes`, `applicantWithoutName`)
