---
id: no-banner-comments
title: No banner comments
layer: any
presets: [base]
severity: error
outputs: [mdc, agents-md, ast-grep]
---

Do not use decorative banner comments (`// ====`, `// ----`, `// ****`, `// ####`) to separate sections. Names and module boundaries should carry the structure.
