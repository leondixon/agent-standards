const ANSI = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  bold: '\u001B[1m',
  green: '\u001B[32m',
  yellow: '\u001B[33m',
  red: '\u001B[31m',
  cyan: '\u001B[36m',
}

const enabled = process.stdout.isTTY && !process.env.NO_COLOR

function paint(code, text) {
  return enabled ? `${code}${text}${ANSI.reset}` : text
}

export const style = {
  dim: text => paint(ANSI.dim, text),
  bold: text => paint(ANSI.bold, text),
  green: text => paint(ANSI.green, text),
  yellow: text => paint(ANSI.yellow, text),
  red: text => paint(ANSI.red, text),
  cyan: text => paint(ANSI.cyan, text),
}

export const STATE_MARK = {
  current: style.dim('·'),
  missing: style.green('+'),
  stale: style.cyan('↑'),
  drifted: style.yellow('!'),
  untracked: style.yellow('?'),
  deleted: style.red('-'),
  pinned: style.dim('◆'),
}

export function line(text = '') {
  process.stdout.write(`${text}\n`)
}

export function heading(text) {
  line()
  line(style.bold(text))
}
