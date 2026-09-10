import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateRangePicker from '../../src/components/DateRangePicker';

const rangeOp = {
  label: 'Between',
  value: 'between',
  query_params: 'startdate_range',
  input_type: 'range',
  input_field: 'date',
};

const gteOp = {
  label: 'On or after',
  value: 'gte',
  query_param: 'startdate__gte',
  input_type: 'single',
  input_field: 'date',
};

describe('DateRangePicker', () => {
  it('accepts an array-shaped [start, end] value (not just a {start, end} object)', () => {
    render(
      <DateRangePicker
        selectedOp={rangeOp}
        value={['2024-03-05T00:00:00.000Z', '2024-03-10T00:00:00.000Z']}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByRole('gridcell', { name: '5', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '10', selected: true })).toBeInTheDocument();
  });

  it('does not call onChange when the "Reset" shortcut clears the range to [null, null]', async () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker
        selectedOp={rangeOp}
        value={{ start: '2024-03-05T00:00:00.000Z', end: '2024-03-10T00:00:00.000Z' }}
        onChange={onChange}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders a single-date calendar for a non-range operator', () => {
    render(
      <DateRangePicker
        selectedOp={gteOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument();
  });
});
