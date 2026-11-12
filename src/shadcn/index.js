// @awtomated/filter-bar/shadcn — the shadcn/Radix/Tailwind version of the
// bar, styled with the host app's design-system tokens. Same data contract
// as the MUI version (the package root): filterApiUrl, fetcher, onApply
// params, appliedFilters/onFiltersChange shape, choicesMap, fieldProps,
// labels, timezone. See README "shadcn version".
export { default as DynamicFilterBar, shadcnDefaultLabels } from './components/DynamicFilterBar';
export { default as FilterToggleButton } from './components/FilterToggleButton';
export { FilterChip, chipVariants } from './components/FilterChip';
export { DynamicFilterProvider, defaultLabels } from '../tokens';
export { dayToIso, isoToDay, formatDay, formatRange } from './dates';

export {
  adaptApiConfig,
  applyChoicesMap,
  applyFieldProps,
  buildQueryParams,
  getChoiceId,
  getChoiceLabel,
  getDefaultOperator,
  getDefaultOperatorId,
  getOperatorId,
  isMultiSelectionField,
  isSelectionField,
  makeFilter,
  matchMostUsedField,
} from '../utils';
