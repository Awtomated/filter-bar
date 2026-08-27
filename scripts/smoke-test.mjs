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

function checkExports(mod, label) {
  const missing = REQUIRED_EXPORTS.filter((name) => !(name in mod));
  if (missing.length) {
    throw new Error(`${label} is missing exports: ${missing.join(', ')}`);
  }
}

const require = createRequire(import.meta.url);
checkExports(require('../dist/index.js'), 'CJS build (dist/index.js)');

(async () => {
  checkExports(await import('../dist/index.mjs'), 'ESM build (dist/index.mjs)');
})();
