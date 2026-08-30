#!/usr/bin/env node
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const filePath = process.argv[2];
if (!filePath || !fs.existsSync(filePath)) {
  process.stdout.write('[]\n');
  process.exit(0);
}

const resolveFrom = (startDir, request) => {
  let dir = startDir;
  while (true) {
    try {
      return createRequire(path.join(dir, 'package.json')).resolve(request);
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
};

const fileDir = path.dirname(path.resolve(filePath));
const typescriptEntry = resolveFrom(fileDir, 'typescript');
if (!typescriptEntry) {
  process.stdout.write('[]\n');
  process.exit(0);
}

const ts = createRequire(typescriptEntry)(typescriptEntry);
const absoluteFile = path.resolve(filePath);

const findTsconfigDir = (startDir) => {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'tsconfig.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
};

const tsconfigDir = findTsconfigDir(fileDir);
let options = {
  strict: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  noEmit: true,
  skipLibCheck: false,
  jsx: ts.JsxEmit.ReactJSX,
};
if (tsconfigDir) {
  const configPath = path.join(tsconfigDir, 'tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (!configFile.error) {
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      tsconfigDir,
      undefined,
      configPath,
    );
    options = { ...parsed.options, noEmit: true, skipLibCheck: false };
  }
}

const program = ts.createProgram({ rootNames: [absoluteFile], options });
const sourceFile = program.getSourceFile(absoluteFile);
if (!sourceFile) {
  process.stdout.write('[]\n');
  process.exit(0);
}

const checker = program.getTypeChecker();

const deprecatedTagText = (symbol) => {
  if (!symbol) return null;
  const resolved
    = symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const tag = resolved
    .getJsDocTags()
    .find(entry => entry.name === 'deprecated');
  if (!tag) return null;
  return (tag.text ?? []).map(part => part.text).join('').trim() || 'deprecated';
};

const deprecatedJsDocAt = (start) => {
  let best = null;
  const visit = (node) => {
    if (start >= node.getStart(sourceFile) && start < node.getEnd()) {
      const target = ts.isCallExpression(node)
        ? node.expression
        : ts.isPropertyAccessExpression(node) || ts.isIdentifier(node)
          ? node
          : null;
      if (target) {
        const symbol = checker.getSymbolAtLocation(
          ts.isPropertyAccessExpression(target) && !ts.isCallExpression(node)
            ? target.name
            : target,
        );
        const text = deprecatedTagText(symbol);
        if (text) best = text;
      }
      ts.forEachChild(node, visit);
    }
  };
  visit(sourceFile);
  return best;
};

const propertySymbolFromType = (type, name) => {
  const direct = type.getProperty(name);
  if (direct) return direct;
  if (type.isUnionOrIntersection()) {
    for (const member of type.types) {
      const found = propertySymbolFromType(member, name);
      if (found) return found;
    }
  }
  return undefined;
};

const findings = [];
const seen = new Set();

const addFinding = (start, message) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(start);
  const snippet = sourceFile.text
    .slice(
      sourceFile.getPositionOfLineAndCharacter(line, 0),
      sourceFile.getLineEndOfPosition(start),
    )
    .trim();
  const key = `${line + 1}:${character + 1}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push({
    line: line + 1,
    column: character + 1,
    message,
    snippet,
  });
};

for (const diagnostic of program.getSuggestionDiagnostics(sourceFile)) {
  if (!diagnostic.reportsDeprecated || diagnostic.start === undefined) continue;

  const jsdoc = deprecatedJsDocAt(diagnostic.start);
  const message = (jsdoc
    || ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
  ).split('\n')[0];

  addFinding(diagnostic.start, message);
}

const visitObjectLiterals = (node) => {
  if (ts.isObjectLiteralExpression(node)) {
    const contextualType = checker.getContextualType(node);
    if (contextualType) {
      for (const property of node.properties) {
        if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property)) {
          continue;
        }
        if (!ts.isIdentifier(property.name)) continue;

        const symbol = propertySymbolFromType(contextualType, property.name.text);
        const message = deprecatedTagText(symbol);
        if (message) {
          addFinding(property.name.getStart(sourceFile), message);
        }
      }
    }
  }
  ts.forEachChild(node, visitObjectLiterals);
};

visitObjectLiterals(sourceFile);

process.stdout.write(`${JSON.stringify(findings)}\n`);
