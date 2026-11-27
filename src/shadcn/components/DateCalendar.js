import { useState } from 'react';
import {
  addDays,
  addMonths,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { WEEK_STARTS_ON } from '../dates';

// Month calendar for the shadcn bar: Monday-first, one-band range, like the
// app's DateRangeCalendar, but it applies the moment a date (or the second
// end of a range) is picked — as the MUI bar does — instead of Save/Cancel.
//
// mode "single": `value` Date | null, onSelect(Date)
// mode "range":  `value` [Date|null, Date|null], onSelect([start, end])
// `shortcuts`: [{ label, getValue }] shown as a list beside the grid; their
// values (dayjs, from dates.js) go to onSelect unchanged.
function DateCalendar({ mode = 'single', value, onSelect, today, shortcuts = [], labels = {} }) {
  const selectedStart = mode === 'range' ? value?.[0] ?? null : value ?? null;
  const selectedEnd = mode === 'range' ? value?.[1] ?? null : null;
  const [month, setMonth] = useState(() => startOfMonth(selectedStart ?? today));
  // First click of a range, waiting for the second.
  const [pendingStart, setPendingStart] = useState(null);

  const gridStart = startOfWeek(month, { weekStartsOn: WEEK_STARTS_ON });
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdays = days.slice(0, 7);

  const rangeStart = pendingStart ?? selectedStart;
  const rangeEnd = pendingStart ? null : selectedEnd;

  function pick(day) {
    if (mode === 'single') {
      onSelect(day);
      return;
    }
    if (!pendingStart) {
      setPendingStart(day);
      return;
    }
    const [start, end] = isBefore(day, pendingStart) ? [day, pendingStart] : [pendingStart, day];
    setPendingStart(null);
    onSelect([start, end]);
  }

  function applyShortcut(shortcut) {
    const result = shortcut.getValue();
    setPendingStart(null);
    // Shortcut values are dayjs objects built like the MUI picker's; the
    // editor serializes them as-is (see dates.js).
    onSelect(result);
  }

  return (
    <div className='flex gap-2'>
      {shortcuts.length > 0 && (
        <div className='flex min-w-28 flex-col border-r border-border pr-2'>
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type='button'
              onClick={() => applyShortcut(shortcut)}
              className='rounded-md px-2 py-1 text-left text-sm text-popover-foreground outline-none hover:bg-accent focus-visible:bg-accent'
            >
              {shortcut.label}
            </button>
          ))}
        </div>
      )}
      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between px-1'>
          <button
            type='button'
            aria-label={labels.previousMonth ?? 'Previous month'}
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground'
          >
            <ChevronLeftIcon className='size-4' />
          </button>
          <span className='text-sm font-medium text-foreground' aria-live='polite'>
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            type='button'
            aria-label={labels.nextMonth ?? 'Next month'}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className='inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground'
          >
            <ChevronRightIcon className='size-4' />
          </button>
        </div>
        <div role='grid' aria-label={format(month, 'MMMM yyyy')} className='flex flex-col'>
          <div role='row' className='grid grid-cols-7'>
            {weekdays.map((day) => (
              <span
                key={day.toISOString()}
                role='columnheader'
                className='flex h-8 items-center justify-center text-caption text-muted-foreground'
              >
                {format(day, 'EEEEEE')}
              </span>
            ))}
          </div>
          {[0, 1, 2, 3, 4, 5].map((week) => (
            <div role='row' key={week} className='grid grid-cols-7'>
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const isStart = rangeStart && isSameDay(day, rangeStart);
                const isEnd = rangeEnd && isSameDay(day, rangeEnd);
                const inRange =
                  rangeStart && rangeEnd && isAfter(day, rangeStart) && isBefore(day, rangeEnd);
                const selected = Boolean(isStart || isEnd);
                return (
                  <div
                    role='gridcell'
                    key={day.toISOString()}
                    aria-selected={selected}
                    className={cn(inRange && 'bg-accent')}
                  >
                    <button
                      type='button'
                      aria-label={format(day, 'd MMMM yyyy')}
                      onClick={() => pick(day)}
                      className={cn(
                        'flex size-8 items-center justify-center rounded-md text-sm outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        !isSameMonth(day, month) && 'text-muted-foreground opacity-60',
                        isSameDay(day, today) && !selected && 'font-semibold text-primary',
                        selected && 'bg-primary text-primary-foreground hover:bg-primary'
                      )}
                    >
                      {format(day, 'd')}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DateCalendar;
