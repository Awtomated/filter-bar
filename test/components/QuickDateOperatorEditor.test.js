import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickDateOperatorEditor from '../../src/components/QuickDateOperatorEditor';

// FilterRow-style Select components don't wire an explicit htmlFor/id
// between their InputLabel and combobox — locate the combobox via the
// FormControl that wraps the matching label text (mirrors
// QuickOperatorEditor.test.js's helper).
function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

function dateField(overrides) {
  return {
    name: 'startdate',
    label: 'Start Date',
    type: 'date',
    default_operator: 'between',
    operators: [
      {
        label: 'On or after',
        value: 'gte',
        query_param: 'startdate__gte',
        input_type: 'single',
        input_field: 'date',
      },
      {
        label: 'On or before',
        value: 'lte',
        query_param: 'startdate__lte',
        input_type: 'single',
        input_field: 'date',
      },
      {
        label: 'Between',
        value: 'between',
        query_params: 'startdate_range',
        input_type: 'range',
        input_field: 'date',
      },
    ],
    ...overrides,
  };
}

describe('QuickDateOperatorEditor', () => {
  it("defaults the operator select to the field's default_operator instead of blank", () => {
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(getSelectByLabel('Operator')).toHaveTextContent('Between');
  });

  it('shows Today/Tomorrow shortcuts for a "gte" operator', async () => {
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'On or after' }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yesterday' })).not.toBeInTheDocument();
  });

  it('shows Today/Yesterday shortcuts for an "lte" operator', async () => {
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'On or before' }));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomorrow' })).not.toBeInTheDocument();
  });

  it('commits immediately when a single-date shortcut is clicked — no Apply button', async () => {
    const onApply = jest.fn();
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={onApply}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'On or after' }));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'startdate', operatorId: 'startdate__gte' })
    );
    expect(onApply.mock.calls[0][0].value).toEqual(expect.any(String));
  });

  it('shows MUI\'s default range shortcuts for the "Between" operator', () => {
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByRole('button', { name: 'This Week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Last 7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it("commits a range shortcut immediately, keyed by the operator's query_params", async () => {
    const onApply = jest.fn();
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={onApply}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'This Week' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'startdate',
        operatorId: 'between',
        value: { start: expect.any(String), end: expect.any(String) },
      })
    );
  });

  it('commits immediately when a day is picked directly from the calendar, with no Apply/OK button anywhere', async () => {
    const onApply = jest.fn();
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={onApply}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'On or after' }));
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('gridcell', { name: '10' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ field: 'startdate', operatorId: 'startdate__gte' })
    );
    expect(onApply.mock.calls[0][0].value).toEqual(expect.any(String));
  });

  it('commits a range immediately once two calendar days are picked directly, with no Apply/OK button anywhere', async () => {
    const onApply = jest.fn();
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={null}
        onApply={onApply}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    // Defaults to "Between".
    await userEvent.click(screen.getByRole('gridcell', { name: '10' }));
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('gridcell', { name: '20' }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'startdate',
        operatorId: 'between',
        value: { start: expect.any(String), end: expect.any(String) },
      })
    );
    expect(screen.queryByRole('button', { name: 'OK' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it('seeds the operator and shows shortcuts for an already-applied filter', async () => {
    const appliedFilter = {
      id: 'f1',
      field: 'startdate',
      operatorId: 'startdate__lte',
      value: '2024-03-15T00:00:00.000Z',
    };
    render(
      <QuickDateOperatorEditor
        fieldDef={dateField({})}
        appliedFilter={appliedFilter}
        onApply={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(getSelectByLabel('Operator')).toHaveTextContent('On or before');
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
  });
});
