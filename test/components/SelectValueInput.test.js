import { act, render, screen, waitFor } from '@testing-library/react';
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

  it('ignores a fetch that resolves after the component has unmounted', async () => {
    let resolvePromise;
    const fetcher = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );
    const { unmount } = render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(fetcher).toHaveBeenCalled();
    unmount();
    await act(async () => {
      resolvePromise({ data: { results: [{ id: 1, name: 'Fetched' }] } });
      await Promise.resolve();
    });
  });

  it('ignores a fetch that rejects after the component has unmounted', async () => {
    let rejectPromise;
    const fetcher = jest.fn(
      () =>
        new Promise((_, reject) => {
          rejectPromise = reject;
        })
    );
    const { unmount } = render(
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI='/api/choices'
        label='Value'
        value={null}
        onChange={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    expect(fetcher).toHaveBeenCalled();
    unmount();
    await act(async () => {
      rejectPromise(new Error('too late'));
      await Promise.resolve();
    });
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

  it('uses selectConfig.formatOptionLabel over every built-in label fallback', () => {
    const choices = [{ id: 1, code: 'US', title: 'United States' }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices[0]}
        onChange={() => {}}
        selectConfig={{ formatOptionLabel: (opt) => `custom:${opt.id}` }}
      />
    );
    expect(screen.getByDisplayValue('custom:1')).toBeInTheDocument();
  });

  it('falls back to a stringified id when an option has no title, name, code, or language', () => {
    const choices = [{ id: 7 }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices[0]}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('7')).toBeInTheDocument();
  });

  it('formats a language_code+language option as "code - language"', () => {
    const choices = [{ id: 1, language_code: 'en', language: 'English' }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices[0]}
        onChange={() => {}}
      />
    );
    expect(screen.getByDisplayValue('en - English')).toBeInTheDocument();
  });

  it('allows picking more than one option when multiple is true, and stays open after a pick', async () => {
    const onChange = jest.fn();
    const choices = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
    ];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={[]}
        onChange={onChange}
        multiple
      />
    );
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.click(await screen.findByText('Alpha'));
    expect(onChange).toHaveBeenCalledWith([choices[0]]);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('renders only the first selected option as a chip plus a "+N" indicator, keeping the field height fixed', () => {
    const choices = [
      { id: 1, name: 'Alpha' },
      { id: 2, name: 'Beta' },
      { id: 3, name: 'Gamma' },
    ];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices}
        onChange={() => {}}
        multiple
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).not.toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('gives selected chips the brand purple label and border color', () => {
    const choices = [{ id: 1, name: 'Alpha' }];
    render(
      <SelectValueInput
        fetcher={jest.fn()}
        choices={choices}
        label='Value'
        value={choices}
        onChange={() => {}}
        multiple
      />
    );
    const chip = screen.getByText('Alpha').closest('.MuiChip-root');
    expect(chip).toHaveStyle({ color: '#460D91' });
  });
});
