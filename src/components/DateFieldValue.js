import { useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, IconButton, InputAdornment, Popover, TextField } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DateRangePicker from './DateRangePicker';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { isoToCalendarDay } from '../utils';

function formatDay(iso, timezone, dateFormat) {
  const day = isoToCalendarDay(iso, timezone);
  return day ? day.format(dateFormat) : '';
}

function formatDisplayValue(selectedOp, value, timezone, dateFormat) {
  if (selectedOp?.input_type === 'range') {
    const start = formatDay(value?.start, timezone, dateFormat);
    const end = formatDay(value?.end, timezone, dateFormat);
    return start || end ? `${start} - ${end}` : '';
  }
  return formatDay(value, timezone, dateFormat);
}

// The "Filter" builder's date value — a compact, read-only field (matching
// every other field/operator select in its row) showing the picked date (or
// "start - end" for a range operator) as text. Clicking the field or its
// calendar icon opens DateRangePicker in a popover, with the same
// operator-driven shortcuts as the quick chip; picking a value there closes
// the popover and updates the field's text. Kept out of ValueInput's plain
// `inline` date branch (used by the quick chip, which is already itself a
// popover trigger) so that path stays a direct, single-popover interaction.
function DateFieldValue({ selectedOp, value, onChange, onCommit, timezone, dateFormat }) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  function openPopover(event) {
    setAnchorEl(event.currentTarget);
  }

  function closePopover() {
    setAnchorEl(null);
  }

  function handlePick(newValue) {
    onChange(newValue);
    onCommit?.(newValue);
    closePopover();
  }

  return (
    <>
      <TextField
        size='small'
        fullWidth
        label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={formatDisplayValue(selectedOp, value, timezone, dateFormat)}
        onClick={openPopover}
        slotProps={{
          input: {
            readOnly: true,
            sx: { cursor: 'pointer' },
            endAdornment: (
              <InputAdornment position='end'>
                <IconButton size='small' onClick={openPopover} edge='end'>
                  <CalendarTodayIcon fontSize='small' />
                </IconButton>
              </InputAdornment>
            ),
          },
          inputLabel: { shrink: true },
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { borderRadius: `${tokens.popoverRadius}px`, mt: '4px' } } }}
      >
        <Box sx={{ p: 1.5 }}>
          <DateRangePicker
            selectedOp={selectedOp}
            value={value}
            onChange={handlePick}
            timezone={timezone}
            dateFormat={dateFormat}
          />
        </Box>
      </Popover>
    </>
  );
}

export default DateFieldValue;
