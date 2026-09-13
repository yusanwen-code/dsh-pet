import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@dsh-pet/protocol': fileURLToPath(new URL('./packages/protocol/src/index.ts', import.meta.url)),
      '@dsh-pet/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@dsh-pet/web': fileURLToPath(new URL('./packages/web/src/index.ts', import.meta.url)),
      'dsh-pet:pack': fileURLToPath(new URL('./packages/dsh-plugin/src/pack.fixture.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['{apps,packages,pets,examples}/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
