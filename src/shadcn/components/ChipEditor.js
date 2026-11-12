import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';
import MenuList from './MenuList';
import DateCalendar from './DateCalendar';
import { getChoiceId, getChoiceLabel, getGroupByFn, getOperatorId } from '../../utils';
import { isoToDay, rangeShortcuts, singleShortcuts, todayIn, valueToIso } from '../dates';
import { getEditorKind, isMultipleSelect } from '../fields';

// Text / number value: no Apply button and no request while typing. The value
// applies on Enter (which also closes the popover) or, if the user forgot to
// press Enter, when the field loses focus — including when the popover
// closes (Escape, a click outside). Clearing the field and confirming removes
// the filter. A value applies once: Enter after a blur, or a blur after
// Enter, doesn't send a second request.
function TextEditor({ type, value, onValue, onDone, labels }) {
  const initial = value == null ? '' : String(value);
  const [draft, setDraft] = useState(initial);
  const inputRef = useRef(null);
  const committed = useRef(initial);
  const latest = useRef(initial);
  const onValueRef = useRef(onValue);
  onValueRef.current = onValue;

  function commit(text, close) {
    const next = text.trim() === '' ? '' : text;
    if (next === committed.current) {
      if (close) onDone();
      return;
    }
    committed.current = next;
    onValueRef.current(next, { close });
  }

  useEffect(() => {
    // Focus the field on open (see MenuList).
    inputRef.current?.focus();
    return () => {
      // The popover closed without Enter (React fires no blur on unmount).
      commit(latest.current, false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(event) {
    latest.current = event.target.value;
    setDraft(event.target.value);
  }

  return (
    <div className='p-1'>
      <input
        ref={inputRef}
        type={type}
        aria-label={labels.valueLabel}
        placeholder={labels.valueLabel}
        value={draft}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          commit(draft, true);
        }}
        onBlur={() => commit(latest.current, false)}
        className='h-8 w-full min-w-56 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'
      />
    </div>
  );
}

// The body of a chip's popover. `mode` "operator" lists the operators;
// "value" shows the operator header (when there's a choice to make) and the
// editor for the selected operator. Every editor commits through
// `onValue(value, { close })`; the bar decides what applying means.
function ChipEditor({
  fieldDef,
  operatorId,
  value,
  mode,
  onModeChange,
  onOperatorPick,
  onValue,
  // Closes the popover without a change (Enter on an unchanged value).
  onDone,
  choices,
  choicesLoading,
  timezone,
  labels,
  classNames = {},
}) {
  const operators = fieldDef.operators ?? [];
  const op = operators.find((o) => getOperatorId(o) === operatorId);

  if (mode === 'operator') {
    return (
      <MenuList
        searchable={false}
        ariaLabel={labels.operatorLabel}
        items={operators.map((o) => ({
          id: getOperatorId(o),
          label: o.label,
          selected: getOperatorId(o) === operatorId,
        }))}
        onSelect={(item) => onOperatorPick(item.id)}
        itemClassName={classNames.menuItem}
      />
    );
  }

  const kind = getEditorKind(fieldDef, op);
  const today = todayIn(timezone);
  let body = null;

  if (kind === 'select') {
    const multiple = isMultipleSelect(fieldDef, op);
    const groupBy = getGroupByFn(fieldDef.selectConfig);
    const selectedIds = new Set(
      (multiple ? value ?? [] : value ? [value] : []).map((v) => getChoiceId(v))
    );
    body = (
      <MenuList
        placeholder={labels.searchPlaceholder(fieldDef.label)}
        emptyText={labels.noMatches}
        loading={choicesLoading}
        items={choices.map((choice) => ({
          id: getChoiceId(choice),
          label: getChoiceLabel(choice, fieldDef.selectConfig, fieldDef),
          group: groupBy ? groupBy(choice) : undefined,
          selected: selectedIds.has(getChoiceId(choice)),
          choice,
        }))}
        onSelect={(item) => {
          if (!multiple) {
            onValue(item.choice, { close: true });
            return;
          }
          const current = value ?? [];
          const next = item.selected
            ? current.filter((v) => getChoiceId(v) !== item.id)
            : [...current, item.choice];
          onValue(next, { close: false });
        }}
        itemClassName={classNames.menuItem}
        selectedItemClassName={classNames.menuItemSelected}
        groupHeadingClassName={classNames.groupHeading}
      />
    );
  } else if (kind === 'date') {
    body = (
      <DateCalendar
        mode='single'
        value={isoToDay(value)}
        today={today}
        shortcuts={singleShortcuts(op?.value, timezone)}
        labels={labels}
        // Serialized exactly as the MUI version does (see dates.js).
        onSelect={(day) => onValue(valueToIso(day, timezone), { close: true })}
      />
    );
  } else if (kind === 'range') {
    body = (
      <DateCalendar
        mode='range'
        value={[isoToDay(value?.start), isoToDay(value?.end)]}
        today={today}
        shortcuts={rangeShortcuts(timezone)}
        labels={labels}
        onSelect={([start, end]) =>
          onValue(
            { start: valueToIso(start, timezone), end: valueToIso(end, timezone) },
            { close: true }
          )
        }
      />
    );
  } else if (kind === 'none') {
    body = (
      <div className='flex justify-end p-1'>
        <Button size='sm' onClick={() => onValue(null, { close: true })}>
          {labels.apply}
        </Button>
      </div>
    );
  } else {
    body = (
      <TextEditor
        type={kind === 'number' ? 'number' : 'text'}
        value={value}
        labels={labels}
        onValue={onValue}
        onDone={onDone}
      />
    );
  }

  return (
    <div className='flex flex-col gap-1'>
      {operators.length > 1 && (
        <div className='flex items-center gap-1.5 px-2 pt-1 text-sm'>
          <span className='text-foreground'>{fieldDef.label}</span>
          <button
            type='button'
            aria-label={`${labels.operatorLabel}: ${op?.label ?? ''}`}
            onClick={() => onModeChange('operator')}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1 text-sm text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
              classNames.chipOperator
            )}
          >
            {String(op?.label ?? '').toLowerCase()}
            <ChevronDownIcon aria-hidden className='size-3.5' />
          </button>
        </div>
      )}
      {body}
    </div>
  );
}

export default ChipEditor;
