#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCommand } from './commands/build.js'
import { initCommand } from './commands/init.js'
import { listCommand } from './commands/list.js'
import { resolveCommand } from './commands/resolve.js'
import { syncCommand } from './commands/sync.js'
import { line, style } from './lib/ui.js'

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

function usage() {
  line(`${style.bold('standards')} — portable coding standards`)
  line()
  line('  init [dir]     scaffold a project with detected presets')
  line('  sync [dir]     add missing rules, update stale, prompt on drift')
  line('  check [dir]    report drift without writing (exit 1 when out of date)')
  line('  resolve <rule> mark a conflict merged after editing the file')
  line('  list           show every rule in the source')
  line('  build          regenerate the ESLint plugin from the rule source')
  line()
}

const [command = 'help', target] = process.argv.slice(2)
const targetRoot = resolve(target ?? process.cwd())

switch (command) {
  case 'list':
    listCommand(SOURCE_ROOT)
    break
  case 'build':
    process.exitCode = buildCommand(SOURCE_ROOT)
    break
  case 'init':
    process.exitCode = await initCommand(SOURCE_ROOT, targetRoot)
    break
  case 'sync':
    process.exitCode = await syncCommand(SOURCE_ROOT, targetRoot, { write: true })
    break
  case 'check':
    process.exitCode = await syncCommand(SOURCE_ROOT, targetRoot, { write: false })
    break
  case 'resolve':
    process.exitCode = resolveCommand(process.cwd(), process.argv.slice(3))
    break
  default:
    usage()
}
