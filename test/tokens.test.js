import { render, screen } from '@testing-library/react';
import {
  DynamicFilterProvider,
  defaultLabels,
  defaultTokens,
  useFilterBarLabels,
  useFilterBarTokens,
} from '../src/tokens';

function Probe() {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  return (
    <div>
      <span data-testid='gapSm'>{tokens.gapSm}</span>
      <span data-testid='chipRadius'>{tokens.chipRadius}</span>
      <span data-testid='filterChipLabel'>{labels.filterChipLabel}</span>
      <span data-testid='searchPlaceholder'>{labels.searchPlaceholder('Status')}</span>
    </div>
  );
}

describe('useFilterBarTokens / useFilterBarLabels', () => {
  it('returns the default tokens and labels when used outside a provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('gapSm')).toHaveTextContent(String(defaultTokens.gapSm));
    expect(screen.getByTestId('chipRadius')).toHaveTextContent(String(defaultTokens.chipRadius));
    expect(screen.getByTestId('filterChipLabel')).toHaveTextContent(defaultLabels.filterChipLabel);
  });

  it('computes the searchPlaceholder label as a function of the field label', () => {
    render(<Probe />);
    expect(screen.getByTestId('searchPlaceholder')).toHaveTextContent('Search status...');
  });
});

describe('DynamicFilterProvider', () => {
  it('merges partial custom tokens onto the defaults instead of replacing them', () => {
    render(
      <DynamicFilterProvider tokens={{ gapSm: 20 }}>
        <Probe />
      </DynamicFilterProvider>
    );
    expect(screen.getByTestId('gapSm')).toHaveTextContent('20');
    // Untouched token keeps its default value.
    expect(screen.getByTestId('chipRadius')).toHaveTextContent(String(defaultTokens.chipRadius));
  });

  it('merges partial custom labels onto the defaults instead of replacing them', () => {
    render(
      <DynamicFilterProvider labels={{ filterChipLabel: 'Custom Filter' }}>
        <Probe />
      </DynamicFilterProvider>
    );
    expect(screen.getByTestId('filterChipLabel')).toHaveTextContent('Custom Filter');
  });

  it('renders children even when no tokens or labels overrides are provided', () => {
    render(
      <DynamicFilterProvider>
        <div data-testid='child'>hello</div>
      </DynamicFilterProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });
});
