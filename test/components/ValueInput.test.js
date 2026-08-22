import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValueInput from '../../src/components/ValueInput';

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
