import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['360/screenshots/tests/**/*.test.ts'],
    environment: 'node',
  },
})
