import { useEffect, useState } from 'react';
// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/Box`-style import.
import { Box, CircularProgress } from '@mui/material';
import QuickFilterChip from './QuickFilterChip';
import QuickFieldEditor from './QuickFieldEditor';
import SelectionChoicesEditor from './SelectionChoicesEditor';
import DateRangeGroupChip from './DateRangeGroupChip';
import OtherFiltersBuilder from './OtherFiltersBuilder';
import { DynamicFilterProvider, useFilterBarLabels, useFilterBarTokens } from '../tokens';
import {
  adaptApiConfig,
  applyChoicesMap,
  buildDateRangeGroups,
  buildQueryParams,
  isDateLikeField,
  isMultiSelectionField,
  isSelectionField,
} from '../utils';

const DEFAULT_MAX_QUICK_CHIPS = 5;

function DynamicFilterBarInner({
  filterApiUrl,
  fetcher,
  onApply,
  choicesMap = {},
  appliedFilters = [],
  onFiltersChange,
  timezone,
  maxQuickChips = DEFAULT_MAX_QUICK_CHIPS,
}) {
  const resolvedTimezone = timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const [filterConfig, setFilterConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [filters, setFilters] = useState(appliedFilters);

  useEffect(() => {
    onFiltersChange?.(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    if (!filterApiUrl) return;
    let active = true;
    setConfigLoading(true);
    fetcher(filterApiUrl)
      .then((res) => {
        if (active) setFilterConfig(res.data);
      })
      .catch(() => {
        // Config fetch failures are silently ignored — filterFields resolves
        // to [] and the bar renders nothing (see the `!filterFields.length`
        // guard below) rather than surfacing a fetch error of its own.
      })
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterApiUrl]);

  const choicesMapNames = new Set(Object.keys(choicesMap));
  const baseFilterFields = adaptApiConfig(filterConfig);
  const filterFields = applyChoicesMap(baseFilterFields, choicesMap);

  const mostUsedNames = filterConfig?.most_used_filters ?? [];
  const hasMostUsed = mostUsedNames.length > 0;
  const mostUsedFieldDefs = hasMostUsed
    ? mostUsedNames
        .map((name) => filterFields.find((f) => f.name === name))
        .filter((f) => Boolean(f) && !choicesMapNames.has(f.name))
    : [];

  const dateFieldDefs = mostUsedFieldDefs.filter(isDateLikeField);
  const allDateRangeGroups = buildDateRangeGroups(dateFieldDefs, filterFields);
  // Cap date-range groups to the overall chip budget too — otherwise they
  // could alone exceed maxQuickChips while the rest of the budget logic
  // below assumes they never do.
  const dateRangeGroups = allDateRangeGroups.slice(0, maxQuickChips);
  const dateRangeOverflow = allDateRangeGroups.slice(maxQuickChips);
  const dateGroupFieldNames = new Set(
    dateRangeGroups.flatMap((g) => [g.startField.name, g.endField.name])
  );
  const dateRangeOverflowFieldNames = new Set(
    dateRangeOverflow.flatMap((g) => [g.startField.name, g.endField.name])
  );

  const nonDateMostUsedFieldDefs = mostUsedFieldDefs.filter(
    (f) => !dateGroupFieldNames.has(f.name) && !dateRangeOverflowFieldNames.has(f.name)
  );
  // A most-used field that is itself a selection field renders as a
  // selection chip (single or multi per isMultiSelectionField) instead of
  // the generic operator+value editor.
  const mostUsedSelectionFieldDefs = nonDateMostUsedFieldDefs.filter(isSelectionField);
  const mostUsedQuickFieldDefs = nonDateMostUsedFieldDefs.filter((f) => !isSelectionField(f));

  const choicesMapFieldDefs = filterFields.filter((f) => choicesMapNames.has(f.name));
  const derivedSelectionFieldDefs = hasMostUsed
    ? []
    : filterFields.filter(
        (f) =>
          !choicesMapNames.has(f.name) && !dateGroupFieldNames.has(f.name) && isSelectionField(f)
      );

  // Cap the individually-rendered chips (everything but the trailing
  // "Filter" chip) at maxQuickChips. choicesMap fields are an explicit,
  // caller-controlled opt-in and are always shown; date-range, most-used,
  // and auto-derived selection chips compete for whatever budget is left,
  // in that priority order — anything that doesn't fit folds into the
  // "Filter" chip instead of disappearing.
  let chipBudget = Math.max(0, maxQuickChips - dateRangeGroups.length);

  const visibleQuickFieldDefs = mostUsedQuickFieldDefs.slice(0, chipBudget);
  chipBudget = Math.max(0, chipBudget - visibleQuickFieldDefs.length);

  const visibleMostUsedSelectionFieldDefs = mostUsedSelectionFieldDefs.slice(0, chipBudget);
  chipBudget = Math.max(0, chipBudget - visibleMostUsedSelectionFieldDefs.length);

  const visibleDerivedSelectionFieldDefs = derivedSelectionFieldDefs.slice(0, chipBudget);

  const overflowFieldNames = new Set([
    ...Array.from(dateRangeOverflowFieldNames),
    ...mostUsedQuickFieldDefs.slice(visibleQuickFieldDefs.length).map((f) => f.name),
    ...mostUsedSelectionFieldDefs
      .slice(visibleMostUsedSelectionFieldDefs.length)
      .map((f) => f.name),
    ...derivedSelectionFieldDefs.slice(visibleDerivedSelectionFieldDefs.length).map((f) => f.name),
  ]);

  const regularMostUsedFieldDefs = visibleQuickFieldDefs;
  const selectionFieldDefs = [
    ...choicesMapFieldDefs,
    ...visibleMostUsedSelectionFieldDefs,
    ...visibleDerivedSelectionFieldDefs,
  ];

  const otherFieldDefs = hasMostUsed
    ? filterFields.filter(
        (f) =>
          !choicesMapNames.has(f.name) &&
          !dateGroupFieldNames.has(f.name) &&
          (!mostUsedNames.includes(f.name) || overflowFieldNames.has(f.name))
      )
    : filterFields.filter(
        (f) =>
          !choicesMapNames.has(f.name) &&
          !dateGroupFieldNames.has(f.name) &&
          (!isSelectionField(f) || overflowFieldNames.has(f.name))
      );
  const otherFieldNameSet = new Set(otherFieldDefs.map((f) => f.name));

  function applyQuickFilter(fieldName, filterObj) {
    const newFilters = [...filters.filter((f) => f.field !== fieldName), filterObj];
    setFilters(newFilters);
    onApply?.(buildQueryParams(newFilters, filterFields));
  }

  function clearQuickFilter(fieldName) {
    const newFilters = filters.filter((f) => f.field !== fieldName);
    setFilters(newFilters);
    onApply?.(buildQueryParams(newFilters, filterFields));
  }

  function applyDateRangeFilters(fieldNames, newEntries) {
    const newFilters = [...filters.filter((f) => !fieldNames.includes(f.field)), ...newEntries];
    setFilters(newFilters);
    onApply?.(buildQueryParams(newFilters, filterFields));
  }

  function clearDateRangeFilters(fieldNames) {
    const newFilters = filters.filter((f) => !fieldNames.includes(f.field));
    setFilters(newFilters);
    onApply?.(buildQueryParams(newFilters, filterFields));
  }

  function applyOtherFilters(newOtherFilters) {
    const newFilters = [
      ...filters.filter((f) => !otherFieldNameSet.has(f.field)),
      ...newOtherFilters,
    ];
    setFilters(newFilters);
    onApply?.(buildQueryParams(newFilters, filterFields));
  }

  if (configLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
        <CircularProgress size={18} />
      </Box>
    );
  }

  if (!filterFields.length) return null;

  const otherActiveCount = filters.filter((f) => otherFieldNameSet.has(f.field)).length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: `${tokens.gapSm}px`,
        py: 1,
        pb: 2,
      }}
    >
      {dateRangeGroups.map((group) => (
        <DateRangeGroupChip
          key={group.key}
          group={group}
          filters={filters}
          timezone={resolvedTimezone}
          onApply={applyDateRangeFilters}
          onClear={() =>
            clearDateRangeFilters(Array.from(new Set([group.startField.name, group.endField.name])))
          }
        />
      ))}

      {regularMostUsedFieldDefs.map((fieldDef) => {
        const appliedFilter = filters.find((f) => f.field === fieldDef.name) ?? null;
        return (
          <QuickFilterChip
            key={fieldDef.name}
            label={fieldDef.label}
            count={appliedFilter ? 1 : 0}
            onClear={() => clearQuickFilter(fieldDef.name)}
            width={280}
          >
            {({ closePopover, openKey }) => (
              <QuickFieldEditor
                key={openKey}
                fieldDef={fieldDef}
                appliedFilter={appliedFilter}
                fetcher={fetcher}
                onApply={(filterObj) => {
                  applyQuickFilter(fieldDef.name, filterObj);
                  closePopover();
                }}
              />
            )}
          </QuickFilterChip>
        );
      })}

      {selectionFieldDefs.map((fieldDef) => {
        const appliedFilter = filters.find((f) => f.field === fieldDef.name) ?? null;
        const multiple = isMultiSelectionField(fieldDef);
        const count = multiple ? appliedFilter?.value?.length ?? 0 : appliedFilter?.value ? 1 : 0;
        return (
          <QuickFilterChip
            key={fieldDef.name}
            label={fieldDef.label}
            count={count}
            onClear={() => clearQuickFilter(fieldDef.name)}
            width={280}
          >
            {({ openKey, closePopover }) => (
              <SelectionChoicesEditor
                key={openKey}
                fieldDef={fieldDef}
                appliedFilter={appliedFilter}
                multiple={multiple}
                fetcher={fetcher}
                onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                onSelectSingle={multiple ? undefined : closePopover}
              />
            )}
          </QuickFilterChip>
        );
      })}

      {otherFieldDefs.length > 0 && (
        <QuickFilterChip
          label={labels.filterChipLabel}
          count={otherActiveCount}
          onClear={() => applyOtherFilters([])}
          width={580}
        >
          {({ closePopover, openKey }) => (
            <OtherFiltersBuilder
              key={openKey}
              otherFieldDefs={otherFieldDefs}
              appliedOtherFilters={filters.filter((f) => otherFieldNameSet.has(f.field))}
              fetcher={fetcher}
              onApply={(newOtherFilters) => {
                applyOtherFilters(newOtherFilters);
                closePopover();
              }}
              onCancel={closePopover}
            />
          )}
        </QuickFilterChip>
      )}
    </Box>
  );
}

function DynamicFilterBar(props) {
  return (
    <DynamicFilterProvider tokens={props.tokens} labels={props.labels}>
      <DynamicFilterBarInner {...props} />
    </DynamicFilterProvider>
  );
}

export default DynamicFilterBar;
