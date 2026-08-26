// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/TextField`-style import.
import { TextField } from '@mui/material';
import SelectValueInput from './SelectValueInput';
import DateRangePicker from './DateRangePicker';
import DateFieldValue from './DateFieldValue';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';

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
  // 'calendar' (default): the calendar renders directly in place — used by
  // the quick chip, which is already itself a popover trigger, so the
  // calendar is the only thing to open. 'field': a compact, row-sized field
  // showing the picked date as text, opening the calendar in its own
  // popover on click — used by the "Filter" builder, where a field sits
  // inline next to the field/operator selects.
  dateDisplay = 'calendar',
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
  // `input_field: "date"`. Same widget, same operator-driven shortcuts, as
  // the quick-chip's date editor (QuickDateOperatorEditor) — a field
  // reached through the "Filter" builder gets the identical experience.
  if (inputField === 'date' || fieldDef?.type === 'datetime') {
    if (dateDisplay === 'field') {
      return (
        <DateFieldValue
          selectedOp={selectedOp}
          value={value}
          onChange={onChange}
          onCommit={onCommit}
          timezone={timezone}
          dateFormat={dateFormat}
        />
      );
    }
    return (
      <DateRangePicker
        selectedOp={selectedOp}
        value={value}
        onChange={(newValue) => {
          onChange(newValue);
          onCommit?.(newValue);
        }}
        timezone={timezone}
        dateFormat={dateFormat}
      />
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
