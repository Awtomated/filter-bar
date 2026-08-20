import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangeGroupChip from '../../src/components/DateRangeGroupChip';

function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

function openChip() {
  // Once a filter is applied, the chip also renders a "clear" control that
  // picks up role="button" too — target the chip root itself by class.
  return userEvent.click(document.querySelector('.MuiChip-root'));
}

function makeGroup(overrides) {
  return {
    key: 'startdate__enddate',
    startField: { name: 'startdate', label: 'Start Date' },
    endField: { name: 'enddate', label: 'End Date' },
    startOperatorId: 'startdate__gte',
    endOperatorId: 'enddate__lte',
    ...overrides,
  };
}

describe('DateRangeGroupChip', () => {
  it('renders the plain dateRangeLabel chip when no filters are applied', () => {
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={[]}
        onApply={() => {}}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('renders the formatted date range as the chip label when filters are applied', () => {
    const filters = [
      {
        id: '1',
        field: 'startdate',
        operatorId: 'startdate__gte',
        value: '2024-03-15T00:00:00.000Z',
      },
      { id: '2', field: 'enddate', operatorId: 'enddate__lte', value: '2024-04-01T00:00:00.000Z' },
    ];
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={filters}
        onApply={() => {}}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    expect(screen.getByText('15/03/24 - 01/04/24')).toBeInTheDocument();
  });

  it('opens a popover with the condition select and both date fields', async () => {
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={[]}
        onApply={() => {}}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    await openChip();
    expect(getSelectByLabel('Condition')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Start Date' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'End Date' })).toBeInTheDocument();
  });

  it('defaults the condition to "between" when neither bound is set', async () => {
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={[]}
        onApply={() => {}}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    await openChip();
    expect(getSelectByLabel('Condition')).toHaveTextContent('Is Between');
  });

  it('defaults the condition to "after" when only the start date is set', async () => {
    const filters = [
      {
        id: '1',
        field: 'startdate',
        operatorId: 'startdate__gte',
        value: '2024-03-15T00:00:00.000Z',
      },
    ];
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={filters}
        onApply={() => {}}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    await openChip();
    expect(getSelectByLabel('Condition')).toHaveTextContent('Is After');
  });

  it('calls onApply with both field names and the new entries when switching condition to "before"', async () => {
    const onApply = jest.fn();
    const filters = [
      {
        id: '1',
        field: 'startdate',
        operatorId: 'startdate__gte',
        value: '2024-03-15T00:00:00.000Z',
      },
      { id: '2', field: 'enddate', operatorId: 'enddate__lte', value: '2024-04-01T00:00:00.000Z' },
    ];
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={filters}
        onApply={onApply}
        onClear={() => {}}
        timezone='UTC'
      />
    );
    await openChip();
    await userEvent.click(getSelectByLabel('Condition'));
    await userEvent.click(screen.getByRole('option', { name: 'Is Before' }));
    expect(onApply).toHaveBeenCalledWith(
      ['startdate', 'enddate'],
      [
        {
          id: expect.any(String),
          field: 'enddate',
          operatorId: 'enddate__lte',
          value: '2024-04-01T00:00:00.000Z',
        },
      ]
    );
  });

  it('calls onClear when the chip clear control is clicked', async () => {
    const onClear = jest.fn();
    const filters = [
      {
        id: '1',
        field: 'startdate',
        operatorId: 'startdate__gte',
        value: '2024-03-15T00:00:00.000Z',
      },
    ];
    render(
      <DateRangeGroupChip
        group={makeGroup({})}
        filters={filters}
        onApply={() => {}}
        onClear={onClear}
        timezone='UTC'
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
