"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  // p-3 keeps this 16px icon at a 40px touch target on phones, tightening back to the
  // original compact 28px at md+ where a cursor doesn't need the extra area.
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex items-center justify-center rounded-lg p-3 text-muted transition-colors hover:bg-white/5 hover:text-foreground md:p-1.5"
    >
      {theme === "dark" ? <Sun size={16} /> : theme === "light" ? <Moon size={16} /> : null}
    </button>
  );
}
