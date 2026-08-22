import { useState } from 'react';
import FilterRow from './FilterRow';
import { getDefaultOperatorId, getOperatorId } from '../utils';

// Quick-chip editor for a field that exposes more than one operator — reuses
// FilterRow (stripped of the remove icon and field select, since the field
// is fixed by the chip it's opened from) so operator+value editing behaves
// identically to the "Filter" builder's rows. There's no Apply button:
// picking an operator that needs no value (e.g. "Is empty") commits right
// away, and a value commits on blur (text) or the moment it's picked
// (date/select) — see ValueInput's onCommit.
function QuickOperatorEditor({ fieldDef, appliedFilter, preferredOperatorId, onApply, fetcher }) {
  const operators = fieldDef.operators ?? [];
  const [filter, setFilter] = useState(() => ({
    id: appliedFilter?.id ?? crypto.randomUUID(),
    field: fieldDef.name,
    operatorId: appliedFilter?.operatorId ?? preferredOperatorId ?? getDefaultOperatorId(fieldDef),
    value: appliedFilter?.value ?? null,
  }));

  function handleChange(key, newValue, extra) {
    setFilter((prev) => {
      const updated = { ...prev, [key]: newValue };
      if (extra?.resetValue) updated.value = null;
      return updated;
    });

    if (key === 'operatorId') {
      const op = operators.find((o) => getOperatorId(o) === newValue);
      if (op?.input_type === 'none') {
        onApply({ ...filter, operatorId: newValue, value: null });
      }
    }
  }

  function handleCommitValue(newValue) {
    onApply({ ...filter, value: newValue });
  }

  return (
    <FilterRow
      filter={filter}
      filterFields={[fieldDef]}
      onChange={handleChange}
      onCommit={handleCommitValue}
      fetcher={fetcher}
      showRemove={false}
      showField={false}
    />
  );
}

export default QuickOperatorEditor;
