import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base matches the GitHub Pages path: rowanflynnpilot.github.io/wpr-jobs/
export default defineConfig({
  plugins: [react()],
  base: '/wpr-jobs/',
})
