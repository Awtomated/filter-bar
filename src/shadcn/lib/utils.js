// Copied from main-app src/design-system/lib/utils.js (2026-11-12).
// Keep in sync with the app; local changes are marked "filter-bar:".
import { clsx } from 'clsx';
import { extendTailwindMerge, validators } from 'tailwind-merge';

// tailwind-merge only knows Tailwind's default scales. Our theme
// (src/styles/app-utilities.css) adds numeric ones: `text-14`, `shadow-2`,
// `rounded-8`, `font-600`. Without this, `text-14` reads as a text colour, so
// cn("text-14", "text-primary") would drop the size. The same goes for the
// design system's type roles (`text-title-l`, styles/theme.css).
const TYPE_ROLES = [
  'display-l',
  'display-m',
  'title-l',
  'title-m',
  'title-s',
  'body-l',
  'body-m',
  'body-s',
  'label-m',
  'label-s',
  'label-xs',
  'caption',
];

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [validators.isInteger, ...TYPE_ROLES],
      font: ['display'],
      shadow: [validators.isInteger, 'menu'],
      radius: [validators.isInteger],
      'font-weight': [validators.isInteger],
    },
  },
});

/** Joins class names (clsx syntax); later Tailwind classes override earlier ones. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
