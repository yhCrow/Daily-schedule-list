import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base + HashRouter means the build works on GitHub Pages, Vercel or any static host.
export default defineConfig({
  base: './',
  // Transpile to older JavaScript so the site also runs on older phones and browsers.
  build: { target: ['es2019', 'safari13', 'chrome80', 'firefox78', 'edge88'] },
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
})
