// Copied from main-app src/design-system/components/ui/button.jsx (2026-11-12).
// Keep in sync with the app; local changes are marked "filter-bar:".
import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import { cn } from '../lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
      /**
       * roundness="default" → rounded-md (6 px, standard)
       * roundness="full"    → rounded-full (pill shape, as shown in Figma)
       */
      roundness: {
        default: '',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      roundness: 'default',
    },
  }
);

function ButtonSpinner({ className }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={cn('animate-spin', className)}
      aria-hidden
    >
      <path d='M21 12a9 9 0 1 1-6.219-8.56' />
    </svg>
  );
}

/**
 * Button
 *
 * Props:
 *   variant    – "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
 *   size       – "xs" | "sm" | "default" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"
 *   roundness  – "default" (rounded-md) | "full" (pill / rounded-full)
 *   loading    – shows a spinner, sets disabled + aria-busy; ignored when asChild=true
 *   asChild    – renders as the child element via Radix Slot (useful for Link buttons)
 *
 * Forwards its ref, so it works as a Radix `asChild` trigger (menus and
 * popovers anchor to the trigger's DOM node; React 18 drops refs on plain
 * function components).
 */
const Button = forwardRef(function Button(
  {
    className,
    variant = 'default',
    size = 'default',
    roundness = 'default',
    asChild = false,
    loading = false,
    disabled,
    children,
    ...props
  },
  ref
) {
  const Comp = asChild ? Slot.Root : 'button';
  const isDisabled = disabled || loading;

  return (
    <Comp
      ref={ref}
      data-slot='button'
      data-variant={variant}
      data-size={size}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, roundness, className }))}
      {...props}
    >
      {/* Slot needs exactly one child, so asChild gets no spinner slot */}
      {asChild ? (
        children
      ) : (
        <>
          {loading && <ButtonSpinner />}
          {children}
        </>
      )}
    </Comp>
  );
});

export { Button, buttonVariants };
