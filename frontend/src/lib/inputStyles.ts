// Shared field styling for plain (non-icon) inputs/selects/textareas, so every
// form across the app shares one focus-ring/border treatment. AuthInput.tsx
// has its own variant since it also lays out a leading icon.
export const FIELD_CLASSNAME =
  "rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

// Roomier, recessed variant used by the application create/edit form. Kept separate from
// FIELD_CLASSNAME rather than replacing it so this doesn't restyle every other form in the
// app (auth, notes, feedback, profile) as a side effect.
//
// bg-background rather than bg-surface is what makes the field read as an inset well: the
// page background is a step darker than a card in dark mode, and a step darker than the card
// in light mode too, so the same token gives the recessed look on both themes.
export const FIELD_CLASSNAME_ROOMY =
  "rounded-xl border border-surface-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-all placeholder:text-muted focus:border-brand/50 focus:ring-1 focus:ring-brand/20";
