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

// most_used_filters entries usually name a field directly, but can also
// name one of that field's operators instead (by query_param, or by the
// operator's full id for a "none" input_type op that shares its query_param
// with a sibling) — e.g. "email__istartswith" picks out email's "Starts
// with" operator specifically, not just the email field. Field-name matches
// take priority so a field can't accidentally match one of its own
// operators' query_param when that happens to equal the field name too.
export function matchMostUsedField(name, filterFields) {
  const directField = filterFields.find((f) => f.name === name);
  if (directField) return { fieldDef: directField, operatorId: null };

  const operatorMatch = filterFields
    .flatMap((f) => (f.operators ?? []).map((op) => ({ fieldDef: f, op })))
    .find(({ op }) => getOperatorId(op) === name || op.query_param === name);
  return operatorMatch
    ? { fieldDef: operatorMatch.fieldDef, operatorId: getOperatorId(operatorMatch.op) }
    : null;
}

export function getChoiceId(choice) {
  return choice?.id;
}

export function getChoiceLabel(choice) {
  if (!choice) return '';
  return choice.label || choice.title || choice.name || choice.email || String(choice.id ?? '');
}

export function isEmptyFilterValue(value) {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
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
