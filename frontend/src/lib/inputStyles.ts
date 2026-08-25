// Shared field styling for plain (non-icon) inputs/selects/textareas, so every
// form across the app shares one focus-ring/border treatment. AuthInput.tsx
// has its own variant since it also lays out a leading icon.
export const FIELD_CLASSNAME =
  "rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";
