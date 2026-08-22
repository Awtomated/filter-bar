import { useState } from 'react';
// Named (root-barrel) imports, not deep paths — this app shares @mui/material
// as a Module Federation singleton keyed on the exact `'@mui/material'`
// specifier; a deep import like `@mui/material/Chip` bypasses that sharing
// and can pull in a second, un-themed instance of the component.
import { Box, Chip, Popover, Tooltip } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useFilterBarLabels, useFilterBarTokens } from '../tokens';

// Compact chip + popover trigger shared by DynamicFilterBar's quick-access
// chips (one per most-used field) and its trailing "Filter" chip. Clicking
// the chip opens `children` in a popover; a count badge and inline clear-X
// are shown once a filter is active.
function QuickFilterChip({
  label,
  count = 0,
  onClear,
  children,
  width = 260,
  displayLabel,
  padding = 1.5,
}) {
  const tokens = useFilterBarTokens();
  const labels = useFilterBarLabels();
  const [anchorEl, setAnchorEl] = useState(null);
  // Bumped on every open so callers can `key` their popover content on it,
  // forcing a fresh mount (and fresh draft state) each time instead of
  // reusing whatever was left over from the last time it was open.
  const [openKey, setOpenKey] = useState(0);
  const open = Boolean(anchorEl);

  const openPopover = (event) => {
    setAnchorEl(event.currentTarget);
    setOpenKey((k) => k + 1);
  };
  const closePopover = () => setAnchorEl(null);

  const chipLabel = count > 0 ? displayLabel || `${label} (${count})` : label;
  const showClear = count > 0 && typeof onClear === 'function';

  const handleClear = (event) => {
    event.stopPropagation();
    onClear?.();
  };

  const handleClearKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
      event.preventDefault();
      onClear?.();
    }
  };

  return (
    <>
      <Chip
        label={
          showClear ? (
            <Box sx={{ display: 'flex', alignItems: 'center', height: '18px', gap: '2px' }}>
              <Box component='span'>{chipLabel}</Box>
              <Tooltip title={labels.clearFilterTooltip}>
                <Box
                  component='span'
                  role='button'
                  tabIndex={0}
                  aria-label={labels.clearFilterTooltip}
                  onClick={handleClear}
                  onKeyDown={handleClearKeyDown}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    color: 'text.secondary',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                  }}
                >
                  <CloseRoundedIcon sx={{ fontSize: 13 }} />
                </Box>
              </Tooltip>
            </Box>
          ) : (
            chipLabel
          )
        }
        onClick={openPopover}
        onDelete={openPopover}
        deleteIcon={<KeyboardArrowDownIcon fontSize='small' aria-label='Open filter' />}
        variant='outlined'
        size='small'
        sx={{
          borderRadius: `${tokens.chipRadius}px`,
          fontSize: 13,
          color: 'text.secondary',
          borderColor: tokens.chipBorderColor,
          bgcolor: 'background.paper',
          '& .MuiChip-label': { px: tokens.chipLabelPadding },
          height: '24px',
        }}
      />
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { borderRadius: `${tokens.popoverRadius}px`, mt: '4px' } },
        }}
      >
        <Box sx={{ p: padding, width }}>{children({ closePopover, openKey })}</Box>
      </Popover>
    </>
  );
}

export default QuickFilterChip;
