import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterRow from '../../src/components/FilterRow';

// FilterRow's Select components don't wire an explicit htmlFor/id between
// their InputLabel and combobox, so getByLabelText can't resolve them —
// locate the combobox via the FormControl that wraps the matching label text.
function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

function getFormControlByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  return label.closest('.MuiFormControl-root');
}

function op(overrides) {
  return {
    label: overrides.label ?? 'Equals',
    value: overrides.value ?? 'exact',
    query_param: overrides.query_param ?? 'field',
    input_type: overrides.input_type ?? 'single',
    input_field: overrides.input_field ?? 'text',
    ...overrides,
  };
}

function field(overrides) {
  return {
    name: overrides.name ?? 'name',
    label: overrides.label ?? 'Name',
    operators: overrides.operators ?? [op({ query_param: 'name__icontains' })],
    ...overrides,
  };
}

describe('FilterRow', () => {
  it('renders field and operator selects with the current filter selections', () => {
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(getSelectByLabel('Field')).toHaveTextContent('Name');
    expect(getSelectByLabel('Operator')).toHaveTextContent('Equals');
  });

  it('renders a value input when the selected operator has an input_type other than "none"', () => {
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
  });

  it('hides the value input when the selected operator has input_type "none"', () => {
    const isEmptyOp = op({
      label: 'Is Empty',
      input_type: 'none',
      query_param: 'name__isnull',
      query_value: 'true',
    });
    const nameField = field({ operators: [isEmptyOp] });
    const filter = { id: '1', field: 'name', operatorId: 'name__isnull:true', value: null };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  });

  it('calls onRemove when the remove (close) icon button is clicked', async () => {
    const onRemove = jest.fn();
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={onRemove}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('calls onChange with resetValue when the field selection changes', async () => {
    const onChange = jest.fn();
    const nameField = field({ name: 'name', label: 'Name' });
    const statusField = field({
      name: 'status',
      label: 'Status',
      operators: [op({ query_param: 'status' })],
    });
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField, statusField]}
        onRemove={() => {}}
        onChange={onChange}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Field'));
    await userEvent.click(screen.getByRole('option', { name: 'Status' }));
    expect(onChange).toHaveBeenCalledWith('field', 'status', { resetValue: true });
  });

  it('makes the operator select read-only (no menu opens) when the field defines a single operator', async () => {
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    const combobox = getSelectByLabel('Operator');
    await userEvent.click(combobox);
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('lets the operator menu open normally when the field defines multiple operators', async () => {
    const multiOpField = field({
      operators: [
        op({ label: 'Equals', query_param: 'name__exact' }),
        op({ label: 'Contains', query_param: 'name__icontains' }),
      ],
    });
    const filter = { id: '1', field: 'name', operatorId: 'name__exact', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[multiOpField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('hides the remove icon when showRemove is false', () => {
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onChange={() => {}}
        fetcher={jest.fn()}
        showRemove={false}
      />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('hides the field select when showField is false', () => {
    const nameField = field({});
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
        showField={false}
      />
    );
    expect(screen.queryByText('Field')).not.toBeInTheDocument();
    expect(getSelectByLabel('Operator')).toBeInTheDocument();
  });

  it('filters the Field dropdown options by a search box', async () => {
    const nameField = field({ name: 'name', label: 'Name' });
    const statusField = field({
      name: 'status',
      label: 'Status',
      operators: [op({ query_param: 'status' })],
    });
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField, statusField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Field'));
    expect(screen.getByRole('option', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Status' })).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText('Search field...'), 'stat');
    expect(screen.queryByRole('option', { name: 'Name' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Status' })).toBeInTheDocument();
  });

  it('keeps showing the selected field label after filtering it out of the dropdown', async () => {
    const nameField = field({ name: 'name', label: 'Name' });
    const statusField = field({
      name: 'status',
      label: 'Status',
      operators: [op({ query_param: 'status' })],
    });
    const filter = { id: '1', field: 'name', operatorId: 'name__icontains', value: '' };
    render(
      <FilterRow
        filter={filter}
        filterFields={[nameField, statusField]}
        onRemove={() => {}}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Field'));
    await userEvent.type(screen.getByPlaceholderText('Search field...'), 'stat');
    // MUI marks the rest of the page aria-hidden while the menu's still
    // open, so query with `hidden: true` to see the (still-open) trigger's
    // displayed text rather than requiring it to close first.
    const formControl = screen
      .getAllByText('Field')
      .find((el) => el.tagName === 'LABEL')
      .closest('.MuiFormControl-root');
    expect(within(formControl).getByRole('combobox', { hidden: true })).toHaveTextContent('Name');
  });
});
