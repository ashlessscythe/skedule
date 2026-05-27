"use client";

import * as React from "react";

export type AppTheme = "day" | "night" | "corporate" | "neon" | "cyberpunk";

export const DEFAULT_APP_THEME: AppTheme = "corporate";

const STORAGE_KEY = "skedule:theme";
const THEME_CLASS_PREFIX = "theme-";
const THEME_CHANGE_EVENT = "skedule:theme-change";

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

function readStoredTheme(fallback: AppTheme): AppTheme {
  return safeParseTheme(localStorage.getItem(STORAGE_KEY)) ?? fallback;
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

/** Runs before React hydrates to avoid theme flash (see root layout). */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(STORAGE_KEY)};var d=${JSON.stringify(DEFAULT_APP_THEME)};var t=localStorage.getItem(k);var themes=${JSON.stringify(["day", "night", "corporate", "neon", "cyberpunk"])};var dark=${JSON.stringify(["night", "neon", "cyberpunk"])};if(!t||themes.indexOf(t)===-1)t=d;var r=document.documentElement;themes.forEach(function(x){r.classList.remove("theme-"+x)});r.classList.remove("dark");r.classList.add("theme-"+t);if(dark.indexOf(t)!==-1)r.classList.add("dark")}catch(e){}})();`;

export function ThemeProvider({
  children,
  defaultTheme = DEFAULT_APP_THEME,
}: {
  children: React.ReactNode;
  defaultTheme?: AppTheme;
}) {
  const theme = React.useSyncExternalStore(
    subscribeToTheme,
    () => readStoredTheme(defaultTheme),
    () => defaultTheme
  );

  React.useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    localStorage.setItem(STORAGE_KEY, nextTheme);
    applyThemeToDocument(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const ctx = React.use(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
