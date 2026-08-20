import { useState } from 'react';
// Named (root-barrel) imports — see the note in QuickFilterChip.js about why
// these must not be deep `@mui/material/*`-style imports.
import { Box, Button, Divider, Typography } from '@mui/material';
import FilterRow from './FilterRow';
import { useFilterBarLabels } from '../tokens';
import { getDefaultOperatorId, makeFilter } from '../utils';

function OtherFiltersBuilder({ otherFieldDefs, appliedOtherFilters, onApply, onCancel, fetcher }) {
  const labels = useFilterBarLabels();
  const [draftFilters, setDraftFilters] = useState(() =>
    appliedOtherFilters.length > 0
      ? appliedOtherFilters
      : otherFieldDefs.length > 0
      ? [makeFilter(otherFieldDefs[0])]
      : []
  );

  function addFilter() {
    if (!otherFieldDefs.length) return;
    setDraftFilters((prev) => [...prev, makeFilter(otherFieldDefs[0])]);
  }

  function removeFilter(index) {
    setDraftFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function updateFilter(index, key, value, extra) {
    const newOperatorId =
      extra?.resetValue && key === 'field'
        ? getDefaultOperatorId(otherFieldDefs.find((fd) => fd.name === value))
        : undefined;

    setDraftFilters((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const updated = { ...f, [key]: value };
        if (extra?.resetValue) {
          updated.value = null;
          if (key === 'field') updated.operatorId = newOperatorId ?? '';
        }
        return updated;
      })
    );
  }

  function handleClearAll() {
    setDraftFilters([]);
    onApply([]);
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, px: 2, pb: 1 }}>
        <Typography variant='h6' sx={{ fontWeight: 500 }}>
          {labels.filtersTitle}
        </Typography>

        {draftFilters.map((filter, index) => (
          <FilterRow
            key={filter.id}
            filter={filter}
            filterFields={otherFieldDefs}
            onRemove={() => removeFilter(index)}
            onChange={(key, val, extra) => updateFilter(index, key, val, extra)}
            fetcher={fetcher}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '14px',
          paddingRight: '14px',
        }}
      >
        <Button
          variant='text'
          size='small'
          onClick={addFilter}
          disabled={!otherFieldDefs.length}
          sx={{ textTransform: 'none', px: 0.5 }}
        >
          {labels.addFilter}
        </Button>
        {draftFilters.length > 0 && (
          <Button
            variant='text'
            size='small'
            onClick={handleClearAll}
            sx={{ textTransform: 'none' }}
          >
            {labels.clearAll}
          </Button>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant='text' size='medium' onClick={onCancel} sx={{ textTransform: 'none' }}>
          {labels.cancel}
        </Button>
        <Button
          variant='contained'
          size='medium'
          onClick={() => onApply(draftFilters)}
          disabled={draftFilters.length === 0}
          sx={{ textTransform: 'none' }}
        >
          {labels.apply}
        </Button>
      </Box>
    </Box>
  );
}

export default OtherFiltersBuilder;
