import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DynamicFilterBar from '../../src/components/DynamicFilterBar';

function makeConfig(overrides) {
  return {
    filters: {
      name: {
        field: 'name',
        label: 'Name',
        operators: [
          {
            label: 'Contains',
            value: 'icontains',
            query_param: 'name__icontains',
            input_type: 'single',
            input_field: 'text',
          },
        ],
      },
      status: {
        field: 'status',
        label: 'Status',
        options: [
          { id: 1, label: 'Open', value: 'open' },
          { id: 2, label: 'Closed', value: 'closed' },
        ],
        operators: [
          {
            label: 'Is',
            value: 'exact',
            query_param: 'status',
            input_type: 'single',
            input_field: 'select',
          },
        ],
      },
    },
    most_used_filters: [],
    ...overrides,
  };
}

describe('DynamicFilterBar', () => {
  it('renders nothing while the filter config is loading', () => {
    const fetcher = jest.fn(() => new Promise(() => {}));
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(document.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
  });

  it('renders nothing once loaded when the config has no filters', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: { filters: {} } });
    const { container } = render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders a quick chip for a non-selection field too, once it fits the chip budget', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    // Both fields fit within the default 5-chip budget, so both become their
    // own quick chip regardless of field type, and nothing is left over for
    // the trailing "Filter" chip.
    expect(await screen.findByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Filter')).not.toBeInTheDocument();
  });

  it('renders a selection quick-chip for an options-backed field even without most_used_filters', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Status')).toBeInTheDocument();
  });

  it('shows a most_used_filters entry first and backfills the rest of the chip budget', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: makeConfig({ most_used_filters: ['name'] }) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Name')).toBeInTheDocument();
    // Status wasn't most-used, but with only 2 fields total it still fits
    // the 5-chip budget and gets backfilled in rather than folding into
    // the trailing "Filter" chip.
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.queryByText('Filter')).not.toBeInTheDocument();
  });

  it('calls onApply with query params derived from an applied quick filter, committed on Enter', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: makeConfig({ most_used_filters: ['name'] }) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    await userEvent.click(await screen.findByText('Name'));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledWith({ name__icontains: 'acme' });
  });

  it('closes the quick-chip popover after the value commits on Enter', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValue({ data: makeConfig({ most_used_filters: ['name'] }) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={() => {}} />);
    await userEvent.click(await screen.findByText('Name'));
    const input = await screen.findByLabelText('Value');
    await userEvent.type(input, 'acme');
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByLabelText('Value')).not.toBeInTheDocument();
  });

  it('calls onFiltersChange with the initial appliedFilters on mount', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onFiltersChange = jest.fn();
    const appliedFilters = [{ id: '1', field: 'name', operatorId: 'name__icontains', value: 'x' }];
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        appliedFilters={appliedFilters}
        onFiltersChange={onFiltersChange}
      />
    );
    await waitFor(() => expect(onFiltersChange).toHaveBeenCalledWith(appliedFilters));
  });

  it('applies a choicesMap override so the overridden field renders as a selection chip', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        choicesMap={{ name: { options: [{ id: 1, label: 'Acme', value: 'acme' }] } }}
      />
    );
    const chip = await screen.findByText('Name');
    await userEvent.click(chip);
    expect(await screen.findByText('Acme')).toBeInTheDocument();
  });

  it('silently renders no fields when the config fetch rejects', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('network error'));
    const { container } = render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('applies and clears a selection quick chip, calling onApply with the derived query params', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    const statusChip = await screen.findByText('Status');
    await userEvent.click(statusChip);
    await userEvent.click(await screen.findByText('Open'));
    expect(onApply).toHaveBeenLastCalledWith({ status: 'open' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onApply).toHaveBeenLastCalledWith({});
  });

  it("renders a most-used date field as its own quick chip, opening a calendar with its operator's shortcuts", async () => {
    const fetcher = jest.fn().mockResolvedValue({
      data: makeConfig({
        filters: {
          startdate: {
            field: 'startdate',
            label: 'Start Date',
            operators: [
              {
                label: 'From',
                value: 'gte',
                query_param: 'startdate__gte',
                input_type: 'single',
                input_field: 'date',
              },
            ],
          },
        },
        most_used_filters: ['startdate'],
      }),
    });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    const chip = await screen.findByText('Start Date');
    await userEvent.click(chip);
    // The single operator's value ("gte") drives the shortcut set.
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument();
  });

  it('applies the correct UTC-midnight ISO value when a calendar shortcut is picked', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      data: makeConfig({
        filters: {
          startdate: {
            field: 'startdate',
            label: 'Start Date',
            operators: [
              {
                label: 'From',
                value: 'gte',
                query_param: 'startdate__gte',
                input_type: 'single',
                input_field: 'date',
              },
            ],
          },
        },
        most_used_filters: ['startdate'],
      }),
    });
    const onApply = jest.fn();
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        onApply={onApply}
        timezone='UTC'
      />
    );
    const chip = await screen.findByText('Start Date');
    await userEvent.click(chip);
    await userEvent.click(screen.getByRole('button', { name: 'Today' }));

    expect(onApply).toHaveBeenLastCalledWith({
      startdate__gte: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/),
    });
  });

  it('applies and clears filters via the trailing "Filter" builder chip', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    const onApply = jest.fn();
    // maxQuickChips=0 forces both fields to fold into the trailing "Filter"
    // builder chip instead of becoming their own quick chips, so this test
    // can exercise the builder in isolation.
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        onApply={onApply}
        maxQuickChips={0}
      />
    );
    await userEvent.click(await screen.findByText('Filter'));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenLastCalledWith({ name__icontains: 'acme' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(onApply).toHaveBeenLastCalledWith({});
  });
});

// Seven fields (mixing text and options-backed selection fields) so the
// 5-chip budget and its priority order — most_used_filters first, then
// backfill from the remaining fields, regardless of field type — actually
// gets exercised.
function manyFieldsConfig(mostUsedFilters) {
  const fieldNames = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf'];
  const filters = {};
  fieldNames.forEach((name, index) => {
    const isSelection = index % 2 === 1;
    filters[name] = {
      field: name,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      options: isSelection ? [{ id: 1, label: 'One', value: 'one' }] : undefined,
      operators: [
        {
          label: 'Is',
          value: 'exact',
          query_param: name,
          input_type: 'single',
          input_field: isSelection ? 'select' : 'text',
        },
      ],
    };
  });
  return { filters, most_used_filters: mostUsedFilters };
}

describe('DynamicFilterBar quick-chip budget', () => {
  it('takes the first maxQuickChips fields in order, of any type, when there is no most_used_filters data', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: manyFieldsConfig([]) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.getByText('Echo')).toBeInTheDocument();
    expect(screen.queryByText('Foxtrot')).not.toBeInTheDocument();
    expect(screen.queryByText('Golf')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows one most_used_filters entry first, then backfills 4 more from the rest', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: manyFieldsConfig(['golf']) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Golf')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.queryByText('Echo')).not.toBeInTheDocument();
    expect(screen.queryByText('Foxtrot')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows two most_used_filters entries first, then backfills 3 more from the rest', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: manyFieldsConfig(['golf', 'foxtrot']) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Golf')).toBeInTheDocument();
    expect(screen.getByText('Foxtrot')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.queryByText('Delta')).not.toBeInTheDocument();
    expect(screen.queryByText('Echo')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('shows all 5 most_used_filters entries with no backfill when there are exactly maxQuickChips of them', async () => {
    const fetcher = jest.fn().mockResolvedValue({
      data: manyFieldsConfig(['golf', 'foxtrot', 'echo', 'delta', 'charlie']),
    });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    expect(await screen.findByText('Golf')).toBeInTheDocument();
    expect(screen.getByText('Foxtrot')).toBeInTheDocument();
    expect(screen.getByText('Echo')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    // alpha and bravo overflow into the trailing "Filter" chip instead.
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('Bravo')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it('does not let a choicesMap override force an extra field past the chip budget', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: manyFieldsConfig([]) });
    render(
      <DynamicFilterBar
        filterApiUrl='/api/config'
        fetcher={fetcher}
        choicesMap={{ golf: { options: [{ id: 1, label: 'Acme', value: 'acme' }] } }}
      />
    );
    // Same first-5 fields as with no choicesMap at all — golf is 6th in
    // filterFields order and choicesMap doesn't move it up the priority
    // list, it only would've overridden its options if it were rendered.
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
    expect(screen.getByText('Echo')).toBeInTheDocument();
    expect(screen.queryByText('Foxtrot')).not.toBeInTheDocument();
    expect(screen.queryByText('Golf')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });
});

function multiOpConfig(overrides) {
  return {
    filters: {
      name: {
        field: 'name',
        label: 'Name',
        default_operator: 'icontains',
        operators: [
          {
            label: 'Contains',
            value: 'icontains',
            query_param: 'name__icontains',
            input_type: 'single',
            input_field: 'text',
          },
          {
            label: 'Equals',
            value: 'exact',
            query_param: 'name__exact',
            input_type: 'single',
            input_field: 'text',
          },
        ],
      },
      status: {
        field: 'status',
        label: 'Status',
        default_operator: 'exact',
        options: [
          { id: 1, label: 'Open', value: 'open' },
          { id: 2, label: 'Closed', value: 'closed' },
        ],
        operators: [
          {
            label: 'Is',
            value: 'exact',
            query_param: 'status',
            input_type: 'single',
            input_field: 'select',
          },
          {
            label: 'Is not',
            value: 'exclude',
            query_param: 'status__exclude',
            input_type: 'single',
            input_field: 'select',
          },
        ],
      },
    },
    most_used_filters: ['name', 'status'],
    ...overrides,
  };
}

// FilterRow's Select components don't wire an explicit htmlFor/id between
// their InputLabel and combobox, so getByLabelText can't resolve them —
// locate the combobox via the FormControl that wraps the matching label
// text, same as FilterRow.test.js does.
function getSelectByLabel(text) {
  const label = screen.getAllByText(text).find((el) => el.tagName === 'LABEL');
  const formControl = label.closest('.MuiFormControl-root');
  return within(formControl).getByRole('combobox');
}

describe('DynamicFilterBar operator selection in quick-chips', () => {
  it('shows only an operator select and value field (no close icon, no field select, no Apply button) for a quick-chip field with more than one operator', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: multiOpConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await userEvent.click(await screen.findByText('Name'));
    expect(getSelectByLabel('Operator')).toBeInTheDocument();
    expect(screen.queryByText('Field')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies a non-default operator chosen from a quick-chip with multiple operators, committing the value on Enter', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: multiOpConfig({}) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    await userEvent.click(await screen.findByText('Name'));
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Equals' }));
    await userEvent.type(screen.getByLabelText('Value'), 'acme');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onApply).toHaveBeenCalledWith({ name__exact: 'acme' });
  });

  it('offers an operator choice for a selection quick-chip with multiple operators, applying as soon as a value is picked', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: multiOpConfig({}) });
    const onApply = jest.fn();
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} onApply={onApply} />);
    await userEvent.click(await screen.findByText('Status'));
    expect(getSelectByLabel('Operator')).toBeInTheDocument();
    await userEvent.click(getSelectByLabel('Operator'));
    await userEvent.click(screen.getByRole('option', { name: 'Is not' }));
    await userEvent.click(screen.getByLabelText('Value'));
    await userEvent.click(await screen.findByText('Open'));
    expect(onApply).toHaveBeenCalledWith({ status__exclude: 'open' });
  });

  it('keeps the existing checkbox/search chip (no operator select) for a selection field with a single operator', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: makeConfig({}) });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    await userEvent.click(await screen.findByText('Status'));
    expect(screen.queryByText('Operator')).not.toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Search status...')).toBeInTheDocument();
  });
});

function textFieldOperators(prefix) {
  return [
    {
      label: 'Contains',
      value: 'icontains',
      query_param: `${prefix}__icontains`,
      input_type: 'single',
      input_field: 'text',
    },
    {
      label: 'Equals',
      value: 'iexact',
      query_param: `${prefix}__iexact`,
      input_type: 'single',
      input_field: 'text',
    },
    {
      label: 'Starts with',
      value: 'istartswith',
      query_param: `${prefix}__istartswith`,
      input_type: 'single',
      input_field: 'text',
    },
    {
      label: 'Ends with',
      value: 'iendswith',
      query_param: `${prefix}__iendswith`,
      input_type: 'single',
      input_field: 'text',
    },
    {
      label: 'Does not contain',
      value: 'not_icontains',
      query_param: `${prefix}__not_icontains`,
      input_type: 'single',
      input_field: 'text',
    },
    {
      label: 'Is empty',
      value: 'isnull',
      query_param: `${prefix}__isnull`,
      input_type: 'none',
      input_field: null,
      query_value: 'true',
    },
    {
      label: 'Is not empty',
      value: 'isnull',
      query_param: `${prefix}__isnull`,
      input_type: 'none',
      input_field: null,
      query_value: 'false',
    },
  ];
}

// Mirrors the real CRM contacts filter config that surfaced this behavior:
// most_used_filters names operators (by query_param), not just field names.
const CONTACTS_FILTER_CONFIG = {
  filters: {
    name: {
      field: 'name',
      label: 'Name',
      type: 'string',
      default_operator: 'contains',
      operators: textFieldOperators('name'),
    },
    email: {
      field: 'email',
      label: 'Email',
      type: 'string',
      default_operator: 'contains',
      operators: textFieldOperators('email'),
    },
    phone: {
      field: 'phone',
      label: 'Phone',
      type: 'string',
      default_operator: 'contains',
      operators: textFieldOperators('phone'),
    },
    jobtitle: {
      field: 'jobtitle',
      label: 'Job Title',
      type: 'string',
      default_operator: 'contains',
      operators: textFieldOperators('jobtitle'),
    },
    country: {
      field: 'country',
      label: 'Country',
      type: 'string',
      default_operator: 'contains',
      operators: textFieldOperators('country'),
    },
    contact_origin: {
      field: 'contact_origin',
      label: 'Contact Origin',
      type: 'string',
      default_operator: 'equals',
      options: [
        { id: 1, label: 'Contact Form', value: 'contact form' },
        { id: 2, label: 'Get your quote', value: 'get your quote' },
        { id: 3, label: 'Whatsapp', value: 'whatsapp' },
      ],
      operators: [
        {
          label: 'Contains',
          value: 'icontains',
          query_param: 'contact_origin__icontains',
          input_type: 'single',
          input_field: 'text',
        },
        {
          label: 'Equals',
          value: 'iexact',
          query_param: 'contact_origin',
          input_type: 'single',
          input_field: 'text',
        },
      ],
    },
    owner: {
      field: 'owner',
      label: 'Owner',
      type: 'number',
      default_operator: 'equals',
      operators: [
        {
          label: 'Equals',
          value: 'exact',
          query_param: 'owner',
          input_type: 'single',
          input_field: 'number',
        },
      ],
    },
    companies: {
      field: 'companies',
      label: 'Company',
      type: 'number',
      default_operator: 'equals',
      fetch_url: '/api/crm/companies/choices/',
      operators: [
        {
          label: 'Equals',
          value: 'exact',
          query_param: 'companies',
          input_type: 'multiple',
          input_field: 'select',
        },
      ],
    },
    deals: {
      field: 'deals',
      label: 'Deal',
      type: 'number',
      default_operator: 'equals',
      fetch_url: '/api/crm/deals/choices/',
      operators: [
        {
          label: 'Equals',
          value: 'exact',
          query_param: 'deals',
          input_type: 'multiple',
          input_field: 'select',
        },
      ],
    },
    projects: {
      field: 'projects',
      label: 'Project',
      type: 'number',
      default_operator: 'equals',
      fetch_url: '/api/project/project_chunks/choices/',
      operators: [
        {
          label: 'Equals',
          value: 'exact',
          query_param: 'projects',
          input_type: 'multiple',
          input_field: 'select',
        },
      ],
    },
  },
  _or_support: true,
  _or_param: '_or',
  _or_group_param_pattern: '_or_group{n}',
  most_used_filters: ['email__istartswith', 'contact_origin__icontains', 'companies'],
};

describe('DynamicFilterBar most_used_filters matching by operator', () => {
  it('renders a priority chip for each most_used_filters entry matched by operator query_param, backfills the rest of the budget, and overflows the remainder into "Filter"', async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: CONTACTS_FILTER_CONFIG });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);

    // most_used_filters priority chips.
    expect(await screen.findByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Contact Origin')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    // Backfilled from the remaining fields in their original config order.
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    // Everything else overflows into the trailing "Filter" builder chip.
    expect(screen.queryByText('Job Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Country')).not.toBeInTheDocument();
    expect(screen.queryByText('Owner')).not.toBeInTheDocument();
    expect(screen.queryByText('Deal')).not.toBeInTheDocument();
    expect(screen.queryByText('Project')).not.toBeInTheDocument();
    expect(screen.getByText('Filter')).toBeInTheDocument();
  });

  it("seeds the matched operator (not the field's own default) when opening a most_used_filters chip fresh", async () => {
    const fetcher = jest.fn().mockResolvedValue({ data: CONTACTS_FILTER_CONFIG });
    render(<DynamicFilterBar filterApiUrl='/api/config' fetcher={fetcher} />);
    // "email__istartswith" names email's "Starts with" operator, not its
    // default (icontains-derived "Contains") — the chip should open there.
    await userEvent.click(await screen.findByText('Email'));
    expect(getSelectByLabel('Operator')).toHaveTextContent('Starts with');
  });
});
