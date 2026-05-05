"use client";

import * as React from "react";

export type AppTheme = "day" | "night" | "corporate" | "neon" | "cyberpunk";

const STORAGE_KEY = "skedule:theme";
const THEME_CLASS_PREFIX = "theme-";

const DARK_THEMES = new Set<AppTheme>(["night", "neon", "cyberpunk"]);

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyThemeToDocument(theme: AppTheme) {
  const root = document.documentElement;

  // Remove any prior theme-* class and dark mode toggle first.
  const toRemove: string[] = [];
  root.classList.forEach((c) => {
    if (c.startsWith(THEME_CLASS_PREFIX)) toRemove.push(c);
  });
  toRemove.forEach((c) => root.classList.remove(c));
  root.classList.remove("dark");

  root.classList.add(`${THEME_CLASS_PREFIX}${theme}`);
  if (DARK_THEMES.has(theme)) root.classList.add("dark");
}

function safeParseTheme(v: string | null): AppTheme | null {
  if (!v) return null;
  if (v === "day") return "day";
  if (v === "night") return "night";
  if (v === "corporate") return "corporate";
  if (v === "neon") return "neon";
  if (v === "cyberpunk") return "cyberpunk";
  return null;
}

export function ThemeProvider({
  children,
  defaultTheme = "day",
}: {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
}) {
  const [theme, setThemeState] = React.useState<AppTheme>(() => {
    const stored =
      typeof window === "undefined"
        ? null
        : safeParseTheme(localStorage.getItem(STORAGE_KEY));
    return stored ?? defaultTheme;
  });

  React.useEffect(() => {
    applyThemeToDocument(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = React.use(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

