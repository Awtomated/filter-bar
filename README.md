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
  date picker in its popover on click. Values are serialized as midnight of the picked calendar day
  in the `timezone` prop, with that day's UTC offset (`2026-11-12T00:00:00+05:30`, `…Z` for UTC;
  range shortcuts that end a period end at `23:59:59`), and the picker's displayed/typed section
  order comes from the `dateFormat` prop (e.g. `"DD-MM-YYYY"` puts Day first).

## Props

| Prop              | Type                                       | Required | Notes                                                                                         |
| ----------------- | ------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `filterApiUrl`    | string                                     | yes      | Passed to `fetcher` to load the schema above.                                                 |
| `fetcher`         | `(url) => Promise<{ data }>`               | yes      | Used for the schema fetch and any `fetch_url`-backed choices. Pass your HTTP client's `get`.  |
| `onApply`         | `(params) => void`                         | no       | Called with the flattened query params object every time a filter changes.                    |
| `choicesMap`      | `{ [field]: { options } \| { fetchUrl } }` | no       | Force specific fields to use these choices instead of the schema's own `options`/`fetch_url`. |
| `fieldProps`      | `{ [field]: { fieldDef: { select } } }`    | no       | Per-field choices behavior overrides (transform/group/label) — see below.                     |
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

          // Controls the display text for each choice, both in the
          // quick-chip selection list and in the "Filter" builder's
          // Autocomplete (its selected-value chips included). Takes
          // priority over every built-in label fallback.
          formatOptionLabel: (choice) =>
            `${choice.name} (${choice.is_active ? 'Active' : 'Archived'})`,
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
- `formatOptionLabel(choice, { fieldDef }) => string` — optional. Overrides the label shown for a
  choice everywhere it's rendered as text (list item, search matching, selected-value chip).

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

## shadcn version (`@awtomated/filter-bar/shadcn`)

A second entry built on Radix, Tailwind v4 and the host app's shadcn design tokens, styled to the
Figma filter chip row. The MUI version above is unchanged; both share the same data contract
(`filterApiUrl`, `fetcher`, `onApply` params, `appliedFilters` / `onFiltersChange` shape,
`choicesMap`, `fieldProps`, `labels`, `timezone`), so a screen can switch between them.

```jsx
import { DynamicFilterBar, FilterToggleButton } from '@awtomated/filter-bar/shadcn';

<FilterToggleButton active={open} label='Filter' count={activeCount} onClick={toggle} />;
{
  open && (
    <DynamicFilterBar
      filterApiUrl='/api/crm/contacts/filters/'
      fetcher={(url) => apiService.get(url)}
      dateFormat='dd/MM/yyyy' // date-fns pattern
      onApply={loadContacts}
    />
  );
}
```

How it behaves:

- **Chips** read `field operator value ×` (Body M). **Dashed = not applied, solid = applied.** A
  multi-select with one value reads "is", with several "is any of A, B" (no "+N").
- **Main chips:** the first `maxQuickChips` (default **2**) of `most_used_filters` (then schema
  order) always show, dashed while empty.
- **"+ Add filter"** opens a searchable list of the fields not yet shown; picking one adds a dashed
  chip and opens it. There is no multi-row builder. **"Clear all"** shows once something is applied.
- **Popovers:** the operator word on a chip opens the operator list; the chip opens its value
  editor: a searchable choice list with a check on selected entries, a text/number field (no Apply
  button and no request while typing: it applies on Enter, or on blur if the user forgot to press
  Enter; clearing it removes the filter), or a calendar with shortcuts (single date or range).
- Values that arrive as bare ids (e.g. `{ id: 5 }` from URL params) get their labels from the
  field's choices, fetched once per bar.

Requirements in the host app:

- Peer dependencies (optional for the MUI entry): `radix-ui`, `lucide-react`,
  `class-variance-authority`, `clsx`, `tailwind-merge`, `date-fns`.
- **Tailwind v4 with the design-system theme**, and the package in Tailwind's sources, or its
  classes produce no CSS:
  ```css
  @source "../../node_modules/@awtomated/filter-bar/dist";
  ```

Extra props: `classNames` (`row`, `chip`, `chipApplied`, `chipEmpty`, `chipOperator`, `chipValue`,
`popover`, `menuItem`, `menuItemSelected`, `groupHeading`, `addFilter`, `clearAll`, merged with
`cn()`), `className`, `portalContainer` (render popovers inside e.g. an MUI Dialog), and
`fieldProps[field].icon` (an icon shown in that field's chip). Extra `labels`: `filterBy`,
`singleValueOperator`, `previousMonth`, `nextMonth`. `tokens` is not used.

The primitives in `src/shadcn/ui/` and `src/shadcn/lib/utils.js` are copies of main-app's
`src/design-system` files. `yarn ui:sync` (with `MAIN_APP_DIR`) copies the app's theme into the
playground. See `SHADCN_MIGRATION_PLAN.md`.

## Development

```sh
yarn install
yarn test        # jest unit tests for the pure helpers
yarn build       # tsup -> dist/ (esm + cjs)
yarn playground  # Vite dev server at http://localhost:5173 for manual testing
```

### Local playground

`yarn playground` starts a Vite app (in `playground/`) that renders `DynamicFilterBar` straight from
`src/`, so component edits hot-reload. There is no real backend: a mock `fetcher` serves the filter
schemas and choice lists, and 40 sample contacts are filtered with whatever params `onApply` emits,
so you can see whether each filter really narrows the rows.

- **Scenarios** (sidebar): full schema with every field type, `appliedFilters`, `fieldProps`
  grouping and labels, `choicesMap` overrides, no `most_used_filters` (backfill), small schema, i18n
  `labels` + `tokens`, a failing choices endpoint, an empty schema, and a failing schema endpoint.
  Each scenario shows a "What to check" list.
- **Bar UI** switch: the shadcn version (default) or the MUI version, on the same scenario and mock
  data, so you can compare their `onApply` params. Two scenarios are mainly for the shadcn version:
  values from URL params (bare ids) and the bar inside an MUI Dialog.
- **Same CSS as main-app:** the playground loads the app's reset, `app-base.css` (Inter, 14px body,
  0.17px letter spacing), design tokens, type roles and Tailwind scales (copied by `yarn ui:sync`),
  puts MUI in the `mui` cascade layer and uses no `CssBaseline`, as the app does. What renders here
  is what renders in the app.
- **Design check** tab: renders the shadcn bar's components and compares their computed styles
  (font, size, line height, weight, letter spacing, colours, heights, radii, padding) with the Figma
  spec and the app's tokens, row by row. Toggle dark theme to check the dark tokens.
- **Controls**: `maxQuickChips`, `dateFormat`, `timezone`, mock network latency, dark theme, and a
  remount button that resets the bar's state.
- **Output tabs**: last `onApply` params and query string, matching sample contacts,
  `onFiltersChange` state, a network log of mock requests, and the `onApply` call history.

Sample data lives in `playground/sampleData.js`, schemas and scenarios in `playground/scenarios.js`.
To test a new case, add a field to `FIELDS` or a new entry to `scenarios`. In dev, React StrictMode
runs effects twice, so each fetch appears twice in the network log.

Releases are fully automated via `semantic-release` on push to `master` (stable) and `develop`
(`next` prerelease) — commit messages must follow
[Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.),
enforced by a commit-msg hook. Never hand-bump `package.json`'s version or run `npm publish`
manually.
