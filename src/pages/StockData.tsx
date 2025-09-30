"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

interface StockItem {
  model: string;
  stock: number;
}

const StockData = () => {
  const { database, availableBrands, availableBookingPersons, isLoadingData } = useData();
  const [searchQuery, setSearchQuery] = useState("");
  const [open, setOpen] = useState(false); // State for popover open/close

  const inStockItems = useMemo(() => {
    const modelStockMap = new Map<string, number>();

    database.forEach(entry => {
      // Only consider entries that are currently in stock (inward but not outward)
      if (entry.imei && entry.model && entry.inwardDate && !entry.outwardDate) {
        modelStockMap.set(entry.model, (modelStockMap.get(entry.model) || 0) + 1);
      }
    });

    return Array.from(modelStockMap.entries()).map(([model, stock]) => ({ model, stock }));
  }, [database]);

  const totalUnitStock = inStockItems.reduce((sum, item) => sum + item.stock, 0);

  const filteredStock = inStockItems.filter(item => {
    const query = searchQuery.toLowerCase();
    if (!query) return true; // Show all if search query is empty

    // Check if the item's model matches the query
    if (item.model.toLowerCase().includes(query)) {
      return true;
    }

    // Check if any entry associated with this model matches by brand or booking person
    return database.some(entry =>
      entry.model.toLowerCase() === item.model.toLowerCase() &&
      (entry.brand.toLowerCase().includes(query) ||
       entry.bookingPerson.toLowerCase().includes(query))
    );
  });

  // Suggestions for the search box
  const searchSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    database.forEach(entry => {
      if (entry.model) suggestions.add(entry.model);
      if (entry.brand) suggestions.add(entry.brand);
      // Removed IMEI from suggestions
      if (entry.bookingPerson) suggestions.add(entry.bookingPerson);
    });
    const query = searchQuery.toLowerCase();
    return Array.from(suggestions).filter(s => s.toLowerCase().includes(query)).sort();
  }, [database, searchQuery]);

  if (isLoadingData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="uppercase text-center">Stock Data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="mt-4">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full mt-2" />
              <Skeleton className="h-12 w-full mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="uppercase text-center">Stock Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="font-bold">Total Unit Stock: {totalUnitStock}</div>

          <div className="grid gap-2">
            <Label htmlFor="search">Search Stock</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOpen(true); // Open popover on change
                  }}
                  placeholder="Search by Model, Brand, or Booking Person" // Updated placeholder
                />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Search suggestions..." value={searchQuery} onValueChange={setSearchQuery} />
                  <CommandEmpty>No suggestions found.</CommandEmpty>
                  <CommandGroup>
                    {searchSuggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion}
                        onSelect={() => {
                          setSearchQuery(suggestion);
                          setOpen(false); // Close popover on select
                        }}
                      >
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">In-Stock Details</h3>
            {filteredStock.length > 0 ? (
              <ul className="grid gap-2">
                {filteredStock.map((item, index) => (
                  <li key={index} className="flex justify-between items-center p-2 border rounded-md">
                    <span className="font-medium">{item.model}</span>
                    <span className="text-muted-foreground">Stock: {item.stock}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No stock items found matching your search.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockData;