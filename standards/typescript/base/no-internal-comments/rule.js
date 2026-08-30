/**
 * Flag comments that explain WHAT instead of naming:
 *  1. Leading `//` or `/* *\/` blocks above any declaration (including exports).
 *  2. Trailing `//` end-of-line comments.
 * Pragmas (`eslint-*`, `oxlint-*`, `@ts-*`, `biome-ignore`, `prettier-ignore`) are ignored.
 */
const PRAGMA_RE = /^(eslint-|oxlint-|@ts-|biome-ignore|prettier-ignore)/;

function isPragma(value) {
  return PRAGMA_RE.test(value.trim());
}

function findNextSubstantiveLine(sourceCode, afterLine) {
  const lines = sourceCode.lines;
  for (let i = afterLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    return { line, lineNumber: i + 1 };
  }
  return null;
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
       'Leading comments above declarations (including exports), plus trailing // end-of-line comments.',
    },
    schema: [],
    messages: {
      leading:
       'Leading comment — names should carry meaning. Remove or move non-obvious WHY into a doc.',
      trailing:
       'Trailing `//` end-of-line comment — names should carry meaning. Remove or move into a doc.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const comments = sourceCode.getAllComments();

    const lineComments = [];
    const blockComments = [];
    for (const c of comments) {
      if (c.type === 'Line') lineComments.push(c);
      else if (c.type === 'Block') blockComments.push(c);
    }

    function reportTrailing() {
      const lines = sourceCode.lines;
      for (const c of lineComments) {
        if (isPragma(c.value)) continue;
        const lineIdx = c.loc.start.line - 1;
        const lineText = lines[lineIdx];
        if (lineText === undefined) continue;
        const before = lineText.slice(0, c.loc.start.column);
        if (before.trim() === '') continue;
        context.report({ loc: c.loc, messageId: 'trailing' });
      }
    }

    function reportLeading() {
      const lines = sourceCode.lines;
      const lineCommentsByLine = new Map();
      for (const c of lineComments) {
        lineCommentsByLine.set(c.loc.start.line, c);
      }
      const visited = new Set();
      for (const c of lineComments) {
        if (visited.has(c)) continue;
        const lineIdx = c.loc.start.line - 1;
        const before = lines[lineIdx]?.slice(0, c.loc.start.column);
        if (before === undefined || before.trim() !== '') {
          visited.add(c);
          continue;
        }
        let startLine = c.loc.start.line;
        const block = [c];
        visited.add(c);
        while (true) {
          const next = lineCommentsByLine.get(startLine - 1);
          if (!next) break;
          const beforeNext = lines[next.loc.start.line - 1]?.slice(0, next.loc.start.column);
          if (beforeNext === undefined || beforeNext.trim() !== '') break;
          block.unshift(next);
          visited.add(next);
          startLine = next.loc.start.line;
        }
        const allPragma = block.every((bc) => isPragma(bc.value));
        if (allPragma) continue;
        const lastLine = block[block.length - 1].loc.end.line;
        const next = findNextSubstantiveLine(sourceCode, lastLine);
        if (!next) continue;
        if (/^\s*\/\*/.test(next.line) || /^\s*\/\//.test(next.line)) continue;
        context.report({ loc: block[0].loc, messageId: 'leading' });
      }

      for (const c of blockComments) {
        const lineIdx = c.loc.start.line - 1;
        const before = lines[lineIdx]?.slice(0, c.loc.start.column);
        if (before === undefined || before.trim() !== '') continue;
        if (isPragma(c.value.replace(/^\*/, '').trim())) continue;
        const next = findNextSubstantiveLine(sourceCode, c.loc.end.line);
        if (!next) continue;
        if (/^\s*\/\*/.test(next.line) || /^\s*\/\//.test(next.line)) continue;
        context.report({ loc: c.loc, messageId: 'leading' });
      }
    }

    return {
     'Program:exit'() {
        reportTrailing();
        reportLeading();
      },
    };
  },
};
