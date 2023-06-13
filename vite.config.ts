/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    dts({ rollupTypes: true })
  ],
  server: {
    open: true,
  },
  build: {
    minify: false,
    lib: {
      entry: {
        main: "src/main/index.ts",
        renderer: "src/renderer/index.ts",
        preload: "src/preload.ts"
      },
      fileName: "[name]",
      name: '[name]',
    },
    rollupOptions: {
      external: ['electron'],
      output: {
        manualChunks: {}
      },

    }
  },
})
