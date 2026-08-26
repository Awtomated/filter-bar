import { useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import DateRangePicker from './DateRangePicker';
import { useFilterBarLabels } from '../tokens';
import { getDefaultOperatorId, getOperatorId, isEmptyFilterValue } from '../utils';

// Quick-chip editor for a date/datetime field with more than one operator.
// Unlike QuickOperatorEditor's generic operator+value side-by-side row, the
// operator select renders full width on its own line and the calendar
// (DateRangePicker) fills the full width below it — a plain inline value
// field reads fine next to a short operator label, but a calendar needs the
// room. There's no Apply button: a shortcut, a single-date pick, or a
// completed range all commit right away (see DateRangePicker's onChange).
function QuickDateOperatorEditor({
  fieldDef,
  appliedFilter,
  preferredOperatorId,
  onApply,
  timezone,
  dateFormat,
}) {
  const labels = useFilterBarLabels();
  const operators = fieldDef.operators ?? [];
  const [filter, setFilter] = useState(() => ({
    id: appliedFilter?.id ?? crypto.randomUUID(),
    field: fieldDef.name,
    operatorId: appliedFilter?.operatorId ?? preferredOperatorId ?? getDefaultOperatorId(fieldDef),
    value: appliedFilter?.value ?? null,
  }));

  const selectedOp = operators.find((op) => getOperatorId(op) === filter.operatorId);

  function handleOperatorChange(newOperatorId) {
    setFilter((prev) => ({ ...prev, operatorId: newOperatorId, value: null }));
  }

  function handleValueChange(newValue) {
    setFilter((prev) => ({ ...prev, value: newValue }));
    if (isEmptyFilterValue(newValue)) return;
    onApply({ ...filter, value: newValue });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <FormControl size='small' fullWidth>
        <InputLabel shrink>{labels.operatorLabel}</InputLabel>
        <Select
          value={filter.operatorId ?? ''}
          label={labels.operatorLabel}
          notched
          inputProps={{ readOnly: operators.length <= 1 }}
          onChange={(e) => handleOperatorChange(e.target.value)}
        >
          {operators.map((op) => (
            <MenuItem key={getOperatorId(op)} value={getOperatorId(op)}>
              {op.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <DateRangePicker
        selectedOp={selectedOp}
        value={filter.value}
        onChange={handleValueChange}
        timezone={timezone}
        dateFormat={dateFormat}
      />
    </Box>
  );
}

export default QuickDateOperatorEditor;
