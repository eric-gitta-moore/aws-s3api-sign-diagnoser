import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/web-tree-sitter/tree-sitter.wasm',
          dest: 'public'
        },
        {
          src: 'node_modules/curlconverter/dist/tree-sitter-bash.wasm',
          dest: 'public'
        }
      ]
    })
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  },
  build: {
    target: 'esnext'
  },
})
