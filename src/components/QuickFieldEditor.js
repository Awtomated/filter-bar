import { useEffect, useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box } from '@mui/material';
import ValueInput from './ValueInput';
import { getDefaultOperator, getDefaultOperatorId } from '../utils';

// Used only for fields with a single (or no) operator — DynamicFilterBar
// routes fields with more than one operator to QuickOperatorEditor instead,
// so there's never a choice to present here, just the value. There's no
// Apply button: a plain text/number value commits on blur, a date/select
// value commits the moment it's picked (see ValueInput's onCommit).
function QuickFieldEditor({ fieldDef, appliedFilter, onApply, fetcher }) {
  const operatorId = appliedFilter?.operatorId ?? getDefaultOperatorId(fieldDef);
  const selectedOp = getDefaultOperator(fieldDef);
  const [value, setValue] = useState(appliedFilter?.value ?? null);

  const showValue = selectedOp?.input_type !== 'none';

  function commit(newValue) {
    onApply({
      id: appliedFilter?.id ?? crypto.randomUUID(),
      field: fieldDef.name,
      operatorId,
      value: newValue,
    });
  }

  useEffect(() => {
    // The field's one and only operator takes no value (e.g. "Is empty") —
    // there's nothing left for the user to interact with, so opening this
    // chip's popover is itself the action; commit right away.
    if (!showValue) commit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!showValue) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <ValueInput
        fieldDef={fieldDef}
        selectedOp={selectedOp}
        value={value}
        onChange={setValue}
        onCommit={commit}
        fetcher={fetcher}
      />
    </Box>
  );
}

export default QuickFieldEditor;
