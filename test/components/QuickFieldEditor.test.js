import { render, screen } from '@testing-library/react';
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

describe('QuickFieldEditor', () => {
  it('seeds the value from an existing applied filter', () => {
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

  it('has no Apply button — a typed value commits on Enter', async () => {
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
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name', operatorId: 'name__icontains', value: 'acme' })
    );
  });

  it('closes the popover after a typed value commits on Enter', async () => {
    const closePopover = jest.fn();
    const fieldDef = field({});
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={() => {}}
        closePopover={closePopover}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.keyboard('{Enter}');
    expect(closePopover).toHaveBeenCalled();
  });

  it('does not apply a filter when the field is focused and blurred without a value', async () => {
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
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.tab();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('does not re-apply when a typed value is cleared back to empty before blur', async () => {
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
    const input = screen.getByLabelText('Value');
    await userEvent.type(input, 'acme');
    await userEvent.clear(input);
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
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={appliedFilter}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    await userEvent.type(screen.getByLabelText('Value'), ' updated');
    await userEvent.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 'existing-id' }));
  });

  it('applies immediately when the field has a single value-less ("none") operator', () => {
    const onApply = jest.fn();
    const noneOp = op({ input_type: 'none', query_param: 'name__isnull', query_value: 'true' });
    const fieldDef = field({ operators: [noneOp] });
    render(
      <QuickFieldEditor
        fieldDef={fieldDef}
        appliedFilter={null}
        onApply={onApply}
        fetcher={jest.fn()}
      />
    );
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'name', operatorId: 'name__isnull:true', value: null })
    );
  });
});
