import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['standards/**/*.test.js', 'packages/**/*.test.js'],
    restoreMocks: true,
  },
})
