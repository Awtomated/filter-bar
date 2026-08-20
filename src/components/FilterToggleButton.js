// Named (root-barrel) import — see the note in QuickFilterChip.js about why
// this must not be a deep `@mui/material/IconButton`-style import.
import { IconButton, Tooltip } from '@mui/material';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';

// Standalone, controlled filter-toggle button — the caller owns the
// open/closed state (e.g. from its own table context) and passes it in via
// `active`/`onClick`; this component has no knowledge of where that state
// lives.
function FilterToggleButton({
  active,
  onClick,
  icon,
  tooltip = 'Filter',
  size = 'small',
  sx,
  ...iconButtonProps
}) {
  return (
    <Tooltip title={tooltip}>
      <IconButton
        onClick={onClick}
        size={size}
        sx={{
          border: '1px solid',
          borderColor: active ? 'primary.main' : 'divider',
          borderRadius: '8px',
          color: active ? 'primary.main' : 'text.secondary',
          p: '8px',
          ...sx,
        }}
        {...iconButtonProps}
      >
        {icon ?? <FilterAltOutlinedIcon fontSize='small' />}
      </IconButton>
    </Tooltip>
  );
}

export default FilterToggleButton;
