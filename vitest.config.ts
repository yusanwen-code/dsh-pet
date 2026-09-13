import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['{apps,packages,pets,examples}/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
