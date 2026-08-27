import { useState } from 'react';
import dayjs from 'dayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDateRangePicker } from '@mui/x-date-pickers-pro/StaticDateRangePicker';
import { LocalizationProvider as ProLocalizationProvider } from '@mui/x-date-pickers-pro/LocalizationProvider';
import { AdapterDayjs as ProAdapterDayjs } from '@mui/x-date-pickers-pro/AdapterDayjs';
import { calendarDayToIso, isoToCalendarDay } from '../utils';

function gteShortcuts(timezone) {
  const today = () => dayjs().tz(timezone).startOf('day');
  return [
    { label: 'Today', getValue: () => today() },
    { label: 'Tomorrow', getValue: () => today().add(1, 'day') },
  ];
}

function lteShortcuts(timezone) {
  const today = () => dayjs().tz(timezone).startOf('day');
  return [
    { label: 'Today', getValue: () => today() },
    { label: 'Yesterday', getValue: () => today().subtract(1, 'day') },
  ];
}

// MUI X's own documented default shortcut set for a range picker/calendar.
function rangeShortcuts(timezone) {
  const today = () => dayjs().tz(timezone).startOf('day');
  return [
    { label: 'This Week', getValue: () => [today().startOf('week'), today().endOf('week')] },
    {
      label: 'Last Week',
      getValue: () => {
        const prevWeek = today().subtract(7, 'day');
        return [prevWeek.startOf('week'), prevWeek.endOf('week')];
      },
    },
    { label: 'Last 7 Days', getValue: () => [today().subtract(7, 'day'), today()] },
    { label: 'Current Month', getValue: () => [today().startOf('month'), today().endOf('month')] },
    {
      label: 'Next Month',
      getValue: () => {
        const nextMonth = today().add(1, 'month');
        return [nextMonth.startOf('month'), nextMonth.endOf('month')];
      },
    },
    { label: 'Reset', getValue: () => [null, null] },
  ];
}

function RangeCalendar({ selectedOp, value, onChange, timezone, dateFormat }) {
  const [draft, setDraft] = useState(() => {
    const [start, end] = Array.isArray(value) ? value : [value?.start, value?.end];
    return [isoToCalendarDay(start, timezone), isoToCalendarDay(end, timezone)];
  });

  function handleRangeChange(range) {
    setDraft(range);
    const [newStart, newEnd] = range ?? [];
    if (newStart && newEnd) {
      onChange({ start: calendarDayToIso(newStart), end: calendarDayToIso(newEnd) });
    }
  }

  return (
    <ProLocalizationProvider dateAdapter={ProAdapterDayjs}>
      <StaticDateRangePicker
        displayStaticWrapperAs='desktop'
        calendars={1}
        value={draft}
        timezone={timezone}
        format={dateFormat}
        onChange={handleRangeChange}
        slotProps={{
          shortcuts: { items: rangeShortcuts(timezone), changeImportance: 'accept' },
          // Unlike the single-date picker below, a static range picker
          // shows a Cancel/OK bar by default — hide it since handleRangeChange
          // above already applies the filter the moment the range completes.
          actionBar: { actions: [] },
        }}
      />
    </ProLocalizationProvider>
  );
}

function DateRangePicker({ selectedOp, value, onChange, timezone, dateFormat }) {
  if (selectedOp?.input_type === 'range') {
    return (
      <RangeCalendar
        selectedOp={selectedOp}
        value={value}
        onChange={onChange}
        timezone={timezone}
        dateFormat={dateFormat}
      />
    );
  }

  const shortcuts =
    // eslint-disable-next-line no-nested-ternary
    selectedOp?.value === 'gte'
      ? gteShortcuts(timezone)
      : selectedOp?.value === 'lte'
      ? lteShortcuts(timezone)
      : [];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <StaticDatePicker
        displayStaticWrapperAs='desktop'
        value={isoToCalendarDay(value, timezone)}
        timezone={timezone}
        format={dateFormat}
        onChange={(date) => onChange(calendarDayToIso(date))}
        slotProps={{
          shortcuts: { items: shortcuts, changeImportance: 'accept' },
          actionBar: { actions: [] },
        }}
      />
    </LocalizationProvider>
  );
}

export default DateRangePicker;
