"use client";

import * as React from "react";
import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDownIcon, SearchIcon, CheckIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTOR_GROUPS } from "@/lib/constants";
import type { SectorGroup } from "@/lib/constants";

interface SectorComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Show group-level items as selectable options (for classements dual view) */
  allowGroupSelection?: boolean;
}

/** Find the label for a given sector/sub-sector value */
function findLabel(value: string): string {
  for (const group of SECTOR_GROUPS) {
    if (group.value === value) return group.label;
    for (const sub of group.subSectors) {
      if (sub.value === value) return sub.label;
    }
  }
  return "";
}

/** Find which group a sub-sector belongs to */
export function findParentGroup(subSectorValue: string): SectorGroup | undefined {
  return SECTOR_GROUPS.find(
    (g) =>
      g.value === subSectorValue ||
      g.subSectors.some((s) => s.value === subSectorValue)
  );
}

export function SectorCombobox({
  value,
  onValueChange,
  placeholder = "Rechercher un secteur...",
  disabled = false,
  className,
  allowGroupSelection = false,
}: SectorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  // Filter groups and sub-sectors based on search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return SECTOR_GROUPS;

    return SECTOR_GROUPS.map((group) => {
      const groupMatches = group.label.toLowerCase().includes(q);
      const matchingSubs = group.subSectors.filter((s) =>
        s.label.toLowerCase().includes(q)
      );

      if (groupMatches) return group; // Show entire group if group name matches
      if (matchingSubs.length > 0) {
        return { ...group, subSectors: matchingSubs };
      }
      return null;
    }).filter(Boolean) as SectorGroup[];
  }, [search]);

  const selectedLabel = value ? findLabel(value) : "";

  function handleSelect(val: string) {
    onValueChange(val);
    setOpen(false);
    setSearch("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onValueChange("");
    setSearch("");
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none h-8",
          "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selectedLabel && "text-muted-foreground"
        )}
      >
        <span className="flex-1 text-left truncate">
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-muted transition-colors"
            >
              <XIcon className="size-3 text-muted-foreground" />
            </span>
          )}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <SearchIcon className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Taper pour filtrer..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoComplete="off"
            />
          </div>

          {/* Results */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun secteur trouve.
              </p>
            ) : (
              filtered.map((group) => (
                <div key={group.value} className="scroll-my-1 p-1">
                  {allowGroupSelection ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(group.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer",
                        value === group.value
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {value === group.value && (
                        <CheckIcon className="size-3 shrink-0" />
                      )}
                      {group.label}
                    </button>
                  ) : (
                    <div className="px-1.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.label}
                    </div>
                  )}
                  {group.subSectors.map((sub) => (
                    <button
                      key={sub.value}
                      type="button"
                      onClick={() => handleSelect(sub.value)}
                      className={cn(
                        "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pr-8 pl-3 text-sm outline-hidden select-none transition-colors cursor-pointer",
                        value === sub.value
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="flex-1 text-left">{sub.label}</span>
                      {value === sub.value && (
                        <CheckIcon className="absolute right-2 size-4" />
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
