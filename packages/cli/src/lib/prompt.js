import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

export function isInteractive() {
  return stdin.isTTY && stdout.isTTY
}

export async function choose(question, choices, fallback) {
  if (!isInteractive()) return fallback

  const rl = createInterface({ input: stdin, output: stdout })
  try {
    const labels = choices.map(choice => choice.key).join('/')
    const answer = (await rl.question(`${question} [${labels}] `)).trim().toLowerCase()
    const chosen = choices.find(choice => choice.key.toLowerCase() === answer)
    return chosen ? chosen.value : fallback
  }
  finally {
    rl.close()
  }
}

export async function confirm(question, fallback = true) {
  const value = await choose(question, [
    { key: 'y', value: true },
    { key: 'n', value: false },
  ], fallback)
  return value
}
