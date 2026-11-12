// Copied from main-app src/design-system/components/ui/spinner.jsx (2026-11-12).
// Keep in sync with the app; local changes are marked "filter-bar:".
import { Loader2Icon } from 'lucide-react';
import { cn } from '../lib/utils';

/*
 * shadcn/ui Spinner: a spinning Lucide loader with a status role.
 * Size it with a size-* class (default 16px); colour follows currentColor.
 */
function Spinner({ className, ...props }) {
  return (
    <Loader2Icon
      role='status'
      aria-label='Loading'
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
