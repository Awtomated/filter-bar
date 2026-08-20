import { useEffect, useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Autocomplete, CircularProgress, TextField } from '@mui/material';

function getOptionLabel(option) {
  if (!option) return '';
  if (option.code && option.title) return `${option.code} - ${option.title}`;
  if (option.language_code && option.language)
    return `${option.language_code} - ${option.language}`;
  return String(option.title || option.name || option.id || '');
}

// Standalone select/autocomplete input for a single filter value. Fetches
// its option list lazily (on open) from `choicesAPI` via the injected
// `fetcher`, or uses a local `choices` array when provided (which always
// takes precedence and skips fetching entirely).
function SelectValueInput({
  fetcher,
  choicesAPI,
  choices,
  label,
  placeholder,
  value,
  onChange,
  listboxSx,
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState(choices ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (choices) {
      setOptions(choices);
      return;
    }
    if (!open || !choicesAPI) {
      setOptions([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetcher(choicesAPI)
      .then((res) => {
        if (!active) return;
        const data = res?.data;
        const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
        // Some choice endpoints return `full_name` instead of `name` — treat
        // it as the canonical display name so getOptionLabel/getChoiceLabel
        // don't fall back to a raw numeric id.
        const normalized = list.map((item) =>
          item?.full_name ? { ...item, name: item.full_name } : item
        );
        setOptions(normalized);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, choicesAPI, choices, fetcher]);

  return (
    <Autocomplete
      size='small'
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading && !choices}
      value={value ?? null}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size='small'
          variant='outlined'
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={14} /> : null}
                  {params.slotProps?.input?.endAdornment}
                </>
              ),
            },
            inputLabel: { ...params.slotProps?.inputLabel, shrink: true },
          }}
        />
      )}
      sx={{ width: '100%' }}
      slotProps={{
        popper: { sx: { zIndex: 1400 } },
        paper: { sx: { zIndex: 99 } },
        listbox: { sx: listboxSx },
      }}
    />
  );
}

export default SelectValueInput;
