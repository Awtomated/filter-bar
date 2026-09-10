import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtherFiltersBuilder from '../../src/components/OtherFiltersBuilder';

// FilterRow's Select components don't wire an explicit htmlFor/id between
// their InputLabel and combobox, so getByLabelText can't resolve them —
// locate the combobox via the FormControl that wraps the matching label text.
function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

function op(overrides) {
  return {
    label: overrides.label ?? 'Contains',
    value: overrides.value ?? 'icontains',
    query_param: overrides.query_param ?? 'name__icontains',
    input_type: overrides.input_type ?? 'single',
    input_field: overrides.input_field ?? 'text',
    ...overrides,
  };
}

function field(overrides) {
  return {
    name: overrides.name ?? 'name',
    label: overrides.label ?? 'Name',
    operators: overrides.operators ?? [op({})],
    ...overrides,
  };
}

describe('OtherFiltersBuilder', () => {
  it('seeds one draft filter row from the first field when there are no applied filters', () => {
    const nameField = field({});
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
  });

  it('renders no draft rows and disables Apply when there are no field defs and no applied filters', () => {
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add filter' })).toBeDisabled();
  });

  it('renders the "Add filter" button with a leading AddIcon', () => {
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[field({})]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    const addButton = screen.getByRole('button', { name: 'Add filter' });
    expect(addButton.querySelector('[data-testid="AddIcon"]')).toBeInTheDocument();
  });

  it('seeds draft rows from appliedOtherFilters when present', () => {
    const nameField = field({});
    const applied = [{ id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' }];
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={applied}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
  });

  it('adds another draft row when "Add filter" is clicked', async () => {
    const nameField = field({});
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getAllByLabelText('Value')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(screen.getAllByLabelText('Value')).toHaveLength(2);
  });

  it('removes a draft row when its remove icon is clicked', async () => {
    const nameField = field({});
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Add filter' }));
    expect(screen.getAllByLabelText('Value')).toHaveLength(2);
    const removeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('[data-testid="CloseIcon"]'));
    await userEvent.click(removeButtons[0]);
    expect(screen.getAllByLabelText('Value')).toHaveLength(1);
  });

  it('clears all draft rows and calls onApply([]) when "Clear all" is clicked', async () => {
    const nameField = field({});
    const onApply = jest.fn();
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={onApply}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onApply).toHaveBeenCalledWith([]);
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  });

  it('calls onApply with the current draft filters when Apply is clicked', async () => {
    const nameField = field({});
    const onApply = jest.fn();
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={onApply}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith([
      expect.objectContaining({ field: 'name', operatorId: 'name__icontains', value: 'acme' }),
    ]);
  });

  it('only resets the row that was edited, leaving other draft rows untouched', async () => {
    const nameField = field({});
    const statusField = field({
      name: 'status',
      label: 'Status',
      operators: [op({ query_param: 'status' })],
    });
    const applied = [
      { id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' },
      { id: 'f2', field: 'status', operatorId: 'status', value: 'open' },
    ];
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField, statusField]}
        appliedOtherFilters={applied}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    const values = screen.getAllByLabelText('Value');
    expect(values[0]).toHaveValue('acme');
    await userEvent.type(values[0], ' updated');
    expect(screen.getAllByLabelText('Value')[1]).toHaveValue('open');
  });

  it('resets the value (but keeps the newly chosen operator) when the operator selection changes', async () => {
    const multiOpField = field({
      operators: [
        op({ label: 'Contains', query_param: 'name__icontains', value: 'icontains' }),
        op({ label: 'Equals', query_param: 'name__exact', value: 'exact' }),
      ],
    });
    const applied = [{ id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' }];
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[multiOpField]}
        appliedOtherFilters={applied}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Equals' }));
    expect(getSelectByLabel('Operator')).toHaveTextContent('Equals');
    expect(screen.getByLabelText('Value')).toHaveValue('');
  });

  it("resets the operator and value when a draft row's field selection changes", async () => {
    const nameField = field({});
    const statusField = field({
      name: 'status',
      label: 'Status',
      operators: [
        op({ label: 'Is', value: 'exact', query_param: 'status', input_field: 'select' }),
      ],
    });
    const applied = [{ id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' }];
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField, statusField]}
        appliedOtherFilters={applied}
        onApply={() => {}}
        onCancel={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
    await userEvent.click(getSelectByLabel('Field'));
    await userEvent.click(screen.getByRole('option', { name: 'Status' }));
    expect(getSelectByLabel('Operator')).toHaveTextContent('Is');
    expect(screen.queryByLabelText('Value')).not.toHaveValue('acme');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = jest.fn();
    const nameField = field({});
    render(
      <OtherFiltersBuilder
        otherFieldDefs={[nameField]}
        appliedOtherFilters={[]}
        onApply={() => {}}
        onCancel={onCancel}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
