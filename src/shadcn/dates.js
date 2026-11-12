import dayjs from 'dayjs';
import { format, isSameMonth, isSameYear, isValid } from 'date-fns';
// Also extends dayjs with the utc + timezone plugins.
import { calendarDayToIso } from '../utils';

// Date helpers for the shadcn version.
//
// Hard requirement: dates leave this bar exactly as they leave the MUI
// version. So values are built the same way, with the same code:
// - a picked day goes through src/utils.js `calendarDayToIso(day, timezone)`
//   (dayjs `day.tz(timezone).format()`): midnight of that day in the bar's
//   timezone with its offset — "2026-11-12T00:00:00+05:30",
//   "2024-03-15T00:00:00-04:00", "2026-11-12T00:00:00Z";
// - shortcuts are the MUI picker's own dayjs expressions (src/components/
//   DateRangePicker.js), including its quirks: weeks start on Sunday (dayjs
//   default locale), period ends are 23:59:59 (endOf), and a day added
//   across a DST change keeps dayjs's result.
// The calendar grid itself works on plain calendar-day `Date`s (date-fns).

export const DEFAULT_DATE_FORMAT = 'MM/dd/yyyy';

// Grid layout only: Monday first, like the app's DateRangeCalendar.
export const WEEK_STARTS_ON = 1;

const resolveZone = (timezone) => timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

// A calendar day picked in the grid, as the MUI version sends it.
export function dayToIso(day, timezone) {
  if (!(day instanceof Date) || !isValid(day)) return null;
  const zone = resolveZone(timezone);
  return calendarDayToIso(dayjs.tz(format(day, 'yyyy-MM-dd'), zone), zone);
}

// A picked value (grid `Date` or shortcut dayjs) as the MUI version sends it.
export function valueToIso(value, timezone) {
  if (dayjs.isDayjs(value)) return calendarDayToIso(value, resolveZone(timezone));
  return dayToIso(value, timezone);
}

// The calendar day a stored value stands for: the date as written in it.
// - Values this bar (and the MUI bar) send are midnight in the bar's
//   timezone, so the written date is the picked day:
//   "2026-11-13T00:00:00+05:30" is the 13th.
// - Older UTC-midnight values ("2026-11-12T00:00:00.000Z", e.g. saved
//   filters) and bare dates from URLs ("2026-01-31") are read as written too.
// The MUI version reads the UTC date instead. That agrees with this for UTC
// values and timezones behind UTC, but turns the first example into the 12th
// for timezones ahead of UTC (India, Auckland, ...).
export function isoToDay(iso) {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = Number(match[3]);
  const day = new Date(year, month, date);
  // Reject impossible dates ("2026-02-30") instead of rolling them over.
  return day.getMonth() === month && day.getDate() === date ? day : null;
}

// "Today" as a calendar day in the given IANA timezone (grid highlight).
export function todayIn(timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return new Date(get('year'), get('month') - 1, get('day'));
}

export function formatDay(iso, dateFormat = DEFAULT_DATE_FORMAT) {
  const day = isoToDay(iso);
  return day ? format(day, dateFormat) : '';
}

// Compact range text for a chip: "1–15 Nov", "28 Oct – 3 Nov",
// "28 Dec 2026 – 3 Jan 2027".
export function formatRange(value) {
  const start = isoToDay(value?.start);
  const end = isoToDay(value?.end);
  if (!start || !end) return '';
  if (!isSameYear(start, end)) {
    return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`;
  }
  if (isSameMonth(start, end)) return `${format(start, 'd')}–${format(end, 'd MMM')}`;
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`;
}

// The MUI picker's shortcuts (src/components/DateRangePicker.js), same
// expressions: "on or after" offers Today/Tomorrow, "on or before"
// Today/Yesterday, a range MUI X's default windows (minus Reset; the chip's
// × clears). Each returns a dayjs, or [dayjs, dayjs] for a range.
export function singleShortcuts(operatorValue, timezone) {
  const today = () => dayjs().tz(resolveZone(timezone)).startOf('day');
  if (operatorValue === 'gte') {
    return [
      { label: 'Today', getValue: () => today() },
      { label: 'Tomorrow', getValue: () => today().add(1, 'day') },
    ];
  }
  if (operatorValue === 'lte') {
    return [
      { label: 'Today', getValue: () => today() },
      { label: 'Yesterday', getValue: () => today().subtract(1, 'day') },
    ];
  }
  return [];
}

export function rangeShortcuts(timezone) {
  const today = () => dayjs().tz(resolveZone(timezone)).startOf('day');
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
  ];
}
