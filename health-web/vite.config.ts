import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // shared/types.ts, shared/utils.ts는 monorepo 루트(../)에 있어 기본 root(health-web) 밖이다.
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
