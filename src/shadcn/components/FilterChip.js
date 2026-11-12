import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { PlusIcon, XIcon } from 'lucide-react';
import { cn } from '../lib/utils';

// Linear-style filter chip, Figma "Work-in-Progress" › Filter chip (581:3673):
// a pill (radius full, 1px border, px 10, py 4, 6px gap) with
// [icon] Field  operator  Value  ×  in Body M; the operator in
// muted-foreground. Applied filters have a solid border; a filter that isn't
// applied yet (a main filter with no value, or a field just added with
// "Add filter") has a dashed border and reads "+ Field".
//
// Click targets: the field/value open the value popover, the operator word
// opens the operator menu (when there's more than one operator), × clears.
const chipVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-body-m whitespace-nowrap transition-colors data-[open=true]:border-primary',
  {
    variants: {
      applied: {
        true: 'border-solid border-border text-foreground',
        false: 'border-dashed border-border text-muted-foreground hover:text-foreground',
      },
    },
    defaultVariants: { applied: false },
  }
);

// text-body-m again on each part: main-app's reset sets <button> to 16px.
const partClass =
  'inline-flex min-w-0 text-body-m items-center gap-1.5 rounded-sm outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-ring/50';

const FilterChip = forwardRef(function FilterChip(
  {
    label,
    icon,
    applied = false,
    operatorText,
    valueText,
    pending = false,
    canChangeOperator = false,
    open = false,
    onOpenValue,
    onOpenOperator,
    onClear,
    clearLabel = 'Clear filter',
    className,
    operatorClassName,
    valueClassName,
  },
  ref
) {
  return (
    <div
      ref={ref}
      data-slot='filter-chip'
      data-state={applied ? 'applied' : 'empty'}
      data-open={open}
      className={cn(chipVariants({ applied }), className)}
    >
      {applied ? (
        <>
          <button type='button' className={partClass} onClick={onOpenValue}>
            {icon && <span className='inline-flex shrink-0 [&_svg]:size-3.5'>{icon}</span>}
            <span>{label}</span>
          </button>
          {operatorText &&
            (canChangeOperator ? (
              <button
                type='button'
                onClick={onOpenOperator}
                className={cn(
                  partClass,
                  'text-muted-foreground hover:text-foreground',
                  operatorClassName
                )}
              >
                {operatorText}
              </button>
            ) : (
              <span className={cn('text-muted-foreground', operatorClassName)}>{operatorText}</span>
            ))}
          {valueText && (
            <button
              type='button'
              title={valueText}
              aria-busy={pending || undefined}
              onClick={onOpenValue}
              className={cn(
                partClass,
                'block max-w-60 truncate',
                pending && 'text-muted-foreground',
                valueClassName
              )}
            >
              {valueText}
            </button>
          )}
        </>
      ) : (
        <button type='button' className={partClass} onClick={onOpenValue}>
          <PlusIcon aria-hidden className='size-3.5 shrink-0' />
          <span>{label}</span>
        </button>
      )}
      {onClear && (
        <button
          type='button'
          aria-label={`${clearLabel}: ${label}`}
          onClick={onClear}
          className='inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50'
        >
          <XIcon aria-hidden className='size-3.5' />
        </button>
      )}
    </div>
  );
});

export { FilterChip, chipVariants };
