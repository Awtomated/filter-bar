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

const lteOp = {
  label: 'On or before',
  value: 'lte',
  query_param: 'startdate__lte',
  input_type: 'single',
  input_field: 'date',
};

const exactOp = {
  label: 'Equals',
  value: 'exact',
  query_param: 'startdate',
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

  it('shows "Today"/"Yesterday" shortcuts for the "lte" operator', () => {
    render(
      <DateRangePicker
        selectedOp={lteOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yesterday' })).toBeInTheDocument();
  });

  it('shows no shortcuts for an operator that is neither "gte" nor "lte"', () => {
    render(
      <DateRangePicker
        selectedOp={exactOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yesterday' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomorrow' })).not.toBeInTheDocument();
  });

  it('calls onChange with the tz-anchored calendar day when a single date is picked', async () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker
        selectedOp={gteOp}
        value='2024-03-05T00:00:00.000Z'
        onChange={onChange}
        timezone='America/New_York'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByRole('gridcell', { name: '10' }));
    expect(onChange).toHaveBeenCalledWith('2024-03-10T00:00:00-05:00');
  });

  it('calls onChange with tz-anchored start/end once a full range is picked', async () => {
    const onChange = jest.fn();
    render(
      <DateRangePicker
        selectedOp={rangeOp}
        value={{ start: '2024-03-05T00:00:00.000Z', end: '2024-03-06T00:00:00.000Z' }}
        onChange={onChange}
        timezone='America/New_York'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByRole('gridcell', { name: '10' }));
    await userEvent.click(screen.getByRole('gridcell', { name: '15' }));
    expect(onChange).toHaveBeenCalledWith({
      start: '2024-03-10T00:00:00-05:00',
      end: '2024-03-15T00:00:00-04:00',
    });
  });
});
