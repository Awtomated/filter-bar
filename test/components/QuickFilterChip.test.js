import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickFilterChip from '../../src/components/QuickFilterChip';

describe('QuickFilterChip', () => {
  it('renders the plain label when count is 0', () => {
    render(
      <QuickFilterChip label='Status' count={0}>
        {() => <div>content</div>}
      </QuickFilterChip>
    );
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders the "label (count)" badge when count is greater than 0', () => {
    render(
      <QuickFilterChip label='Status' count={2}>
        {() => <div>content</div>}
      </QuickFilterChip>
    );
    expect(screen.getByText('Status (2)')).toBeInTheDocument();
  });

  it('renders displayLabel instead of the count badge when provided and count > 0', () => {
    render(
      <QuickFilterChip label='Date Range' count={1} displayLabel='15/03/24 - 01/04/24'>
        {() => <div>content</div>}
      </QuickFilterChip>
    );
    expect(screen.getByText('15/03/24 - 01/04/24')).toBeInTheDocument();
    expect(screen.queryByText('Date Range (1)')).not.toBeInTheDocument();
  });

  it('does not render a clear control when count is 0', () => {
    render(
      <QuickFilterChip label='Status' count={0} onClear={() => {}}>
        {() => <div>content</div>}
      </QuickFilterChip>
    );
    expect(screen.queryByRole('button', { name: 'Clear filter' })).not.toBeInTheDocument();
  });

  it('opens a popover rendering the children render-prop content on click', async () => {
    render(
      <QuickFilterChip label='Status'>
        {({ closePopover }) => <button onClick={closePopover}>Inner content</button>}
      </QuickFilterChip>
    );
    expect(screen.queryByText('Inner content')).not.toBeInTheDocument();
    await userEvent.click(screen.getByText('Status'));
    expect(await screen.findByText('Inner content')).toBeInTheDocument();
  });

  it('closes the popover via the render-prop closePopover callback', async () => {
    render(
      <QuickFilterChip label='Status'>
        {({ closePopover }) => <button onClick={closePopover}>Inner content</button>}
      </QuickFilterChip>
    );
    await userEvent.click(screen.getByText('Status'));
    const innerButton = await screen.findByText('Inner content');
    await userEvent.click(innerButton);
    expect(screen.queryByText('Inner content')).not.toBeInTheDocument();
  });

  it('calls onClear and stops propagation when the clear control is clicked, without opening the popover', async () => {
    const onClear = jest.fn();
    render(
      <QuickFilterChip label='Status' count={1} onClear={onClear}>
        {() => <div>Inner content</div>}
      </QuickFilterChip>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Inner content')).not.toBeInTheDocument();
  });

  it('calls onClear on Enter/Space keydown on the clear control', () => {
    const onClear = jest.fn();
    render(
      <QuickFilterChip label='Status' count={1} onClear={onClear}>
        {() => <div>Inner content</div>}
      </QuickFilterChip>
    );
    const clearControl = screen.getByRole('button', { name: 'Clear filter' });
    act(() => {
      clearControl.focus();
    });
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    act(() => {
      clearControl.dispatchEvent(enterEvent);
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('bumps openKey on every open so consumers can force a fresh mount', async () => {
    const seenKeys = [];
    render(
      <QuickFilterChip label='Status'>
        {({ openKey, closePopover }) => {
          seenKeys.push(openKey);
          return <button onClick={closePopover}>close</button>;
        }}
      </QuickFilterChip>
    );
    const chip = screen.getByText('Status');
    await userEvent.click(chip);
    await userEvent.click(screen.getByText('close'));
    await userEvent.click(chip);
    expect(seenKeys.length).toBeGreaterThanOrEqual(2);
    expect(seenKeys[seenKeys.length - 1]).toBeGreaterThan(seenKeys[0]);
  });
});
