// Class strings shared by the bar and the playground's design check, so both
// render exactly the same element. Values from Figma "Work-in-Progress":
// Filter chip row (581:3673) and Add filter menu (581:4144).
//
// Everything sets its own size, line height and letter spacing: main-app's
// reset gives <button>/<input> 16px and its body has 0.17px letter spacing,
// which would otherwise leak into the bar.

// Popover surface (Box Shadow/menu): popover background, 8px padding and
// radius, the menu shadow (it draws its own 1px ring, so no border). Text
// inside uses Figma's tracking/normal.
export const POPOVER_CLASS = 'w-auto rounded-lg border-0 p-2 shadow-menu tracking-normal';

// "+ Add filter": 28px, px 10, gap 4, radius 8 (the app's rounded-lg), muted
// fill, Text-xs Medium (12/16/500), 16px icon.
export const ADD_FILTER_CLASS =
  'h-7 gap-1 rounded-lg bg-muted px-2.5 text-xs font-medium tracking-normal text-foreground hover:bg-muted/80 has-[>svg]:px-2.5 [&_svg:not([class*=size-])]:size-4';

// "Clear all": same size and text, no fill.
export const CLEAR_ALL_CLASS =
  'h-7 rounded-lg px-2.5 text-xs font-medium tracking-normal text-foreground hover:bg-muted';
