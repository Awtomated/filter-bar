import { forwardRef } from 'react';
import { ListFilterIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';

// Controlled show/hide button for the filter bar; the caller owns the state.
// Same props as the MUI version (`active`, `onClick`, `icon`, `tooltip`,
// `className`, other button props), plus:
//   - `label`: shows a labelled button ("Filter", or "Filter · 3" with
//     `count`), as in the Figma toolbar; without it, an icon-only button.
//   - `count`: number of active filters, appended to the label.
const FilterToggleButton = forwardRef(function FilterToggleButton(
  { active = false, onClick, icon, tooltip = 'Filter', label, count = 0, className, ...props },
  ref
) {
  const text = label && count > 0 ? `${label} · ${count}` : label;
  return (
    <Button
      ref={ref}
      type='button'
      variant={label && active ? 'secondary' : 'outline'}
      size={label ? 'sm' : 'icon-sm'}
      aria-pressed={active}
      aria-label={label ? undefined : tooltip}
      title={tooltip}
      onClick={onClick}
      className={cn(
        // Figma toolbar button: 32px, px 10, gap 4, radius 12, Text-sm Medium.
        label ? 'gap-1 rounded-xl px-2.5 tracking-normal has-[>svg]:px-2.5' : 'rounded-lg',
        !label && active && 'border-primary text-primary hover:text-primary',
        className
      )}
      {...props}
    >
      {icon ?? <ListFilterIcon aria-hidden />}
      {text && <span>{text}</span>}
    </Button>
  );
});

export default FilterToggleButton;
