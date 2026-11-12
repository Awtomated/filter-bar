import { fireEvent, render, screen, within } from '@testing-library/react';
import dayjs from 'dayjs';
import { format } from 'date-fns';
import MuiDateRangePicker, {
  gteShortcuts as muiGteShortcuts,
  lteShortcuts as muiLteShortcuts,
  rangeShortcuts as muiRangeShortcuts,
} from '../../src/components/DateRangePicker';
import ChipEditor from '../../src/shadcn/components/ChipEditor';
import { shadcnDefaultLabels } from '../../src/shadcn/components/DynamicFilterBar';
import {
  dayToIso,
  isoToDay,
  rangeShortcuts,
  singleShortcuts,
  todayIn,
  valueToIso,
} from '../../src/shadcn/dates';
import { defaultLabels } from '../../src/tokens';
import { calendarDayToIso, getOperatorId, isoToCalendarDay } from '../../src/utils';

// Hard requirement: the shadcn version must send dates exactly like the MUI
// version (src/utils.js calendarDayToIso(day, timezone): midnight of the
// picked day in the bar's timezone, with that day's offset). Both are driven
// side by side here — the real MUI DateRangePicker and the real shadcn
// ChipEditor — under a fixed clock, for several filter timezones (the
// `timezone` prop) and several *browser* timezones (process.env.TZ).

const labels = { ...defaultLabels, ...shadcnDefaultLabels };

const gteOp = {
  label: 'On or after',
  value: 'gte',
  query_param: 'd__gte',
  input_type: 'single',
  input_field: 'date',
};
const lteOp = { ...gteOp, label: 'On or before', value: 'lte', query_param: 'd__lte' };
const rangeOp = {
  label: 'Between',
  value: 'range',
  query_params: 'd__range',
  input_type: 'range',
  input_field: 'date',
};

// Instants chosen to land on different calendar days in different zones,
// across DST changes and a year boundary.
const INSTANTS = [
  '2026-11-12T23:30:00Z', // already Nov 13 in Kolkata / Auckland
  '2026-11-13T03:00:00Z', // still Nov 12 in Los Angeles / New York
  '2026-03-08T09:30:00Z', // US DST starts
  '2026-11-01T08:30:00Z', // US DST ends
  '2026-12-31T22:00:00Z', // already 2027 in Auckland
];
const FILTER_TZS = ['UTC', 'Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland'];
const BROWSER_TZS = ['Asia/Kolkata', 'America/Los_Angeles', 'Pacific/Auckland'];

// Every shortcut both versions offer (MUI's "Reset" clears; the chip's ×
// does that in the shadcn version).
const SHORTCUTS = {
  gte: ['Today', 'Tomorrow'],
  lte: ['Today', 'Yesterday'],
  range: ['This Week', 'Last Week', 'Last 7 Days', 'Current Month', 'Next Month'],
};

function renderMui(op, timezone, value = null) {
  const onChange = jest.fn();
  const utils = render(
    <MuiDateRangePicker
      selectedOp={op}
      value={value}
      onChange={onChange}
      timezone={timezone}
      dateFormat='MM/DD/YYYY'
    />
  );
  return { ...utils, onChange };
}

function renderShadcn(op, timezone, value = null) {
  const onValue = jest.fn();
  const utils = render(
    <ChipEditor
      fieldDef={{ name: 'd', label: 'Date', type: 'datetime', operators: [op] }}
      operatorId={getOperatorId(op)}
      value={value}
      mode='value'
      onModeChange={() => {}}
      onOperatorPick={() => {}}
      onValue={onValue}
      onDone={() => {}}
      choices={[]}
      choicesLoading={false}
      timezone={timezone}
      labels={labels}
    />
  );
  return { ...utils, onChange: onValue };
}

function clickShortcuts(renderer, op, timezone, shortcuts) {
  const { onChange, unmount } = renderer(op, timezone);
  const values = shortcuts.map((label) => {
    fireEvent.click(screen.getByRole('button', { name: label }));
    return onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
  });
  unmount();
  return values;
}

const muiValues = (op, timezone, shortcuts) => clickShortcuts(renderMui, op, timezone, shortcuts);
const shadcnValues = (op, timezone, shortcuts) =>
  clickShortcuts(renderShadcn, op, timezone, shortcuts);

const originalTz = process.env.TZ;

// Jest runs several test files in one worker process, so the browser
// timezone must be put back exactly: `process.env.TZ = undefined` would store
// the string "undefined" (an invalid zone) and break the next test file.
function restoreTz() {
  if (originalTz === undefined) delete process.env.TZ;
  else process.env.TZ = originalTz;
}

describe('dates are sent as midnight in the bar timezone, like the MUI version', () => {
  afterEach(() => {
    jest.useRealTimers();
    restoreTz();
  });

  it('at 23:30 UTC on 12 Nov: Auckland is on the 13th, Los Angeles on the 12th', () => {
    process.env.TZ = 'Asia/Kolkata'; // browser elsewhere entirely
    jest.useFakeTimers({ now: new Date('2026-11-12T23:30:00Z') });
    const expected = {
      'Pacific/Auckland': ['2026-11-13T00:00:00+13:00', '2026-11-14T00:00:00+13:00'],
      'America/Los_Angeles': ['2026-11-12T00:00:00-08:00', '2026-11-13T00:00:00-08:00'],
      'Asia/Kolkata': ['2026-11-13T00:00:00+05:30', '2026-11-14T00:00:00+05:30'],
      UTC: ['2026-11-12T00:00:00Z', '2026-11-13T00:00:00Z'],
    };
    Object.entries(expected).forEach(([timezone, values]) => {
      expect(shadcnValues(gteOp, timezone, ['Today', 'Tomorrow'])).toEqual(values);
      expect(muiValues(gteOp, timezone, ['Today', 'Tomorrow'])).toEqual(values);
    });
  });

  it('a range picked across a DST change carries each day’s own offset', () => {
    jest.useFakeTimers({ now: new Date('2024-03-05T15:00:00Z') });
    const timezone = 'America/New_York';
    const expected = { start: '2024-03-10T00:00:00-05:00', end: '2024-03-15T00:00:00-04:00' };

    const mui = renderMui(rangeOp, timezone);
    fireEvent.click(screen.getByRole('gridcell', { name: '10' }));
    fireEvent.click(screen.getByRole('gridcell', { name: '15' }));
    expect(mui.onChange).toHaveBeenLastCalledWith(expected);
    mui.unmount();

    const shadcn = renderShadcn(rangeOp, timezone);
    const grid = screen.getByRole('grid');
    const month = grid.getAttribute('aria-label');
    fireEvent.click(within(grid).getByRole('button', { name: `10 ${month}` }));
    fireEvent.click(within(grid).getByRole('button', { name: `15 ${month}` }));
    expect(shadcn.onChange).toHaveBeenLastCalledWith(expected, { close: true });
  });

  it('a period shortcut ends at 23:59:59 in the bar timezone', () => {
    jest.useFakeTimers({ now: new Date('2026-11-12T12:00:00Z') });
    const [mui] = muiValues(rangeOp, 'Asia/Kolkata', ['Current Month']);
    const [shadcn] = shadcnValues(rangeOp, 'Asia/Kolkata', ['Current Month']);
    expect(mui).toEqual({ start: '2026-11-01T00:00:00+05:30', end: '2026-11-30T23:59:59+05:30' });
    expect(shadcn).toEqual(mui);
  });
});

describe.each(BROWSER_TZS)('browser timezone %s', (browserTz) => {
  beforeAll(() => {
    process.env.TZ = browserTz;
  });
  afterAll(() => {
    restoreTz();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  describe.each(FILTER_TZS)('timezone prop %s', (timezone) => {
    // Every shortcut, against the MUI picker's own shortcut builders and its
    // own serializer. (The rendered pickers are compared further down.)
    it.each(INSTANTS)('shortcut values equal the MUI picker’s at %s', (instant) => {
      jest.useFakeTimers({ now: new Date(instant) });
      const muiIso = (v) =>
        Array.isArray(v)
          ? v.map((d) => calendarDayToIso(d, timezone))
          : calendarDayToIso(v, timezone);
      const ourIso = (v) =>
        Array.isArray(v) ? v.map((d) => valueToIso(d, timezone)) : valueToIso(v, timezone);
      [
        [muiGteShortcuts(timezone), singleShortcuts('gte', timezone)],
        [muiLteShortcuts(timezone), singleShortcuts('lte', timezone)],
        [muiRangeShortcuts(timezone).filter((s) => s.label !== 'Reset'), rangeShortcuts(timezone)],
      ].forEach(([mui, ours]) => {
        const muiValues = Object.fromEntries(mui.map((s) => [s.label, muiIso(s.getValue())]));
        const ourValues = Object.fromEntries(ours.map((s) => [s.label, ourIso(s.getValue())]));
        expect(Object.keys(ourValues)).toEqual(Object.keys(muiValues));
        expect(ourValues).toEqual(muiValues);
      });
    });

    it.each(INSTANTS)('"today" is the same calendar day as the MUI version at %s', (instant) => {
      jest.useFakeTimers({ now: new Date(instant) });
      expect(format(todayIn(timezone), 'yyyy-MM-dd')).toBe(
        dayjs().tz(timezone).format('YYYY-MM-DD')
      );
    });

    it('a picked day is sent exactly like the MUI version and reads back as that day', () => {
      ['2026-01-01', '2026-03-08', '2026-11-01', '2026-11-12', '2026-12-31'].forEach((ymd) => {
        const [y, m, d] = ymd.split('-').map(Number);
        const day = new Date(y, m - 1, d);
        const iso = dayToIso(day, timezone);
        expect(iso).toBe(calendarDayToIso(dayjs.tz(ymd, timezone), timezone));
        // Round trip: the value reads back as the picked day.
        expect(format(isoToDay(iso), 'yyyy-MM-dd')).toBe(ymd);
      });
    });

    it('older UTC values and URL dates show the same day as the MUI version', () => {
      ['2026-11-12T00:00:00.000Z', '2026-11-12T23:30:00Z', '2026-01-31'].forEach((iso) => {
        expect(format(isoToDay(iso), 'yyyy-MM-dd')).toBe(
          isoToCalendarDay(iso, timezone).format('YYYY-MM-DD')
        );
      });
    });
  });

  // The rendered pickers: clicking the same shortcuts sends the same values.
  it.each(FILTER_TZS)(
    'rendered pickers send the same shortcut values (timezone %s)',
    (timezone) => {
      jest.useFakeTimers({ now: new Date('2026-11-12T23:30:00Z') });
      [
        [gteOp, SHORTCUTS.gte],
        [lteOp, SHORTCUTS.lte],
        [rangeOp, SHORTCUTS.range],
      ].forEach(([op, shortcuts]) => {
        const mui = muiValues(op, timezone, shortcuts);
        expect(mui.every(Boolean)).toBe(true);
        expect(shadcnValues(op, timezone, shortcuts)).toEqual(mui);
      });
    }
  );

  it('clicking a day in the calendar sends the same value as the MUI version', () => {
    jest.useFakeTimers({ now: new Date('2026-11-12T23:30:00Z') });
    const timezone = 'Pacific/Auckland'; // already Nov 13 there

    const mui = renderMui(gteOp, timezone);
    fireEvent.click(screen.getByRole('gridcell', { name: '20' }));
    const muiValue = mui.onChange.mock.calls[0][0];
    mui.unmount();

    const shadcn = renderShadcn(gteOp, timezone);
    const grid = screen.getByRole('grid');
    fireEvent.click(
      within(grid).getByRole('button', { name: `20 ${grid.getAttribute('aria-label')}` })
    );
    expect(shadcn.onChange.mock.calls[0][0]).toBe(muiValue);
    expect(muiValue).toBe('2026-11-20T00:00:00+13:00');
  });
});
