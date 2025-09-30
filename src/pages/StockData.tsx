"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";


const StockData = () => {
  const { database, isLoadingData } = useData();
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedUsername, setSelectedUsername] = useState<string>("all");

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
    // If all filters are set to "all", show all items
    if (selectedModel === "all" && selectedBrand === "all" && selectedUsername === "all") {
      return true;
    }

    // Check model filter
    if (selectedModel !== "all" && item.model !== selectedModel) {
      return false;
    }

    // Check brand filter
    if (selectedBrand !== "all") {
      const hasBrandMatch = database.some(entry =>
        entry.model === item.model && entry.brand === selectedBrand
      );
      if (!hasBrandMatch) {
        return false;
      }
    }

    // Check username filter
    if (selectedUsername !== "all") {
      const hasUsernameMatch = database.some(entry =>
        entry.model === item.model && entry.bookingPerson === selectedUsername
      );
      if (!hasUsernameMatch) {
        return false;
      }
    }

    return true;
  });

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
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="brand-filter">Filter by Brand</Label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {availableBrands.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username-filter">Filter by Username</Label>
                <Select value={selectedUsername} onValueChange={setSelectedUsername}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select username" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Usernames</SelectItem>
                    {availableUsernames.map((username) => (
                      <SelectItem key={username} value={username}>
                        {username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">In-Stock Details</h3>
              {(selectedModel !== "all" || selectedBrand !== "all" || selectedUsername !== "all") && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredStock.length} of {inStockItems.length} items
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