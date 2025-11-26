"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  maxDisplay?: number; // Maximum number of selected items to display before showing "+X more"
}

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  maxDisplay = 2,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (option: string) => {
    if (option === "all") {
      // Toggle "All" - if all are selected, clear; otherwise select all
      if (value.length === options.length) {
        onValueChange([]);
      } else {
        onValueChange([...options]);
      }
    } else {
      // Toggle individual option
      const newValue = value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option];
      onValueChange(newValue);
    }
  };

  const handleRemove = (option: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== option));
  };

  const isAllSelected = value.length === options.length && options.length > 0;

  // For badge display
  const displayBadges = value.slice(0, maxDisplay);
  const remainingCount = value.length - maxDisplay;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-10 h-auto py-2 px-3 text-left", className)}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 items-center min-w-0 overflow-hidden">
            {value.length === 0 ? (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            ) : (
              <>
                {displayBadges.map((option) => (
                  <Badge
                    key={option}
                    variant="secondary"
                    className="cursor-default shrink-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <span className="max-w-[120px] truncate">{option}</span>
                    <button
                      type="button"
                      className="ml-1.5 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted -mr-0.5"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemove(option, e as any);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => handleRemove(option, e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  </Badge>
                ))}
                {remainingCount > 0 && (
                  <Badge variant="secondary" className="shrink-0">
                    +{remainingCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => handleSelect("all")}
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isAllSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span>Select All</span>
                </div>
              </CommandItem>
              {options.map((option) => {
                const isSelected = value.includes(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => handleSelect(option)}
                  >
                    <div className="flex items-center w-full">
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{option}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

