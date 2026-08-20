import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SelectValueInput from '../../src/components/SelectValueInput';

describe('SelectValueInput', () => {
  it('renders local choices without calling the fetcher', async () => {
    const fetcher = jest.fn();
    const choices = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];
    render(
      <SelectValueInput
        fetcher={fetcher}
        choices={choices}
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fetches options from choicesAPI lazily when opened', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: { results: [{ id: 1, name: 'Fetched' }] } });
    render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    expect(fetcher).not.toHaveBeenCalled();
    await userEvent.click(screen.getByLabelText('Value'));
    expect(fetcher).toHaveBeenCalledWith('/api/choices');
    expect(await screen.findByText('Fetched')).toBeInTheDocument();
  });

  it('normalizes items exposing full_name into a name field for labeling', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: { results: [{ id: 1, full_name: 'Full Name Co.' }] } });
    render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(await screen.findByText('Full Name Co.')).toBeInTheDocument();
  });

  it('accepts a bare array response (not wrapped in { results })', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: [{ id: 1, name: 'Bare' }] });
    render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(await screen.findByText('Bare')).toBeInTheDocument();
  });

  it('falls back to an empty option list when the fetch rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network error'));
    render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(screen.getByText('No options')).toBeInTheDocument();
  });

  it('calls onChange with the selected option when the user picks one', async () => {
    const onChange = jest.fn();
    const choices = [{ id: 1, name: 'Alpha' }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={null}
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.click(await screen.findByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith(choices[0]);
  });

  it('formats a code+title option using "code - title"', async () => {
    const choices = [{ id: 1, code: 'US', title: 'United States' }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices[0]}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('US - United States')).toBeInTheDocument();
  });
});
