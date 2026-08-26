import { createContext, useContext } from 'react';

export const defaultTokens = {
  gapSm: 8,
  chipLabelPadding: '0px 6px',
  chipRadius: 16,
  popoverRadius: 8,
  menuItemPadding: '6px 16px',
  searchGap: 10,
  searchIconSize: 24,
  searchPadding: 8,
  searchHeight: 40,
  searchFieldHeight: 24,
  searchRadius: 12,
  checkboxSize: 20,
  // Colors default to plain MUI theme palette slots so the bar looks
  // reasonable against any theme out of the box; pass real palette paths
  // (e.g. a custom `border.chip`/`primary.hoverBg`) here to match a
  // specific design system exactly.
  chipBorderColor: 'divider',
  searchBackground: 'background.default',
  hoverBackground: 'action.hover',
  selectedBackground: 'action.selected',
  // Applied as sx to the selection-list item text; defaults to no override.
  menuItemTypographySx: {},
};

export const defaultLabels = {
  filterChipLabel: 'Filter',
  valueLabel: 'Value',
  noMatches: 'No matches found',
  searchPlaceholder: (fieldLabel) => `Search ${fieldLabel.toLowerCase()}...`,
  clearFilterTooltip: 'Clear filter',
  apply: 'Apply',
  cancel: 'Cancel',
  addFilter: 'Add filter',
  clearAll: 'Clear all',
  filtersTitle: 'Filters',
  fieldLabel: 'Field',
  operatorLabel: 'Operator',
};

const TokensContext = createContext(defaultTokens);
const LabelsContext = createContext(defaultLabels);

export function DynamicFilterProvider({ tokens, labels, children }) {
  const mergedTokens = { ...defaultTokens, ...tokens };
  const mergedLabels = { ...defaultLabels, ...labels };
  return (
    <TokensContext.Provider value={mergedTokens}>
      <LabelsContext.Provider value={mergedLabels}>{children}</LabelsContext.Provider>
    </TokensContext.Provider>
  );
}

export function useFilterBarTokens() {
  return useContext(TokensContext);
}

export function useFilterBarLabels() {
  return useContext(LabelsContext);
}
