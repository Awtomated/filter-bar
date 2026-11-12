// Post-build sanity check: confirms the packaged CJS and ESM bundles both
// load standalone (no bundler/babel involved) and expose the public API
// documented in src/index.js. Run via `yarn smoke-test` (build + this file).
import { createRequire } from 'module';

const REQUIRED_EXPORTS = [
  'DynamicFilterBar',
  'FilterToggleButton',
  'QuickFilterChip',
  'DynamicFilterProvider',
  'defaultTokens',
  'defaultLabels',
  'adaptApiConfig',
  'applyChoicesMap',
  'buildQueryParams',
  'getChoiceId',
  'getChoiceLabel',
  'getDefaultOperator',
  'getDefaultOperatorId',
  'getOperatorId',
  'isMultiSelectionField',
  'isSelectionField',
  'makeFilter',
];

// The shadcn entry (@awtomated/filter-bar/shadcn) exposes the same pure
// helpers plus its own components.
const SHADCN_EXPORTS = [
  ...REQUIRED_EXPORTS.filter((name) => !['QuickFilterChip', 'defaultTokens'].includes(name)),
  'FilterChip',
  'shadcnDefaultLabels',
];

function checkExports(mod, label, required = REQUIRED_EXPORTS) {
  const missing = required.filter((name) => !(name in mod));
  if (missing.length) {
    throw new Error(`${label} is missing exports: ${missing.join(', ')}`);
  }
}

const require = createRequire(import.meta.url);
checkExports(require('../dist/index.js'), 'CJS build (dist/index.js)');
checkExports(require('../dist/shadcn.js'), 'CJS build (dist/shadcn.js)', SHADCN_EXPORTS);

(async () => {
  checkExports(await import('../dist/index.mjs'), 'ESM build (dist/index.mjs)');
  checkExports(await import('../dist/shadcn.mjs'), 'ESM build (dist/shadcn.mjs)', SHADCN_EXPORTS);
  console.log('Smoke test passed: MUI and shadcn entries load (CJS + ESM).');
})();
