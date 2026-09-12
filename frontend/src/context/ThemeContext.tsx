"use client";

import { createContext, ReactNode, useContext, useState } from "react";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE_SECONDS, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * The chosen theme is persisted in a cookie rather than React state alone, so it survives a
 * refresh, and rather than localStorage, which SPEC.md rules out.
 *
 * <p>The cookie is read by the root layout on the server and handed back here as
 * {@code initialTheme}, which is what avoids a flash of the wrong palette: the correct
 * `data-theme` is already on `<html>` in the first byte of HTML, so there is no moment where
 * dark renders and then flips to light. That is also why this no longer starts as null and
 * resolves in an effect, which is what the old `prefers-color-scheme` version had to do.
 *
 * <p>Not `Secure`, deliberately: local development is plain http and the cookie would silently
 * never be set there. It holds nothing sensitive. `SameSite=Lax` because nothing cross-site
 * needs to read it.
 */
export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // Applied directly as well as written to the cookie: the cookie only takes effect on the
    // next server render, and the toggle has to look instant.
    document.documentElement.setAttribute("data-theme", next);
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
