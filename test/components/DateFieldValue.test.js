import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateFieldValue from '../../src/components/DateFieldValue';

const gteOp = {
  label: 'On or after',
  value: 'gte',
  query_param: 'startdate__gte',
  input_type: 'single',
  input_field: 'date',
};

const betweenOp = {
  label: 'Between',
  value: 'between',
  query_params: 'startdate_range',
  input_type: 'range',
  input_field: 'date',
};

describe('DateFieldValue', () => {
  it('renders a read-only field with no value shown when nothing is applied', () => {
    render(
      <DateFieldValue
        selectedOp={gteOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    const field = screen.getByLabelText('Value');
    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveValue('');
  });

  it('shows a single applied date formatted per dateFormat, anchored to the given timezone', () => {
    render(
      <DateFieldValue
        selectedOp={gteOp}
        value='2024-03-15T00:00:00.000Z'
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('03/15/2024');
  });

  it('shows an applied range as "start - end"', () => {
    render(
      <DateFieldValue
        selectedOp={betweenOp}
        value={{ start: '2024-03-05T00:00:00.000Z', end: '2024-03-10T00:00:00.000Z' }}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.getByLabelText('Value')).toHaveValue('03/05/2024 - 03/10/2024');
  });

  it('does not show a calendar until the field or its icon is clicked', () => {
    render(
      <DateFieldValue
        selectedOp={gteOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  it("opens a popover with the operator's shortcuts when the field is clicked", async () => {
    render(
      <DateFieldValue
        selectedOp={gteOp}
        value={null}
        onChange={() => {}}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument();
  });

  it('picking a day updates the field text, commits, and closes the popover', async () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    render(
      <DateFieldValue
        selectedOp={gteOp}
        value={null}
        onChange={onChange}
        onCommit={onCommit}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(onChange).toHaveBeenCalledWith(expect.any(String));
    expect(onCommit).toHaveBeenCalledWith(expect.any(String));
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument();
  });

  it('completing a range (two calendar days) commits and closes the popover', async () => {
    const onChange = jest.fn();
    render(
      <DateFieldValue
        selectedOp={betweenOp}
        value={null}
        onChange={onChange}
        timezone='UTC'
        dateFormat='MM/DD/YYYY'
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.click(screen.getByRole('gridcell', { name: '10' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'This Week' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('gridcell', { name: '20' }));

    expect(onChange).toHaveBeenCalledWith({ start: expect.any(String), end: expect.any(String) });
    expect(screen.queryByRole('button', { name: 'This Week' })).not.toBeInTheDocument();
  });
});
