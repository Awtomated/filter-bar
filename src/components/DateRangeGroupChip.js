import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers-pro/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro/StaticDateRangePicker';
import QuickFilterChip from './QuickFilterChip';
import RegularDateField from './RegularDateField';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { formatDateRangeLabel, toCalendarDay, toIsoDay } from '../utils';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

function DateRangeGroupChip({ group, filters, onApply, onClear, timezone }) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const { startField, endField, startOperatorId, endOperatorId } = group;

  const startDate =
    filters.find((f) => f.field === startField.name && f.operatorId === startOperatorId)?.value ??
    null;
  const endDate =
    filters.find((f) => f.field === endField.name && f.operatorId === endOperatorId)?.value ?? null;

  const [rangeCondition, setRangeCondition] = useState(() => {
    if (startDate && !endDate) return 'after';
    if (endDate && !startDate) return 'before';
    return 'between';
  });
  const disableStart = rangeCondition === 'before';
  const disableEnd = rangeCondition === 'after';

  const shortcutsItems = useMemo(() => {
    const today = () => dayjs().tz(timezone).startOf('day');
    const range = (start, end) => [start, end];
    return [
      { label: 'Today', getValue: () => range(today(), today()) },
      {
        label: 'Tomorrow',
        getValue: () => {
          const t = today().add(1, 'day');
          return range(t, t);
        },
      },
      {
        label: 'This week',
        getValue: () => {
          const t = today();
          return range(t.startOf('week'), t.endOf('week'));
        },
      },
      {
        label: 'Last week',
        getValue: () => {
          const t = today().subtract(1, 'week');
          return range(t.startOf('week'), t.endOf('week'));
        },
      },
    ];
  }, [timezone]);

  function handleChange(newStart, newEnd) {
    const fieldNames = Array.from(new Set([startField.name, endField.name]));
    const entries = [];
    if (newStart)
      entries.push({
        id: crypto.randomUUID(),
        field: startField.name,
        operatorId: startOperatorId,
        value: newStart,
      });
    if (newEnd)
      entries.push({
        id: crypto.randomUUID(),
        field: endField.name,
        operatorId: endOperatorId,
        value: newEnd,
      });
    onApply(fieldNames, entries);
  }

  function handleConditionChange(nextCondition) {
    setRangeCondition(nextCondition);
    if (nextCondition === 'before') handleChange(null, endDate);
    else if (nextCondition === 'after') handleChange(startDate, null);
  }

  function handleClear() {
    setRangeCondition('between');
    onClear();
  }

  const rangeValue = [
    disableStart ? null : toCalendarDay(startDate, timezone),
    disableEnd ? null : toCalendarDay(endDate, timezone),
  ];

  return (
    <QuickFilterChip
      label={labels.dateRangeLabel}
      displayLabel={formatDateRangeLabel(startDate, endDate)}
      count={startDate || endDate ? 1 : 0}
      onClear={handleClear}
      width={480}
    >
      {() => (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: `${tokens.gapSm}px` }}>
          <FormControl size='small' fullWidth>
            <InputLabel shrink>{labels.conditionLabel}</InputLabel>
            <Select
              value={rangeCondition}
              label={labels.conditionLabel}
              notched
              onChange={(e) => handleConditionChange(e.target.value)}
            >
              <MenuItem value='before'>{labels.isBefore}</MenuItem>
              <MenuItem value='between'>{labels.isBetween}</MenuItem>
              <MenuItem value='after'>{labels.isAfter}</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: `${tokens.gapSm}px` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <RegularDateField
                label={startField.label || 'Start Date'}
                value={disableStart ? null : startDate}
                onChange={(value) => handleChange(value, endDate)}
                maxDate={endDate}
                disabled={disableStart}
                timezone={timezone}
                fullWidth
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <RegularDateField
                label={endField.label || 'Due Date'}
                value={disableEnd ? null : endDate}
                onChange={(value) => handleChange(startDate, value)}
                minDate={startDate}
                disabled={disableEnd}
                timezone={timezone}
                fullWidth
              />
            </Box>
          </Box>

          {rangeCondition === 'between' && (
            // `timezone` isn't a LocalizationProvider prop in this MUI X
            // version — timezone-correctness here comes entirely from
            // toCalendarDay's explicit dayjs.tz() conversion above, not from
            // the picker itself.
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <StaticDateRangePicker
                displayStaticWrapperAs='desktop'
                calendars={1}
                value={rangeValue}
                onChange={([newStart, newEnd]) =>
                  handleChange(toIsoDay(newStart), toIsoDay(newEnd))
                }
                slotProps={{ actionBar: { actions: [] }, shortcuts: { items: shortcutsItems } }}
              />
            </LocalizationProvider>
          )}
        </Box>
      )}
    </QuickFilterChip>
  );
}

export default DateRangeGroupChip;
