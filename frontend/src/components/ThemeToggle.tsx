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
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-brand/10 hover:text-foreground"
    >
      {theme === "dark" ? <Sun size={16} /> : theme === "light" ? <Moon size={16} /> : null}
    </button>
  );
}
