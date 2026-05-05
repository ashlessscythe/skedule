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

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40",
          className
        )}
        aria-label="Select theme"
      >
        <PaletteIcon className="size-4" />
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
                  <span className="flex w-full items-center justify-between gap-3">
                    <span>{THEME_LABEL[key]}</span>
                    <span className="text-xs text-muted-foreground">{key}</span>
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

