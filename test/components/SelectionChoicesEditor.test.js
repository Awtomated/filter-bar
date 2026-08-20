import { render, screen, waitFor } from '@testing-library/react';
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
