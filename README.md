# @awtomated/filter-bar

A schema-driven, fully customizable React filter bar for MUI applications — `DynamicFilterBar`
renders quick-access filter chips and an overflow "Filter" builder from a backend-described filter
schema, plus a standalone `FilterToggleButton` for toggling it open/closed.

It has no knowledge of any specific backend, HTTP client, or app theme — every side effect
(fetching, timezone, styling, copy) is injected via props.

## Install

```sh
npm install @awtomated/filter-bar
```

Peer dependencies (bring your own versions): `react`, `react-dom`, `@mui/material`,
`@mui/icons-material`, `@mui/x-date-pickers`.

## Usage

```jsx
import { DynamicFilterBar, FilterToggleButton } from '@awtomated/filter-bar';

function ContactsToolbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <FilterToggleButton active={open} onClick={() => setOpen((v) => !v)} />
      {open && (
        <DynamicFilterBar
          filterApiUrl='/api/crm/contacts/filters/'
          fetcher={(url) => apiService.get(url)}
          timezone={getUserTimezone()}
          choicesMap={{
            owner: { fetchUrl: '/api/account/organization/users/choices/' },
            projects: { fetchUrl: '/api/projects/chunks/choices/' },
          }}
          onApply={(queryParams) => loadContacts(queryParams)}
        />
      )}
    </>
  );
}
```

## The filter-config contract

`fetcher(filterApiUrl)` must resolve to `{ data: filterConfig }`, where `filterConfig` has this
shape:

```js
{
  filters: {
    // one entry per field, keyed by any name — the entry's own `field` is
    // what's actually used as the field name
    [anyKey]: {
      field: 'name__icontains',    // the query param base name
      label: 'Name',               // human-readable label
      type: 'string',              // "string" | "number" | "boolean" | "datetime" | ...
      default_operator: 'icontains',
      operators: [
        {
          label: 'Contains',       // e.g. "Contains"
          value: 'icontains',      // e.g. "icontains"
          query_param: 'name__icontains',
          input_type: 'single',    // "single" | "multiple" | "none"
          input_field: 'text',     // "text" | "number" | "date" | "select" | null
          query_value: 'true',     // only for input_type "none" (e.g. isnull=true)
        },
      ],
      options: null,               // local choices: [{ id, label, value }] | null
      fetch_url: null,             // OR choices fetched lazily
      field_key: 'select',         // opt-in: always render as a selection chip
    },
  },
  most_used_filters: ['name'],     // field names promoted to individual quick chips
}
```

- A field is a **selection field** (renders as a searchable choice chip) when it has
  `field_key: "select"`, or exposes `options`/`fetch_url`.
- Everywhere a field's value editor is driven by an explicit operator choice (the "Filter" builder,
  and quick chips for fields with more than one operator), the widget itself — select vs. plain
  text/number/date — follows the _currently selected operator's_ `input_field`, not just whether the
  field exposes choices. A field can therefore expose a select for one operator (e.g. "Is") and a
  plain text field for another (e.g. "Contains") on the same field.
- A select renders as **multi-choice** only when the selected operator has `input_field: "select"`
  **and** `input_type: "multiple"`; every other shape renders single-select. For a selection field
  with only one operator, this is decided by that one (default) operator — see
  `isMultiSelectionField`.
- A field renders a **date picker** when the selected operator's `input_field` is `"date"`, or when
  the field's own `type` is `"datetime"` — whichever applies, regardless of the other. Like any
  other field, a date field listed in `most_used_filters` gets its own quick chip and opens the same
  date picker in its popover on click. Values are serialized as a UTC-midnight ISO string for the
  field's calendar day, anchored to the `timezone` prop, and the picker's displayed/typed section
  order comes from the `dateFormat` prop (e.g. `"DD-MM-YYYY"` puts Day first).

## Props

| Prop              | Type                                       | Required | Notes                                                                                         |
| ----------------- | ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `filterApiUrl`    | string                                     | yes      | Passed to `fetcher` to load the schema above.                                                 |
| `fetcher`         | `(url) => Promise<{ data }>`               | yes      | Used for the schema fetch and any `fetch_url`-backed choices. Pass your HTTP client's `get`.  |
| `onApply`         | `(params) => void`                         | no       | Called with the flattened query params object every time a filter changes.                    |
| `choicesMap`      | `{ [field]: { options } \| { fetchUrl } }` | no       | Force specific fields to use these choices instead of the schema's own `options`/`fetch_url`. |
| `fieldProps`      | `{ [field]: { fieldDef: { select } } }`    | no       | Per-field choices behavior overrides (transform/group) — see below.                           |
| `appliedFilters`  | array                                      | no       | Initial filter state (controlled from outside).                                               |
| `onFiltersChange` | `(filters) => void`                        | no       | Fires on every filter state change, before `onApply`'s param flattening.                      |
| `timezone`        | string (IANA)                              | no       | Defaults to the browser's detected timezone. Used to serialize/parse date field values.       |
| `dateFormat`      | string (dayjs format)                      | no       | Defaults to `"MM/DD/YYYY"`. Controls the date picker's displayed/typed section order.         |
| `tokens`          | object                                     | no       | Spacing/radius overrides — see Theming below.                                                 |
| `labels`          | object                                     | no       | UI copy overrides (i18n) — see Theming below.                                                 |
| `maxQuickChips`   | number                                     | no       | Defaults to 5. Caps individually-rendered chips before folding into "Filter".                 |

`FilterToggleButton` is a plain controlled `IconButton` — `active: boolean`, `onClick: () => void`,
optional `icon`/`tooltip`, plus any other `IconButtonProps`.

## Per-field choices behavior (`fieldProps`)

`choicesMap` controls _where_ a field's choices come from; `fieldProps` controls _how_ they're
transformed and rendered once fetched. It's keyed by field name and is purely additive — a field
with no entry, or the prop omitted entirely, behaves exactly as if `fieldProps` didn't exist.

```jsx
<DynamicFilterBar
  // ...
  fieldProps={{
    status: {
      fieldDef: {
        select: {
          // Runs once, right before the choices reach the Autocomplete's
          // `options` or the quick chip's list — for a fetched OR a static
          // `options` list. Use it to reshape/filter/sort/annotate choices,
          // e.g. attach a group key the API response doesn't provide.
          transformChoices: (choices) =>
            choices.map((c) => ({ ...c, category: c.is_active ? 'Active' : 'Archived' })),

          // Renders a header above each group of choices, both in the
          // quick-chip selection list and in the "Filter" builder's
          // Autocomplete.
          grouping: true,
          groupingKey: 'category', // or: groupBy: (choice) => choice.category
          sortGroups: (a, b) => a.localeCompare(b), // optional, defaults to alphabetical
        },
      },
    },
  }}
/>
```

- `transformChoices(choices, { fieldDef }) => choices` — optional. Receives the resolved choices
  list (already normalized, e.g. `full_name` → `name`) and returns the list to actually render.
- `grouping` — optional, defaults to `false`.
- `groupingKey` — property name read off each choice to determine its group. Ignored if `groupBy` is
  given.
- `groupBy` — optional `(choice) => string`, takes precedence over `groupingKey`.
- `sortGroups` — optional `(a, b) => number` comparator over group keys; defaults to alphabetical.

## Theming & customization

The package ships with no external design-token dependency — it renders inside your app's own MUI
`ThemeProvider` (colors/typography come from theme as usual) and exposes two additional override
points:

- **`tokens`** — spacing/radius values (chip radius, popover radius, gap, search-box sizing,
  checkbox size) plus a handful of color/typography overrides that don't map to a single obvious
  theme palette slot: `chipBorderColor`, `searchBackground`, `hoverBackground`, `selectedBackground`
  (each a theme palette path string, e.g. `'primary.hoverBg'` for a custom palette extension), and
  `menuItemTypographySx` (a plain style object applied to selection-list item text). Pass your
  design system's values for a pixel-exact match; omitted keys fall back to sensible defaults (see
  `defaultTokens` in `src/tokens.js`). Every other color in the package (text, background.paper,
  primary.main, etc.) already reads from your theme directly via standard MUI palette slots, so it
  re-themes automatically without any token overrides.
- **`labels`** — every hardcoded UI string (chip labels, search placeholders, button text) so you
  can localize or rebrand without forking (see `defaultLabels` in `src/tokens.js`).

For one-off styling beyond tokens, every MUI sub-component underneath is a plain `@mui/material`
component — target it via your theme's `components.MuiChip.styleOverrides` etc. the same way you
would anywhere else in your app.

## Advanced: building custom UI on the same logic

`buildQueryParams`, `adaptApiConfig`, `applyChoicesMap`, `applyFieldProps`, `getDefaultOperatorId`,
`isSelectionField`, and `isMultiSelectionField` are all exported as pure functions if you want to
build a different UI on top of the same filter-config contract, or reuse `QuickFilterChip` as a
building block.

## Development

```sh
yarn install
yarn test        # jest unit tests for the pure helpers
yarn build       # tsup -> dist/ (esm + cjs)
```

Releases are fully automated via `semantic-release` on push to `master` (stable) and `develop`
(`next` prerelease) — commit messages must follow
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.),
enforced by a commit-msg hook. Never hand-bump `package.json`'s version or run `npm publish`
manually.
