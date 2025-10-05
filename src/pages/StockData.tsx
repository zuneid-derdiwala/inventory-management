"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";


const StockData = () => {
  const { database, isLoadingData } = useData();
  
  // Initialize state from localStorage or defaults
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedModel') || "all";
  });
  const [selectedBrand, setSelectedBrand] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedBrand') || "all";
  });
  const [selectedUsername, setSelectedUsername] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedUsername') || "all";
  });

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('stockData_selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedBrand', selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedUsername', selectedUsername);
  }, [selectedUsername]);

  // First filter the database entries based on the selected filters
  const filteredEntries = useMemo(() => {
    return database.filter(entry => {
      // Only consider entries that are currently in stock (inward but not outward)
      if (!entry.imei || !entry.model || !entry.inwardDate || entry.outwardDate) {
        return false;
      }

      // Check model filter
      if (selectedModel !== "all" && entry.model !== selectedModel) {
        return false;
      }

      // Check brand filter
      if (selectedBrand !== "all" && entry.brand !== selectedBrand) {
        return false;
      }

      // Check username filter
      if (selectedUsername !== "all" && entry.bookingPerson !== selectedUsername) {
        return false;
      }

      return true;
    });
  }, [database, selectedModel, selectedBrand, selectedUsername]);

  // Calculate stock from filtered entries
  const inStockItems = useMemo(() => {
    const modelStockMap = new Map<string, number>();

    filteredEntries.forEach(entry => {
      if (entry.model) {
        modelStockMap.set(entry.model, (modelStockMap.get(entry.model) || 0) + 1);
      }
    });

    return Array.from(modelStockMap.entries()).map(([model, stock]) => ({ model, stock }));
  }, [filteredEntries]);

  const totalUnitStock = inStockItems.reduce((sum, item) => sum + item.stock, 0);

  // For display purposes, we can use inStockItems directly since it's already filtered
  const filteredStock = inStockItems;

  // Get unique options for filters
  const availableModels = useMemo(() => {
    const models = new Set<string>();
    database.forEach(entry => {
      if (entry.model) models.add(entry.model);
    });
    return Array.from(models).sort();
  }, [database]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    database.forEach(entry => {
      if (entry.brand) brands.add(entry.brand);
    });
    return Array.from(brands).sort();
  }, [database]);

  const availableUsernames = useMemo(() => {
    const usernames = new Set<string>();
    database.forEach(entry => {
      if (entry.bookingPerson) usernames.add(entry.bookingPerson);
    });
    return Array.from(usernames).sort();
  }, [database]);

  const clearFilters = () => {
    setSelectedModel("all");
    setSelectedBrand("all");
    setSelectedUsername("all");
    // Clear localStorage as well
    localStorage.removeItem('stockData_selectedModel');
    localStorage.removeItem('stockData_selectedBrand');
    localStorage.removeItem('stockData_selectedUsername');
  };

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

          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Filter Stock</Label>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="model-filter">Filter by Model</Label>
                <SearchableSelect
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  options={availableModels}
                  placeholder="Select model"
                  searchPlaceholder="Search models..."
                  emptyText="No models found."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand-filter">Filter by Brand</Label>
                <SearchableSelect
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                  options={availableBrands}
                  placeholder="Select brand"
                  searchPlaceholder="Search brands..."
                  emptyText="No brands found."
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username-filter">Filter by Username</Label>
                <SearchableSelect
                  value={selectedUsername}
                  onValueChange={setSelectedUsername}
                  options={availableUsernames}
                  placeholder="Select username"
                  searchPlaceholder="Search usernames..."
                  emptyText="No usernames found."
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">In-Stock Details</h3>
              {(selectedModel !== "all" || selectedBrand !== "all" || selectedUsername !== "all") && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredStock.length} items
                </div>
              )}
            </div>
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
              <p className="text-muted-foreground">No stock items found matching your filters.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockData;