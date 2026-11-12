import { useEffect, useMemo, useRef, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Spinner } from '../ui/spinner';
import { FilterChip } from './FilterChip';
import ChipEditor from './ChipEditor';
import MenuList from './MenuList';
import { DynamicFilterProvider, useFilterBarLabels } from '../../tokens';
import {
  adaptApiConfig,
  applyChoicesMap,
  applyFieldProps,
  buildQueryParams,
  getDefaultOperatorId,
  getOperatorId,
  isEmptyFilterValue,
  matchMostUsedField,
} from '../../utils';
import { hasOwnLabel, useChoicesStore, useFieldChoices } from '../hooks/useChoices';
import { chipOperatorText, chipValueText, getEditorKind, sameEditor } from '../fields';
import { DEFAULT_DATE_FORMAT } from '../dates';
import { ADD_FILTER_CLASS, CLEAR_ALL_CLASS, POPOVER_CLASS } from '../styles';

// Labels the shadcn bar adds to the shared defaults (src/tokens.js).
export const shadcnDefaultLabels = {
  filterBy: 'Filter by…',
  singleValueOperator: 'is',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

// Figma: "Default = the module's two main filters as empty chips".
const DEFAULT_PINNED_CHIPS = 2;
const EMPTY = {};
const EMPTY_LIST = [];

// The main filters shown as chips even when empty: most_used_filters first
// (a name may point at a field or at one of its operators, which then
// becomes that chip's starting operator), then the remaining fields in
// schema order, up to `max` — the same priority as the MUI bar's chips.
function getPinnedFields(filterConfig, filterFields, max) {
  const seen = new Set();
  const mostUsed = (filterConfig?.most_used_filters ?? [])
    .map((name) => matchMostUsedField(name, filterFields))
    .filter((match) => {
      if (!match || seen.has(match.fieldDef.name)) return false;
      seen.add(match.fieldDef.name);
      return true;
    });
  const backfill = filterFields
    .filter((f) => !seen.has(f.name))
    .map((fieldDef) => ({ fieldDef, operatorId: null }));
  return [...mostUsed, ...backfill].slice(0, Math.max(0, max));
}

function FieldChip({
  fieldDef,
  filter,
  editorOperatorId,
  pinned,
  mode,
  onOpen,
  onClose,
  onValue,
  onOperatorPick,
  onClear,
  store,
  icon,
  timezone,
  dateFormat,
  labels,
  classNames,
  portalContainer,
}) {
  const operators = fieldDef.operators ?? [];
  const applied = Boolean(filter);
  const appliedOp = applied ? operators.find((o) => getOperatorId(o) === filter.operatorId) : null;

  // Bare `{ id }` values (e.g. built from URL params) need the choice list
  // for their labels, so the chip loads it without waiting for a click.
  const needsLabels =
    applied &&
    getEditorKind(fieldDef, appliedOp) === 'select' &&
    [].concat(filter.value ?? []).some((v) => !hasOwnLabel(v));
  const { choices, loading } = useFieldChoices(fieldDef, store, Boolean(mode) || needsLabels);

  const value = applied
    ? chipValueText({ fieldDef, op: appliedOp, value: filter.value, choices, dateFormat })
    : null;

  return (
    <Popover open={Boolean(mode)} onOpenChange={(open) => !open && onClose()}>
      <PopoverAnchor asChild>
        <FilterChip
          label={fieldDef.label}
          icon={icon}
          applied={applied}
          open={Boolean(mode)}
          operatorText={applied ? chipOperatorText(fieldDef, appliedOp, filter.value, labels) : ''}
          valueText={value?.text}
          pending={value?.pending}
          canChangeOperator={operators.length > 1}
          onOpenValue={() => onOpen('value')}
          onOpenOperator={() => onOpen('operator')}
          // A main (pinned) filter stays as an empty chip; anything else can
          // be removed even before it has a value.
          onClear={applied || !pinned ? onClear : undefined}
          clearLabel={labels.clearFilterTooltip}
          className={cn(classNames.chip, applied ? classNames.chipApplied : classNames.chipEmpty)}
          operatorClassName={classNames.chipOperator}
          valueClassName={classNames.chipValue}
        />
      </PopoverAnchor>
      <PopoverContent
        align='start'
        container={portalContainer}
        className={cn(
          POPOVER_CLASS,
          mode === 'operator' ? 'min-w-48' : 'min-w-64',
          classNames.popover
        )}
      >
        {mode && (
          <ChipEditor
            key={`${mode}-${editorOperatorId}`}
            fieldDef={fieldDef}
            operatorId={editorOperatorId}
            value={
              filter && filter.operatorId === editorOperatorId
                ? filter.value
                : sameValue(fieldDef, operators, filter, editorOperatorId)
            }
            mode={mode}
            onModeChange={onOpen}
            onOperatorPick={onOperatorPick}
            onValue={onValue}
            onDone={onClose}
            choices={choices}
            choicesLoading={loading}
            timezone={timezone}
            labels={labels}
            classNames={classNames}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

// The applied value, if it still fits the (draft) operator being edited.
function sameValue(fieldDef, operators, filter, operatorId) {
  if (!filter) return null;
  const from = operators.find((o) => getOperatorId(o) === filter.operatorId);
  const to = operators.find((o) => getOperatorId(o) === operatorId);
  return from && to && sameEditor(fieldDef, from, to) ? filter.value : null;
}

function DynamicFilterBarInner({
  filterApiUrl,
  fetcher,
  onApply,
  choicesMap = EMPTY,
  fieldProps = EMPTY,
  appliedFilters = EMPTY_LIST,
  onFiltersChange,
  timezone,
  dateFormat = DEFAULT_DATE_FORMAT,
  maxQuickChips = DEFAULT_PINNED_CHIPS,
  classNames = EMPTY,
  className,
  portalContainer,
}) {
  const labels = useFilterBarLabels();
  const resolvedTimezone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [filterConfig, setFilterConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [filters, setFilters] = useState(() => appliedFilters.filter((f) => f?.field));
  // Fields shown as chips besides the pinned ones, in the order added.
  const [extraFields, setExtraFields] = useState(() => [
    ...new Set(appliedFilters.filter((f) => f?.field).map((f) => f.field)),
  ]);
  // Operator picked in a popover but not applied yet, per field.
  const [draftOperators, setDraftOperators] = useState(EMPTY);
  const [openChip, setOpenChip] = useState(null); // { field, mode: 'value' | 'operator' }
  const [addOpen, setAddOpen] = useState(false);
  const pickedFromAddMenu = useRef(false);
  const store = useChoicesStore(fetcher);

  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!filterApiUrl) return undefined;
    let active = true;
    setConfigLoading(true);
    fetcher(filterApiUrl)
      .then((res) => {
        if (active) setFilterConfig(res.data);
      })
      // Like the MUI bar: a failed schema request renders nothing.
      .catch(() => {})
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterApiUrl]);

  const filterFields = useMemo(
    () => applyFieldProps(applyChoicesMap(adaptApiConfig(filterConfig), choicesMap), fieldProps),
    [filterConfig, choicesMap, fieldProps]
  );

  if (configLoading) {
    return (
      <div className='flex items-center py-1 text-muted-foreground'>
        <Spinner />
      </div>
    );
  }
  if (!filterFields.length) return null;

  const fieldByName = new Map(filterFields.map((f) => [f.name, f]));
  const pinned = getPinnedFields(filterConfig, filterFields, maxQuickChips);
  const pinnedNames = new Set(pinned.map((p) => p.fieldDef.name));
  const preferredOperator = new Map(pinned.map((p) => [p.fieldDef.name, p.operatorId]));
  const chipNames = [
    ...new Set([...pinnedNames, ...extraFields, ...filters.map((f) => f.field)]),
  ].filter((name) => fieldByName.has(name));
  const remainingFields = filterFields.filter((f) => !chipNames.includes(f.name));

  function commit(nextFilters) {
    setFilters(nextFilters);
    onApply?.(buildQueryParams(nextFilters, filterFields));
  }

  function closeChip(fieldName) {
    setOpenChip(null);
    setDraftOperators((d) => {
      if (!(fieldName in d)) return d;
      const { [fieldName]: _, ...rest } = d;
      return rest;
    });
  }

  function editorOperatorIdFor(fieldDef) {
    const filter = filters.find((f) => f.field === fieldDef.name);
    return (
      draftOperators[fieldDef.name] ??
      filter?.operatorId ??
      preferredOperator.get(fieldDef.name) ??
      getDefaultOperatorId(fieldDef)
    );
  }

  function setValue(fieldDef, operatorId, value, { close }) {
    const op = (fieldDef.operators ?? []).find((o) => getOperatorId(o) === operatorId);
    const existing = filters.find((f) => f.field === fieldDef.name);
    const others = filters.filter((f) => f.field !== fieldDef.name);
    if (op?.input_type !== 'none' && isEmptyFilterValue(value)) {
      // e.g. the last box unticked in a multi-select: no longer applied,
      // the chip stays (dashed) so it can be filled in again.
      if (existing) commit(others);
    } else {
      const filter = {
        id: existing?.id ?? crypto.randomUUID(),
        field: fieldDef.name,
        operatorId,
        value: op?.input_type === 'none' ? null : value,
      };
      commit(
        existing
          ? filters.map((f) => (f.field === fieldDef.name ? filter : f))
          : [...filters, filter]
      );
    }
    if (!pinnedNames.has(fieldDef.name) && !extraFields.includes(fieldDef.name)) {
      setExtraFields((names) => [...names, fieldDef.name]);
    }
    if (close) closeChip(fieldDef.name);
  }

  function pickOperator(fieldDef, operatorId) {
    const operators = fieldDef.operators ?? [];
    const next = operators.find((o) => getOperatorId(o) === operatorId);
    const existing = filters.find((f) => f.field === fieldDef.name);
    const current = existing && operators.find((o) => getOperatorId(o) === existing.operatorId);
    if (next?.input_type === 'none') {
      // "Is empty" needs no value: applies right away (as in the MUI bar).
      setValue(fieldDef, operatorId, null, { close: true });
    } else if (existing && current?.input_type !== 'none' && sameEditor(fieldDef, current, next)) {
      // The applied value still fits ("contains" -> "starts with").
      setValue(fieldDef, operatorId, existing.value, { close: true });
    } else {
      // Needs a new value: keep the applied filter until one is picked.
      setDraftOperators((d) => ({ ...d, [fieldDef.name]: operatorId }));
      setOpenChip({ field: fieldDef.name, mode: 'value' });
    }
  }

  function clearField(fieldName) {
    if (filters.some((f) => f.field === fieldName)) {
      commit(filters.filter((f) => f.field !== fieldName));
    }
    if (!pinnedNames.has(fieldName)) {
      setExtraFields((names) => names.filter((n) => n !== fieldName));
    }
    closeChip(fieldName);
  }

  function clearAll() {
    setExtraFields([]);
    setDraftOperators(EMPTY);
    setOpenChip(null);
    commit([]);
  }

  function addField(fieldName) {
    pickedFromAddMenu.current = true;
    setExtraFields((names) => [...names, fieldName]);
    setAddOpen(false);
    setOpenChip({ field: fieldName, mode: 'value' });
  }

  return (
    <div
      data-slot='filter-bar'
      className={cn('flex flex-wrap items-center gap-2', classNames.row, className)}
    >
      {chipNames.map((name) => {
        const fieldDef = fieldByName.get(name);
        const mode = openChip?.field === name ? openChip.mode : null;
        const editorOperatorId = editorOperatorIdFor(fieldDef);
        return (
          <FieldChip
            key={name}
            fieldDef={fieldDef}
            filter={filters.find((f) => f.field === name) ?? null}
            editorOperatorId={editorOperatorId}
            pinned={pinnedNames.has(name)}
            mode={mode}
            onOpen={(nextMode) => setOpenChip({ field: name, mode: nextMode })}
            onClose={() => closeChip(name)}
            onValue={(value, options) => setValue(fieldDef, editorOperatorId, value, options)}
            onOperatorPick={(operatorId) => pickOperator(fieldDef, operatorId)}
            onClear={() => clearField(name)}
            store={store}
            icon={fieldProps[name]?.icon}
            timezone={resolvedTimezone}
            dateFormat={dateFormat}
            labels={labels}
            classNames={classNames}
            portalContainer={portalContainer}
          />
        );
      })}

      {remainingFields.length > 0 && (
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button variant='ghost' className={cn(ADD_FILTER_CLASS, classNames.addFilter)}>
              <PlusIcon aria-hidden />
              {labels.addFilter}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align='start'
            container={portalContainer}
            className={cn(POPOVER_CLASS, 'w-64', classNames.popover)}
            onCloseAutoFocus={(event) => {
              // A picked field opens its own popover; don't pull focus back.
              if (pickedFromAddMenu.current) event.preventDefault();
              pickedFromAddMenu.current = false;
            }}
          >
            <MenuList
              placeholder={labels.filterBy}
              emptyText={labels.noMatches}
              items={remainingFields.map((f) => ({ id: f.name, label: f.label }))}
              onSelect={(item) => addField(item.id)}
              itemClassName={classNames.menuItem}
            />
          </PopoverContent>
        </Popover>
      )}

      {filters.length > 0 && (
        <Button
          variant='ghost'
          onClick={clearAll}
          className={cn(CLEAR_ALL_CLASS, classNames.clearAll)}
        >
          {labels.clearAll}
        </Button>
      )}
    </div>
  );
}

function DynamicFilterBar(props) {
  return (
    <DynamicFilterProvider labels={{ ...shadcnDefaultLabels, ...props.labels }}>
      <DynamicFilterBarInner {...props} />
    </DynamicFilterProvider>
  );
}

export default DynamicFilterBar;
