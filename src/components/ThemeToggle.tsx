"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useStoredChoice } from "@/lib/useStoredChoice";

const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };

export function ThemeToggle() {
  const [theme, setTheme] = useStoredChoice<Theme>("theme", THEMES, "system");

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
    >
      <Icon className="size-4" />
      <span className="hidden capitalize md:inline">{theme} theme</span>
    </button>
  );
}
