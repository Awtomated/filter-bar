import dayjs from 'dayjs';
import {
  dayToIso,
  formatDay,
  formatRange,
  isoToDay,
  rangeShortcuts,
  singleShortcuts,
  todayIn,
  valueToIso,
} from '../../src/shadcn/dates';
import { calendarDayToIso } from '../../src/utils';

const values = (shortcuts, timezone) =>
  Object.fromEntries(
    shortcuts.map((s) => {
      const v = s.getValue();
      return [
        s.label,
        Array.isArray(v) ? v.map((d) => valueToIso(d, timezone)) : valueToIso(v, timezone),
      ];
    })
  );

describe('shadcn dates', () => {
  afterEach(() => jest.useRealTimers());

  it('sends a picked day exactly like the MUI version: midnight in the bar timezone', () => {
    const day = new Date(2026, 10, 12);
    expect(dayToIso(day, 'Asia/Kolkata')).toBe('2026-11-12T00:00:00+05:30');
    expect(dayToIso(day, 'America/New_York')).toBe('2026-11-12T00:00:00-05:00');
    expect(dayToIso(day, 'UTC')).toBe('2026-11-12T00:00:00Z');
    expect(dayToIso(new Date(2024, 2, 15), 'America/New_York')).toBe('2024-03-15T00:00:00-04:00');
    ['UTC', 'Asia/Kolkata', 'America/New_York', 'Pacific/Auckland'].forEach((tz) => {
      expect(dayToIso(day, tz)).toBe(calendarDayToIso(dayjs.tz('2026-11-12', tz), tz));
    });
  });

  it('defaults to the browser timezone and rejects invalid days', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(dayToIso(new Date(2026, 10, 12))).toBe(dayToIso(new Date(2026, 10, 12), zone));
    expect(dayToIso(null, 'UTC')).toBeNull();
    expect(dayToIso(new Date('nope'), 'UTC')).toBeNull();
  });

  it('serializes shortcut (dayjs) values through the MUI function', () => {
    const d = dayjs.tz('2026-11-12', 'Asia/Kolkata').endOf('month');
    expect(valueToIso(d, 'Asia/Kolkata')).toBe('2026-11-30T23:59:59+05:30');
    expect(valueToIso(new Date(2026, 10, 12), 'Asia/Kolkata')).toBe('2026-11-12T00:00:00+05:30');
  });

  it('reads a stored value as the day written in it', () => {
    const read = (iso) => {
      const day = isoToDay(iso);
      return [day.getFullYear(), day.getMonth() + 1, day.getDate()];
    };
    expect(read('2026-11-13T00:00:00+05:30')).toEqual([2026, 11, 13]);
    expect(read('2026-11-13T00:00:00+13:00')).toEqual([2026, 11, 13]);
    expect(read('2024-03-15T00:00:00-04:00')).toEqual([2024, 3, 15]);
    expect(read('2026-11-12T00:00:00.000Z')).toEqual([2026, 11, 12]); // older UTC values
    expect(read('2026-01-31')).toEqual([2026, 1, 31]); // URL params
  });

  it('rejects empty and malformed values', () => {
    expect(isoToDay(null)).toBeNull();
    expect(isoToDay('soon')).toBeNull();
    expect(isoToDay('2026-02-30T00:00:00Z')).toBeNull();
  });

  it('formats a single day with a date-fns pattern', () => {
    expect(formatDay('2026-11-12T00:00:00+05:30', 'dd/MM/yyyy')).toBe('12/11/2026');
    expect(formatDay('2026-11-12T00:00:00Z')).toBe('11/12/2026');
    expect(formatDay(null)).toBe('');
  });

  it('formats ranges compactly', () => {
    expect(
      formatRange({ start: '2026-11-01T00:00:00+05:30', end: '2026-11-15T00:00:00+05:30' })
    ).toBe('1–15 Nov');
    expect(formatRange({ start: '2026-10-28T00:00:00Z', end: '2026-11-03T23:59:59Z' })).toBe(
      '28 Oct – 3 Nov'
    );
    expect(formatRange({ start: '2026-12-28T00:00:00Z', end: '2027-01-03T00:00:00Z' })).toBe(
      '28 Dec 2026 – 3 Jan 2027'
    );
    expect(formatRange({ start: '2026-12-28T00:00:00Z', end: null })).toBe('');
    expect(formatRange(null)).toBe('');
  });

  it('works out today in a timezone', () => {
    jest.useFakeTimers({ now: new Date('2026-11-12T23:30:00Z') });
    expect(todayIn('UTC').getDate()).toBe(12);
    expect(todayIn('Pacific/Auckland').getDate()).toBe(13);
    expect(todayIn('UTC').getHours()).toBe(0);
  });

  it('offers the MUI version’s single-date shortcuts, in the bar timezone', () => {
    jest.useFakeTimers({ now: new Date('2026-11-12T23:30:00Z') });
    expect(values(singleShortcuts('gte', 'Pacific/Auckland'), 'Pacific/Auckland')).toEqual({
      Today: '2026-11-13T00:00:00+13:00',
      Tomorrow: '2026-11-14T00:00:00+13:00',
    });
    expect(values(singleShortcuts('lte', 'UTC'), 'UTC')).toEqual({
      Today: '2026-11-12T00:00:00Z',
      Yesterday: '2026-11-11T00:00:00Z',
    });
    expect(singleShortcuts('exact', 'UTC')).toEqual([]);
  });

  it('offers the MUI version’s range shortcuts (Sunday weeks, period ends at 23:59:59)', () => {
    jest.useFakeTimers({ now: new Date('2026-11-12T12:00:00Z') }); // Thursday
    expect(values(rangeShortcuts('UTC'), 'UTC')).toEqual({
      'This Week': ['2026-11-08T00:00:00Z', '2026-11-14T23:59:59Z'],
      'Last Week': ['2026-11-01T00:00:00Z', '2026-11-07T23:59:59Z'],
      'Last 7 Days': ['2026-11-05T00:00:00Z', '2026-11-12T00:00:00Z'],
      'Current Month': ['2026-11-01T00:00:00Z', '2026-11-30T23:59:59Z'],
      'Next Month': ['2026-12-01T00:00:00Z', '2026-12-31T23:59:59Z'],
    });
  });

  it('defaults shortcuts to the browser timezone', () => {
    expect(singleShortcuts('gte').map((s) => s.label)).toEqual(['Today', 'Tomorrow']);
    expect(rangeShortcuts()).toHaveLength(5);
  });
});
