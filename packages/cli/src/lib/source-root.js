import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The installed package root — where `standards/` and `templates/` live.
 *
 * Walks up from this file rather than counting `..` segments, so the same code
 * works from a clone, a global install, an npx cache, and a pnpm store where the
 * nesting depth differs.
 */
export function findSourceRoot(from = fileURLToPath(import.meta.url)) {
  let directory = dirname(from)

  while (true) {
    if (existsSync(join(directory, 'standards')) && existsSync(join(directory, 'templates'))) {
      return directory
    }

    const parent = resolve(directory, '..')
    if (parent === directory) {
      throw new Error(
        'Could not locate the agent-standards package root. '
        + 'Expected a directory containing both `standards/` and `templates/`.',
      )
    }
    directory = parent
  }
}
