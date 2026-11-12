import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { CheckIcon, SearchIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { Spinner } from '../ui/spinner';

// The searchable list used by every popover in the shadcn bar: the "Add
// filter" field list, a field's choices, and the operator list. Styled to
// Figma "Work-in-Progress" › Add filter menu (581:4144) / MenuItem:
//   - search: 32px, 12px radius, 1px border, 16px search icon, Text-sm
//   - rows: px 8, py 4, 6px radius, Text-sm Regular in popover-foreground
//   - the selected entry keeps a trailing check
// Keyboard: typing filters, ↑/↓ move, Enter picks, focus stays in the input
// (aria-activedescendant), so the popover has a single tab stop.
//
// `items`: [{ id, label, group?, selected? }]. Grouped lists must arrive
// sorted by group (applyGrouping in src/utils.js does this).
function MenuList({
  items,
  onSelect,
  searchable = true,
  // Focus the search (or list) when shown; off for static previews.
  autoFocus = true,
  placeholder,
  emptyText,
  loading = false,
  ariaLabel,
  className,
  itemClassName,
  selectedItemClassName,
  groupHeadingClassName,
}) {
  const baseId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Focus the search (or the list) on mount. Radix popovers would otherwise
  // focus their first tabbable element, which may be an operator header.
  useEffect(() => {
    if (autoFocus) (inputRef.current ?? listRef.current)?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => item.label.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0));
  const optionId = (index) => `${baseId}-option-${index}`;

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((activeIndex + 1) % Math.max(visible.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((activeIndex - 1 + visible.length) % Math.max(visible.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (visible[activeIndex]) onSelect(visible[activeIndex]);
    }
  }

  let body;
  if (loading) {
    body = (
      <div className='flex justify-center py-4 text-muted-foreground'>
        <Spinner />
      </div>
    );
  } else if (!visible.length) {
    body = <div className='px-2 py-4 text-center text-sm text-muted-foreground'>{emptyText}</div>;
  } else {
    let lastGroup;
    body = visible.map((item, index) => {
      const showHeading = item.group !== undefined && item.group !== lastGroup;
      const isFirst = lastGroup === undefined;
      lastGroup = item.group;
      return (
        <Fragment key={item.id}>
          {showHeading && (
            <div
              role='presentation'
              className={cn(
                'px-2 pb-1 text-caption text-muted-foreground uppercase',
                isFirst ? 'pt-1' : 'pt-2',
                groupHeadingClassName
              )}
            >
              {item.group}
            </div>
          )}
          <div
            id={optionId(index)}
            role='option'
            aria-selected={Boolean(item.selected)}
            data-active={index === activeIndex || undefined}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-popover-foreground outline-none select-none data-[active]:bg-accent data-[active]:text-accent-foreground',
              itemClassName,
              item.selected && selectedItemClassName
            )}
            // Focus stays in the search input (aria-activedescendant); rows
            // are still reachable on their own for assistive tech.
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(item);
              }
            }}
            onMouseMove={() => setActive(index)}
            // Keep focus in the search input while clicking a row.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(item)}
          >
            <span className='min-w-0 flex-1 truncate'>{item.label}</span>
            {item.selected && <CheckIcon aria-hidden className='size-4 shrink-0 text-primary' />}
          </div>
        </Fragment>
      );
    });
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {searchable && (
        <div className='p-1'>
          <div className='flex h-8 items-center gap-2 rounded-xl border border-border bg-background px-2.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50'>
            <SearchIcon aria-hidden className='size-4 shrink-0 text-muted-foreground' />
            <input
              // Radix focuses the first focusable element when the popover opens.
              ref={inputRef}
              autoComplete='off'
              role='combobox'
              aria-expanded='true'
              aria-controls={`${baseId}-list`}
              aria-activedescendant={visible.length && !loading ? optionId(activeIndex) : undefined}
              aria-label={ariaLabel ?? placeholder}
              placeholder={placeholder}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={handleKeyDown}
              className='min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground'
            />
          </div>
        </div>
      )}
      <div
        ref={searchable ? undefined : listRef}
        id={`${baseId}-list`}
        role='listbox'
        aria-label={ariaLabel ?? placeholder}
        tabIndex={searchable ? -1 : 0}
        onKeyDown={searchable ? undefined : handleKeyDown}
        className='flex max-h-72 flex-col overflow-y-auto outline-none'
      >
        {body}
      </div>
    </div>
  );
}

export default MenuList;
