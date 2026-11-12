import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { PlusIcon } from 'lucide-react';
import { FilterChip, FilterToggleButton } from '../src/shadcn';
import MenuList from '../src/shadcn/components/MenuList';
import { Button } from '../src/shadcn/ui/button';
import { cn } from '../src/shadcn/lib/utils';
import { ADD_FILTER_CLASS, CLEAR_ALL_CLASS, POPOVER_CLASS } from '../src/shadcn/styles';

// Renders the shadcn bar's real components (same classes as the bar) inside
// this page — which carries main-app's global CSS — and compares their
// computed styles with the Figma spec. Colours are compared with the app's
// tokens (tokens.css), which win over Figma's hex where they differ slightly.
//
// Figma "Work-in-Progress": Filter chip row 581:3673, Add filter menu
// 581:4144, toolbar Filter button 354:72925.

const tok = (name) => ({ token: name });

const SPEC = [
  {
    name: 'Chip (applied) — container',
    sel: '[data-check=chip-applied]',
    checks: {
      height: '30px',
      'border-top-style': 'solid',
      'border-top-width': '1px',
      'border-top-color': tok('--border'),
      'border-top-left-radius': '9999px',
      'padding-top': '4px',
      'padding-left': '10px',
      'column-gap': '6px',
      'background-color': tok('--background'),
    },
  },
  {
    name: 'Chip — field label (Body M)',
    sel: '[data-check=chip-applied] button:nth-of-type(1)',
    checks: {
      'font-family': 'Inter',
      'font-size': '14px',
      'line-height': '20px',
      'font-weight': '400',
      'letter-spacing': '0px',
      color: tok('--foreground'),
    },
  },
  {
    name: 'Chip — operator',
    sel: '[data-check=chip-applied] button:nth-of-type(2)',
    checks: { 'font-size': '14px', 'line-height': '20px', color: tok('--muted-foreground') },
  },
  {
    name: 'Chip — value',
    sel: '[data-check=chip-applied] button:nth-of-type(3)',
    checks: { 'font-size': '14px', 'font-weight': '400', color: tok('--foreground') },
  },
  {
    name: 'Chip — clear ×',
    sel: '[data-check=chip-applied] button:nth-of-type(4) svg',
    checks: { width: '14px', color: tok('--muted-foreground') },
  },
  {
    name: 'Chip (not applied) — dashed',
    sel: '[data-check=chip-empty]',
    checks: {
      height: '30px',
      'border-top-style': 'dashed',
      'border-top-color': tok('--border'),
      color: tok('--muted-foreground'),
    },
  },
  {
    name: 'Chip (not applied) — "+ Field" text',
    sel: '[data-check=chip-empty] button',
    checks: { 'font-size': '14px', 'line-height': '20px', 'letter-spacing': '0px' },
  },
  {
    name: '+ Add filter (Text-xs Medium)',
    sel: '[data-check=add-filter]',
    checks: {
      height: '28px',
      'padding-left': '10px',
      'column-gap': '4px',
      'border-top-left-radius': '8px',
      'background-color': tok('--muted'),
      'font-family': 'Inter',
      'font-size': '12px',
      'line-height': '16px',
      'font-weight': '500',
      'letter-spacing': '0px',
      color: tok('--foreground'),
    },
  },
  { name: '+ Add filter — icon', sel: '[data-check=add-filter] svg', checks: { width: '16px' } },
  {
    name: 'Clear all',
    sel: '[data-check=clear-all]',
    checks: {
      height: '28px',
      'padding-left': '10px',
      'font-size': '12px',
      'line-height': '16px',
      'font-weight': '500',
      'letter-spacing': '0px',
      'background-color': 'rgba(0, 0, 0, 0)',
      color: tok('--foreground'),
    },
  },
  {
    name: 'Menu — surface',
    sel: '[data-check=menu]',
    checks: {
      'border-top-left-radius': '8px',
      'padding-top': '8px',
      'padding-left': '8px',
      'background-color': tok('--popover'),
    },
  },
  {
    name: 'Menu — search field',
    sel: '[data-check=menu] [role=combobox]',
    parent: true,
    checks: {
      height: '32px',
      'border-top-left-radius': '12px',
      'border-top-width': '1px',
      'border-top-color': tok('--border'),
      'padding-left': '10px',
      'column-gap': '8px',
      'background-color': tok('--background'),
    },
  },
  {
    name: 'Menu — search text (Text-sm)',
    sel: '[data-check=menu] [role=combobox]',
    checks: {
      'font-size': '14px',
      'line-height': '20px',
      'letter-spacing': '0px',
      color: tok('--foreground'),
    },
  },
  {
    name: 'Menu — row (Text-sm Regular)',
    sel: '[data-check=menu] [role=option]',
    checks: {
      'font-family': 'Inter',
      'font-size': '14px',
      'line-height': '20px',
      'font-weight': '400',
      'letter-spacing': '0px',
      'padding-top': '4px',
      'padding-left': '8px',
      'border-top-left-radius': '6px',
      color: tok('--popover-foreground'),
    },
  },
  {
    name: 'Menu — selected check',
    sel: '[data-check=menu] [role=option][aria-selected=true] svg',
    checks: { width: '16px', color: tok('--primary') },
  },
  {
    name: 'Filter button (toolbar, active)',
    sel: '[data-check=toggle]',
    checks: {
      height: '32px',
      'border-top-left-radius': '12px',
      'padding-left': '10px',
      'font-size': '14px',
      'line-height': '20px',
      'font-weight': '500',
      'letter-spacing': '0px',
      'background-color': tok('--secondary'),
      color: tok('--secondary-foreground'),
    },
  },
];

function resolveToken(root, name) {
  const probe = document.createElement('span');
  probe.style.color = `var(${name})`;
  root.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function normalize(prop, value) {
  if (prop === 'letter-spacing' && value === 'normal') return '0px';
  if (prop === 'font-family') return value.split(',')[0].replace(/["']/g, '').trim();
  return value;
}

function toHex(rgb) {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb);
  if (!m) return rgb;
  if (m[4] === '0') return 'transparent';
  return `#${[m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
}

function measure(root) {
  return SPEC.map((spec) => {
    let el = root.querySelector(spec.sel);
    if (el && spec.parent) el = el.parentElement;
    const style = el ? getComputedStyle(el) : null;
    const checks = Object.entries(spec.checks).map(([prop, expected]) => {
      const want = typeof expected === 'object' ? resolveToken(root, expected.token) : expected;
      const actual = style ? normalize(prop, style.getPropertyValue(prop)) : 'missing';
      const isColor = /color/.test(prop);
      return {
        prop,
        expected: isColor
          ? `${typeof expected === 'object' ? `${expected.token} ` : ''}${toHex(want)}`
          : want,
        actual: isColor ? toHex(actual) : actual,
        ok: actual === want,
      };
    });
    return { name: spec.name, checks };
  });
}

export default function DesignCheck({ mode }) {
  const rootRef = useRef(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let active = true;
    const run = () => active && rootRef.current && setResults(measure(rootRef.current));
    // After the parent has switched the `.dark` class (its effect runs after
    // this one) and the components' 150ms colour transitions have finished.
    const timer = setTimeout(run, 400);
    // Re-measure once Inter has loaded (font-family is resolved either way,
    // but metrics such as height can shift).
    document.fonts?.ready.then(run);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode]);

  const all = results.flatMap((r) => r.checks);
  const failed = all.filter((c) => !c.ok);

  return (
    <Stack spacing={2}>
      <Typography variant='body2' color='text.secondary'>
        The shadcn bar's own components, rendered with main-app's global CSS (reset, app-base.css,
        tokens, type roles, Inter), measured live and compared with the Figma spec. Colours are
        checked against the app's tokens. Toggle dark theme to re-check the dark tokens.
      </Typography>

      <div
        ref={rootRef}
        className='flex flex-col gap-4 rounded-lg border border-border bg-background p-4'
      >
        <div className='flex flex-wrap items-center gap-2'>
          <FilterToggleButton data-check='toggle' active label='Filter' count={3} />
          <FilterChip
            applied
            label='Owner'
            operatorText='is'
            valueText='Paul Becker'
            canChangeOperator
            onOpenValue={() => {}}
            onOpenOperator={() => {}}
            onClear={() => {}}
            ref={(node) => node?.setAttribute('data-check', 'chip-applied')}
          />
          <FilterChip
            label='Status'
            onOpenValue={() => {}}
            ref={(node) => node?.setAttribute('data-check', 'chip-empty')}
          />
          <Button variant='ghost' data-check='add-filter' className={ADD_FILTER_CLASS}>
            <PlusIcon aria-hidden />
            Add filter
          </Button>
          <Button variant='ghost' data-check='clear-all' className={CLEAR_ALL_CLASS}>
            Clear all
          </Button>
        </div>
        <div
          data-check='menu'
          className={cn('bg-popover text-popover-foreground', POPOVER_CLASS, 'w-64')}
        >
          <MenuList
            autoFocus={false}
            placeholder='Filter by…'
            emptyText='No matches found'
            items={[
              { id: 1, label: 'Project manager' },
              { id: 2, label: 'Deal', selected: true },
              { id: 3, label: 'Language pair' },
            ]}
            onSelect={() => {}}
          />
        </div>
      </div>

      {results.length > 0 &&
        (failed.length ? (
          <Alert severity='warning'>
            {failed.length} of {all.length} checks differ from the spec (rows marked ✗).
          </Alert>
        ) : (
          <Alert severity='success'>
            All {all.length} checks match the Figma spec and the app's tokens.
          </Alert>
        ))}

      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>Element</TableCell>
            <TableCell>Property</TableCell>
            <TableCell>Expected</TableCell>
            <TableCell>Rendered</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {results.flatMap((row) =>
            row.checks.map((check, i) => (
              <TableRow key={`${row.name}-${check.prop}`}>
                <TableCell sx={{ whiteSpace: 'nowrap', fontWeight: i === 0 ? 600 : 400 }}>
                  {i === 0 ? row.name : ''}
                </TableCell>
                <TableCell>
                  <code>{check.prop}</code>
                </TableCell>
                <TableCell>
                  <code>{check.expected}</code>
                </TableCell>
                <TableCell>
                  <code>{check.actual}</code>
                </TableCell>
                <TableCell>
                  <Chip
                    size='small'
                    label={check.ok ? '✓' : '✗'}
                    color={check.ok ? 'success' : 'error'}
                    variant='outlined'
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Stack>
  );
}
