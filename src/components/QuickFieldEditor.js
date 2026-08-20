import { useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, Button, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import ValueInput from './ValueInput';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { getDefaultOperatorId, getOperatorId } from '../utils';

function QuickFieldEditor({ fieldDef, appliedFilter, onApply, fetcher }) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const operators = fieldDef.operators ?? [];
  const [operatorId, setOperatorId] = useState(
    appliedFilter?.operatorId ?? getDefaultOperatorId(fieldDef)
  );
  const [value, setValue] = useState(appliedFilter?.value ?? null);

  const selectedOp = operators.find((op) => getOperatorId(op) === operatorId);
  const showValue = selectedOp?.input_type !== 'none';

  function handleApply() {
    onApply({
      id: appliedFilter?.id ?? crypto.randomUUID(),
      field: fieldDef.name,
      operatorId,
      value,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <FormControl size='small' fullWidth>
        <InputLabel shrink>{labels.operatorLabel}</InputLabel>
        <Select
          value={operatorId}
          label={labels.operatorLabel}
          notched
          inputProps={{ readOnly: operators.length <= 1 }}
          MenuProps={{ slotProps: { list: { sx: { px: '8px' } } } }}
          onChange={(e) => {
            setOperatorId(e.target.value);
            setValue(null);
          }}
        >
          {operators.map((op) => (
            <MenuItem
              key={getOperatorId(op)}
              value={getOperatorId(op)}
              sx={{ borderRadius: '8px', padding: tokens.menuItemPadding }}
            >
              {op.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showValue && (
        <ValueInput
          fieldDef={fieldDef}
          selectedOp={selectedOp}
          value={value}
          onChange={setValue}
          fetcher={fetcher}
        />
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant='contained'
          size='small'
          onClick={handleApply}
          sx={{ textTransform: 'none' }}
        >
          {labels.apply}
        </Button>
      </Box>
    </Box>
  );
}

export default QuickFieldEditor;
