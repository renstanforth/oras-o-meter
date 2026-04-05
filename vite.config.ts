import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import manifest from './manifest.config.ts'

export default defineConfig({
  base: './',
  build: {
    // Service worker uses chrome.action.setIcon paths; inlined base64 is invalid there.
    assetsInlineLimit: 0,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@assets': path.resolve(__dirname, 'assets'),
    },
  },
  plugins: [vue(), crx({ manifest })],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
})
