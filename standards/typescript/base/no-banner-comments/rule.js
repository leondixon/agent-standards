/**
 * Flag decorative banner comments (`// ====`, `// ----`, `// ****`,
 * `// ####`). Names should carry meaning — banners are noise.
 */
const BANNER_RE = /^[[:space:]]*[-=*#]{3,}/;
const BANNER_PATTERN = /^\s*[-=*#]{3,}/;

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Decorative banner comment (// ====, // ----, // ****, // ####).',
    },
    schema: [],
    messages: {
      banner:
       'Decorative banner comment — names should carry meaning, not be wrapped in `// ====`/`// ----`/`// ****`/`// ####`.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    return {
     'Program:exit'() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type !== 'Line') continue;
          if (BANNER_PATTERN.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'banner' });
          }
        }
      },
    };
  },
};
