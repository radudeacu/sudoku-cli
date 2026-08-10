import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages project path, or every asset 404s in production.
export default defineConfig({
  base: '/sudoku-cli/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
