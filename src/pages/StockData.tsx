"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";


const StockData = () => {
  const { database, isLoadingData } = useData();
  
  
  // Initialize state from localStorage or defaults
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedModel') || "all";
  });
  const [selectedBrand, setSelectedBrand] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedBrand') || "all";
  });
  const [selectedBookingPerson, setSelectedBookingPerson] = useState<string>(() => {
    return localStorage.getItem('stockData_selectedBookingPerson') || "all";
  });
  
  // State for tracking expanded items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Function to toggle expanded state
  const toggleExpanded = (model: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(model)) {
        newSet.delete(model);
      } else {
        newSet.add(model);
      }
      return newSet;
    });
  };

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('stockData_selectedModel', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedBrand', selectedBrand);
  }, [selectedBrand]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedBookingPerson', selectedBookingPerson);
  }, [selectedBookingPerson]);



  // Always use user-specific data for Stock Data page (both admin and regular users)
  const dataSource = database;

  // First filter the database entries based on the selected filters
  const filteredEntries = useMemo(() => {
    console.log("StockData: Total database entries:", dataSource.length);
    console.log("StockData: Database entries:", dataSource);
    console.log("StockData: Selected filters:", { selectedModel, selectedBrand, selectedBookingPerson });
    
    return dataSource.filter(entry => {
      // Only require basic entry data (IMEI and model)
      if (!entry.imei || !entry.model) {
        console.log("StockData: Filtering out entry (missing basic data):", entry.imei, {
          hasImei: !!entry.imei,
          hasModel: !!entry.model
        });
        return false;
      }

      // Check model filter
      if (selectedModel !== "all" && entry.model !== selectedModel) {
        console.log("StockData: Filtering out entry by model:", {
          entryImei: entry.imei,
          entryModel: entry.model,
          selectedModel: selectedModel,
          match: entry.model === selectedModel
        });
        return false;
      }

      // Check brand filter
      if (selectedBrand !== "all" && entry.brand !== selectedBrand) {
        console.log("StockData: Filtering out entry by brand:", {
          entryImei: entry.imei,
          entryBrand: entry.brand,
          selectedBrand: selectedBrand,
          match: entry.brand === selectedBrand
        });
        return false;
      }

      // Check booking person filter
      if (selectedBookingPerson !== "all" && entry.bookingPerson !== selectedBookingPerson) {
        console.log("StockData: Filtering out entry by booking person:", {
          entryImei: entry.imei,
          entryBookingPerson: entry.bookingPerson,
          selectedBookingPerson: selectedBookingPerson,
          match: entry.bookingPerson === selectedBookingPerson
        });
        return false;
      }

      console.log("StockData: Entry passed all filters:", {
        imei: entry.imei,
        model: entry.model,
        brand: entry.brand,
        bookingPerson: entry.bookingPerson,
        inwardDate: entry.inwardDate,
        outwardDate: entry.outwardDate
      });
      return true;
    });
  }, [dataSource, selectedModel, selectedBrand, selectedBookingPerson]);

  // Debug the filtered entries
  useEffect(() => {
    console.log("StockData: Filtered entries count:", filteredEntries.length);
    console.log("StockData: Filtered entries:", filteredEntries);
  }, [filteredEntries]);

  // Calculate stock from filtered entries - show ALL data including sold items
  const inStockItems = useMemo(() => {
    const modelStockMap = new Map<string, { inStock: number; sold: number; total: number }>();

    filteredEntries.forEach(entry => {
      if (entry.model) {
        const current = modelStockMap.get(entry.model) || { inStock: 0, sold: 0, total: 0 };
        
        // Check if item is in stock (has inward date but no outward date)
        const isInStock = entry.inwardDate && !entry.outwardDate;
        const isSold = entry.inwardDate && entry.outwardDate;
        
        if (isInStock) {
          current.inStock += 1;
        } else if (isSold) {
          current.sold += 1;
        }
        current.total += 1;
        
        modelStockMap.set(entry.model, current);
      }
    });

    // Return all models with their complete statistics
    return Array.from(modelStockMap.entries()).map(([model, stock]) => ({ 
      model, 
      inStock: stock.inStock,
      sold: stock.sold,
      total: stock.total
    }));
  }, [filteredEntries]);

  // Filter for display - only show models with in-stock items in Inventory Details
  const displayItems = useMemo(() => {
    return inStockItems
      .filter(item => item.inStock > 0)
      .sort((a, b) => a.model.localeCompare(b.model)); // Sort alphabetically by model name
  }, [inStockItems]);

  // Calculate user-specific summary (for both admin and regular users)
  const totalUnitStock = useMemo(() => {
    return dataSource.reduce((sum, entry) => {
      // Count items that are in stock (have inward date but no outward date)
      if (entry.inwardDate && !entry.outwardDate) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }, [dataSource]);

  const totalSoldStock = useMemo(() => {
    return dataSource.reduce((sum, entry) => {
      // Count items that are sold (have both inward and outward date)
      if (entry.inwardDate && entry.outwardDate) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }, [dataSource]);

  const totalItems = useMemo(() => {
    return dataSource.reduce((sum, entry) => {
      // Count all items that have inward date
      if (entry.inwardDate) {
        return sum + 1;
      }
      return sum;
    }, 0);
  }, [dataSource]);

  // For display purposes, use displayItems which only shows in-stock items
  const filteredStock = displayItems;

  // Get unique options for filters
  const availableModels = useMemo(() => {
    const models = new Set<string>();
    dataSource.forEach(entry => {
      // If a brand is selected, only show models from that brand
      if (entry.model && (selectedBrand === "all" || entry.brand === selectedBrand)) {
        models.add(entry.model);
      }
    });
    const result = Array.from(models).sort();
    console.log("StockData: Available models for brand", selectedBrand, ":", result);
    console.log("StockData: Total entries:", dataSource.length);
    console.log("StockData: Entries with brand", selectedBrand, ":", dataSource.filter(entry => selectedBrand === "all" || entry.brand === selectedBrand).length);
    return result;
  }, [dataSource, selectedBrand]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    dataSource.forEach(entry => {
      // If a model is selected, only show brands that have that model
      if (entry.brand && (selectedModel === "all" || entry.model === selectedModel)) {
        brands.add(entry.brand);
      }
    });
    const result = Array.from(brands).sort();
    console.log("StockData: Available brands for model", selectedModel, ":", result);
    console.log("StockData: Total entries:", dataSource.length);
    console.log("StockData: Entries with model", selectedModel, ":", dataSource.filter(entry => selectedModel === "all" || entry.model === selectedModel).length);
    return result;
  }, [dataSource, selectedModel]);

  const availableBookingPersons = useMemo(() => {
    const bookingPersons = new Set<string>();
    dataSource.forEach(entry => {
      if (entry.bookingPerson) bookingPersons.add(entry.bookingPerson);
    });
    const result = Array.from(bookingPersons).sort();
    console.log("StockData: Available booking persons:", result);
    console.log("StockData: All booking persons in data:", dataSource.map(entry => ({
      imei: entry.imei,
      bookingPerson: entry.bookingPerson
    })));
    return result;
  }, [dataSource]);

  // Clear model selection when brand changes
  useEffect(() => {
    if (selectedBrand !== "all") {
      // Check if the currently selected model is available for the selected brand
      const isModelAvailable = availableModels.includes(selectedModel);
      if (!isModelAvailable && selectedModel !== "all") {
        console.log("StockData: Model", selectedModel, "not available for brand", selectedBrand, ", clearing model selection");
        setSelectedModel("all");
      }
    } else {
      // If brand is set to "all", we can keep the current model selection
      // as it will be filtered appropriately by the availableModels logic
      console.log("StockData: Brand set to 'all', showing all available models");
    }
  }, [selectedBrand, availableModels, selectedModel]);

  // Clear brand selection when model changes
  useEffect(() => {
    if (selectedModel !== "all") {
      // Check if the currently selected brand is available for the selected model
      const isBrandAvailable = availableBrands.includes(selectedBrand);
      if (!isBrandAvailable && selectedBrand !== "all") {
        console.log("StockData: Brand", selectedBrand, "not available for model", selectedModel, ", clearing brand selection");
        setSelectedBrand("all");
      }
    } else {
      // If model is set to "all", we can keep the current brand selection
      // as it will be filtered appropriately by the availableBrands logic
      console.log("StockData: Model set to 'all', showing all available brands");
    }
  }, [selectedModel, availableBrands, selectedBrand]);

  const clearFilters = () => {
    setSelectedModel("all");
    setSelectedBrand("all");
    setSelectedBookingPerson("all");
    // Clear localStorage as well
    localStorage.removeItem('stockData_selectedModel');
    localStorage.removeItem('stockData_selectedBrand');
    localStorage.removeItem('stockData_selectedBookingPerson');
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="uppercase text-center text-lg sm:text-xl">Stock Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
            <div className="bg-green-100 p-4 sm:p-6 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-green-600">{totalUnitStock}</div>
              <div className="text-xs sm:text-sm text-green-700">In Stock</div>
            </div>
            <div className="bg-red-100 p-4 sm:p-6 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-red-600">{totalSoldStock}</div>
              <div className="text-xs sm:text-sm text-red-700">Sold</div>
            </div>
            <div className="bg-blue-100 p-4 sm:p-6 rounded-lg">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">{totalItems}</div>
              <div className="text-xs sm:text-sm text-blue-700">Total Items</div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-base sm:text-lg font-semibold">Filter Stock</Label>
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-full sm:w-auto px-4 py-2 touch-manipulation">
                Clear Filters
              </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="brand-filter">
                  Filter by Brand
                  {selectedModel !== "all" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (filtered by {selectedModel})
                    </span>
                  )}
                </Label>
                <SearchableSelect
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                  options={availableBrands}
                  placeholder={selectedModel !== "all" ? `Select brand for ${selectedModel}` : "Select brand"}
                  searchPlaceholder="Search brands..."
                  emptyText={selectedModel !== "all" ? `No brands found for ${selectedModel}` : "No brands found."}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-filter">
                  Filter by Model
                  {selectedBrand !== "all" && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (filtered by {selectedBrand})
                    </span>
                  )}
                </Label>
                <SearchableSelect
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  options={availableModels}
                  placeholder={selectedBrand !== "all" ? `Select model for ${selectedBrand}` : "Select model"}
                  searchPlaceholder="Search models..."
                  emptyText={selectedBrand !== "all" ? `No models found for ${selectedBrand}` : "No models found."}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username-filter">Filter by Booking Person</Label>
                <SearchableSelect
                  value={selectedBookingPerson}
                  onValueChange={setSelectedBookingPerson}
                  options={availableBookingPersons}
                  placeholder="Select booking person"
                  searchPlaceholder="Search booking persons..."
                  emptyText="No booking persons found."
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Inventory Details</h3>
              {(selectedModel !== "all" || selectedBrand !== "all" || selectedBookingPerson !== "all") && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredStock.length} items
                </div>
              )}
            </div>
            {filteredStock.length > 0 ? (
              <ul className="grid gap-2">
                {filteredStock.map((item, index) => {
                  const isExpanded = expandedItems.has(item.model);
                  const modelEntries = filteredEntries.filter(entry => 
                    entry.model === item.model && 
                    entry.inwardDate && 
                    !entry.outwardDate // Only show in-stock items
                  );
                  
                  return (
                    <li key={index} className="border rounded-md">
                      <div 
                        className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpanded(item.model)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{item.model}</span>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-green-600 font-medium">
                              In Stock: {item.inStock}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t bg-muted/50 p-4">
                          <h4 className="font-semibold mb-3 text-foreground">Entry Details</h4>
                          <div className="grid gap-3">
                            {modelEntries.map((entry, entryIndex) => (
                              <div key={entryIndex} className="bg-muted/30 p-3 rounded border border-border">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-muted-foreground">IMEI:</span>
                                    <span className="ml-2 text-foreground">{entry.imei}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Brand:</span>
                                    <span className="ml-2 text-foreground">{entry.brand || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Seller:</span>
                                    <span className="ml-2 text-foreground">{entry.seller || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Booking Person:</span>
                                    <span className="ml-2 text-foreground">{entry.bookingPerson || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Inward Date:</span>
                                    <span className="ml-2 text-foreground">
                                      {entry.inwardDate ? new Date(entry.inwardDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Inward Amount:</span>
                                    <span className="ml-2 text-foreground">{entry.inwardAmount || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Outward Date:</span>
                                    <span className="ml-2 text-foreground">
                                      {entry.outwardDate ? new Date(entry.outwardDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Outward Amount:</span>
                                    <span className="ml-2 text-foreground">{entry.outwardAmount || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Buyer:</span>
                                    <span className="ml-2 text-foreground">{entry.buyer || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">No items found matching your filters.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StockData;