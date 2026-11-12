import { defineConfig } from 'tsup';

export default defineConfig({
  // `index` is the MUI version (the package root); `shadcn` is the
  // shadcn/Radix/Tailwind version, published as `@awtomated/filter-bar/shadcn`.
  entry: { index: 'src/index.js', shadcn: 'src/shadcn/index.js' },
  format: ['esm', 'cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: [
    'react',
    'react-dom',
    '@mui/material',
    '@mui/icons-material',
    '@mui/x-date-pickers',
    '@mui/x-date-pickers-pro',
    // shadcn entry: optional peers, resolved from the host app.
    'radix-ui',
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
    'date-fns',
  ],
  // Source files use the .js extension for JSX (matching this repo's own
  // convention), which esbuild doesn't parse as JSX by default.
  esbuildOptions(options) {
    options.loader = { ...options.loader, '.js': 'jsx' };
    // esbuild defaults to the classic transform (`React.createElement(...)`)
    // without ever importing `React` into scope — none of our components
    // import React explicitly (they rely on the automatic runtime, same as
    // this repo's babel.config.js), so the classic transform throws
    // "React is not defined" at runtime. Automatic mode auto-imports
    // jsx/jsxs from react/jsx-runtime instead, matching React 17+/18.
    options.jsx = 'automatic';
  },
});
