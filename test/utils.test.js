import dayjs from 'dayjs';
import {
  adaptApiConfig,
  applyChoicesMap,
  buildQueryParams,
  calendarDayToIso,
  getChoiceId,
  getChoiceLabel,
  getDefaultOperator,
  getDefaultOperatorId,
  getOperatorId,
  isEmptyFilterValue,
  isMultiSelectionField,
  isoToCalendarDay,
  isSelectionField,
  makeFilter,
  matchMostUsedField,
} from '../src/utils';

function op(overrides) {
  return {
    label: overrides.label ?? 'Equals',
    value: overrides.value ?? 'exact',
    query_param: overrides.query_param ?? 'field',
    input_type: overrides.input_type ?? 'single',
    input_field: overrides.input_field ?? 'text',
    ...overrides,
  };
}

function field(overrides) {
  return {
    name: overrides.name ?? 'field',
    label: overrides.label ?? 'Field',
    operators: overrides.operators ?? [op({})],
    default_operator: overrides.default_operator,
    options: overrides.options ?? null,
    fetch_url: overrides.fetch_url ?? null,
    field_key: overrides.field_key,
  };
}

describe('calendarDayToIso / isoToCalendarDay', () => {
  it('serializes a dayjs day as UTC-midnight ISO and parses it back to the same calendar day', () => {
    const day = dayjs.tz('2024-03-15', 'America/New_York');
    const iso = calendarDayToIso(day);
    expect(iso).toBe('2024-03-15T00:00:00.000Z');
    const roundTripped = isoToCalendarDay(iso, 'America/New_York');
    expect(roundTripped.format('YYYY-MM-DD')).toBe('2024-03-15');
  });

  it('returns null for a nullish/invalid day or iso string', () => {
    expect(calendarDayToIso(null)).toBeNull();
    expect(calendarDayToIso(dayjs('not-a-date'))).toBeNull();
    expect(isoToCalendarDay(null, 'UTC')).toBeNull();
    expect(isoToCalendarDay('not-a-date', 'UTC')).toBeNull();
  });

  it('keeps the same calendar day regardless of timezone, rather than rolling it back a day west of UTC', () => {
    const day = isoToCalendarDay('2024-03-15T00:00:00.000Z', 'America/Los_Angeles');
    expect(day.format('YYYY-MM-DD')).toBe('2024-03-15');
  });
});

describe('getOperatorId', () => {
  it('keys "none" operators by query_param + query_value so is-empty/is-not-empty do not collide', () => {
    const isEmpty = op({ input_type: 'none', query_param: 'name__isnull', query_value: 'true' });
    const isNotEmpty = op({
      input_type: 'none',
      query_param: 'name__isnull',
      query_value: 'false',
    });
    expect(getOperatorId(isEmpty)).not.toBe(getOperatorId(isNotEmpty));
  });

  it('keys every other operator by query_param alone', () => {
    expect(getOperatorId(op({ query_param: 'name__icontains' }))).toBe('name__icontains');
  });

  it('falls back to value when query_param is absent (e.g. a range-shaped "Between" operator)', () => {
    const between = op({
      value: 'between',
      query_param: undefined,
      query_params: 'startdate_range',
    });
    expect(getOperatorId(between)).toBe('between');
  });
});

describe('isMultiSelectionField', () => {
  it('is multi only when the default operator declares input_field select + input_type multiple', () => {
    const multi = field({
      operators: [op({ input_field: 'select', input_type: 'multiple' })],
    });
    const single = field({
      operators: [op({ input_field: 'select', input_type: 'single' })],
    });
    const nonSelect = field({
      operators: [op({ input_field: 'number', input_type: 'single' })],
    });
    expect(isMultiSelectionField(multi)).toBe(true);
    expect(isMultiSelectionField(single)).toBe(false);
    expect(isMultiSelectionField(nonSelect)).toBe(false);
  });
});

describe('buildQueryParams', () => {
  const fields = [
    field({
      name: 'name',
      operators: [op({ query_param: 'name__icontains', value: 'icontains' })],
    }),
    field({
      name: 'is_private',
      options: [
        { id: 1, label: 'Private', value: true },
        { id: 2, label: 'Public', value: false },
      ],
      operators: [op({ query_param: 'is_private', value: 'exact', input_field: 'select' })],
    }),
  ];

  it('serializes a plain value filter', () => {
    const filters = [{ id: '1', field: 'name', operatorId: 'name__icontains', value: 'acme' }];
    expect(buildQueryParams(filters, fields)).toEqual({ name__icontains: 'acme' });
  });

  it('serializes an options-backed choice by its underlying value, not its id', () => {
    const filters = [
      {
        id: '1',
        field: 'is_private',
        operatorId: 'is_private',
        value: { id: 1, label: 'Private', value: true },
      },
    ];
    expect(buildQueryParams(filters, fields)).toEqual({ is_private: 'true' });
  });

  it('skips filters with no matching operator or an empty value', () => {
    const filters = [{ id: '1', field: 'name', operatorId: 'name__icontains', value: '' }];
    expect(buildQueryParams(filters, fields)).toEqual({});
  });

  it('serializes an array value joining by id when the field has no options', () => {
    const arrayFields = [
      field({
        name: 'tags',
        operators: [op({ query_param: 'tags__in', value: 'in' })],
      }),
    ];
    const filters = [
      {
        id: '1',
        field: 'tags',
        operatorId: 'tags__in',
        value: [{ id: 1 }, { id: 2 }],
      },
    ];
    expect(buildQueryParams(filters, arrayFields)).toEqual({ tags__in: '1,2' });
  });

  it('skips an array value when it is empty', () => {
    const arrayFields = [
      field({
        name: 'tags',
        operators: [op({ query_param: 'tags__in', value: 'in' })],
      }),
    ];
    const filters = [{ id: '1', field: 'tags', operatorId: 'tags__in', value: [] }];
    expect(buildQueryParams(filters, arrayFields)).toEqual({});
  });

  it('serializes a "none" input_type operator using its query_value regardless of filter.value', () => {
    const noneFields = [
      field({
        name: 'archived',
        operators: [
          op({
            query_param: 'archived__isnull',
            value: 'exact',
            input_type: 'none',
            query_value: 'false',
          }),
        ],
      }),
    ];
    const filters = [
      { id: '1', field: 'archived', operatorId: getOperatorId(noneFields[0].operators[0]) },
    ];
    expect(buildQueryParams(filters, noneFields)).toEqual({ archived__isnull: 'false' });
  });

  it('serializes a range ("Between") value as a comma-joined pair under the operator\'s query_params', () => {
    const rangeFields = [
      field({
        name: 'startdate',
        operators: [
          op({
            label: 'Between',
            value: 'between',
            query_param: undefined,
            query_params: 'startdate_range',
            input_type: 'range',
            input_field: 'date',
          }),
        ],
      }),
    ];
    const filters = [
      {
        id: '1',
        field: 'startdate',
        operatorId: 'between',
        value: { start: '2024-03-01T00:00:00.000Z', end: '2024-03-10T00:00:00.000Z' },
      },
    ];
    expect(buildQueryParams(filters, rangeFields)).toEqual({
      startdate_range: '2024-03-01T00:00:00.000Z,2024-03-10T00:00:00.000Z',
    });
  });

  it('skips a range value that is missing either end', () => {
    const rangeFields = [
      field({
        name: 'startdate',
        operators: [
          op({
            value: 'between',
            query_param: undefined,
            query_params: 'startdate_range',
            input_type: 'range',
          }),
        ],
      }),
    ];
    const filters = [
      { id: '1', field: 'startdate', operatorId: 'between', value: { start: null, end: null } },
    ];
    expect(buildQueryParams(filters, rangeFields)).toEqual({});
  });
});

describe('adaptApiConfig', () => {
  it('returns an empty array when there is no filters map', () => {
    expect(adaptApiConfig(null)).toEqual([]);
    expect(adaptApiConfig({})).toEqual([]);
  });

  it('maps the API filters object into an array of field definitions', () => {
    const config = {
      filters: {
        name: {
          field: 'name',
          label: 'Name',
          type: 'text',
          default_operator: 'icontains',
          operators: [op({})],
          field_key: 'name',
        },
      },
    };
    expect(adaptApiConfig(config)).toEqual([
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        default_operator: 'icontains',
        operators: config.filters.name.operators,
        options: null,
        fetch_url: null,
        field_key: 'name',
      },
    ]);
  });

  it('preserves provided options and fetch_url instead of defaulting them to null', () => {
    const config = {
      filters: {
        status: {
          field: 'status',
          label: 'Status',
          operators: [op({})],
          options: [{ id: 1, label: 'Open' }],
          fetch_url: '/api/statuses',
        },
      },
    };
    const [adapted] = adaptApiConfig(config);
    expect(adapted.options).toEqual([{ id: 1, label: 'Open' }]);
    expect(adapted.fetch_url).toBe('/api/statuses');
  });
});

describe('applyChoicesMap', () => {
  it('leaves fields without a matching override untouched', () => {
    const fields = [field({ name: 'name' })];
    expect(applyChoicesMap(fields, {})).toEqual(fields);
  });

  it('overrides a field with explicit options and clears fetch_url', () => {
    const fields = [field({ name: 'status', fetch_url: '/api/statuses' })];
    const [result] = applyChoicesMap(fields, {
      status: { options: [{ id: 1, label: 'Open' }] },
    });
    expect(result.options).toEqual([{ id: 1, label: 'Open' }]);
    expect(result.fetch_url).toBeNull();
  });

  it('overrides a field with a fetchUrl and clears options', () => {
    const fields = [field({ name: 'status', options: [{ id: 1, label: 'Open' }] })];
    const [result] = applyChoicesMap(fields, {
      status: { fetchUrl: '/api/statuses' },
    });
    expect(result.fetch_url).toBe('/api/statuses');
    expect(result.options).toBeNull();
  });
});

describe('getDefaultOperator / getDefaultOperatorId', () => {
  it('returns the operator matching default_operator when present', () => {
    const gte = op({ value: 'gte', query_param: 'a__gte' });
    const lte = op({ value: 'lte', query_param: 'a__lte' });
    const fieldDef = field({ default_operator: 'lte', operators: [gte, lte] });
    expect(getDefaultOperator(fieldDef)).toBe(lte);
    expect(getDefaultOperatorId(fieldDef)).toBe('a__lte');
  });

  it('falls back to the first operator when default_operator is missing or unmatched', () => {
    const gte = op({ value: 'gte', query_param: 'a__gte' });
    const lte = op({ value: 'lte', query_param: 'a__lte' });
    const fieldDef = field({ default_operator: 'nope', operators: [gte, lte] });
    expect(getDefaultOperator(fieldDef)).toBe(gte);
  });

  it('returns undefined/empty string for a field with no operators', () => {
    const fieldDef = field({ operators: [] });
    expect(getDefaultOperator(fieldDef)).toBeUndefined();
    expect(getDefaultOperatorId(fieldDef)).toBe('');
  });
});

describe('isSelectionField', () => {
  it('is true when field_key is explicitly "select"', () => {
    expect(isSelectionField(field({ field_key: 'select', options: null, fetch_url: null }))).toBe(
      true
    );
  });

  it('is true when the field has a fetch_url', () => {
    expect(isSelectionField(field({ fetch_url: '/api/choices' }))).toBe(true);
  });

  it('is true when the field has a non-empty options list', () => {
    expect(isSelectionField(field({ options: [{ id: 1, label: 'A' }] }))).toBe(true);
  });

  it('is false when there is no field_key opt-in, fetch_url, or options', () => {
    expect(isSelectionField(field({ options: null, fetch_url: null }))).toBe(false);
    expect(isSelectionField(field({ options: [], fetch_url: null }))).toBe(false);
  });
});

describe('getChoiceId / getChoiceLabel', () => {
  it('returns the choice id, or undefined for a nullish choice', () => {
    expect(getChoiceId({ id: 5 })).toBe(5);
    expect(getChoiceId(null)).toBeUndefined();
  });

  it('returns an empty string label for a nullish choice', () => {
    expect(getChoiceLabel(null)).toBe('');
  });

  it('prefers label, then title, then name, then a stringified id', () => {
    expect(getChoiceLabel({ label: 'L', title: 'T', name: 'N', id: 1 })).toBe('L');
    expect(getChoiceLabel({ title: 'T', name: 'N', id: 1 })).toBe('T');
    expect(getChoiceLabel({ name: 'N', id: 1 })).toBe('N');
    expect(getChoiceLabel({ id: 1 })).toBe('1');
  });
});

describe('isEmptyFilterValue', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty string', ''],
    ['a whitespace-only string', '   '],
    ['an empty array', []],
  ])('returns true for %s', (_label, value) => {
    expect(isEmptyFilterValue(value)).toBe(true);
  });

  it.each([
    ['a non-empty string', 'acme'],
    ['zero', 0],
    ['false', false],
    ['a non-empty array', [{ id: 1 }]],
    ['an object', { id: 1 }],
    ['a complete range', { start: '2024-03-01', end: '2024-03-10' }],
  ])('returns false for %s', (_label, value) => {
    expect(isEmptyFilterValue(value)).toBe(false);
  });

  it.each([
    ['both ends null (e.g. a range picker\'s "Reset")', { start: null, end: null }],
    ['only the start set', { start: '2024-03-01', end: null }],
    ['only the end set', { start: null, end: '2024-03-10' }],
  ])('returns true for a range value with %s', (_label, value) => {
    expect(isEmptyFilterValue(value)).toBe(true);
  });
});

describe('makeFilter', () => {
  it('builds a fresh filter object seeded with the field name and default operator, and a null value', () => {
    const fieldDef = field({
      name: 'name',
      operators: [op({ query_param: 'name__icontains', value: 'icontains' })],
    });
    const filter = makeFilter(fieldDef);
    expect(filter.field).toBe('name');
    expect(filter.operatorId).toBe('name__icontains');
    expect(filter.value).toBeNull();
    expect(typeof filter.id).toBe('string');
    expect(filter.id.length).toBeGreaterThan(0);
  });

  it('generates a unique id on every call', () => {
    const fieldDef = field({});
    const a = makeFilter(fieldDef);
    const b = makeFilter(fieldDef);
    expect(a.id).not.toBe(b.id);
  });
});

describe('matchMostUsedField', () => {
  const emailField = field({
    name: 'email',
    label: 'Email',
    operators: [
      op({ label: 'Contains', query_param: 'email__icontains', value: 'icontains' }),
      op({ label: 'Starts with', query_param: 'email__istartswith', value: 'istartswith' }),
    ],
  });
  const companiesField = field({
    name: 'companies',
    label: 'Company',
    fetch_url: '/api/crm/companies/choices/',
    operators: [op({ label: 'Equals', query_param: 'companies', value: 'exact' })],
  });
  const nameIsEmptyOp = op({
    input_type: 'none',
    query_param: 'name__isnull',
    query_value: 'true',
  });
  const nameField = field({
    name: 'name',
    label: 'Name',
    operators: [
      op({ label: 'Contains', query_param: 'name__icontains', value: 'icontains' }),
      nameIsEmptyOp,
    ],
  });
  const filterFields = [emailField, companiesField, nameField];

  it('matches a bare field name directly, with no preferred operator', () => {
    expect(matchMostUsedField('companies', filterFields)).toEqual({
      fieldDef: companiesField,
      operatorId: null,
    });
  });

  it("matches an entry naming one of a field's operators by query_param, returning that operator's id", () => {
    expect(matchMostUsedField('email__istartswith', filterFields)).toEqual({
      fieldDef: emailField,
      operatorId: 'email__istartswith',
    });
  });

  it('matches a "none" input_type operator by its full operator id (query_param:query_value)', () => {
    expect(matchMostUsedField('name__isnull:true', filterFields)).toEqual({
      fieldDef: nameField,
      operatorId: 'name__isnull:true',
    });
  });

  it('returns null when nothing matches', () => {
    expect(matchMostUsedField('nonexistent', filterFields)).toBeNull();
  });

  it('prefers a direct field-name match over a coincidentally-equal operator query_param', () => {
    // companies' only operator's query_param is also "companies" — the
    // direct field match must win so the result carries no operator
    // override (there's nothing to override with; it's the same operator).
    expect(matchMostUsedField('companies', filterFields).operatorId).toBeNull();
  });
});
