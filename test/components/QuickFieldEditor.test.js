import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickFieldEditor from '../../src/components/QuickFieldEditor';

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
    default_operator: overrides.default_operator,
    operators: overrides.operators ?? [op({ query_param: 'name__icontains', value: 'icontains' })],
    ...overrides,
  };
}

function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

describe('QuickFieldEditor', () => {
  it('seeds the operator select from the default operator when there is no applied filter', () => {
    const fieldDef = field({});
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(getSelectByLabel('Operator')).toHaveTextContent('Equals');
  });

  it('seeds the operator and value from an existing applied filter', () => {
    const fieldDef = field({});
    const appliedFilter = { id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' };
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
  });

  it('hides the value input for a "none" input_type operator', () => {
    const noneOp = op({ input_type: 'none', query_param: 'name__isnull', query_value: 'true' });
    const fieldDef = field({ operators: [noneOp] });
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  });

  it('resets the value when the operator changes', async () => {
    const fieldDef = field({
      operators: [
        op({ label: 'Contains', query_param: 'name__icontains', value: 'icontains' }),
        op({ label: 'Equals', query_param: 'name__exact', value: 'exact' }),
      ],
    });
    const appliedFilter = { id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' };
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Equals' }));
    expect(screen.getByLabelText('Value')).toHaveValue('');
  });

  it('calls onApply with the field name, operatorId, and current value when Apply is clicked', async () => {
    const onApply = jest.fn();
    const fieldDef = field({});
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name', operatorId: 'name__icontains', value: 'acme' })
    );
  });

  it('preserves the applied filter id when re-applying an edited filter', async () => {
    const onApply = jest.fn();
    const fieldDef = field({});
    const appliedFilter = {
      id: 'existing-id',
      field: 'name',
      operatorId: 'name__icontains',
      value: 'old',
    };
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-id' }));
  });
});
