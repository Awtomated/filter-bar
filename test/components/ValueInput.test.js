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

  it('renders a date picker when the selected operator input_field is "date"', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    // The date picker renders a sectioned input (month/day/year spinbuttons)
    // rather than a single labeled text input.
    expect(screen.getByRole('group', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toBeInTheDocument();
  });

  it('keeps the label shrunk to the border even without focus, so it does not sit on top of and hide the MM/DD/YYYY placeholder', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    const [label] = screen.getAllByText('Value');
    expect(label).toHaveAttribute('data-shrink', 'true');
  });

  it('renders a date picker when the field type is "datetime", even if the selected operator input_field is not "date"', () => {
    render(
      <ValueInput
        fieldDef={{ type: 'datetime' }}
        selectedOp={{ input_field: 'text' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByRole('group', { name: 'Value' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toBeInTheDocument();
  });

  it('defaults the date picker sections to MM/DD/YYYY when no dateFormat is given', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveTextContent('MM');
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('DD');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('YYYY');
  });

  it('renders the date picker sections in the given dateFormat order', () => {
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
        dateFormat='DD-MM-YYYY'
      />
    );
    const sections = screen.getAllByRole('spinbutton');
    expect(sections.map((el) => el.getAttribute('aria-label'))).toEqual(['Day', 'Month', 'Year']);
  });

  it('renders the given ISO value as a calendar day anchored to the given timezone', () => {
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
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveTextContent('03');
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('15');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('2024');
  });

  it('calls onChange and onCommit with a UTC-midnight ISO string when the user picks a full date', async () => {
    const onChange = jest.fn();
    const onCommit = jest.fn();
    render(
      <ValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onChange={onChange}
        onCommit={onCommit}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    await userEvent.click(screen.getByRole('spinbutton', { name: 'Month' }));
    await userEvent.keyboard('03152024');
    expect(onChange).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
    expect(onCommit).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
  });

  it('still commits the correct date when typed digit-by-digit against a real controlled value that re-renders on every callback', async () => {
    const onCommit = jest.fn();
    render(
      <StatefulValueInput
        fieldDef={{}}
        selectedOp={{ input_field: 'date' }}
        value={null}
        onCommit={onCommit}
        fetcher={jest.fn()}
        timezone='UTC'
      />
    );
    await userEvent.click(screen.getByRole('spinbutton', { name: 'Month' }));
    await userEvent.keyboard('03152024');
    expect(onCommit).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
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
  ])('does not call onCommit on blur when the value is %s', async (_label, value) => {
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
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('calls onCommit on blur when the value is non-empty', async () => {
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
    expect(onCommit).toHaveBeenCalledWith('hello');
  });
});
