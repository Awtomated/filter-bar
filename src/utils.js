import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

export function getOperatorId(op) {
  return op.input_type === 'none' ? `${op.query_param}:${op.query_value ?? ''}` : op.query_param;
}

export function adaptApiConfig(filterConfig) {
  if (!filterConfig?.filters) return [];
  return Object.values(filterConfig.filters).map((field) => ({
    name: field.field,
    label: field.label,
    type: field.type,
    default_operator: field.default_operator,
    operators: field.operators,
    options: field.options ?? null,
    fetch_url: field.fetch_url ?? null,
    field_key: field.field_key,
  }));
}

// Applies an explicit choicesMap override onto the adapted field list. The
// contract is intentionally unambiguous — options XOR a fetch URL — so a
// caller can never end up passing a shape that later parts of the bar have
// to guess at (see the choicesMap shape documented in the README).
export function applyChoicesMap(fields, choicesMap) {
  return fields.map((field) => {
    const override = choicesMap[field.name];
    if (!override) return field;
    if ('options' in override) {
      return { ...field, options: override.options, fetch_url: null };
    }
    return { ...field, fetch_url: override.fetchUrl, options: null };
  });
}

export function getDefaultOperator(fieldDef) {
  return (
    fieldDef?.operators?.find((op) => op.value === fieldDef.default_operator) ??
    fieldDef?.operators?.[0]
  );
}

export function getDefaultOperatorId(fieldDef) {
  const op = getDefaultOperator(fieldDef);
  return op ? getOperatorId(op) : '';
}

function tokenize(name) {
  return String(name ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function isDateLikeField(fieldDef) {
  return tokenize(fieldDef?.name).some((token) => token.includes('date'));
}

// Token-prefix match (not a bare substring match on the whole normalized
// name) — a field like `startdate__gte` still classifies via its
// "startdate" token starting with "start", but `vendor_date` no longer
// false-positives as an "end" field just because "vendor"+"date" happen to
// spell "...end..." across the token boundary once separators are removed.
export function classifyDateField(fieldDef) {
  const tokens = tokenize(fieldDef?.name);
  const startsWithAny = (prefixes) =>
    tokens.some((token) => prefixes.some((prefix) => token.startsWith(prefix)));
  if (startsWithAny(['start', 'estimate'])) return 'start';
  if (startsWithAny(['end', 'due'])) return 'end';
  return 'solo';
}

export function findBoundOperatorId(fieldDef, bound) {
  const operators = fieldDef?.operators ?? [];
  const pattern = bound === 'start' ? /gte|greater|after|from|min/i : /lte|less|before|^to$|max/i;
  const match = operators.find(
    (op) =>
      pattern.test(op.label ?? '') ||
      pattern.test(String(op.value ?? '')) ||
      pattern.test(op.query_param ?? '')
  );
  if (match) return getOperatorId(match);

  const dateOps = operators.filter((op) => op.input_field === 'date');
  if (dateOps.length >= 2) {
    return getOperatorId(bound === 'start' ? dateOps[0] : dateOps[1]);
  }
  return getDefaultOperatorId(fieldDef);
}

// Each most-used date field gets its own range chip. When its counterpart
// (the other side of the range) isn't itself listed in most_used_filters,
// it's still pulled in from the full field list so the chip offers a real
// range instead of a single bound, and the counterpart is then treated as
// "consumed" so it isn't also offered separately in the "Filter" builder.
export function buildDateRangeGroups(mostUsedDateFieldDefs, allFields) {
  const consumed = new Set();
  const groups = [];

  // A field with only one usable operator can't represent two independent
  // bounds — rendering it as a range chip would apply the same
  // field+operatorId twice and silently drop one side (the second write
  // wins in buildQueryParams). Applies whenever a field ends up alone,
  // whether it classified as "solo" outright or as "start"/"end" by name
  // but has no real counterpart field to pair with.
  function soloGroup(fieldDef) {
    const startOperatorId = findBoundOperatorId(fieldDef, 'start');
    const endOperatorId = findBoundOperatorId(fieldDef, 'end');
    if (startOperatorId === endOperatorId) return null;
    return {
      key: fieldDef.name,
      startField: fieldDef,
      endField: fieldDef,
      startOperatorId,
      endOperatorId,
    };
  }

  mostUsedDateFieldDefs.forEach((fieldDef) => {
    if (consumed.has(fieldDef.name)) return;
    const role = classifyDateField(fieldDef);

    if (role === 'solo') {
      const group = soloGroup(fieldDef);
      if (!group) return;
      consumed.add(fieldDef.name);
      groups.push(group);
      return;
    }

    const wantRole = role === 'start' ? 'end' : 'start';
    const counterpart =
      mostUsedDateFieldDefs.find(
        (f) =>
          !consumed.has(f.name) && f.name !== fieldDef.name && classifyDateField(f) === wantRole
      ) ??
      allFields.find(
        (f) =>
          !consumed.has(f.name) &&
          f.name !== fieldDef.name &&
          isDateLikeField(f) &&
          classifyDateField(f) === wantRole
      );

    if (!counterpart) {
      const group = soloGroup(fieldDef);
      if (!group) return;
      consumed.add(fieldDef.name);
      groups.push(group);
      return;
    }

    consumed.add(fieldDef.name);
    consumed.add(counterpart.name);

    const startField = role === 'start' ? fieldDef : counterpart;
    const endField = role === 'end' ? fieldDef : counterpart;

    groups.push({
      key: `${startField.name}__${endField.name}`,
      startField,
      endField,
      startOperatorId: getDefaultOperatorId(startField),
      endOperatorId: getDefaultOperatorId(endField),
    });
  });

  return groups;
}

export function toIsoDay(value) {
  if (!value || !dayjs.isDayjs(value) || !value.isValid()) return null;
  return dayjs.utc(value.format('YYYY-MM-DD')).toISOString();
}

export function toCalendarDay(iso, tz) {
  if (!iso) return null;
  const utcDate = dayjs.utc(iso);
  return utcDate.isValid() ? dayjs.tz(utcDate.format('YYYY-MM-DD'), tz) : null;
}

export function formatDateRangeLabel(startDate, endDate) {
  if (!startDate && !endDate) return null;
  const fmt = (iso) => (iso ? dayjs.utc(iso).format('DD/MM/YY') : '');
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

// `field_key: "select"` is an explicit backend opt-in — a field marked this
// way is always a selection field even without fetch_url/options. Absent
// that, a field still qualifies implicitly whenever it exposes a discrete
// list of choices.
export function isSelectionField(fieldDef) {
  if (fieldDef.field_key === 'select') return true;
  return Boolean(fieldDef.fetch_url) || Boolean(fieldDef.options?.length);
}

// Single/multi intent comes from the field's default operator: only when it
// declares `input_field: "select"` and `input_type: "multiple"` does the
// field render as a multi-choice (checkbox) selector; every other operator
// shape renders single-choice.
export function isMultiSelectionField(fieldDef) {
  const op = getDefaultOperator(fieldDef);
  return op?.input_field === 'select' && op?.input_type === 'multiple';
}

export function getChoiceId(choice) {
  return choice?.id;
}

export function getChoiceLabel(choice) {
  if (!choice) return '';
  return choice.label || choice.title || choice.name || String(choice.id ?? '');
}

export function makeFilter(fieldDef) {
  return {
    id: crypto.randomUUID(),
    field: fieldDef.name,
    operatorId: getDefaultOperatorId(fieldDef),
    value: null,
  };
}

export function buildQueryParams(filters, filterFields) {
  const params = {};
  filters.forEach((filter) => {
    const fieldDef = filterFields.find((f) => f.name === filter.field);
    const opDef = fieldDef?.operators?.find((op) => getOperatorId(op) === filter.operatorId);
    if (!opDef) return;

    if (opDef.input_type === 'none') {
      params[opDef.query_param] = opDef.query_value ?? 'true';
    } else {
      const raw = filter.value;
      if (raw === null || raw === undefined || raw === '') return;
      if (Array.isArray(raw)) {
        if (!raw.length) return;
        params[opDef.query_param] = raw
          .map((item) => (fieldDef?.options?.length ? item.value : item.id))
          .join(',');
      } else if (raw !== null && typeof raw === 'object' && 'id' in raw) {
        params[opDef.query_param] = fieldDef?.options?.length ? String(raw.value) : String(raw.id);
      } else {
        params[opDef.query_param] = String(raw);
      }
    }
  });
  return params;
}
