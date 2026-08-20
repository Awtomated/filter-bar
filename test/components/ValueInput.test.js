import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValueInput from '../../src/components/ValueInput';

describe('ValueInput', () => {
  it('renders an API-backed select when fieldDef has a fetch_url', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: { results: [{ id: 1, name: 'Alpha' }] } });
    render(
      <ValueInput
        fieldDef={{ fetch_url: '/api/choices' }}
        selectedOp={{}}
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

  it('renders a local-options select when fieldDef has options, mapping label to title', async () => {
    render(
      <ValueInput
        fieldDef={{ options: [{ id: 1, label: 'Open' }] }}
        selectedOp={{}}
        value={null}
        onChange={() => {}}
        fetcher={jest.fn()}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(await screen.findByText('Open')).toBeInTheDocument();
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
});
