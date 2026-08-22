import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtherFiltersBuilder from '../../src/components/OtherFiltersBuilder';

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
