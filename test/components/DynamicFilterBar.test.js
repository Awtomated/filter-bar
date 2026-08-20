import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DynamicFilterBar from '../../src/components/DynamicFilterBar';

function makeConfig(overrides) {
  return {
    filters: {
      name: {
        field: 'name',
        label: 'Name',
        operators: [
          {
            label: 'Contains',
            value: 'icontains',
            query_param: 'name__icontains',
            input_type: 'single',
            input_field: 'text',
          },
        ],
      },
      status: {
        field: 'status',
        label: 'Status',
        options: [
          { id: 1, label: 'Open', value: 'open' },
          { id: 2, label: 'Closed', value: 'closed' },
        ],
        operators: [
          {
            label: 'Is',
            value: 'exact',
            query_param: 'status',
            input_type: 'single',
            input_field: 'select',
          },
        ],
      },
    },
    most_used_filters: [],
    ...overrides,
  };
}

describe('DynamicFilterBar', () => {
  it('renders nothing while the filter config is loading', () => {
    const fetcher = jest.fn(() => new Promise(() => {}));
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders nothing once loaded when the config has no filters', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: { filters: {} } });
    const { container } = render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders the trailing "Filter" chip for a non-selection field with no most_used_filters configured', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    // "name" isn't a selection field and isn't most-used, so it only shows up
    // inside the trailing "Filter" builder chip, not as its own quick chip.
    expect(await screen.findByText('Filter')).toBeInTheDocument();
    expect(screen.queryByText('Name')).not.toBeInTheDocument();
  });

  it('renders a selection quick-chip for an options-backed field even without most_used_filters', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Status')).toBeInTheDocument();
  });

  it('renders a quick chip per most_used_filters entry', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: makeConfig({ most_used_filters: ['name'] }) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Name')).toBeInTheDocument();
    // Status was not listed as most-used, so it collapses into the "Filter" builder chip instead.
    expect(screen.queryByText('Status')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('calls onApply with query params derived from an applied quick filter', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: makeConfig({ most_used_filters: ['name'] }) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    await userEvent.click(await screen.findByText('Name'));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith({ name__icontains: 'acme' });
  });

  it('calls onFiltersChange with the initial appliedFilters on mount', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onFiltersChange = jest.fn();
    const appliedFilters = [{ id: '1', field: 'name', operatorId: 'name__icontains', value: 'x' }];
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        appliedFilters={appliedFilters}
        onFiltersChange={onFiltersChange}
      />
    );
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith(appliedFilters));
  });

  it('applies a choicesMap override so the overridden field renders as a selection chip', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        choicesMap={{ name: { options: [{ id: 1, label: 'Acme', value: 'acme' }] } }}
      />
    );
    const chip = await screen.findByText('Name');
    await userEvent.click(chip);
    expect(await screen.findByText('Acme')).toBeInTheDocument();
  });

  it('silently renders no fields when the config fetch rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network error'));
    const { container } = render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('applies and clears a selection quick chip, calling onApply with the derived query params', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    const statusChip = await screen.findByText('Status');
    await userEvent.click(statusChip);
    await userEvent.click(await screen.findByText('Open'));
    expect(onApply).toHaveBeenLastCalledWith({ status: 'open' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onApply).toHaveBeenLastCalledWith({});
  });

  it('renders a date-range chip for a paired start/end most-used date field', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      data: makeConfig({
        filters: {
          startdate: {
            field: 'startdate',
            label: 'Start Date',
            operators: [
              {
                label: 'From',
                value: 'gte',
                query_param: 'startdate__gte',
                input_type: 'single',
                input_field: 'date',
              },
            ],
          },
          enddate: {
            field: 'enddate',
            label: 'End Date',
            operators: [
              {
                label: 'To',
                value: 'lte',
                query_param: 'enddate__lte',
                input_type: 'single',
                input_field: 'date',
              },
            ],
          },
        },
        most_used_filters: ['startdate'],
      }),
    });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Date Range')).toBeInTheDocument();
  });

  it('applies and clears filters via the trailing "Filter" builder chip', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    await userEvent.click(await screen.findByText('Filter'));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenLastCalledWith({ name__icontains: 'acme' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onApply).toHaveBeenLastCalledWith({});
  });
});
