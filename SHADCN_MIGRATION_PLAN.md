# Plan: a shadcn version of filter-bar, alongside MUI

Add a shadcn/Radix/Tailwind v4 version of the bar that matches main-app's `src/design-system` and
the Figma filter chip design, **without removing the MUI version**. Both ship in the same package.
The app (and any microfrontend) switches screen by screen behind a flag. MUI is removed only after
testing, as a separate release (Step 8).

- Design: Figma "Work-in-Progress", **Filter chip row**
  ([581:3673](https://www.figma.com/design/luAicMCLsYgXHBjGqnpDnH/Work-in-Progress?node-id=581-3673&m=dev)).
  Reference for states not shown there: the draft frame "Filters · Tasks list" (354:72920).
- Not in scope, as agreed: the **"+N" overflow chip** ("Filter chip / Overflow", max 3 visible).
  Chips are not capped.
- App side: follows main-app's `SHADCN_THEME_PLAN.md` (Step 4: "Components") and
  `src/design-system/README.md`.

## 0. Progress at a glance

| Step | What                                                                    | Repo       | Size | Status                                      |
| ---- | ----------------------------------------------------------------------- | ---------- | ---- | ------------------------------------------- |
| 0    | Prep: three MUI bug fixes, answer §8                                    | filter-bar | S    | Not started (MUI left untouched on purpose) |
| 1    | Add `command`, `checkbox`, `input` to the app design system             | main-app   | S    | **Not needed** (see §9)                     |
| 2    | `@awtomated/filter-bar/shadcn` entry, ui sync, playground with both UIs | filter-bar | M    | **Done** 2026-11-12, uncommitted            |
| 3    | Chip row from Figma: filter chip, empty chip, Add filter, Clear all     | filter-bar | M    | **Done** 2026-11-12, uncommitted            |
| 4    | Popover bodies: operator menu, choice lists, text/number                | filter-bar | L    | **Done** 2026-11-12, uncommitted            |
| 5    | Dates: date-fns calendar, shortcuts, chip date text                     | filter-bar | L    | **Done** 2026-11-12, uncommitted            |
| 6    | Release **1.1.0** (additive, MUI unchanged)                             | filter-bar | S    | Not started                                 |
| 7    | App: flag per screen, `@source`, dialogs, QA                            | main-app   | M    | Not started                                 |
| 8    | **Later, after sign-off:** remove MUI, release 2.0.0                    | both       | M    | Not started                                 |

---

## 1. Review findings (unchanged from the first review)

**main-app**

- **Tailwind v4 with its own theme** (`src/styles/app-utilities.css`). It contains shadcn's scales
  (`text-sm`, `text-xs`, `rounded-md` = 6px, `rounded-lg` = 8px, `rounded-xl` = 12px,
  `font-medium`), the app scales (`text-14`, `rounded-8`) and the type roles (`text-body-m`,
  `text-label-m`, ...).
- **Only `src/` is scanned** (`source(none)` + `@source "../**/*"`). Classes inside
  `node_modules/@awtomated/filter-bar` produce no CSS until an `@source` line is added (Step 7).
- **Design system:** `tokens.css` → `theme.css`; `cn()` with an extended tailwind-merge (type roles,
  numeric scales). Primitives present: button, popover, select, dropdown-menu, tooltip, spinner,
  badge, label. **Missing:** `command`, `checkbox`, `input`. React 18: `asChild` triggers need
  `forwardRef`.
- **Dates are date-fns** (`useDateFormat()` → e.g. `dd/MM/yyyy`). That's why the wrapper's
  `dateFormat` is commented out: the MUI bar expects dayjs patterns.
- **Usage:** 35 screens via `shared-components/DynamicFilter/DynamicFilterBar.js`
  (`DynamicFilterBarPanel`, passes MUI palette paths as `tokens`); 6 screens import
  `FilterToggleButton`; 2 screens render the bar inside MUI Dialogs (`Hub/Lists/AddProjectModal`,
  `AddToListDialog`), where Radix popovers (`z-50`) would open behind the dialog (`z-1300`) and lose
  focus to MUI's focus trap.
- **Install:** `github:Awtomated/filter-bar#<commit>` plus a `patch-package` patch that vendors
  `dist/`.

**filter-bar**

- 13 MUI components, MUI X Pro date pickers, dayjs.
- **Bugs to fix in the MUI version now:**
  - Leftover `xxx` and `sd` props in `FilterRow.js`.
  - Invalid `px: '0px 6px'` in `QuickFilterChip.js`.
  - Hard-coded `#460D91` in `SelectValueInput.js` and `OtherFiltersBuilder.js`.

**Microfrontends** may use the package, so it stays a package, and the MUI version must keep working
unchanged for them.

---

## 2. Decisions

### D1. Two entry points in one package; MUI untouched

```
@awtomated/filter-bar          → MUI version (today's API and behaviour, unchanged)
@awtomated/filter-bar/shadcn   → shadcn version (new)
```

```
src/
  index.js              MUI entry (unchanged)
  utils.js  tokens.js   shared pure logic (unchanged: buildQueryParams, adaptApiConfig, ...)
  components/           MUI components (unchanged apart from the 3 bug fixes)
  shadcn/
    index.js            DynamicFilterBar, FilterToggleButton, FilterChip
    components/         chip row, chip, popover bodies
    hooks/              useChoices (fetch + transformChoices + grouping), useFilterState
    ui/                 synced copies of the app's design-system primitives
    lib/utils.js        synced copy of the app's cn()
    dates.js            date-fns helpers (same ISO output as utils.js)
```

- `tsup.config.js` builds two entries (`index`, `shadcn`). `package.json` `exports` gains
  `"./shadcn": { "import": "./dist/shadcn.mjs", "require": "./dist/shadcn.js" }`.
- **Same data contract in both versions:** `filterApiUrl`, `fetcher`, `onApply` params,
  `appliedFilters` / `onFiltersChange` shape, `choicesMap`, `fieldProps`, `labels`, `timezone`, and
  every `utils.js` export. A screen can switch between the two versions and its saved filters,
  `paramsToFilters` and the backend are unaffected.
- The shadcn version reuses `utils.js` and adds its own hooks. It does **not** refactor the MUI
  components; they stay byte-for-byte as they are now, so their risk is zero.
- Release as **1.1.0** (`feat:`), additive and non-breaking.

### D2. Dependencies

- MUI peer dependencies and `dayjs` **stay** (MUI entry).
- New **optional** peers (`peerDependenciesMeta: { optional: true }`), at the app's versions:
  `radix-ui@^1.8.1`, `lucide-react@^1.59.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`,
  `tailwind-merge@^3.7.0`, `date-fns@^4.1.0`, `cmdk`. A microfrontend that only imports the MUI
  entry needs none of them.
- Peers rather than bundled copies, so the bar and the app share **one Radix instance**. Nested
  popovers and outside-click/Escape handling only work within one instance.

### D3. Primitives: synced copies of the app's design system

`src/shadcn/ui/*` holds the app's `design-system/components/ui` files, with only the `cn` import
path rewritten. `src/shadcn/lib/utils.js` is the app's `cn()` including its tailwind-merge config.
`yarn ui:sync` copies them and `yarn ui:sync --check` fails on drift (Step 2). When the design
system becomes its own package, these copies are replaced by imports.

### D4. Styling only with the app's semantic tokens and type roles

No hex values, no `dark:`. Figma's colours map to the app tokens (§3). Where Figma's hex differs
slightly from `tokens.css`, the app's value wins (e.g. Figma `foreground` #1a1a1e vs the app's
`neutral-900` #1c1a22, Figma `muted-foreground` #67676f vs `neutral-600` #6a6577), because the app's
tokens are the source of truth.

### D5. Dates in the shadcn version: date-fns

`dateFormat` takes a **date-fns** pattern there, so the wrapper can pass `useDateFormat()`. Values
are built with the MUI version's own code (`calendarDayToIso(day, timezone)` and its shortcut
expressions), so they are identical: midnight of the picked day in the bar's timezone with its
offset, e.g. `2026-11-12T00:00:00+05:30` (ranges `start,end`). `test/shadcn/timezoneParity.test.js`
proves it across bar and browser timezones, DST changes and year ends.

### D6. Theming props in the shadcn version

`tokens` (MUI palette paths) is not supported. Use `classNames`
(`{ row, chip, chipEmpty, chipOperator, chipValue, popover, addFilter, clearAll, ... }`, merged with
`cn()`) and `portalContainer` (for MUI dialogs, Step 7). `labels` gains the new strings: `addFilter`
(exists), `clearAll` (exists), `singleValueOperator` ("is"), `emptyChip`.

---

## 3. Figma spec → implementation

### 3.1 Filter chip (set): `Owner is Paul Becker ×`

From 581:3673, "Filter chip" (Linear-style: field + operator + value).

| Part        | Figma                                                          | Class (app theme)                                                                                                                  |
| ----------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Container   | bg `background`, 1px `border`, radius full, px 10, py 4, gap 6 | `inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1` (30px tall: 20 + 2×4 + 2×1 border)  |
| Field icon  | 14px lucide (user-round, calendar, languages)                  | `size-3.5 shrink-0`. Icon per field, see §3.4                                                                                      |
| Field label | Body M, `foreground`                                           | `text-body-m text-foreground`                                                                                                      |
| Operator    | Body M, `muted-foreground`                                     | `text-body-m text-muted-foreground`. A button when the field has >1 operator (opens the operator menu, §3.5); plain text otherwise |
| Value       | Body M, `foreground`                                           | `text-body-m text-foreground truncate max-w-60`. Clicking it (or the chip) opens the value popover                                 |
| Clear       | 14px ×                                                         | separate `<button aria-label={labels.clearFilterTooltip}>` with lucide `X` `size-3.5 text-muted-foreground hover:text-foreground`  |
| Open state  | primary border (draft 354:72947)                               | `data-[state=open]:border-primary`                                                                                                 |
| Focus       | —                                                              | `focus-visible:ring-[3px] focus-visible:ring-ring/50` (design-system convention)                                                   |

All chip text uses **Body M (14px / 20px / 400)**, the app's `text-body-m`, which is exactly Figma's
`Body/M`. This replaces today's 13px MUI chip label.

### 3.2 Chip wording

| Case                                 | Chip text                                                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Single value (`Is`, `Contains`, ...) | `Owner` `is` `Paul Becker`: operator label lowercased                                                                 |
| Multi-select with **one** value      | `Targets` `is` `DE`: Figma rule "one value = is" (`labels.singleValueOperator`)                                       |
| Multi-select with **two or more**    | `Targets` `is any of` `DE, FR`: labels joined with ", ", truncated with the full list in a tooltip (**no "+N" chip**) |
| Value-less operator (`Is empty`)     | `Phone` `is empty`, with no value part                                                                                |
| Date range                           | `Due date` `between` `1–15 Nov`: compact range, see §3.6                                                              |
| Choice labels                        | through `getChoiceLabel` / `fieldProps...formatOptionLabel`, as today (languages keep the app's format)               |

### 3.3 Empty chip (a main filter with no value)

The Figma component description says the row's default shows "the module's two main filters as
**empty** chips: dashed '+ Field'". The draft frame (354:72943) shows them solid with a chevron
instead (§8, Q2).

Plan (description version):
`rounded-full border border-dashed border-border px-2.5 py-1 text-body-m text-muted-foreground` +
lucide `Plus` `size-3.5`, label `Owner`. Clicking it opens the value popover; once a value is
applied it becomes a set chip (§3.1).

### 3.4 Field icons

The schema has no icon. Add an optional `fieldProps[name].icon` (a React element, e.g.
`<UserRoundIcon />`), so the app keeps choosing icons. Defaults by type: date → `Calendar`, select →
`ListFilter`, number → `Hash`, text → `Type`.

### 3.5 Row: `[chips] [+ Add filter] [Clear all]`

| Part        | Figma                                                                           | Class                                                                                                     |
| ----------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Row         | gap 8, centred                                                                  | `flex flex-wrap items-center gap-2`                                                                       |
| Add filter  | h 28, px 10, gap 4, radius 8, bg `muted`, Text-xs Medium (12/16/500), 16px plus | `Button`-based: `h-7 gap-1 rounded-lg bg-muted px-2.5 text-xs font-medium text-foreground [&_svg]:size-4` |
| Clear all   | same size, transparent, Text-xs Medium; only when a filter is active            | `h-7 rounded-lg px-2.5 text-xs font-medium text-foreground hover:bg-muted`                                |
| Overflow +N | **out of scope**                                                                | —                                                                                                         |

Figma's `radius-md` is 8px, which is the app's `rounded-lg` (the app's `rounded-md` is 6px).

**Row behaviour per Figma** ("Appears only after Filter is clicked or when a filter is active"):

- Default: the first `pinnedCount` (default **2**) entries of `most_used_filters` as empty chips.
- Every active filter is a set chip, pinned or not, in the order applied.
- **Add filter** opens a searchable field list (`Command`). Picking a field opens that field's value
  popover; applying it adds a chip. This replaces the MUI version's "Filter" chip with its multi-row
  builder (Apply/Cancel). That builder is **not** part of the shadcn version (§8, Q3).
- **Clear all** clears every filter (one `onApply({})`).
- The toggle button keeps controlling whether the row is shown (as today, the app owns that state).

### 3.6 Dates in the chip

- Range in the same month: `1–15 Nov`. Otherwise: `28 Oct – 3 Nov` (date-fns, en dash).
- Single date: `dateFormat`.
- If the value equals a shortcut's current range, show the shortcut label instead (e.g.
  `is This week`, as in the draft). This is computed when rendering, so nothing extra is stored.

### 3.7 Filter toggle button (shadcn version)

The draft (354:72925) shows a labelled button rather than today's icon-only one: `Filter · 3`,
`bg-secondary text-secondary-foreground h-8 gap-1 rounded-xl px-2.5 text-sm font-medium`, lucide
`ListFilter` `size-4`. Props stay `active`, `onClick`, `icon`, `tooltip`, plus `count` and `label`.
Icon-only stays available (`label={null}`) for toolbars without room (§8, Q4).

### 3.8 Popover bodies (Step 4–5, typography only)

Design references from the draft: Add filter 248px, List value 264px (plain and grouped), Date
417px, Text 264px, Operator menu 200px.

- Menu items, search and inputs: `text-label-m`.
- Group headings: `text-caption text-muted-foreground`.
- Selected item: `bg-accent text-primary`.
- Popover surface: the design system's `PopoverContent` (`bg-popover border shadow-md rounded-md`).

---

## 4. Steps

### Step 0: Prep (filter-bar)

1. Fix the three MUI bugs (§1) as a `fix:` release.
2. Answer §8.

### Step 1: Missing primitives (main-app)

`yarn ui:add command checkbox input`, then add `forwardRef` where a primitive can be an `asChild`
trigger, a story and tests each, and exports in `design-system/index.js`.

### Step 2: Scaffolding (filter-bar)

1. **Package setup:** the `src/shadcn/` tree, a second tsup entry, `exports["./shadcn"]` and the
   optional peers (D2).
2. **`scripts/sync-design-system.mjs`** (`yarn ui:sync [--check]`, app path from `MAIN_APP_DIR`):
   - Copies the needed `components/ui/*.jsx` and `lib/utils.js`, rewriting imports.
   - Copies `styles/tokens.css`, `styles/theme.css` and the `@theme` blocks of `app-utilities.css`
     into `playground/theme/`.
3. **Playground:**
   - Add `@tailwindcss/vite` and import the synced theme.
   - Add a **"UI: MUI | shadcn" switch**: the same scenario and mock API rendered with either entry.
   - Add a **"Compare" mode** that records `onApply` from both versions for the same clicks.
   - Add scenarios for: empty pinned chips, a one-value multi-select ("is"), a long multi-select
     list (truncation, no +N), Clear all, and Add filter.
4. **Jest:** polyfills for Radix/cmdk (`ResizeObserver`, `scrollIntoView`, pointer capture,
   `DOMRect`). Put the shadcn tests in `test/shadcn/`; the MUI tests are not touched.

### Step 3: Chip row (filter-bar)

`FilterChip` (set / empty / open, §3.1–3.3), the row with Add filter and Clear all (§3.5), field
icons (§3.4), chip wording (§3.2) and `FilterToggleButton` (§3.7). Get design sign-off in the
playground, light and dark, before Step 4.

### Step 4: Popover bodies (filter-bar)

- **Operator menu:** `DropdownMenu` radio items, opened from the operator word. Picking a value-less
  operator applies immediately (as today).
- **Choice list:** `Command` + `Checkbox`, with `CommandGroup` headings for grouping (pipeline
  stages). Use `shouldFilter={false}` and keep today's filtering, so search matches
  `formatOptionLabel`. Single choice applies and closes; multi applies on each toggle (as today).
- **Text / number:** `Input`, applied on Enter (as today).
- **Add filter field list:** `Command` over the fields that don't have a chip yet.
- **Lazy fetching:** `useChoices` fetches on first open with stable dependencies. This fixes the MUI
  version's refetch-while-open issue in the new code only.

### Step 5: Dates (filter-bar)

A calendar panel styled like the app's `DateRangeCalendar` (date-fns, Monday-first, one-band range),
plus the shortcut buttons (Today/Tomorrow, Today/Yesterday, This Week ... Reset). It **applies on
pick**, like today's bar, with no Save/Cancel. Use `src/shadcn/dates.js` for date-fns patterns,
"today" in `timezone` and ISO output. Its tests assert the **same ISO strings** as the existing
`utils.test.js` cases.

### Step 6: Release 1.1.0 (filter-bar)

- README: a new "shadcn version" section (import path, optional peers, the `@source` step,
  `classNames`, `fieldProps.icon`, date-fns `dateFormat`). The MUI docs stay as they are.
- Publish to the registry. With the git-commit install, the app's `patch-package` patch must be
  regenerated to include `dist/shadcn.*` (§8, Q6).

### Step 7: Try it in main-app behind a flag

1. `src/styles/app-utilities.css`: `@source "../../node_modules/@awtomated/filter-bar/dist";`
   (harmless while the flag is off).
2. Bump `@awtomated/filter-bar` to 1.1.0. Keep MUI.
3. **Flag:** add `REACT_APP_FILTER_BAR_UI=mui|shadcn` (default `mui`) **and** a per-screen `ui` prop
   on `DynamicFilterBarPanel` that overrides it. The wrapper imports both entries:
   - MUI path: exactly today's code (`TOKENS`, `Collapse`, no `dateFormat`).
   - shadcn path: no `tokens`; `dateFormat={useDateFormat()}`; `fieldProps` with icons;
     `wrapperClassName` instead of `wrapperSx`; `Spinner` instead of `CircularProgress`.
   - The 6 direct `FilterToggleButton` imports follow the same flag through a small app wrapper.
4. **Dialogs** (`AddProjectModal`, `AddToListDialog`), for the shadcn path only: `portalContainer`
   pointing at the dialog content, or `disableEnforceFocus` + a popover z-index above 1300 (§8, Q5).
5. **QA, one screen at a time** (flip `ui="shadcn"` per screen):

   1. Contacts.
   2. Companies, Deals, Projects (list + cards).
   3. Glossary, Placeholders, Reports, Language Manager.
   4. Hub lists (both dialogs).

   Check on each:

   - The chips match Figma.
   - The `onApply` params match the MUI version for the same filters (network tab).
   - Saved/default filters (`defaultParams` → `paramsToFilters`) load as chips.
   - Grouped pipeline stages and language labels.
   - Dates in the org's localisation format.

6. Run `yarn test --findRelatedTests` on the wrapper and the switched screens.

### Step 8 (later, after sign-off): remove MUI → 2.0.0

Only once every screen in the app **and every microfrontend that uses the package** runs on the
shadcn version:

- **filter-bar:** delete the MUI entry, `components/`, `tokens.js` and dayjs. Make `/shadcn` the
  root export (keep `/shadcn` as an alias for one release). Turn the optional peers into required
  ones and drop the MUI peers. Release with `feat!:` → **2.0.0**.
- **main-app:** remove the flag and the MUI path in the wrapper, and delete the unused
  `DynamicFilter/QuickFilterChip.js` (with a human decision, per CLAUDE.md). Drop
  `@mui/x-date-pickers-pro` only if nothing else in the app uses it.

---

## 5. Tests

- **MUI version:** the existing 242 tests, unchanged, plus tests for the 3 bug fixes. CI's 90%
  coverage applies to both versions.
- **shadcn version:** role- and label-based tests in `test/shadcn/` (chip states and wording, the
  operator menu, Add filter, Clear all, grouping, dates), plus `jest-axe` on the chip and row.
- **Parity tests:** the same schema and filter state through both entries must give identical
  `buildQueryParams` output and identical `onFiltersChange` shapes. This is what makes switching a
  screen safe.

## 6. Risks

| Risk                                                                           | Mitigation                                                                                      |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| shadcn version renders without styles (missing `@source`)                      | Step 7.1, and a README warning. Check that the chip has its border on the first screen switched |
| Synced `ui/*` drifts from the app                                              | `yarn ui:sync --check` before each release                                                      |
| Popovers behind / unfocusable in MUI dialogs                                   | Step 7.4                                                                                        |
| Row model change (Add filter instead of the multi-row builder) surprises users | Design sign-off in the playground (Step 3); per-screen flag; MUI version stays one prop away    |
| Microfrontends without Tailwind v4 / the design tokens import `/shadcn`        | Documented requirement; they stay on the MUI entry until they have the theme                    |
| Two date libraries during the transition (dayjs + date-fns)                    | Only until Step 8; both are already in the app                                                  |

## 7. What changed since the first plan

- **MUI stays:** shadcn ships as an additional `/shadcn` entry in **1.1.0**, and MUI removal moved
  to Step 8 (2.0.0).
- **The package stays** (microfrontends may use it), so option C (moving it into the app) is out.
- **The chip/pill design and typography come from Figma 581:3673:** a Linear-style
  `field · operator · value · ×` pill in Body M, with empty chips, Add filter and Clear all.
- **No "+N" overflow chip.**

## 8. Open questions

Answered:

1. ~~Microfrontends~~: they may use it, so it stays a package.
2. ~~Empty chip style~~: **dashed when not applied, solid when applied.**
3. ~~Add filter vs the "Filter" builder~~: **no multi-row builder.** "+ Add filter" opens the field
   list (Figma 581:4144, without icons and "Advanced filter"); picking a field adds a dashed chip,
   applying a value makes it solid. Choice popovers use the same menu design, with a check on the
   selected entries.
4. ~~Overflow~~: no "+N" chip.

Still open:

5. **Toggle button:** both are built (`label` prop → `Filter · 3`; without it, icon-only). Which one
   do the toolbars use?
6. **Dialogs:** `portalContainer` is built and verified in the playground (scenario 12). Use it in
   `AddProjectModal` / `AddToListDialog`, or prefer `disableEnforceFocus` + z-index?
7. **Registry:** publish 1.1.0 to npm/Verdaccio, or keep the git install and regenerate the patch?
8. **Main chips:** `maxQuickChips` defaults to 2 in the shadcn version (Figma: "the module's two
   main filters"), filled from `most_used_filters`, then schema order. Keep 2 for every module?

## 9. Built (2026-11-12): what differs from the plan above

- **No `cmdk`, `checkbox` or `input` primitives.** One `MenuList` (`src/shadcn/components/`) serves
  the Add filter list, choice lists and the operator list. It follows Figma's menu (search field,
  Text-sm rows, trailing check) with keyboard support (type to filter, ↑/↓, Enter). That avoids a
  new dependency the app doesn't have, so Step 1 isn't needed.
- **Copied primitives:** `button`, `popover` (plus a `container` prop, marked `filter-bar:`) and
  `spinner` from the app, and the app's `cn()`. `yarn ui:sync` copies the app **theme** into
  `playground/theme/` and lists the primitives to compare; it doesn't overwrite or `--check` them.
- **Operators:** the operator word on an applied chip opens the operator list. Every value popover
  also has a header ("Name contains ▾"), so a dashed chip can pick its operator before a value. An
  operator that needs a different editor keeps the applied filter until the new value is set.
- **Bare-id values** (`appliedFilters` from URL params): the chip loads the field's choices on mount
  and shows labels; ids show in muted text while loading. Lists are cached per bar.
- **`maxQuickChips`** means "main (pinned) chips" in the shadcn version, default 2.
- **Verified:**
  - Jest: 288 tests (242 MUI unchanged + 46 new), coverage 98% statements / 93.6% branches.
  - `yarn smoke-test`: both entries, CJS and ESM.
  - Lint: no errors.
  - Headless Chrome against the playground: chip metrics (30px, Body M, dashed/solid), Add filter,
    checks, operator changes, ranges, Clear all, bare-id labels, MUI Dialog focus, dark mode.
    `onApply` params match the MUI format (`name__icontains`, `status__in=lead,customer`,
    `created_at__range=<iso>,<iso>`).
