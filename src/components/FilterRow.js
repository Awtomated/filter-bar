// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, FormControl, IconButton, InputLabel, MenuItem, Select } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ValueInput from './ValueInput';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { getOperatorId } from '../utils';

function FilterRow({ filter, filterFields, onRemove, onChange, fetcher }) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const dropdownListSx = { px: '8px' };
  const dropdownItemSx = { borderRadius: '8px', padding: tokens.menuItemPadding };

  const fieldDef = filterFields.find((f) => f.name === filter.field);
  const operators = fieldDef?.operators ?? [];
  const selectedOp = operators.find((op) => getOperatorId(op) === filter.operatorId);
  const showValue = selectedOp?.input_type !== 'none';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
      <IconButton
        size='small'
        onClick={onRemove}
        sx={{ color: 'text.secondary', flexShrink: 0, p: '4px' }}
      >
        <CloseIcon fontSize='small' />
      </IconButton>

      <FormControl size='small' sx={{ minWidth: 140 }}>
        <InputLabel shrink>{labels.fieldLabel}</InputLabel>
        <Select
          value={filter.field}
          label={labels.fieldLabel}
          notched
          MenuProps={{ slotProps: { list: { sx: dropdownListSx } } }}
          onChange={(e) => onChange('field', e.target.value, { resetValue: true })}
        >
          {filterFields.map((f) => (
            <MenuItem key={f.name} value={f.name} sx={dropdownItemSx}>
              {f.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size='small' sx={{ minWidth: 140 }}>
        <InputLabel shrink>{labels.operatorLabel}</InputLabel>
        <Select
          value={filter.operatorId ?? ''}
          label={labels.operatorLabel}
          notched
          inputProps={{ readOnly: operators.length <= 1 }}
          MenuProps={{ slotProps: { list: { sx: dropdownListSx } } }}
          onChange={(e) => onChange('operatorId', e.target.value, { resetValue: true })}
        >
          {operators.map((op) => (
            <MenuItem key={getOperatorId(op)} value={getOperatorId(op)} sx={dropdownItemSx}>
              {op.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showValue && (
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <ValueInput
            fieldDef={fieldDef}
            selectedOp={selectedOp}
            value={filter.value}
            onChange={(val) => onChange('value', val)}
            fetcher={fetcher}
          />
        </Box>
      )}
    </Box>
  );
}

export default FilterRow;
