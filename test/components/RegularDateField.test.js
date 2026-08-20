import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegularDateField from '../../src/components/RegularDateField';

describe('RegularDateField', () => {
  it('renders with an empty value when value is null', () => {
    render(<RegularDateField label='Start Date' value={null} onChange={() => {}} timezone='UTC' />);
    expect(screen.getByRole('group', { name: 'Start Date' })).toBeInTheDocument();
  });

  it('renders the given ISO value as a calendar day in the target timezone', () => {
    render(
      <RegularDateField
        label='Start Date'
        value='2024-03-15T00:00:00.000Z'
        onChange={() => {}}
        timezone='UTC'
      />
    );
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveTextContent('15');
    expect(screen.getByRole('spinbutton', { name: 'Month' })).toHaveTextContent('03');
    expect(screen.getByRole('spinbutton', { name: 'Year' })).toHaveTextContent('2024');
  });

  it('calls onChange with a UTC-midnight ISO string when the user types a full date', async () => {
    const onChange = jest.fn();
    render(<RegularDateField label='Start Date' value={null} onChange={onChange} timezone='UTC' />);
    const day = screen.getByRole('spinbutton', { name: 'Day' });
    await userEvent.click(day);
    await userEvent.keyboard('15032024');
    expect(onChange).toHaveBeenLastCalledWith('2024-03-15T00:00:00.000Z');
  });

  it('is disabled when the disabled prop is true', () => {
    render(
      <RegularDateField
        label='Start Date'
        value={null}
        onChange={() => {}}
        timezone='UTC'
        disabled
      />
    );
    expect(screen.getByRole('spinbutton', { name: 'Day' })).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});
