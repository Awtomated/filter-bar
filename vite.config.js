import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// Local playground only (`yarn playground`) — the published package is still
// built by tsup (see tsup.config.js). The playground imports straight from
// ../src, so edits to the components hot-reload without a rebuild.
export default defineConfig({
  root: 'playground',
  // This repo writes JSX in plain `.js` files (see tsup.config.js), which
  // Vite/esbuild don't treat as JSX by default.
  // tailwindcss: the shadcn version's classes, built against main-app's
  // theme (playground/styles.css).
  plugins: [react({ include: /\.(js|jsx)$/ }), tailwindcss()],
  esbuild: {
    loader: 'jsx',
    include: /(src|playground)[\\/].*\.jsx?$/,
    exclude: [],
    jsx: 'automatic',
  },
  optimizeDeps: {
    esbuildOptions: { loader: { '.js': 'jsx' } },
  },
  server: {
    port: 5173,
    open: true,
    fs: { allow: [repoRoot] },
  },
});
