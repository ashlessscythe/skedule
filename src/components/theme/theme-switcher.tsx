"use client";

import * as React from "react";
import { PaletteIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type AppTheme, useTheme } from "./theme-provider";

const THEME_LABEL: Record<AppTheme, string> = {
  day: "Day",
  night: "Night",
  corporate: "Corporate",
  neon: "Neon",
  cyberpunk: "Cyberpunk",
};

const THEME_SWATCH: Record<AppTheme, string> = {
  day: "linear-gradient(135deg, oklch(0.82 0.14 55), oklch(0.78 0.12 230), oklch(0.8 0.13 310))",
  night: "linear-gradient(135deg, oklch(0.55 0.2 280), oklch(0.5 0.18 250), oklch(0.48 0.16 200))",
  corporate:
    "linear-gradient(135deg, oklch(0.55 0.14 262), oklch(0.7 0.1 220), oklch(0.65 0.08 250))",
  neon: "linear-gradient(135deg, oklch(0.65 0.28 312), oklch(0.62 0.24 195), oklch(0.58 0.22 280))",
  cyberpunk:
    "linear-gradient(135deg, oklch(0.68 0.28 324), oklch(0.65 0.24 195), oklch(0.7 0.22 55))",
};

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "relative overflow-hidden bg-background/60 ring-1 ring-primary/20 backdrop-blur supports-[backdrop-filter]:bg-background/40",
          className
        )}
        aria-label="Select theme"
      >
        <span
          className="absolute inset-0 opacity-40"
          style={{ background: THEME_SWATCH[theme] }}
          aria-hidden
        />
        <PaletteIcon className="relative size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={theme}
            onValueChange={(v) => setTheme(v as AppTheme)}
          >
            {Object.keys(THEME_LABEL).map((k) => {
              const key = k as AppTheme;
              return (
                <DropdownMenuRadioItem key={key} value={key}>
                  <span className="flex w-full items-center gap-3">
                    <span
                      className="size-5 shrink-0 rounded-md ring-1 ring-foreground/15 shadow-sm"
                      style={{ background: THEME_SWATCH[key] }}
                      aria-hidden
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span>{THEME_LABEL[key]}</span>
                      <span className="text-xs text-muted-foreground">{key}</span>
                    </span>
                  </span>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

