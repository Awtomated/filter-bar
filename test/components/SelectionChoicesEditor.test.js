import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectionChoicesEditor from '../../src/components/SelectionChoicesEditor';

function fieldDef(overrides) {
  return {
    name: 'status',
    label: 'Status',
    operators: [{ label: 'Is', value: 'exact', query_param: 'status', input_type: 'single' }],
    options: null,
    fetch_url: null,
    ...overrides,
  };
}

describe('SelectionChoicesEditor', () => {
  it('renders choices from fieldDef.options without fetching', () => {
    const fetcher = jest.fn();
    const def = fieldDef({
      options: [
        { id: 1, label: 'Open' },
        { id: 2, label: 'Closed' },
      ],
    });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches choices from fetch_url when there are no local options', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: { results: [{ id: 1, name: 'Fetched' }] } });
    const def = fieldDef({ fetch_url: '/api/statuses' });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    expect(fetcher).toHaveBeenCalledWith('/api/statuses');
    expect(await screen.findByText('Fetched')).toBeInTheDocument();
  });

  it('shows the noMatches label when the fetch resolves to an empty list', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: { results: [] } });
    const def = fieldDef({ fetch_url: '/api/statuses' });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    expect(await screen.findByText('No matches found')).toBeInTheDocument();
  });

  it('shows the noMatches label when the fetch rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('boom'));
    const def = fieldDef({ fetch_url: '/api/statuses' });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(await screen.findByText('No matches found')).toBeInTheDocument();
  });

  it('ignores a choices fetch that resolves after the component has unmounted', async () => {
    let resolvePromise;
    const fetcher = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );
    const def = fieldDef({ fetch_url: '/api/statuses' });
    const { unmount } = render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    expect(fetcher).toHaveBeenCalled();
    unmount();
    await act(async () => {
      resolvePromise({ data: { results: [{ id: 1, name: 'Fetched' }] } });
      await Promise.resolve();
    });
  });

  it('ignores a choices fetch that rejects after the component has unmounted', async () => {
    let rejectPromise;
    const fetcher = jest.fn(
      () =>
        new Promise((_, reject) => {
          rejectPromise = reject;
        })
    );
    const def = fieldDef({ fetch_url: '/api/statuses' });
    const { unmount } = render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={fetcher}
      />
    );
    expect(fetcher).toHaveBeenCalled();
    unmount();
    await act(async () => {
      rejectPromise(new Error('too late'));
      await Promise.resolve();
    });
  });

  it('filters choices by the search box text (case-insensitively)', async () => {
    const def = fieldDef({
      options: [
        { id: 1, label: 'Open' },
        { id: 2, label: 'Closed' },
      ],
    });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByPlaceholderText('Search status...'), 'clo');
    expect(screen.queryByText('Open')).not.toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('single mode: clicking a choice applies it immediately and calls onSelectSingle', async () => {
    const onApply = jest.fn();
    const onSelectSingle = jest.fn();
    const def = fieldDef({ options: [{ id: 1, label: 'Open' }] });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={onApply}
        multiple={false}
        onSelectSingle={onSelectSingle}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'status', value: { id: 1, label: 'Open' } })
    );
    expect(onSelectSingle).toHaveBeenCalledTimes(1);
  });

  it('multi mode: toggling a checkbox adds then removes the choice from the selection without calling onSelectSingle', async () => {
    const onApply = jest.fn();
    const onSelectSingle = jest.fn();
    const def = fieldDef({ options: [{ id: 1, label: 'Open' }] });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={onApply}
        multiple
        onSelectSingle={onSelectSingle}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    expect(onApply).toHaveBeenLastCalledWith(
      expect.objectContaining({ field: 'status', value: [{ id: 1, label: 'Open' }] })
    );
    await userEvent.click(screen.getByText('Open'));
    expect(onApply).toHaveBeenLastCalledWith(
      expect.objectContaining({ field: 'status', value: [] })
    );
    expect(onSelectSingle).not.toHaveBeenCalled();
  });

  it('single mode: applying a choice works fine without an onSelectSingle callback', async () => {
    const onApply = jest.fn();
    const def = fieldDef({ options: [{ id: 1, label: 'Open' }] });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={onApply}
        multiple={false}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByText('Open'));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'status', value: { id: 1, label: 'Open' } })
    );
  });

  it('renders group headers when selectConfig.grouping is enabled, without a top gap on the first header', () => {
    const def = fieldDef({
      options: [
        { id: 1, label: 'Carrot', category: 'Veg' },
        { id: 2, label: 'Apple', category: 'Fruit' },
        { id: 3, label: 'Pea', category: 'Veg' },
      ],
      selectConfig: { grouping: true, groupingKey: 'category' },
    });
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByText('Fruit')).toBeInTheDocument();
    expect(screen.getByText('Veg')).toBeInTheDocument();
    // Same-group items are rendered contiguously, sorted by group.
    const items = screen.getAllByText(/Apple|Carrot|Pea|Fruit|Veg/).map((el) => el.textContent);
    expect(items).toEqual(['Fruit', 'Apple', 'Veg', 'Carrot', 'Pea']);
  });

  it('renders pre-selected choices as checked in multi mode from the applied filter', () => {
    const def = fieldDef({
      options: [
        { id: 1, label: 'Open' },
        { id: 2, label: 'Closed' },
      ],
    });
    const appliedFilter = {
      id: 'f1',
      field: 'status',
      operatorId: 'status',
      value: [{ id: 1, label: 'Open' }],
    };
    render(
      <SelectionChoicesEditor
        fieldDef={def}
        appliedFilter={appliedFilter}
        onApply={() => {}}
        multiple
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument();
  });
});
