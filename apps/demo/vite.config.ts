import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@dsh-pet/protocol': fileURLToPath(new URL('../../packages/protocol/src/index.ts', import.meta.url)),
      '@dsh-pet/web': fileURLToPath(new URL('../../packages/web/src/index.ts', import.meta.url)),
    },
  },
})
