// Sample backend data for the playground. Everything is deterministic (seeded
// RNG), except that contact dates are generated relative to *today*, so the
// date-picker shortcuts ("Today", "Last 7 Days", "This Week", ...) always
// match some rows.

// ---------------------------------------------------------------------------
// Static choice lists — passed to the schema as `options` ({ id, label, value })
// ---------------------------------------------------------------------------

export const statusOptions = [
  { id: 1, label: 'Lead', value: 'lead' },
  { id: 2, label: 'Prospect', value: 'prospect' },
  { id: 3, label: 'Customer', value: 'customer' },
  { id: 4, label: 'Churned', value: 'churned' },
];

export const activeOptions = [
  { id: 1, label: 'Yes', value: 'true' },
  { id: 2, label: 'No', value: 'false' },
];

// `category` is used by the fieldProps grouping scenario.
export const tagOptions = [
  { id: 1, label: 'VIP', value: 'vip', category: 'Priority' },
  { id: 2, label: 'Hot', value: 'hot', category: 'Priority' },
  { id: 3, label: 'Referral', value: 'referral', category: 'Source' },
  { id: 4, label: 'Webinar', value: 'webinar', category: 'Source' },
  { id: 5, label: 'Cold outreach', value: 'cold_outreach', category: 'Source' },
  { id: 6, label: 'SaaS', value: 'saas', category: 'Industry' },
  { id: 7, label: 'Healthcare', value: 'healthcare', category: 'Industry' },
  { id: 8, label: 'Fintech', value: 'fintech', category: 'Industry' },
];

// ---------------------------------------------------------------------------
// Fetched choice lists — served by the mock API under `fetch_url`s
// ---------------------------------------------------------------------------

// Uses `full_name` (not `name`) to exercise the package's full_name -> name
// normalization; `department`/`is_active` feed the fieldProps scenario.
export const users = [
  { id: 1, full_name: 'Aarav Sharma', department: 'Sales', is_active: true },
  { id: 2, full_name: 'Priya Nair', department: 'Sales', is_active: true },
  { id: 3, full_name: 'Liam Carter', department: 'Support', is_active: true },
  { id: 4, full_name: 'Sofia Rossi', department: 'Marketing', is_active: false },
  { id: 5, full_name: 'Kenji Tanaka', department: 'Support', is_active: true },
  { id: 6, full_name: 'Emma Müller', department: 'Marketing', is_active: true },
  { id: 7, full_name: 'Noah Williams', department: 'Sales', is_active: false },
  { id: 8, full_name: 'Zara Ahmed', department: 'Support', is_active: true },
];

// Served as a paginated DRF-style `{ count, next, results }` response.
export const countries = [
  { id: 1, name: 'India' },
  { id: 2, name: 'United States' },
  { id: 3, name: 'United Kingdom' },
  { id: 4, name: 'Germany' },
  { id: 5, name: 'Japan' },
  { id: 6, name: 'Brazil' },
  { id: 7, name: 'Australia' },
];

// Plain `title` instead of `label`/`name` to exercise that label fallback.
export const companies = [
  { id: 1, title: 'Acme Corp' },
  { id: 2, title: 'Globex' },
  { id: 3, title: 'Initech' },
  { id: 4, title: 'Umbrella Health' },
  { id: 5, title: 'Stark Fintech' },
  { id: 6, title: 'Wayne Enterprises' },
];

// `language_code` + `language` renders as "en - English" (getChoiceLabel).
export const languages = [
  { id: 1, language_code: 'en', language: 'English' },
  { id: 2, language_code: 'hi', language: 'Hindi' },
  { id: 3, language_code: 'de', language: 'German' },
  { id: 4, language_code: 'ja', language: 'Japanese' },
  { id: 5, language_code: 'pt', language: 'Portuguese' },
];

// ---------------------------------------------------------------------------
// Contacts — the "table" the playground filters with the emitted query params
// ---------------------------------------------------------------------------

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const FIRST_NAMES = [
  'Ananya',
  'Rohan',
  'Olivia',
  'Mateo',
  'Hana',
  'Lucas',
  'Isabella',
  'Arjun',
  'Mia',
  'Ethan',
  'Chloe',
  'Kabir',
  'Amelia',
  'Daniel',
  'Yuki',
  'Leon',
  'Grace',
  'Vikram',
  'Nora',
  'Samuel',
];
const LAST_NAMES = [
  'Patel',
  'Smith',
  'Garcia',
  'Kim',
  'Schmidt',
  'Silva',
  'Brown',
  'Iyer',
  'Johnson',
  'Sato',
  'Martin',
  'Khan',
];

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCHours(10, 30, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function buildContacts(count) {
  const rand = seededRandom(42);
  // Separate stream for due dates, so adding them left the other columns as they were.
  const dueRand = seededRandom(7);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = pick(LAST_NAMES);
    const tagCount = Math.floor(rand() * 3);
    const tags = [];
    for (let t = 0; t < tagCount; t += 1) {
      const tag = pick(tagOptions).value;
      if (!tags.includes(tag)) tags.push(tag);
    }
    rows.push({
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      // ~25% of contacts have no phone — exercises "Is empty"/"Is not empty".
      phone: rand() < 0.25 ? null : `+1 555 ${String(1000 + i * 37).slice(-4)}`,
      age: 21 + Math.floor(rand() * 45),
      is_active: rand() > 0.3,
      status: pick(statusOptions).value,
      // ~10% unassigned — exercises owner "Is empty".
      owner: rand() < 0.1 ? null : pick(users).id,
      country: pick(countries).id,
      company: pick(companies),
      language: pick(languages).id,
      tags,
      created_at: isoDaysAgo(Math.floor(rand() * 120)),
      last_contacted: rand() < 0.15 ? null : isoDaysAgo(Math.floor(rand() * 30)),
      // From 20 days ago to 25 days ahead (around today, so Today/Tomorrow/
      // This Week match rows); ~15% have none.
      due_date: dueRand() < 0.15 ? null : isoDaysAgo(20 - Math.floor(dueRand() * 46)),
    });
  }
  return rows;
}

export const contacts = buildContacts(40);

export function contactDisplayValues(contact) {
  return {
    owner: users.find((u) => u.id === contact.owner)?.full_name ?? '—',
    country: countries.find((c) => c.id === contact.country)?.name ?? '—',
    language: languages.find((l) => l.id === contact.language)?.language ?? '—',
  };
}
