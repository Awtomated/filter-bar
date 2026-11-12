// A tiny Django-style lookup interpreter so the playground can show which
// sample contacts the emitted query params would return. It is deliberately
// simple — it exists to sanity-check the params, not to mirror a real backend.
//
// "name__icontains" -> path ["name"], lookup "icontains"
// "company__title__icontains" -> path ["company", "title"], lookup "icontains"
// "country" -> path ["country"], lookup "exact"

const LOOKUPS = new Set([
  'exact',
  'iexact',
  'icontains',
  'istartswith',
  'gte',
  'lte',
  'in',
  'isnull',
  'range',
  'date',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

function resolvePath(row, path) {
  const value = path.reduce((acc, key) => (acc == null ? acc : acc[key]), row);
  // A related object compared directly (e.g. "company=3") compares by id.
  if (value && typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
    return value.id;
  }
  return value;
}

// Dates compare by calendar day (UTC), numbers numerically, everything else as text.
function compare(a, b) {
  if (a == null || a === '') return NaN;
  if (ISO_DATE.test(b) && ISO_DATE.test(String(a))) {
    return String(a).slice(0, 10).localeCompare(b.slice(0, 10));
  }
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(b).trim() !== '') return na - nb;
  return String(a).localeCompare(String(b));
}

function isEmpty(value) {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function matches(value, lookup, raw) {
  switch (lookup) {
    case 'isnull':
      return raw === 'true' ? isEmpty(value) : !isEmpty(value);
    case 'in': {
      const wanted = raw.split(',');
      if (Array.isArray(value)) return value.some((v) => wanted.includes(String(v)));
      return value != null && wanted.includes(String(value));
    }
    case 'range': {
      const [from, to] = raw.split(',');
      return compare(value, from) >= 0 && compare(value, to) <= 0;
    }
    case 'gte':
      return compare(value, raw) >= 0;
    case 'lte':
      return compare(value, raw) <= 0;
    case 'icontains':
      return String(value ?? '')
        .toLowerCase()
        .includes(raw.toLowerCase());
    case 'istartswith':
      return String(value ?? '')
        .toLowerCase()
        .startsWith(raw.toLowerCase());
    case 'iexact':
      return String(value ?? '').toLowerCase() === raw.toLowerCase();
    default: // exact, date
      return compare(value, raw) === 0;
  }
}

export function applyQueryParams(rows, params) {
  const knownFields = new Set(rows.length ? Object.keys(rows[0]) : []);
  const unhandled = [];
  let result = rows;
  Object.entries(params ?? {}).forEach(([key, rawValue]) => {
    const parts = key.split('__');
    const lookup = parts.length > 1 && LOOKUPS.has(parts[parts.length - 1]) ? parts.pop() : 'exact';
    if (!knownFields.has(parts[0])) {
      unhandled.push(key);
      return;
    }
    const raw = String(rawValue);
    result = result.filter((row) => matches(resolvePath(row, parts), lookup, raw));
  });
  return { rows: result, unhandled };
}
