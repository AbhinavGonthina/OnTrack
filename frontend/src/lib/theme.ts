export type Theme = "light" | "dark";

export const THEME_COOKIE = "ontrack-theme";

/**
 * Dark unless the visitor has chosen otherwise.
 *
 * Deliberately not the OS preference. This used to read `prefers-color-scheme`, which meant a
 * first-time visitor on a light-mode machine landed on the light palette, even though the whole
 * product is designed dark-first and every screenshot on the landing page is dark.
 */
export const DEFAULT_THEME: Theme = "dark";

/** A year: long enough that the choice effectively sticks, short enough to eventually expire. */
export const THEME_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : DEFAULT_THEME;
}
