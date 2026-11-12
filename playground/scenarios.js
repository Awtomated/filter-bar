import {
  activeOptions,
  companies,
  countries,
  languages,
  statusOptions,
  tagOptions,
  users,
} from './sampleData';

// ---------------------------------------------------------------------------
// Schema building blocks (the filter-config contract from the README)
// ---------------------------------------------------------------------------

function op(label, value, queryParam, inputType = 'single', inputField = 'text', extra = {}) {
  return {
    label,
    value,
    query_param: queryParam,
    input_type: inputType,
    input_field: inputField,
    ...extra,
  };
}

function noneOp(label, value, queryParam, queryValue) {
  return op(label, value, queryParam, 'none', null, { query_value: queryValue });
}

// Each field is keyed by an arbitrary key; the entry's own `field` is the name.
export const FIELDS = {
  // Text, 4 operators incl. a value-less one -> QuickOperatorEditor / FilterRow
  name: {
    field: 'name',
    label: 'Name',
    type: 'string',
    default_operator: 'icontains',
    operators: [
      op('Contains', 'icontains', 'name__icontains'),
      op('Is', 'iexact', 'name__iexact'),
      op('Starts with', 'istartswith', 'name__istartswith'),
      noneOp('Is empty', 'isnull', 'name__isnull', 'true'),
    ],
  },
  // Text, single operator -> QuickFieldEditor
  email: {
    field: 'email',
    label: 'Email',
    type: 'string',
    default_operator: 'icontains',
    operators: [op('Contains', 'icontains', 'email__icontains')],
  },
  // Two "none" operators sharing one query_param (ids become "phone__isnull:true"/":false")
  phone: {
    field: 'phone',
    label: 'Phone',
    type: 'string',
    default_operator: 'icontains',
    operators: [
      op('Contains', 'icontains', 'phone__icontains'),
      noneOp('Is empty', 'isnull', 'phone__isnull', 'true'),
      noneOp('Is not empty', 'isnotnull', 'phone__isnull', 'false'),
    ],
  },
  // Number input
  age: {
    field: 'age',
    label: 'Age',
    type: 'number',
    default_operator: 'exact',
    operators: [
      op('Equals', 'exact', 'age', 'single', 'number'),
      op('At least', 'gte', 'age__gte', 'single', 'number'),
      op('At most', 'lte', 'age__lte', 'single', 'number'),
    ],
  },
  // Boolean via local options -> single-choice selection chip, sends option `value`
  is_active: {
    field: 'is_active',
    label: 'Active',
    type: 'boolean',
    default_operator: 'exact',
    operators: [op('Is', 'exact', 'is_active', 'single', 'select')],
    options: activeOptions,
  },
  // Local options + "multiple" -> multi-choice (checkbox) chip, sends values joined by ","
  status: {
    field: 'status',
    label: 'Status',
    type: 'string',
    default_operator: 'in',
    operators: [op('Is any of', 'in', 'status__in', 'multiple', 'select')],
    options: statusOptions,
  },
  // fetch_url + "multiple" -> multi-choice chip, choices fetched lazily, sends ids
  owner: {
    field: 'owner',
    label: 'Owner',
    type: 'string',
    default_operator: 'in',
    operators: [op('Is any of', 'in', 'owner__in', 'multiple', 'select')],
    fetch_url: '/api/users/choices/',
  },
  // fetch_url (paginated response) + single -> single-choice chip, closes on pick
  country: {
    field: 'country',
    label: 'Country',
    type: 'string',
    default_operator: 'exact',
    operators: [op('Is', 'exact', 'country', 'single', 'select')],
    fetch_url: '/api/countries/choices/',
  },
  // field_key: "select" + 2 operators: "Is" = select, "Name contains" = plain text
  company: {
    field: 'company',
    label: 'Company',
    type: 'string',
    field_key: 'select',
    default_operator: 'exact',
    operators: [
      op('Is', 'exact', 'company', 'single', 'select'),
      op('Name contains', 'icontains', 'company__title__icontains'),
    ],
    fetch_url: '/api/companies/choices/',
  },
  // Choices with language_code/language -> labels like "en - English"
  language: {
    field: 'language',
    label: 'Language',
    type: 'string',
    default_operator: 'exact',
    operators: [op('Is', 'exact', 'language', 'single', 'select')],
    fetch_url: '/api/languages/choices/',
  },
  // Multi-select over local options carrying a `category` (used for grouping)
  tags: {
    field: 'tags',
    label: 'Tags',
    type: 'string',
    default_operator: 'in',
    operators: [op('Has any of', 'in', 'tags__in', 'multiple', 'select')],
    options: tagOptions,
  },
  // datetime + 3 operators (gte / lte shortcuts, and a range) -> QuickDateOperatorEditor
  created_at: {
    field: 'created_at',
    label: 'Created',
    type: 'datetime',
    default_operator: 'gte',
    operators: [
      op('On or after', 'gte', 'created_at__gte', 'single', 'date'),
      op('On or before', 'lte', 'created_at__lte', 'single', 'date'),
      {
        label: 'Between',
        value: 'range',
        query_params: 'created_at__range',
        input_type: 'range',
        input_field: 'date',
      },
    ],
  },
  // Date with a single operator -> QuickFieldEditor with an inline calendar
  // Every date operator, on a plain date field.
  due_date: {
    field: 'due_date',
    label: 'Due date',
    type: 'date',
    default_operator: 'exact',
    operators: [
      op('On', 'exact', 'due_date', 'single', 'date'),
      op('On or after', 'gte', 'due_date__gte', 'single', 'date'),
      op('On or before', 'lte', 'due_date__lte', 'single', 'date'),
      {
        label: 'Between',
        value: 'range',
        query_params: 'due_date__range',
        input_type: 'range',
        input_field: 'date',
      },
      noneOp('Is empty', 'isnull', 'due_date__isnull', 'true'),
    ],
  },
  last_contacted: {
    field: 'last_contacted',
    label: 'Last contacted',
    type: 'date',
    default_operator: 'date',
    operators: [op('On', 'date', 'last_contacted__date', 'single', 'date')],
  },
};

const ALL_FIELDS = Object.values(FIELDS);

function schema(fields, mostUsed) {
  return {
    filters: Object.fromEntries(fields.map((f) => [f.field, f])),
    most_used_filters: mostUsed,
  };
}

// ---------------------------------------------------------------------------
// Mock API routes shared by every scenario (choices endpoints)
// ---------------------------------------------------------------------------

export const choiceRoutes = {
  '/api/users/choices/': { data: users },
  '/api/users/active/choices/': { data: users.filter((u) => u.is_active) },
  '/api/countries/choices/': {
    data: { count: countries.length, next: null, previous: null, results: countries },
  },
  '/api/companies/choices/': { data: companies },
  '/api/languages/choices/': { data: languages },
  '/api/broken/choices/': { error: 500 },
};

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------
// Each scenario: { id, title, description, checklist[], schema | schemaError,
//   props (extra DynamicFilterBar props) }. filterApiUrl is derived below.

export const scenarios = [
  {
    id: 'full',
    title: 'Full schema — every field type',
    description:
      'All 14 field shapes. 5 most_used_filters become chips (Created is matched through its "created_at__gte" operator, so it opens on "On or after"); the rest fold into the "Filter" builder.',
    checklist: [
      'Name chip: switch operators; text applies on Enter; "Is empty" applies immediately with no value.',
      'Status chip: multi-select with checkboxes; badge count = number checked; search box filters the list.',
      'Owner chip: choices load lazily on first open (spinner, see Network log); labels come from full_name.',
      'Country chip: single choice — popover closes on pick; response is paginated ({ results }).',
      'Created chip: opens on "On or after" with Today/Tomorrow shortcuts; "On or before" shows Today/Yesterday; "Between" shows a range calendar with shortcuts.',
      'Filter chip: add rows for Phone (two "none" ops), Age (number), Company (select vs. text by operator), Language ("en - English"), Tags, Last contacted (date field popover). Apply / Cancel / Clear all.',
      'Clear (x) on each chip removes only that filter; params + contacts table update every time.',
      'Raise "maxQuickChips" to 20 to see every field rendered as its own chip.',
    ],
    schema: schema(ALL_FIELDS, ['name', 'status', 'owner', 'created_at__gte', 'country']),
    props: {},
  },
  {
    id: 'applied',
    title: 'Pre-applied filters (appliedFilters)',
    description:
      'The bar starts with filters already applied — a quick chip, a multi-select, a date range and two "Filter"-builder filters.',
    checklist: [
      'Chips show counts on load: Name 1, Status 2, Created 1, Filter 2.',
      'Opening each chip shows the pre-applied operator and value.',
      'Note: onApply is NOT called on mount — only onFiltersChange. Change anything to see params.',
    ],
    schema: schema(ALL_FIELDS, ['name', 'status', 'owner', 'created_at', 'country']),
    props: {
      appliedFilters: [
        { id: 'pre-1', field: 'name', operatorId: 'name__icontains', value: 'an' },
        {
          id: 'pre-2',
          field: 'status',
          operatorId: 'status__in',
          value: [statusOptions[0], statusOptions[2]],
        },
        {
          id: 'pre-3',
          field: 'created_at',
          operatorId: 'range',
          // From the 1st of last month to today. The bar reads a value as the
          // day written in it, so older UTC-midnight values still work.
          value: {
            start: new Date(
              Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)
            ).toISOString(),
            end: new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString(),
          },
        },
        { id: 'pre-4', field: 'phone', operatorId: 'phone__isnull:false', value: null },
        { id: 'pre-5', field: 'age', operatorId: 'age__gte', value: '30' },
      ],
    },
  },
  {
    id: 'fieldProps',
    title: 'Grouping & custom labels (fieldProps)',
    description:
      'Owner choices are transformed (sorted, inactive users flagged), grouped by department and relabelled. Tags are grouped by category.',
    checklist: [
      'Owner chip: group headers Marketing / Sales / Support, labels like "Sofia Rossi (inactive)".',
      'Searching "inactive" in the Owner chip matches by the custom label.',
      'Tags (in the Filter builder) grouped as Industry / Priority / Source, in reverse order via sortGroups.',
    ],
    schema: schema(ALL_FIELDS, ['owner', 'status', 'name']),
    props: {
      fieldProps: {
        owner: {
          fieldDef: {
            select: {
              transformChoices: (choices) =>
                [...choices].sort((a, b) => a.name.localeCompare(b.name)),
              grouping: true,
              groupingKey: 'department',
              formatOptionLabel: (choice) =>
                choice.is_active ? choice.name : `${choice.name} (inactive)`,
            },
          },
        },
        tags: {
          fieldDef: {
            select: {
              grouping: true,
              groupBy: (choice) => choice.category,
              sortGroups: (a, b) => b.localeCompare(a),
            },
          },
        },
      },
    },
  },
  {
    id: 'choicesMap',
    title: 'Choice overrides (choicesMap)',
    description:
      'Status uses a reduced local options list; Owner is redirected to /api/users/active/choices/ (active users only); Country gets local options instead of its fetch_url.',
    checklist: [
      'Status chip only lists Lead and Customer.',
      'Owner chip only lists active users — Network log shows /api/users/active/choices/.',
      'Country chip lists 3 local options and makes no network request; params send the option `value`.',
    ],
    schema: schema(ALL_FIELDS, ['status', 'owner', 'country']),
    props: {
      choicesMap: {
        status: { options: [statusOptions[0], statusOptions[2]] },
        owner: { fetchUrl: '/api/users/active/choices/' },
        country: {
          options: [
            { id: 1, label: 'India', value: 1 },
            { id: 2, label: 'United States', value: 2 },
            { id: 4, label: 'Germany', value: 4 },
          ],
        },
      },
    },
  },
  {
    id: 'backfill',
    title: 'No most_used_filters (backfill)',
    description:
      'most_used_filters is empty — the bar backfills chips with the first N fields in schema order, everything else goes into "Filter".',
    checklist: [
      'First 5 fields (Name, Email, Phone, Age, Active) render as chips.',
      'Set maxQuickChips to 0: everything is inside the "Filter" chip.',
    ],
    schema: schema(ALL_FIELDS, []),
    props: {},
  },
  {
    id: 'small',
    title: 'Small schema (no "Filter" chip)',
    description: 'Only 3 fields, all fit as quick chips, so the "Filter" chip is not rendered.',
    checklist: ['Exactly 3 chips, no "Filter" chip.', 'Set maxQuickChips to 1 to make it appear.'],
    schema: schema([FIELDS.email, FIELDS.is_active, FIELDS.last_contacted], ['email']),
    props: {},
  },
  {
    id: 'i18n',
    title: 'Custom labels & tokens (i18n / theming)',
    description:
      'All UI copy overridden via `labels` (Spanish) and spacing/radius/colors overridden via `tokens`.',
    checklist: [
      '"Filtros" chip, "Aplicar"/"Cancelar"/"Añadir filtro"/"Borrar todo" in the builder.',
      'Search placeholder reads "Buscar estado..." in the Status chip.',
      'Square-ish chips (radius 4), larger gaps, info-tinted selected rows in the Status list.',
    ],
    schema: schema(ALL_FIELDS, ['name', 'status', 'created_at']),
    props: {
      labels: {
        filterChipLabel: 'Filtros',
        valueLabel: 'Valor',
        noMatches: 'Sin resultados',
        searchPlaceholder: (fieldLabel) =>
          `Buscar ${fieldLabel === 'Status' ? 'estado' : fieldLabel.toLowerCase()}...`,
        clearFilterTooltip: 'Quitar filtro',
        apply: 'Aplicar',
        cancel: 'Cancelar',
        addFilter: 'Añadir filtro',
        clearAll: 'Borrar todo',
        filtersTitle: 'Filtros',
        fieldLabel: 'Campo',
        operatorLabel: 'Operador',
      },
      tokens: {
        chipRadius: 4,
        popoverRadius: 2,
        gapSm: 14,
        searchRadius: 4,
        chipBorderColor: 'primary.light',
        selectedBackground: 'info.light',
        hoverBackground: 'action.focus',
        menuItemTypographySx: { fontWeight: 500 },
      },
    },
  },
  {
    id: 'choicesError',
    title: 'Choices endpoint fails',
    description:
      'Owner points at a fetch_url that returns HTTP 500. Verifies the chip / builder handle a failed choices request.',
    checklist: [
      'Open the Owner chip: Network log shows a 500; the list should end up empty ("No matches found"), not spin forever.',
      'Other chips keep working.',
    ],
    schema: schema(
      [{ ...FIELDS.owner, fetch_url: '/api/broken/choices/' }, FIELDS.name, FIELDS.status],
      ['owner', 'name', 'status']
    ),
    props: {},
  },
  {
    id: 'empty',
    title: 'Empty schema',
    description: 'Schema has no filters. The bar renders nothing.',
    checklist: ['Nothing renders below the toggle button (no error, no spinner).'],
    schema: { filters: {}, most_used_filters: [] },
    props: {},
  },
  {
    id: 'schemaError',
    title: 'Schema endpoint fails',
    description: 'The filter-config request returns HTTP 500. The bar silently renders nothing.',
    checklist: [
      'Spinner shows for the latency duration, then nothing renders; Network log shows the 500.',
    ],
    schemaError: 500,
    props: {},
  },
];

// ---------------------------------------------------------------------------
// shadcn version (Bar UI = shadcn): what to check, and extra props
// ---------------------------------------------------------------------------

scenarios.push(
  {
    id: 'dates',
    title: 'Dates & timezones',
    description:
      'Date filters only, pinned as chips in both UIs: Due date (every date operator), Created (datetime) and Last contacted. Change the timezone control and compare: the timezone decides what "Today" is, and a picked day is sent as midnight of that day in that timezone, with its offset (e.g. 2026-11-12T00:00:00+05:30).',
    checklist: [
      'Due date: On / On or after (Today, Tomorrow) / On or before (Today, Yesterday) / Between (range shortcuts) / Is empty; the Due date column shows which rows match.',
      'Set timezone to Pacific/Auckland, then America/Los_Angeles: Today sends the date shown in the yellow line above (it can differ from your own date).',
      'Switch Bar UI between MUI and shadcn with the same timezone and click the same shortcut: onApply params must be identical.',
      'A picked day is sent as midnight in the selected timezone with its offset: YYYY-MM-DDT00:00:00+05:30 (Kolkata), -08:00 (Los Angeles), Z (UTC).',
    ],
    timezoneInfo: true,
    schema: schema(
      [FIELDS.due_date, FIELDS.created_at, FIELDS.last_contacted, FIELDS.name],
      ['due_date', 'created_at__gte', 'last_contacted']
    ),
    props: { maxQuickChips: 3 },
  },
  {
    id: 'urlValues',
    title: 'Values from URL params (bare ids)',
    description:
      'appliedFilters whose select values are only { id } — what the host app builds from URL/default params (paramsToFilters). The shadcn chips must still show labels.',
    checklist: [
      'MUI: chips show counts only (Owner (2), Country (1)); no label lookup is needed.',
      'onApply is not called on mount.',
    ],
    schema: schema(ALL_FIELDS, ['owner', 'country']),
    props: {
      appliedFilters: [
        { id: 'url-1', field: 'owner', operatorId: 'owner__in', value: [{ id: 2 }, { id: 5 }] },
        { id: 'url-2', field: 'country', operatorId: 'country', value: { id: 3 } },
        { id: 'url-3', field: 'language', operatorId: 'language', value: { id: 1 } },
      ],
    },
  },
  {
    id: 'dialog',
    title: 'Inside an MUI Dialog',
    description:
      'The bar rendered inside an MUI Dialog, as on the Hub list screens. The shadcn version gets portalContainer = the dialog content, so its popovers render inside the dialog focus trap.',
    checklist: [
      'MUI: popovers and the "Filter" builder work inside the dialog.',
      'Escape closes the popover first, then the dialog.',
    ],
    inDialog: true,
    schema: schema(ALL_FIELDS, ['name', 'status', 'created_at']),
    props: {},
  }
);

const SHADCN = {
  full: [
    'Two dashed main-filter chips "+ Name" and "+ Status" (most_used_filters, maxQuickChips = 2). Set maxQuickChips to 5 to also pin Owner, Created (opens on "On or after") and Country.',
    'Dashed = not applied, solid = applied. Click "+ Name": operator header "Name contains ▾" and a text field, no Apply button. Typing sends nothing (onApply calls stays 0); Enter applies and closes, and the chip turns solid. Forgot Enter? Clicking outside / Escape / Tab applies it too (once). Clearing the text and confirming removes the filter.',
    'Click the operator word on an applied chip: operator list with a check on the current one. "Is empty" applies at once ("Name is empty"); "Starts with" keeps the text.',
    'Status: searchable list with a check on selected entries. One ticked → "Status is Lead"; two → "Status is any of Lead, Customer" (no +N); untick all → chip back to dashed.',
    '"+ Add filter": "Filter by…" list of the fields not yet shown (no icons, no Advanced filter). Picking one adds a dashed chip and opens it; leaving without a value keeps the dashed chip, × removes it.',
    'Country (single choice) closes on pick. Owner loads its list on first open (Network tab) and shows full names.',
    'Created: "On or after" calendar with Today/Tomorrow; "On or before" Today/Yesterday; "Between" a range calendar with shortcuts → "1–15 Nov".',
    'Company: "Is" shows a choice list, "Name contains" a text field (editor follows the operator).',
    '"Clear all" appears once something is applied; it removes added chips and calls onApply({}).',
    'Switch Bar UI to MUI and apply the same filters: the onApply params must be identical.',
  ],
  applied: [
    'Loads with solid chips: Name contains an, Status is any of Lead, Customer, Created between …, Phone is not empty, Age at least 30.',
    'Each chip opens on its applied operator and value (checks on Lead and Customer).',
    'onApply is not called on mount — only onFiltersChange (Filter state tab).',
  ],
  fieldProps: [
    'Owner list: group headings Marketing / Sales / Support, labels like "Sofia Rossi (inactive)"; searching "inactive" matches.',
    'The chip value uses the same custom label ("Owner is Sofia Rossi (inactive)").',
    'Add filter → Tags: grouped Source / Priority / Industry (reverse order via sortGroups).',
  ],
  choicesMap: [
    'Status lists only Lead and Customer.',
    'Owner loads /api/users/active/choices/ (Network tab): active users only.',
    'Country uses 3 local options and makes no request; onApply sends the option value.',
  ],
  backfill: [
    'No most_used_filters: the first two fields (Name, Email) are the dashed main chips.',
    'Every other field comes from "+ Add filter". maxQuickChips 0 → only the Add filter button.',
  ],
  small: [
    'Email and Active are dashed main chips; Last contacted comes from Add filter.',
    'Once all 3 fields are chips, "+ Add filter" disappears.',
  ],
  i18n: [
    '"Añadir filtro", "Filtrar por…", "Borrar todo", "Valor" (text field placeholder); the Status search reads "Buscar estado...".',
    'A multi-select with one value reads "es" (labels.singleValueOperator).',
    'classNames: chips are rounded-md instead of pills, the Add filter button is outlined.',
  ],
  choicesError: [
    'Open "+ Owner": the 500 shows in the Network tab and the list shows "No matches found" (no endless spinner).',
    'Name and Status keep working.',
  ],
  empty: ['Nothing renders next to the toggle button.'],
  schemaError: ['A spinner for the latency duration, then nothing; the 500 is in the Network tab.'],
  dates: [
    'Three dashed date chips: + Due date, + Created (opens on "On or after"), + Last contacted. Name comes from Add filter.',
    'Due date → operator header "Due date on ▾": try On, On or after (Today / Tomorrow), On or before (Today / Yesterday), Between (two clicks, or This Week / Last 7 Days / Current Month / Next Month) and Is empty (applies at once).',
    'The chip reads e.g. "Due date on 11/12/2026" (follows the dateFormat control) or "Due date between 1–15 Nov". "On" has no shortcuts, as in the MUI version.',
    'Timezone: pick Pacific/Auckland or America/Los_Angeles, then On or after → Today — the param equals the yellow line above, and the calendar marks that day as today.',
    'Same clicks with Bar UI = MUI give identical onApply params, shortcuts included (weeks start on Sunday in both, as before; period ends are 23:59:59).',
  ],
  urlValues: [
    'Without clicking, the choice lists load (Network tab) and the chips read "Owner is any of Priya Nair, Kenji Tanaka", "Country is United Kingdom", "Language is en - English".',
    'Raise the latency to 4000 ms and remount: chips show the ids in muted text until the lists arrive.',
    'Opening Owner shows checks on the two selected users.',
  ],
  dialog: [
    'Open the dialog: every popover (Add filter, choices, calendar) opens above the dialog, and its search field takes focus and accepts typing.',
    'Escape closes the popover first, then the dialog.',
  ],
};

const SHADCN_PROPS = {
  i18n: (s) => ({
    labels: { ...s.props.labels, filterBy: 'Filtrar por…', singleValueOperator: 'es' },
    classNames: { chip: 'rounded-md', addFilter: 'bg-background border border-border' },
  }),
};

scenarios.forEach((s) => {
  s.shadcnChecklist = SHADCN[s.id];
  s.shadcnProps = SHADCN_PROPS[s.id]?.(s) ?? {};
});

// Every scenario gets its own schema endpoint, so the Network log shows which
// schema was loaded.
scenarios.forEach((s) => {
  s.filterApiUrl = `/api/scenarios/${s.id}/filters/`;
});

export function buildRoutes() {
  const routes = { ...choiceRoutes };
  scenarios.forEach((s) => {
    routes[s.filterApiUrl] = s.schemaError ? { error: s.schemaError } : { data: s.schema };
  });
  return routes;
}
