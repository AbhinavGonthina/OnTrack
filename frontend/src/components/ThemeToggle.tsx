"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
    >
      {theme === "dark" ? <Sun size={16} /> : theme === "light" ? <Moon size={16} /> : null}
    </button>
  );
}
