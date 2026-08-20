import dayjs from 'dayjs';
// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/TextField`-style import.
import { TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import SelectValueInput from './SelectValueInput';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';

// Renders the right value editor for a field+operator pair: an API/local
// select when the field exposes choices, a date picker when the operator's
// `input_field` is "date", otherwise a plain text/number field.
function ValueInput({ fieldDef, selectedOp, value, onChange, fetcher }) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const listboxSx = {
    px: '8px',
    '& .MuiAutocomplete-option': { borderRadius: '8px', padding: tokens.menuItemPadding },
  };

  if (fieldDef?.fetch_url) {
    return (
      <SelectValueInput
        fetcher={fetcher}
        choicesAPI={fieldDef.fetch_url}
        label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={value}
        onChange={onChange}
        listboxSx={listboxSx}
      />
    );
  }
  if (fieldDef?.options?.length) {
    const selectChoices = fieldDef.options.map((opt) => ({ ...opt, title: opt.label }));
    return (
      <SelectValueInput
        fetcher={fetcher}
        choices={selectChoices}
        label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={value}
        onChange={onChange}
        listboxSx={listboxSx}
      />
    );
  }

  const inputField = selectedOp?.input_field;
  if (inputField === 'date') {
    const dateValue = typeof value === 'string' && value ? dayjs(value) : null;
    const isValidDate = dateValue && dateValue.isValid() ? dateValue : null;
    return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={labels.valueLabel}
          value={isValidDate}
          onChange={(date) =>
            onChange(
              date && dayjs.isDayjs(date) && date.isValid() ? date.format('YYYY-MM-DD') : null
            )
          }
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
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );
}

export default ValueInput;
