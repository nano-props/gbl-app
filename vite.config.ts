import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8')) as {
  version: string
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwind()],
  root: path.resolve(import.meta.dirname, 'src/renderer'),
  base: './',
  // Inject app version at build time so the renderer can show it (e.g.
  // in the settings overlay) without an IPC round-trip. JSON.stringify
  // so the value lands as a string literal, not bare text.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '#': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/renderer'),
    emptyOutDir: true,
    sourcemap: mode === 'production' ? false : 'inline',
    rollupOptions: {
      input: {
        index: path.resolve(import.meta.dirname, 'src/renderer/index.html'),
      },
    },
  },
}))
