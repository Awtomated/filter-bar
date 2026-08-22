import dayjs from 'dayjs';
// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/TextField`-style import.
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SelectValueInput from './SelectValueInput';
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
function ValueInput({ fieldDef, selectedOp, value, onChange, onCommit, fetcher }) {
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

  if (inputField === 'date') {
    const dateValue = typeof value === 'string' && value ? dayjs(value) : null;
    const isValidDate = dateValue && dateValue.isValid() ? dateValue : null;
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={labels.valueLabel}
          value={isValidDate}
          onChange={(date) => {
            const iso =
              date && dayjs.isDayjs(date) && date.isValid() ? date.format('YYYY-MM-DD') : null;
            onChange(iso);
            onCommit?.(iso);
          }}
          slotProps={{ textField: { size: 'small', fullWidth: true } }}
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
