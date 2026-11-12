import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DynamicFilterBar,
  FilterChip,
  FilterToggleButton,
  buildQueryParams,
} from '../../src/shadcn';
import { dayToIso, todayIn } from '../../src/shadcn/dates';

const op = (label, value, queryParam, inputType = 'single', inputField = 'text', extra = {}) => ({
  label,
  value,
  query_param: queryParam,
  input_type: inputType,
  input_field: inputField,
  ...extra,
});

const SCHEMA = {
  filters: {
    name: {
      field: 'name',
      label: 'Name',
      type: 'string',
      default_operator: 'icontains',
      operators: [
        op('Contains', 'icontains', 'name__icontains'),
        op('Starts with', 'istartswith', 'name__istartswith'),
        op('Is empty', 'isnull', 'name__isnull', 'none', null, { query_value: 'true' }),
      ],
    },
    status: {
      field: 'status',
      label: 'Status',
      default_operator: 'in',
      operators: [op('Is any of', 'in', 'status__in', 'multiple', 'select')],
      options: [
        { id: 1, label: 'Lead', value: 'lead' },
        { id: 2, label: 'Customer', value: 'customer' },
      ],
    },
    country: {
      field: 'country',
      label: 'Country',
      default_operator: 'exact',
      operators: [op('Is', 'exact', 'country', 'single', 'select')],
      fetch_url: '/countries/',
    },
    owner: {
      field: 'owner',
      label: 'Owner',
      default_operator: 'in',
      operators: [op('Is any of', 'in', 'owner__in', 'multiple', 'select')],
      fetch_url: '/users/',
    },
    company: {
      field: 'company',
      label: 'Company',
      field_key: 'select',
      default_operator: 'exact',
      operators: [
        op('Is', 'exact', 'company', 'single', 'select'),
        op('Name contains', 'icontains', 'company__icontains'),
      ],
      fetch_url: '/companies/',
    },
    age: {
      field: 'age',
      label: 'Age',
      type: 'number',
      default_operator: 'gte',
      operators: [op('At least', 'gte', 'age__gte', 'single', 'number')],
    },
    created: {
      field: 'created',
      label: 'Created',
      type: 'datetime',
      default_operator: 'gte',
      operators: [
        op('On or after', 'gte', 'created__gte', 'single', 'date'),
        {
          label: 'Between',
          value: 'range',
          query_params: 'created__range',
          input_type: 'range',
          input_field: 'date',
        },
      ],
    },
    archived: {
      field: 'archived',
      label: 'Archived',
      default_operator: 'isnull',
      operators: [op('Is archived', 'isnull', 'archived', 'none', null, { query_value: 'true' })],
    },
  },
  most_used_filters: ['name', 'status'],
};

const ROUTES = {
  '/schema/': SCHEMA,
  '/countries/': {
    results: [
      { id: 1, name: 'India' },
      { id: 3, name: 'United Kingdom' },
    ],
  },
  '/users/': [
    { id: 2, full_name: 'Priya Nair', department: 'Sales' },
    { id: 5, full_name: 'Kenji Tanaka', department: 'Support' },
  ],
  '/companies/': [{ id: 1, title: 'Acme' }],
};

function makeFetcher(routes = ROUTES) {
  return jest.fn((url) =>
    routes[url] ? Promise.resolve({ data: routes[url] }) : Promise.reject(new Error('500'))
  );
}

async function renderBar(props = {}) {
  const onApply = jest.fn();
  const onFiltersChange = jest.fn();
  const fetcher = props.fetcher ?? makeFetcher();
  const user = userEvent.setup();
  const utils = render(
    <DynamicFilterBar
      filterApiUrl='/schema/'
      fetcher={fetcher}
      onApply={onApply}
      onFiltersChange={onFiltersChange}
      timezone='UTC'
      {...props}
    />
  );
  await waitFor(() => expect(document.querySelector('[data-slot=filter-bar]')).not.toBeNull());
  return { ...utils, onApply, onFiltersChange, fetcher, user };
}

const chips = () =>
  Array.from(document.querySelectorAll('[data-slot=filter-chip]')).map(
    (chip) => `${chip.dataset.state}:${chip.textContent}`
  );
const lastParams = (onApply) => onApply.mock.calls[onApply.mock.calls.length - 1][0];

describe('shadcn DynamicFilterBar', () => {
  it('shows the two main filters as dashed (empty) chips, then Add filter', async () => {
    await renderBar();
    expect(chips()).toEqual(['empty:Name', 'empty:Status']);
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
  });

  it('pins as many chips as maxQuickChips, starting on a most_used operator', async () => {
    const { user } = await renderBar({
      maxQuickChips: 3,
      fetcher: makeFetcher({
        ...ROUTES,
        '/schema/': { ...SCHEMA, most_used_filters: ['name__istartswith', 'missing', 'name'] },
      }),
    });
    // "name" twice counts once; the rest is backfilled in schema order.
    expect(chips()).toEqual(['empty:Name', 'empty:Status', 'empty:Country']);
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(screen.getByRole('button', { name: 'Operator: Starts with' })).toBeInTheDocument();
  });

  it('applies a text filter on Enter and turns the chip solid', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('an{Enter}');
    expect(lastParams(onApply)).toEqual({ name__icontains: 'an' });
    expect(chips()[0]).toBe('applied:Namecontainsan');
  });

  it('text: no Apply button and no request while typing; Enter applies and closes', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    await user.keyboard('ana');
    await new Promise((r) => setTimeout(r, 600));
    expect(onApply).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(lastParams(onApply)).toEqual({ name__icontains: 'ana' });
    expect(screen.queryByRole('textbox', { name: 'Value' })).not.toBeInTheDocument();
  });

  it('text: applies on blur if the user forgot Enter, once', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('ana');
    await user.tab(); // focus leaves the field
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(lastParams(onApply)).toEqual({ name__icontains: 'ana' });
    expect(chips()[0]).toBe('applied:Namecontainsana');
    // Closing afterwards doesn't send it again.
    await user.keyboard('{Escape}');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('text: closing the popover without Enter applies what was typed', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('kenji{Escape}');
    expect(lastParams(onApply)).toEqual({ name__icontains: 'kenji' });
    expect(chips()[0]).toBe('applied:Namecontainskenji');
  });

  it('text: whitespace or an unchanged value never applies; Enter just closes', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('   {Enter}');
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Value' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('an{Enter}');
    await user.click(screen.getByRole('button', { name: 'an' }));
    await user.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('text: clearing the value and confirming removes the filter', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('an{Enter}');
    await user.click(screen.getByRole('button', { name: 'an' }));
    await user.clear(screen.getByRole('textbox', { name: 'Value' }));
    await user.keyboard('{Enter}');
    expect(lastParams(onApply)).toEqual({});
    expect(chips()[0]).toBe('empty:Name');
  });

  it('changes operators from the chip: keeps a fitting value, applies "none" at once', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('an{Enter}');

    await user.click(screen.getByRole('button', { name: 'contains' }));
    const list = screen.getByRole('listbox', { name: 'Operator' });
    expect(within(list).getByRole('option', { name: 'Contains' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await user.click(within(list).getByRole('option', { name: 'Starts with' }));
    expect(lastParams(onApply)).toEqual({ name__istartswith: 'an' });

    await user.click(screen.getByRole('button', { name: 'starts with' }));
    await user.click(screen.getByRole('option', { name: 'Is empty' }));
    expect(lastParams(onApply)).toEqual({ name__isnull: 'true' });
    expect(chips()[0]).toBe('applied:Nameis empty');
  });

  it('switches editor with the operator and keeps the applied value until a new one is set', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Company' }));
    await user.click(await screen.findByRole('option', { name: 'Acme' }));
    expect(lastParams(onApply)).toEqual({ company: '1' });

    // "Is" (list) -> "Name contains" (text) can't keep the choice: the header
    // switches to the text editor, the applied filter stays until submitted.
    await user.click(screen.getByRole('button', { name: 'Acme' }));
    await user.click(screen.getByRole('button', { name: 'Operator: Is' }));
    await user.click(screen.getByRole('option', { name: 'Name contains' }));
    expect(screen.getByRole('textbox', { name: 'Value' })).toHaveValue('');
    expect(chips()).toContain('applied:CompanyisAcme');
    await user.keyboard('ac{Enter}');
    expect(lastParams(onApply)).toEqual({ company__icontains: 'ac' });
  });

  it('multi-select: check marks, "is" for one value, "is any of" for two, dashed when emptied', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Status' }));
    await user.click(screen.getByRole('option', { name: 'Lead' }));
    expect(chips()[1]).toBe('applied:StatusisLead');
    expect(screen.getByRole('option', { name: 'Lead' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('option', { name: 'Customer' }));
    expect(chips()[1]).toBe('applied:Statusis any ofLead, Customer');
    expect(lastParams(onApply)).toEqual({ status__in: 'lead,customer' });

    await user.click(screen.getByRole('option', { name: 'Lead' }));
    await user.click(screen.getByRole('option', { name: 'Customer' }));
    expect(lastParams(onApply)).toEqual({});
    expect(chips()[1]).toBe('empty:Status');
  });

  it('single select from a paginated fetch_url closes on pick and caches the list', async () => {
    const { user, onApply, fetcher } = await renderBar();
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Country' }));
    await user.click(await screen.findByRole('option', { name: 'United Kingdom' }));
    expect(lastParams(onApply)).toEqual({ country: '3' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(chips()).toContain('applied:CountryisUnited Kingdom');

    await user.click(screen.getByRole('button', { name: 'United Kingdom' }));
    expect(screen.getByRole('option', { name: 'United Kingdom' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(fetcher.mock.calls.filter(([url]) => url === '/countries/')).toHaveLength(1);
  });

  it('Add filter lists only fields without a chip; picking one adds a dashed chip that × removes', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    const menu = screen.getByRole('listbox', { name: 'Filter by…' });
    expect(within(menu).queryByRole('option', { name: 'Name' })).not.toBeInTheDocument();
    await user.keyboard('ag');
    expect(
      within(menu)
        .getAllByRole('option')
        .map((o) => o.textContent)
    ).toEqual(['Age']);
    await user.keyboard('{Enter}');

    // Number editor opens for the new chip.
    expect(chips()).toEqual(['empty:Name', 'empty:Status', 'empty:Age']);
    expect(screen.getByRole('spinbutton', { name: 'Value' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(chips()).toContain('empty:Age');

    await user.click(screen.getByRole('button', { name: 'Clear filter: Age' }));
    expect(chips()).toEqual(['empty:Name', 'empty:Status']);
    expect(onApply).not.toHaveBeenCalled();
  });

  it('hides Add filter once every field is a chip', async () => {
    const fields = { name: SCHEMA.filters.name, status: SCHEMA.filters.status };
    const { user } = await renderBar({
      maxQuickChips: 1,
      fetcher: makeFetcher({ '/schema/': { filters: fields, most_used_filters: ['name'] } }),
    });
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Status' }));
    expect(screen.queryByRole('button', { name: /add filter/i })).not.toBeInTheDocument();
  });

  it('× on an applied main filter empties it; Clear all resets everything', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: 'Name' }));
    await user.keyboard('an{Enter}');
    await user.click(screen.getByRole('button', { name: 'Clear filter: Name' }));
    expect(chips()[0]).toBe('empty:Name');
    expect(lastParams(onApply)).toEqual({});
    expect(screen.queryByRole('button', { name: 'Clear filter: Name' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Archived' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(lastParams(onApply)).toEqual({ archived: 'true' });
    expect(chips()).toContain('applied:Archivedis archived');

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(lastParams(onApply)).toEqual({});
    expect(chips()).toEqual(['empty:Name', 'empty:Status']);
  });

  it('date: a shortcut applies today as a UTC-midnight ISO day', async () => {
    const { user, onApply } = await renderBar();
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Created' }));
    await user.click(screen.getByRole('button', { name: 'Today' }));
    // Same value as the MUI version: midnight of today in the bar's timezone.
    expect(lastParams(onApply)).toEqual({ created__gte: dayToIso(todayIn('UTC'), 'UTC') });
    expect(lastParams(onApply).created__gte).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
  });

  it('date range: two clicks apply the range; months can be paged', async () => {
    const { user, onApply } = await renderBar({ dateFormat: 'dd/MM/yyyy' });
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Created' }));
    await user.click(screen.getByRole('button', { name: 'Operator: On or after' }));
    await user.click(screen.getByRole('option', { name: 'Between' }));

    await user.click(screen.getByRole('button', { name: 'Next month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    const grid = screen.getByRole('grid');
    const month = grid.getAttribute('aria-label'); // e.g. "November 2026"
    await user.click(within(grid).getByRole('button', { name: `15 ${month}` }));
    await user.click(within(grid).getByRole('button', { name: `3 ${month}` }));

    const params = lastParams(onApply);
    const [start, end] = params.created__range.split(',');
    expect(start < end).toBe(true);
    expect(start).toMatch(/-03T00:00:00Z$/);
    expect(end).toMatch(/-15T00:00:00Z$/);
    expect(chips().find((c) => c.includes('Created'))).toMatch(/applied:Createdbetween3–15 /);
  });

  it('range shortcuts apply a whole window', async () => {
    const { user, onApply } = await renderBar({
      appliedFilters: [
        {
          id: 'r',
          field: 'created',
          operatorId: 'range',
          value: { start: '2026-11-01T00:00:00.000Z', end: '2026-11-15T00:00:00.000Z' },
        },
      ],
    });
    expect(chips()).toContain('applied:Createdbetween1–15 Nov');
    await user.click(screen.getByRole('button', { name: '1–15 Nov' }));
    await user.click(screen.getByRole('button', { name: 'Current Month' }));
    // Like the MUI version: from the 1st at midnight to the last day at 23:59:59.
    expect(lastParams(onApply).created__range).toMatch(
      /-01T00:00:00Z,\d{4}-\d{2}-\d{2}T23:59:59Z$/
    );
  });

  it('starts from appliedFilters: bare ids get their labels without onApply on mount', async () => {
    const { fetcher, onApply, onFiltersChange } = await renderBar({
      appliedFilters: [
        { id: 'a', field: 'owner', operatorId: 'owner__in', value: [{ id: 2 }, { id: 5 }] },
        { id: 'b', field: 'status', operatorId: 'status__in', value: [{ id: 2 }] },
      ],
    });
    await waitFor(() =>
      expect(chips()).toContain('applied:Owneris any ofPriya Nair, Kenji Tanaka')
    );
    expect(chips()).toContain('applied:StatusisCustomer');
    expect(fetcher).toHaveBeenCalledWith('/users/');
    expect(onApply).not.toHaveBeenCalled();
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ field: 'owner' })])
    );
  });

  it('a failed choices request shows "No matches found"', async () => {
    const { user } = await renderBar({
      fetcher: makeFetcher({ '/schema/': SCHEMA }),
    });
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Country' }));
    expect(await screen.findByText('No matches found')).toBeInTheDocument();
  });

  it('renders nothing when the schema fails, a spinner while it loads', async () => {
    let reject;
    const fetcher = jest.fn(
      () =>
        new Promise((_, r) => {
          reject = r;
        })
    );
    const { container } = render(<DynamicFilterBar filterApiUrl='/schema/' fetcher={fetcher} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    reject(new Error('500'));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('renders nothing without filterApiUrl or fields', async () => {
    const { container } = render(<DynamicFilterBar fetcher={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies fieldProps: transform, grouping, custom labels (search included)', async () => {
    const { user, onApply } = await renderBar({
      fieldProps: {
        owner: {
          icon: <svg data-testid='owner-icon' />,
          fieldDef: {
            select: {
              grouping: true,
              groupingKey: 'department',
              formatOptionLabel: (c) => `${c.name}!`,
            },
          },
        },
      },
    });
    await user.click(screen.getByRole('button', { name: /add filter/i }));
    await user.click(screen.getByRole('option', { name: 'Owner' }));
    const list = await screen.findByRole('listbox', { name: 'Search owner...' });
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(2));
    expect(within(list).getByText('Sales')).toBeInTheDocument();
    expect(within(list).getByText('Support')).toBeInTheDocument();

    await user.keyboard('kenji');
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    expect(lastParams(onApply)).toEqual({ owner__in: '5' });
    expect(chips()).toContain('applied:OwnerisKenji Tanaka!');
    expect(screen.getByTestId('owner-icon')).toBeInTheDocument();
  });

  it('uses custom labels and classNames', async () => {
    const { user } = await renderBar({
      labels: { addFilter: 'Añadir filtro', filterBy: 'Filtrar por…' },
      classNames: { chip: 'rounded-md', addFilter: 'custom-add' },
    });
    expect(screen.getByRole('button', { name: 'Añadir filtro' })).toHaveClass('custom-add');
    expect(document.querySelector('[data-slot=filter-chip]')).toHaveClass('rounded-md');
    await user.click(screen.getByRole('button', { name: 'Añadir filtro' }));
    expect(screen.getByRole('combobox', { name: 'Filtrar por…' })).toHaveFocus();
  });

  it('builds the same params as the shared helper', () => {
    expect(buildQueryParams([], [])).toEqual({});
  });
});

describe('shadcn FilterToggleButton', () => {
  it('icon-only, pressed state follows `active`', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(<FilterToggleButton active={false} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Filter' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    expect(onClick).toHaveBeenCalled();
    rerender(<FilterToggleButton active onClick={onClick} />);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('border-primary');
  });

  it('labelled with a count', () => {
    render(<FilterToggleButton active label='Filter' count={3} />);
    expect(screen.getByRole('button', { name: 'Filter · 3' })).toHaveAttribute(
      'data-variant',
      'secondary'
    );
  });
});

describe('shadcn FilterChip', () => {
  it('renders a fixed operator as text when there is a single operator', () => {
    render(<FilterChip applied label='Email' operatorText='contains' valueText='acme' pending />);
    expect(screen.getByText('contains').tagName).toBe('SPAN');
    expect(screen.getByRole('button', { name: 'acme' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button', { name: /clear filter/i })).not.toBeInTheDocument();
  });
});
