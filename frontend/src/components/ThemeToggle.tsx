"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

function systemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  // Starts unset so the server-rendered markup never has to guess the
  // visitor's OS preference (that would risk the same kind of hydration
  // mismatch TriviaQuiz had) - the real value is read client-side on mount.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setTheme(systemTheme()), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return (
    <button
      onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="fixed right-4 bottom-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface text-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
    >
      {theme === "dark" ? <Sun size={18} /> : theme === "light" ? <Moon size={18} /> : null}
    </button>
  );
}
