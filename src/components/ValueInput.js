import dayjs from 'dayjs';
// dayjs ships no `exports` map for its plugins, so Node's strict ESM
// resolver (used when consumers load dist/index.mjs directly) can't resolve
// these extensionless — the explicit `.js` is required there even though it
// trips the airbnb import/extensions rule.
// eslint-disable-next-line import/extensions
import utc from 'dayjs/plugin/utc.js';
// eslint-disable-next-line import/extensions
import timezonePlugin from 'dayjs/plugin/timezone.js';
// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/TextField`-style import.
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SelectValueInput from './SelectValueInput';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// A date field only ever cares about the calendar day ("Y-M-D"), never a
// real instant — values are serialized as literal UTC midnight of that day,
// matching the wire format the rest of the filter bar expects, and parsed
// back anchored to the calendar day in the given timezone (so e.g. a UTC
// midnight ISO string doesn't roll back to the previous day for a
// west-of-UTC viewer).
function toCalendarDayInTz(iso, tz) {
  if (!iso) return null;
  const utcDate = dayjs.utc(iso);
  return utcDate.isValid() ? dayjs.tz(utcDate.format('YYYY-MM-DD'), tz) : null;
}

// Renders the right value editor for a field+operator pair, driven by the
// *selected operator's* `input_field` — not just whether the field happens
// to expose choices — so a field with more than one operator (e.g. "Is" vs
// "Contains") can switch between a select and a plain text field as the
// user changes operator. `input_type: "multiple"` on that same operator
// turns the select into a multi-choice picker.
//
// `onCommit`, if given, fires whenever the user's action on the current
// widget is "complete" — immediately on picking a choice/date (there's
// nothing more to wait for), or on blur for a plain text/number field
// (so every keystroke doesn't commit). It's optional — callers that manage
// their own explicit submit (e.g. the "Filter" builder) simply don't pass it.
function ValueInput({
  fieldDef,
  selectedOp,
  value,
  onChange,
  onCommit,
  fetcher,
  timezone,
  dateFormat = 'MM/DD/YYYY',
}) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const listboxSx = {
    px: '8px',
    '& .MuiAutocomplete-option': { borderRadius: '8px', padding: tokens.menuItemPadding },
  };

  const inputField = selectedOp?.input_field;
  const multiple = selectedOp?.input_type === 'multiple';

  if (inputField === 'select' && fieldDef?.fetch_url) {
    return (
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI={fieldDef.fetch_url}
        label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={value}
        multiple={multiple}
        onChange={(newValue) => {
          onChange(newValue);
          onCommit?.(newValue);
        }}
        listboxSx={listboxSx}
      />
    );
  }
  if (inputField === 'select' && fieldDef?.options?.length) {
    const selectChoices = fieldDef.options.map((opt) => ({ ...opt, title: opt.label }));
    return (
      <SelectValueInput
        fetcher={fetcher}
        choices={selectChoices}
        label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={value}
        multiple={multiple}
        onChange={(newValue) => {
          onChange(newValue);
          onCommit?.(newValue);
        }}
        listboxSx={listboxSx}
      />
    );
  }

  // A "datetime"-typed field is date-only from this bar's perspective too —
  // there's no time-of-day widget anywhere in the package — so it shares
  // this picker with any field whose selected operator declares
  // `input_field: "date"`.
  if (inputField === 'date' || fieldDef?.type === 'datetime') {
    return (
      // Two MUI X quirks worth the extra care here:
      //
      // 1. Without an explicit `timezone` on the DatePicker itself, it
      //    resolves an unset value's reference date (used while the user is
      //    still filling in sections) against the *system* default
      //    timezone, not the one `toCalendarDayInTz` below assumes — which
      //    silently shifted the picked day by one for a viewer whose system
      //    zone isn't UTC-aligned with `timezone`. Passing it through keeps
      //    the whole picker, not just our own pre/post conversion, anchored
      //    to the same zone.
      // 2. `onChange` fires on *every* section edit, including incomplete
      //    ones (e.g. after typing only 2 of a year's 4 digits) — treating
      //    those as real commits, as the previous version of this branch
      //    did, feeds a half-typed value back into this controlled `value`
      //    prop and corrupts the section the user is still mid-typing,
      //    producing a wrong final date. So `onChange` here is a no-op —
      //    the field manages its own in-progress typing state
      //    uninterrupted — and only `onAccept` (fired once per completed
      //    keyboard entry, calendar pick, or clear) commits, itself
      //    filtered to skip a `validationError`'d intermediate accept.
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={labels.valueLabel}
          value={toCalendarDayInTz(value, timezone)}
          format={dateFormat}
          timezone={timezone}
          onChange={() => {}}
          onAccept={(date, ctx) => {
            if (ctx?.validationError) return;
            const iso =
              date && dayjs.isDayjs(date) && date.isValid()
                ? dayjs.utc(date.format('YYYY-MM-DD')).toISOString()
                : null;
            onChange(iso);
            onCommit?.(iso);
          }}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              sx: {
                '& .MuiInputLabel-root': {
                  backgroundColor: 'background.paper',
                },
              },
              slotProps: { inputLabel: { shrink: true } },
            },
          }}
        />
      </LocalizationProvider>
    );
  }

  const inputType = inputField === 'number' ? 'number' : 'text';
  return (
    <TextField
      size='small'
      label={labels.valueLabel}
      type={inputType}
      fullWidth
      value={value ?? ''}
      placeholder={labels.valueLabel}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        if (value === undefined || value === null || value === '') return;
        onCommit?.(value);
      }}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

export default ValueInput;
