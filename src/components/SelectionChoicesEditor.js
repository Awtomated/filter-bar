import { useEffect, useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import {
  Box,
  Checkbox,
  CircularProgress,
  InputAdornment,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';
import { getChoiceId, getChoiceLabel, getDefaultOperatorId } from '../utils';

// Fetch-choices effect intentionally mirrors SelectValueInput's — including
// the `full_name -> name` normalization for endpoints that return that
// field instead of `name` — so a most-used selection field renders the same
// labels it would if it went through the generic "Filter" builder instead.
function SelectionChoicesEditor({
  fieldDef,
  appliedFilter,
  onApply,
  multiple = true,
  onSelectSingle,
  fetcher,
}) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const [choices, setChoices] = useState(fieldDef.options ?? []);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() =>
    multiple ? appliedFilter?.value ?? [] : appliedFilter?.value ?? null
  );
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (fieldDef.options || !fieldDef.fetch_url) return;
    let active = true;
    setLoading(true);
    fetcher(fieldDef.fetch_url)
      .then((res) => {
        if (!active) return;
        const data = res?.data;
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        const normalized = list.map((item) =>
          item?.full_name ? { ...item, name: item.full_name } : item
        );
        setChoices(normalized);
      })
      .catch(() => {
        if (active) setChoices([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDef.fetch_url]);

  // Single mode: clicking a choice commits it immediately and closes the
  // popover. Multi mode: toggling a checkbox commits the selection and
  // fires the request without closing.
  function toggle(choice) {
    if (!multiple) {
      setSelected(choice);
      onApply({
        id: appliedFilter?.id ?? crypto.randomUUID(),
        field: fieldDef.name,
        operatorId: getDefaultOperatorId(fieldDef),
        value: choice,
      });
      onSelectSingle?.();
      return;
    }
    const id = getChoiceId(choice);
    const currentSelected = selected ?? [];
    const isSelected = currentSelected.some((c) => getChoiceId(c) === id);
    const newSelected = isSelected
      ? currentSelected.filter((c) => getChoiceId(c) !== id)
      : [...currentSelected, choice];
    setSelected(newSelected);
    onApply({
      id: appliedFilter?.id ?? crypto.randomUUID(),
      field: fieldDef.name,
      operatorId: getDefaultOperatorId(fieldDef),
      value: newSelected,
    });
  }

  const filteredChoices = choices.filter((choice) =>
    getChoiceLabel(choice).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField
        size='small'
        fullWidth
        placeholder={labels.searchPlaceholder(fieldDef.label)}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
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
              '& .MuiOutlinedInput-input': { height: `${tokens.searchFieldHeight}px !important` },
            },
          },
        }}
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={18} />
        </Box>
      ) : filteredChoices.length === 0 ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            {labels.noMatches}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            maxHeight: 280,
            overflowY: 'auto',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          {filteredChoices.map((choice) => {
            const id = getChoiceId(choice);
            const checked = multiple
              ? (selected ?? []).some((c) => getChoiceId(c) === id)
              : getChoiceId(selected) === id;
            return (
              <ListItemButton
                key={id}
                dense
                selected={checked}
                onClick={() => toggle(choice)}
                sx={{
                  borderRadius: '8px',
                  padding: tokens.menuItemPadding,
                  gap: 2,
                  color: checked ? 'primary.main' : 'text.primary',
                  fontWeight: checked ? 600 : 400,
                  '&:hover, &.Mui-focusVisible': { bgcolor: tokens.hoverBackground },
                  '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
                    bgcolor: tokens.selectedBackground,
                    color: 'primary.main',
                  },
                }}
              >
                {multiple && (
                  <Checkbox
                    edge='start'
                    size='small'
                    checked={checked}
                    tabIndex={-1}
                    disableRipple
                    sx={{ p: 0, m: 0, '& .MuiSvgIcon-root': { fontSize: tokens.checkboxSize } }}
                  />
                )}
                <ListItemText
                  primary={getChoiceLabel(choice)}
                  primaryTypographyProps={{ sx: tokens.menuItemTypographySx }}
                />
              </ListItemButton>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default SelectionChoicesEditor;
