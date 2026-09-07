import { useEffect, useState } from 'react';
// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/Box`-style import.
import { Box, CircularProgress } from '@mui/material';
import QuickFilterChip from './QuickFilterChip';
import QuickFieldEditor from './QuickFieldEditor';
import QuickOperatorEditor from './QuickOperatorEditor';
import QuickDateOperatorEditor from './QuickDateOperatorEditor';
import SelectionChoicesEditor from './SelectionChoicesEditor';
import OtherFiltersBuilder from './OtherFiltersBuilder';
import { DynamicFilterProvider, useFilterBarLabels, useFilterBarTokens } from '../tokens';
import {
  adaptApiConfig,
  applyChoicesMap,
  applyFieldProps,
  buildQueryParams,
  isMultiSelectionField,
  isSelectionField,
  matchMostUsedField,
} from '../utils';

const DEFAULT_MAX_QUICK_CHIPS = 5;

function isDateField(fieldDef) {
  return (
    fieldDef.type === 'date' ||
    fieldDef.type === 'datetime' ||
    (fieldDef.operators ?? []).some((op) => op.input_field === 'date')
  );
}

function DynamicFilterBarInner({
  filterApiUrl,
  fetcher,
  onApply,
  choicesMap = {},
  fieldProps = {},
  appliedFilters = [],
  onFiltersChange,
  timezone,
  dateFormat,
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

  const baseFilterFields = adaptApiConfig(filterConfig);

  const fieldsWithChoices = applyChoicesMap(baseFilterFields, choicesMap);

  const filterFields = applyFieldProps(fieldsWithChoices, fieldProps);

  const mostUsedNames = filterConfig?.most_used_filters ?? [];
  const hasMostUsed = mostUsedNames.length > 0;

  // Each most_used_filters entry may name a field directly or one of its
  // operators (see matchMostUsedField) — keep only the first match per
  // field so a field referenced twice (e.g. by two different operators)
  // isn't rendered as two chips, and remember which operator it was
  // matched through so that operator becomes the field's preferred
  // starting point instead of the field's own default_operator.
  const seenMostUsedFieldNames = new Set();
  const mostUsedMatches = mostUsedNames
    .map((name) => matchMostUsedField(name, filterFields))
    .filter((match) => Boolean(match))
    .filter((match) => {
      if (seenMostUsedFieldNames.has(match.fieldDef.name)) return false;
      seenMostUsedFieldNames.add(match.fieldDef.name);
      return true;
    });

  const mostUsedFieldDefs = mostUsedMatches.map((match) => match.fieldDef);
  const mostUsedFieldNameSet = new Set(mostUsedFieldDefs.map((f) => f.name));
  const mostUsedPreferredOperatorId = new Map(
    mostUsedMatches
      .filter((match) => match.operatorId)
      .map((match) => [match.fieldDef.name, match.operatorId])
  );

  // The individually-rendered chips (everything but the trailing "Filter"
  // chip) are capped at maxQuickChips in total, filled in priority order:
  // most_used_filters entries (in the order given), then — to always keep
  // the bar filled up to maxQuickChips — whichever remaining filterFields
  // come first, regardless of whether they're a selection field
  // (fetch_url/options) or a plain text/number/date field. Anything that
  // doesn't fit folds into the "Filter" chip instead of disappearing.
  let chipBudget = maxQuickChips;

  const visibleMostUsedFieldDefs = mostUsedFieldDefs.slice(0, chipBudget);
  chipBudget = Math.max(0, chipBudget - visibleMostUsedFieldDefs.length);

  const backfillCandidateFieldDefs = filterFields.filter((f) => !mostUsedFieldNameSet.has(f.name));
  const visibleBackfillFieldDefs = backfillCandidateFieldDefs.slice(0, chipBudget);

  const quickChipFieldDefs = [...visibleMostUsedFieldDefs, ...visibleBackfillFieldDefs];
  const quickChipFieldNameSet = new Set(quickChipFieldDefs.map((f) => f.name));

  // A quick-chip field that is itself a selection field renders via the
  // choice-list editor (single or multi per isMultiSelectionField) instead
  // of the generic operator+value editor.
  const regularMostUsedFieldDefs = quickChipFieldDefs.filter((f) => !isSelectionField(f));
  const selectionFieldDefs = quickChipFieldDefs.filter(isSelectionField);

  const otherFieldDefs = filterFields.filter((f) => !quickChipFieldNameSet.has(f.name));
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
        p: 0,
      }}
    >
      {regularMostUsedFieldDefs.map((fieldDef) => {
        const appliedFilter = filters.find((f) => f.field === fieldDef.name) ?? null;
        const hasMultipleOperators = (fieldDef.operators ?? []).length > 1;
        const isDate = isDateField(fieldDef);
        let chipWidth = 260;
        if (hasMultipleOperators) chipWidth = 'max-content';
        return (
          <QuickFilterChip
            key={fieldDef.name}
            label={fieldDef.label}
            count={appliedFilter ? 1 : 0}
            onClear={() => clearQuickFilter(fieldDef.name)}
            width={chipWidth}
          >
            {({ openKey, closePopover }) => {
              if (hasMultipleOperators && isDate) {
                return (
                  <QuickDateOperatorEditor
                    key={openKey}
                    fieldDef={fieldDef}
                    appliedFilter={appliedFilter}
                    preferredOperatorId={mostUsedPreferredOperatorId.get(fieldDef.name)}
                    timezone={resolvedTimezone}
                    dateFormat={dateFormat}
                    onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                  />
                );
              }
              if (hasMultipleOperators) {
                return (
                  <QuickOperatorEditor
                    key={openKey}
                    fieldDef={fieldDef}
                    appliedFilter={appliedFilter}
                    preferredOperatorId={mostUsedPreferredOperatorId.get(fieldDef.name)}
                    closePopover={closePopover}
                    fetcher={fetcher}
                    timezone={resolvedTimezone}
                    dateFormat={dateFormat}
                    onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                  />
                );
              }
              return (
                <QuickFieldEditor
                  key={openKey}
                  fieldDef={fieldDef}
                  appliedFilter={appliedFilter}
                  closePopover={closePopover}
                  fetcher={fetcher}
                  timezone={resolvedTimezone}
                  dateFormat={dateFormat}
                  onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                />
              );
            }}
          </QuickFilterChip>
        );
      })}

      {selectionFieldDefs.map((fieldDef) => {
        const appliedFilter = filters.find((f) => f.field === fieldDef.name) ?? null;
        const multiple = isMultiSelectionField(fieldDef);
        const count = multiple ? appliedFilter?.value?.length ?? 0 : appliedFilter?.value ? 1 : 0;
        const hasMultipleOperators = (fieldDef.operators ?? []).length > 1;
        return (
          <QuickFilterChip
            key={fieldDef.name}
            label={fieldDef.label}
            count={count}
            onClear={() => clearQuickFilter(fieldDef.name)}
            width={hasMultipleOperators ? 'max-content' : 260}
          >
            {({ openKey, closePopover }) =>
              hasMultipleOperators ? (
                <QuickOperatorEditor
                  key={openKey}
                  fieldDef={fieldDef}
                  appliedFilter={appliedFilter}
                  preferredOperatorId={mostUsedPreferredOperatorId.get(fieldDef.name)}
                  closePopover={closePopover}
                  fetcher={fetcher}
                  timezone={resolvedTimezone}
                  dateFormat={dateFormat}
                  onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                />
              ) : (
                <SelectionChoicesEditor
                  key={openKey}
                  fieldDef={fieldDef}
                  appliedFilter={appliedFilter}
                  multiple={multiple}
                  fetcher={fetcher}
                  onApply={(filterObj) => applyQuickFilter(fieldDef.name, filterObj)}
                  onSelectSingle={multiple ? undefined : closePopover}
                />
              )
            }
          </QuickFilterChip>
        );
      })}

      {otherFieldDefs.length > 0 && (
        <QuickFilterChip
          label={labels.filterChipLabel}
          count={otherActiveCount}
          onClear={() => applyOtherFilters([])}
          width={580}
          padding={0}
        >
          {({ closePopover, openKey }) => (
            <OtherFiltersBuilder
              key={openKey}
              otherFieldDefs={otherFieldDefs}
              appliedOtherFilters={filters.filter((f) => otherFieldNameSet.has(f.field))}
              fetcher={fetcher}
              timezone={resolvedTimezone}
              dateFormat={dateFormat}
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
