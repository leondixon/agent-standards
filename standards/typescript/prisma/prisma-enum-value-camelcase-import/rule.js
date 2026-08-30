const GENERATED_PRISMA_PATH = /(?:^|\/)generated\/prisma(?:\/|$)/;
const PASCAL_CASE = /^[A-Z][A-Za-z0-9]*$/;
const PASCAL_VALUE_ALLOWLIST = new Set(['Prisma', 'PrismaClient']);

function toCamelCase(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function isGeneratedPrismaSource(source) {
  return typeof source === 'string' && GENERATED_PRISMA_PATH.test(source);
}

function isTypeOnlyImportDeclaration(node) {
  return node.importKind === 'type';
}

function isTypeOnlySpecifier(specifier) {
  return specifier.importKind === 'type';
}

function importedName(specifier) {
  if (specifier.imported?.type === 'Identifier') {
    return specifier.imported.name;
  }
  if (typeof specifier.imported?.value === 'string') {
    return specifier.imported.value;
  }
  return undefined;
}

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description:
       'Value imports from generated Prisma must use camelCase locals — Prisma emits PascalCase enum consts.',
    },
    fixable: 'code',
    schema: [],
    messages: {
      camelCaseAlias:
       'Import Prisma value `{{name}}` as camelCase (`{{alias}}`) — keep PascalCase for `import type` only.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      ImportDeclaration(node) {
        if (!isGeneratedPrismaSource(node.source.value)) {
          return;
        }
        if (isTypeOnlyImportDeclaration(node)) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') {
            continue;
          }
          if (isTypeOnlySpecifier(specifier)) {
            continue;
          }

          const name = importedName(specifier);
          const local = specifier.local?.name;
          if (!name || !local || !PASCAL_CASE.test(name)) {
            continue;
          }
          if (PASCAL_VALUE_ALLOWLIST.has(name)) {
            continue;
          }

          const alias = toCamelCase(name);
          if (local === alias) {
            continue;
          }

          context.report({
            node: specifier,
            messageId: 'camelCaseAlias',
            data: { name, alias },
            fix(fixer) {
              const fixes = [];
              if (specifier.imported && specifier.local) {
                if (specifier.imported.range[0] === specifier.local.range[0]) {
                  fixes.push(
                    fixer.replaceText(specifier, `${name} as ${alias}`),
                  );
                }
                else {
                  fixes.push(fixer.replaceText(specifier.local, alias));
                }
              }

              const variable
                = sourceCode.getDeclaredVariables?.(specifier)[0]
                  ?? context.getDeclaredVariables?.(specifier)[0];
              if (variable) {
                for (const reference of variable.references) {
                  if (reference.identifier === specifier.local) {
                    continue;
                  }
                  fixes.push(fixer.replaceText(reference.identifier, alias));
                }
              }

              return fixes;
            },
          });
        }
      },
    };
  },
};
