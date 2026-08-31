import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValueInput from '../../src/components/ValueInput';

// Mirrors QuickFieldEditor's real controlled state (value/onChange wired to
// a live useState, re-rendering ValueInput — and so the DatePicker's
// controlled `value` — on every callback), unlike a bare jest.fn() `onChange`
// which never feeds anything back and so can't reproduce a controlled-value
// feedback bug caused by that re-render.
function StatefulValueInput(props) {
  const [value, setValue] = useState(props.value ?? null);
  return <ValueInput {...props} value={value} onChange={setValue} />;
}

describe('ValueInput', () => {
  it('renders an API-backed select when the selected operator input_field is "select"', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: { results: [{ id: 1, name: 'Alpha' }] } });
    render(
      <ValueInput
        fieldDef={{ fetch_url: '/api/choices' }}
        selectedOp={{ input_field: 'select' }}
        value={null}
        onChange={() => {}}
        fetcher={fetcher}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    expect(fetcher).toHaveBeenCalledWith('/api/choices');
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
  });

  it('renders a local-options select when the selected operator input_field is "select", mapping label to title', async () => {
    render(
      <ValueInput
        fieldDef={{ options: [{ id: 1, label: 'Open' }] }}
        selectedOp={{ input_field: 'select' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(await screen.findByText('Open')).toBeInTheDocument();
  });

  it('renders a plain text field — not a select — when fieldDef has choices but the selected operator input_field is "text"', () => {
    render(
      <ValueInput
        fieldDef={{ fetch_url: '/api/choices' }}
        selectedOp={{ input_field: 'text' }}
        value=''
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders a multi-select and forwards the array value on change when input_type is "multiple"', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      data: {
        results: [
          { id: 1, name: 'Alpha' },
          { id: 2, name: 'Beta' },
        ],
      },
    });
    const onChange = jest.fn();
    render(
      <ValueInput
        fieldDef={{ fetch_url: '/api/choices' }}
        selectedOp={{ input_field: 'select', input_type: 'multiple' }}
        value={null}
        onChange={onChange}
        fetcher={fetcher}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.click(await screen.findByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith([{ id: 1, name: 'Alpha' }]);
    // A multi-select keeps its menu open after a pick, unlike single-select.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders a calendar when the selected operator input_field is "date"', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value='2024-03-01T00:00:00.000Z'
        onChange={() => {}}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    // A calendar day grid, not a text field — no "Value" labeled input.
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '15' })).toBeInTheDocument();
  });

  it('renders a calendar when the field type is "datetime", even if the selected operator input_field is not "date"', () => {
    render(
      <ValueInput
        fieldDef={{ type: 'datetime' }}
        selectedOp={{ input_field: 'text' }}
        value='2024-03-01T00:00:00.000Z'
        onChange={() => {}}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    expect(screen.getByRole('gridcell', { name: '15' })).toBeInTheDocument();
  });

  it('shows the given ISO value selected on the calendar, anchored to the given timezone', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value='2024-03-15T00:00:00.000Z'
        onChange={() => {}}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    expect(screen.getByRole('gridcell', { name: '15', selected: true })).toBeInTheDocument();
  });

  it('calls onChange and onCommit with a UTC-midnight ISO string when the user picks a day', async () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value='2024-03-01T00:00:00.000Z'
        onChange={onChange}
        onCommit={onCommit}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    await userEvent.click(screen.getByRole('gridcell', { name: '15' }));
    expect(onChange).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
    expect(onCommit).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
  });

  it('still commits the correct date against a real controlled value that re-renders on every callback', async () => {
    const onCommit = jest.fn();
    render(
      <StatefulValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value='2024-03-01T00:00:00.000Z'
        onCommit={onCommit}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    await userEvent.click(screen.getByRole('gridcell', { name: '15' }));
    expect(onCommit).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
  });

  it("shows the operator's gte/lte shortcuts above the calendar", () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date', input_type: 'single', value: 'gte' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument();
  });

  it('renders the range calendar with a start/end value when the selected operator is range-shaped', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date', input_type: 'range', value: 'between' }}
        value={{ start: '2024-03-05T00:00:00.000Z', end: '2024-03-10T00:00:00.000Z' }}
        onChange={() => {}}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    expect(screen.getByRole('button', { name: 'This Week' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '5', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: '10', selected: true })).toBeInTheDocument();
  });

  it('renders a number text field when the selected operator input_field is "number"', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'number' }}
        value='5'
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    expect(input).toHaveAttribute('type', 'number');
    expect(input).toHaveValue(5);
  });

  it('renders a plain text field by default and calls onChange as the user types', async () => {
    const onChange = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value=''
        onChange={onChange}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it.each([
    ['empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('does not call onCommit on Enter when the value is %s', async (_label, value) => {
    const onCommit = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value={value}
        onChange={() => {}}
        onCommit={onCommit}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('does not call onCommit on blur', async () => {
    const onCommit = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value='hello'
        onChange={() => {}}
        onCommit={onCommit}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('calls onCommit on Enter when the value is non-empty', async () => {
    const onCommit = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value='hello'
        onChange={() => {}}
        onCommit={onCommit}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    expect(onCommit).toHaveBeenCalledWith('hello');
  });

  it('calls closePopover after committing on Enter', async () => {
    const onCommit = jest.fn();
    const closePopover = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value='hello'
        onChange={() => {}}
        onCommit={onCommit}
        closePopover={closePopover}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    expect(closePopover).toHaveBeenCalled();
  });

  it('does not call closePopover on Enter when the value is empty', async () => {
    const closePopover = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'text' }}
        value=''
        onChange={() => {}}
        closePopover={closePopover}
        fetcher={jest.fn()}
      />
    );
    const input = screen.getByLabelText('Value');
    await userEvent.click(input);
    await userEvent.keyboard('{Enter}');
    expect(closePopover).not.toHaveBeenCalled();
  });
});
