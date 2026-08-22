import { useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import {
  Box,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ValueInput from './ValueInput';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { getOperatorId } from '../utils';

function FilterRow({
  filter,
  filterFields,
  onRemove,
  onChange,
  onCommit,
  fetcher,
  showRemove = true,
  showField = true,
}) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const [fieldSearch, setFieldSearch] = useState('');
  // Same 4px item gap as the selection-choices list (SelectionChoicesEditor).
  const dropdownListSx = { px: '8px', display: 'flex', flexDirection: 'column', gap: '4px' };
  const dropdownItemSx = { borderRadius: '8px', padding: tokens.menuItemPadding };

  const fieldDef = filterFields.find((f) => f.name === filter.field);
  const operators = fieldDef?.operators ?? [];
  const selectedOp = operators.find((op) => getOperatorId(op) === filter.operatorId);
  const showValue = selectedOp?.input_type !== 'none';

  const filteredFilterFields = filterFields.filter((f) =>
    f.label.toLowerCase().includes(fieldSearch.trim().toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {showRemove && (
        <IconButton
          size='small'
          onClick={onRemove}
          sx={{ color: 'text.secondary', flexShrink: 0, p: '4px' }}
        >
          <CloseIcon fontSize='small' />
        </IconButton>
      )}

      {showField && (
        <FormControl size='small' sx={{ minWidth: 140 }}>
          <InputLabel shrink>{labels.fieldLabel}</InputLabel>
          <Select
            value={filter.field}
            label={labels.fieldLabel}
            notched
            renderValue={(val) => filterFields.find((f) => f.name === val)?.label ?? ''}
            MenuProps={{
              autoFocus: false,
              slotProps: { list: { sx: dropdownListSx } },
            }}
            onClose={() => setFieldSearch('')}
            onChange={(e) => onChange('field', e.target.value, { resetValue: true })}
          >
            <ListSubheader sx={{ px: '0px' }} onKeyDown={(e) => e.stopPropagation()}>
              <TextField
                size='small'
                fullWidth
                autoFocus
                placeholder={labels.searchPlaceholder(labels.fieldLabel)}
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Escape') e.stopPropagation();
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment
                        position='start'
                        sx={{ marginLeft: 0, marginRight: `${tokens.searchGap}px` }}
                      >
                        <SearchIcon
                          sx={{ fontSize: `${tokens.searchIconSize}px`, color: 'text.secondary' }}
                        />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: `${tokens.searchRadius}px`,
                      bgcolor: tokens.searchBackground,
                      padding: `${tokens.searchPadding}px !important`,
                      height: `${tokens.searchHeight}px`,
                      '& fieldset': { border: 'none' },
                      '& .MuiOutlinedInput-input': {
                        height: `${tokens.searchFieldHeight}px !important`,
                      },
                    },
                  },
                }}
              />
            </ListSubheader>
            {filteredFilterFields.map((f) => (
              <MenuItem key={f.name} value={f.name} sx={dropdownItemSx}>
                {f.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

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
            onCommit={onCommit}
            fetcher={fetcher}
          />
        </Box>
      )}
    </Box>
  );
}

export default FilterRow;
