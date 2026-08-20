import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterToggleButton from '../../src/components/FilterToggleButton';

describe('FilterToggleButton', () => {
  it('renders the default filter icon and tooltip text', async () => {
    render(<FilterToggleButton active={false} onClick={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    await userEvent.hover(button);
    expect(await screen.findByText('Filter')).toBeInTheDocument();
  });

  it('renders a custom icon and tooltip when provided', async () => {
    render(
      <FilterToggleButton
        active={false}
        onClick={() => {}}
        icon={<span data-testid='custom-icon' />}
        tooltip='Custom tooltip'
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    await userEvent.hover(screen.getByRole('button'));
    expect(await screen.findByText('Custom tooltip')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<FilterToggleButton active={false} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies active styling (primary border/color) when active is true', () => {
    render(<FilterToggleButton active onClick={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveStyle('border-color: #1976d2');
  });

  it('forwards extra IconButton props such as disabled', () => {
    render(<FilterToggleButton active={false} onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
