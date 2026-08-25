import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickOperatorEditor from '../../src/components/QuickOperatorEditor';

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
    operators: overrides.operators ?? [
      op({ label: 'Contains', query_param: 'name__icontains', value: 'icontains' }),
      op({ label: 'Equals', query_param: 'name__exact', value: 'exact' }),
    ],
    ...overrides,
  };
}

describe('QuickOperatorEditor', () => {
  it('renders only the operator select and value field — no Apply button, no remove icon, no field select', () => {
    const fieldDef = field({});
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(getSelectByLabel('Operator')).toBeInTheDocument();
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
    expect(screen.queryByText('Field')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('seeds the operator and value from an existing applied filter', () => {
    const fieldDef = field({});
    const appliedFilter = { id: 'f1', field: 'name', operatorId: 'name__exact', value: 'acme' };
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(getSelectByLabel('Operator')).toHaveTextContent('Equals');
    expect(screen.getByLabelText('Value')).toHaveValue('acme');
  });

  it('seeds the operator from preferredOperatorId when there is no applied filter', () => {
    const fieldDef = field({});
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        preferredOperatorId='name__exact'
        onApply={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(getSelectByLabel('Operator')).toHaveTextContent('Equals');
  });

  it('resets the value when the operator changes', async () => {
    const fieldDef = field({});
    const appliedFilter = { id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' };
    render(
      <QuickOperatorEditor
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

  it('has no Apply button — a typed value commits on blur', async () => {
    const onApply = jest.fn();
    const fieldDef = field({});
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Equals' }));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.tab();
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name', operatorId: 'name__exact', value: 'acme' })
    );
  });

  it('hides the value field and applies immediately when the chosen operator is "none" input_type', async () => {
    const onApply = jest.fn();
    const fieldDef = field({
      operators: [
        op({ label: 'Contains', query_param: 'name__icontains', value: 'icontains' }),
        op({
          label: 'Is Empty',
          input_type: 'none',
          query_param: 'name__isnull',
          query_value: 'true',
        }),
      ],
    });
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Is Empty' }));
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name', operatorId: 'name__isnull:true', value: null })
    );
  });

  it('does not apply a filter when the value field is focused and blurred empty after switching operators', async () => {
    const onApply = jest.fn();
    const fieldDef = field({});
    const appliedFilter = { id: 'f1', field: 'name', operatorId: 'name__icontains', value: 'acme' };
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Equals' }));
    expect(screen.getByLabelText('Value')).toHaveValue('');
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.tab();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('preserves the applied filter id when re-committing an edited filter', async () => {
    const onApply = jest.fn();
    const fieldDef = field({});
    const appliedFilter = {
      id: 'existing-id',
      field: 'name',
      operatorId: 'name__icontains',
      value: 'old',
    };
    render(
      <QuickOperatorEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Value'), ' updated');
    await userEvent.tab();
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-id' }));
  });
});
