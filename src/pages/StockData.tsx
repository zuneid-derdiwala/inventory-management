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

  // First filter the database entries based on the selected filters
  const filteredEntries = useMemo(() => {
    console.log("StockData: Total database entries:", database.length);
    console.log("StockData: Database entries:", database);
    console.log("StockData: Selected filters:", { selectedModel, selectedBrand, selectedBookingPerson });
    
    return database.filter(entry => {
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
  }, [database, selectedModel, selectedBrand, selectedBookingPerson]);

  // Debug the filtered entries
  useEffect(() => {
    console.log("StockData: Filtered entries count:", filteredEntries.length);
    console.log("StockData: Filtered entries:", filteredEntries);
  }, [filteredEntries]);

  // Calculate stock from filtered entries
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

    return Array.from(modelStockMap.entries()).map(([model, stock]) => ({ 
      model, 
      inStock: stock.inStock,
      sold: stock.sold,
      total: stock.total
    }));
  }, [filteredEntries]);

  const totalUnitStock = inStockItems.reduce((sum, item) => sum + item.inStock, 0);
  const totalSoldStock = inStockItems.reduce((sum, item) => sum + item.sold, 0);
  const totalItems = inStockItems.reduce((sum, item) => sum + item.total, 0);

  // For display purposes, we can use inStockItems directly since it's already filtered
  const filteredStock = inStockItems;

  // Get unique options for filters
  const availableModels = useMemo(() => {
    const models = new Set<string>();
    database.forEach(entry => {
      if (entry.model) models.add(entry.model);
    });
    const result = Array.from(models).sort();
    console.log("StockData: Available models:", result);
    console.log("StockData: All models in data:", database.map(entry => ({
      imei: entry.imei,
      model: entry.model
    })));
    return result;
  }, [database]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    database.forEach(entry => {
      if (entry.brand) brands.add(entry.brand);
    });
    const result = Array.from(brands).sort();
    console.log("StockData: Available brands:", result);
    console.log("StockData: All brands in data:", database.map(entry => ({
      imei: entry.imei,
      brand: entry.brand
    })));
    return result;
  }, [database]);

  const availableBookingPersons = useMemo(() => {
    const bookingPersons = new Set<string>();
    database.forEach(entry => {
      if (entry.bookingPerson) bookingPersons.add(entry.bookingPerson);
    });
    const result = Array.from(bookingPersons).sort();
    console.log("StockData: Available booking persons:", result);
    console.log("StockData: All booking persons in data:", database.map(entry => ({
      imei: entry.imei,
      bookingPerson: entry.bookingPerson
    })));
    return result;
  }, [database]);

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
        <CardHeader>
          <CardTitle className="uppercase text-center">Stock Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{totalUnitStock}</div>
              <div className="text-sm text-green-700">In Stock</div>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{totalSoldStock}</div>
              <div className="text-sm text-red-700">Sold</div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
              <div className="text-sm text-blue-700">Total Items</div>
            </div>
          </div>

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
                  const modelEntries = filteredEntries.filter(entry => entry.model === item.model);
                  
                  return (
                    <li key={index} className="border rounded-md">
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
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
                            <span className="text-red-600 font-medium">
                              Sold: {item.sold}
                            </span>
                            <span className="text-blue-600 font-medium">
                              Total: {item.total}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-4">
                          <h4 className="font-semibold mb-3 text-gray-700">Entry Details</h4>
                          <div className="grid gap-3">
                            {modelEntries.map((entry, entryIndex) => (
                              <div key={entryIndex} className="bg-white p-3 rounded border">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium text-gray-600">IMEI:</span>
                                    <span className="ml-2">{entry.imei}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Brand:</span>
                                    <span className="ml-2">{entry.brand || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Seller:</span>
                                    <span className="ml-2">{entry.seller || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Booking Person:</span>
                                    <span className="ml-2">{entry.bookingPerson || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Inward Date:</span>
                                    <span className="ml-2">
                                      {entry.inwardDate ? new Date(entry.inwardDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Inward Amount:</span>
                                    <span className="ml-2">{entry.inwardAmount || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Outward Date:</span>
                                    <span className="ml-2">
                                      {entry.outwardDate ? new Date(entry.outwardDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Outward Amount:</span>
                                    <span className="ml-2">{entry.outwardAmount || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Buyer:</span>
                                    <span className="ml-2">{entry.buyer || 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-600">Status:</span>
                                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                                      entry.outwardDate 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-green-100 text-green-800'
                                    }`}>
                                      {entry.outwardDate ? 'Sold' : 'In Stock'}
                                    </span>
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