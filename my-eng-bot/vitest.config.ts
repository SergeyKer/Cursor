import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './test/shims/server-only.ts'),
      'next/font/google': path.resolve(__dirname, './test/shims/next-font-google.ts'),
    },
  },
})
