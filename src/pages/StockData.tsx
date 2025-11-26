"use client";

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Edit, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


const StockData = () => {
  const { database, isLoadingData, deleteEntry, availableBrands, availableModels, getModelsByBrand, availableBookingPersons: allBookingPersons } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Initialize state from localStorage or defaults - now using arrays for multi-select
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const stored = localStorage.getItem('stockData_selectedModels');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    const stored = localStorage.getItem('stockData_selectedBrands');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [selectedBookingPersons, setSelectedBookingPersons] = useState<string[]>(() => {
    const stored = localStorage.getItem('stockData_selectedBookingPersons');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
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

  // Check if user has navigated away and clear filters if they have
  useEffect(() => {
    const lastVisitedPage = localStorage.getItem('lastVisitedPage');
    const currentPage = 'stock-data';
    
    if (lastVisitedPage && lastVisitedPage !== currentPage) {
      // User has navigated away and returned, clear filters
      setSelectedModels([]);
      setSelectedBrands([]);
      setSelectedBookingPersons([]);
      localStorage.removeItem('stockData_selectedModels');
      localStorage.removeItem('stockData_selectedBrands');
      localStorage.removeItem('stockData_selectedBookingPersons');
    }
    
    // Update the last visited page
    localStorage.setItem('lastVisitedPage', currentPage);
  }, []);

  // Save filter state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('stockData_selectedModels', JSON.stringify(selectedModels));
  }, [selectedModels]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedBrands', JSON.stringify(selectedBrands));
  }, [selectedBrands]);

  useEffect(() => {
    localStorage.setItem('stockData_selectedBookingPersons', JSON.stringify(selectedBookingPersons));
  }, [selectedBookingPersons]);




  // Always use user-specific data for Stock Data page (both admin and regular users)
  const dataSource = database;

  // First filter the database entries based on the selected filters
  const filteredEntries = useMemo(() => {
    
    return dataSource.filter(entry => {
      // Only require basic entry data (IMEI and model)
      if (!entry.imei || !entry.model) {
        return false;
      }

      // Check model filter - if any models selected, entry must match one of them
      if (selectedModels.length > 0 && !selectedModels.includes(entry.model)) {
        return false;
      }

      // Check brand filter - if any brands selected, entry must match one of them
      if (selectedBrands.length > 0 && (!entry.brand || !selectedBrands.includes(entry.brand))) {
        return false;
      }

      // Check booking person filter - if any booking persons selected, entry must match one of them
      if (selectedBookingPersons.length > 0 && (!entry.bookingPerson || !selectedBookingPersons.includes(entry.bookingPerson))) {
        return false;
      }

      return true;
    });
  }, [dataSource, selectedModels, selectedBrands, selectedBookingPersons]);

  // Debug the filtered entries
  useEffect(() => {
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

  // Get unique options for filters from DataContext (all available brands/models)
  // Filter models based on selected brands
  const filteredModels = useMemo(() => {
    const allModels = new Set<string>();
    
    if (selectedBrands.length === 0) {
      // If no brands selected, show all models from DataContext (all available models)
      // Get all models from all brands
      availableBrands.forEach(brand => {
        const modelsForBrand = getModelsByBrand(brand);
        modelsForBrand.forEach(model => allModels.add(model));
      });
      // Also include models from entries (in case they're not in DataContext yet)
      dataSource.forEach(entry => {
        if (entry.model) allModels.add(entry.model);
      });
    } else {
      // If brands selected, show models for those brands from DataContext
      selectedBrands.forEach(brand => {
        const modelsForBrand = getModelsByBrand(brand);
        modelsForBrand.forEach(model => allModels.add(model));
      });
      
      // Also include models from entries that match the selected brands
      // This ensures models in entries are visible even if not in the models table
      dataSource.forEach(entry => {
        if (entry.brand && selectedBrands.includes(entry.brand) && entry.model) {
          allModels.add(entry.model);
        }
      });
    }
    
    return Array.from(allModels).sort();
  }, [dataSource, selectedBrands, getModelsByBrand, availableBrands]);

  // Filter brands based on selected models
  const filteredBrands = useMemo(() => {
    if (selectedModels.length === 0) {
      // If no models selected, show all brands from DataContext
      return availableBrands;
    } else {
      // If models selected, show only brands that have at least one of these models
      const brandsWithModel = availableBrands.filter(brand => {
        const modelsForBrand = getModelsByBrand(brand);
        return selectedModels.some(model => modelsForBrand.includes(model));
      });
      return brandsWithModel;
    }
  }, [availableBrands, selectedModels, getModelsByBrand]);

  // Get booking persons from DataContext (all available) and also from entries
  const availableBookingPersons = useMemo(() => {
    const bookingPersons = new Set<string>();
    // Add all booking persons from DataContext
    allBookingPersons.forEach(person => bookingPersons.add(person));
    // Also add booking persons from entries (in case they're not in DataContext yet)
    dataSource.forEach(entry => {
      if (entry.bookingPerson) bookingPersons.add(entry.bookingPerson);
    });
    const result = Array.from(bookingPersons).sort();
    return result;
  }, [dataSource, allBookingPersons]);

  // Validate stored filters when data is loaded - remove invalid selections
  useEffect(() => {
    if (filteredModels.length > 0) {
      // Remove any selected models that are no longer available
      const validModels = selectedModels.filter(model => filteredModels.includes(model));
      if (validModels.length !== selectedModels.length) {
        setSelectedModels(validModels);
      }
    }
    
    if (filteredBrands.length > 0) {
      // Remove any selected brands that are no longer available
      const validBrands = selectedBrands.filter(brand => filteredBrands.includes(brand));
      if (validBrands.length !== selectedBrands.length) {
        setSelectedBrands(validBrands);
      }
    }
  }, [filteredModels, filteredBrands, selectedModels, selectedBrands]);

  // Update model selection when brands change - filter out models that don't match selected brands
  useEffect(() => {
    if (selectedBrands.length > 0 && filteredModels.length > 0) {
      // Keep only models that belong to the selected brands
      const validModels = selectedModels.filter(model => filteredModels.includes(model));
      if (validModels.length !== selectedModels.length) {
        setSelectedModels(validModels);
      }
    }
  }, [selectedBrands, filteredModels, selectedModels]);

  // Update brand selection when models change - filter out brands that don't have selected models
  useEffect(() => {
    if (selectedModels.length > 0 && filteredBrands.length > 0) {
      // Keep only brands that have at least one of the selected models
      const validBrands = selectedBrands.filter(brand => {
        const modelsForBrand = getModelsByBrand(brand);
        return selectedModels.some(model => modelsForBrand.includes(model));
      });
      if (validBrands.length !== selectedBrands.length) {
        setSelectedBrands(validBrands);
      }
    }
  }, [selectedModels, filteredBrands, selectedBrands, getModelsByBrand]);

  const clearFilters = () => {
    setSelectedModels([]);
    setSelectedBrands([]);
    setSelectedBookingPersons([]);
    // Clear localStorage as well
    localStorage.removeItem('stockData_selectedModels');
    localStorage.removeItem('stockData_selectedBrands');
    localStorage.removeItem('stockData_selectedBookingPersons');
  };

  const handleEdit = (imei: string) => {
    navigate(`/entry-form?imei=${imei}`);
  };

  const handleDelete = async (imei: string) => {
    const success = await deleteEntry(imei);
    if (success) {
      // Data will be refreshed automatically by the deleteEntry function
    }
  };

  if (isLoadingData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="uppercase text-center text-lg sm:text-xl flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              Loading Stock Data...
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:gap-6 p-4 sm:p-6">
            {/* Summary cards skeleton with shimmer effect */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="bg-green-100 p-4 sm:p-6 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <Skeleton className="h-8 w-12 mx-auto mb-2 bg-green-200" />
                <Skeleton className="h-4 w-16 mx-auto bg-green-200" />
              </div>
              <div className="bg-red-100 p-4 sm:p-6 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <Skeleton className="h-8 w-12 mx-auto mb-2 bg-red-200" />
                <Skeleton className="h-4 w-16 mx-auto bg-red-200" />
              </div>
              <div className="bg-blue-100 p-4 sm:p-6 rounded-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                <Skeleton className="h-8 w-12 mx-auto mb-2 bg-blue-200" />
                <Skeleton className="h-4 w-16 mx-auto bg-blue-200" />
              </div>
            </div>

            {/* Filter section skeleton with better animations */}
            <div className="grid gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Skeleton className="h-6 w-24 animate-pulse" />
                <Skeleton className="h-8 w-32 animate-pulse" />
              </div>
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20 animate-pulse" />
                  <Skeleton className="h-10 w-full animate-pulse" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-20 animate-pulse" />
                  <Skeleton className="h-10 w-full animate-pulse" />
                </div>
                <div className="grid gap-2">
                  <Skeleton className="h-4 w-32 animate-pulse" />
                  <Skeleton className="h-10 w-full animate-pulse" />
                </div>
              </div>
            </div>

            {/* Inventory details skeleton with staggered animation */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <Skeleton className="h-6 w-32 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-12 w-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                <Skeleton className="h-12 w-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                <Skeleton className="h-12 w-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                <Skeleton className="h-12 w-full animate-pulse" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Fetching inventory data...</span>
              </div>
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
                  {selectedModels.length > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (filtered by {selectedModels.length} model{selectedModels.length > 1 ? 's' : ''})
                    </span>
                  )}
                </Label>
                <MultiSelect
                  value={selectedBrands}
                  onValueChange={setSelectedBrands}
                  options={filteredBrands}
                  placeholder={selectedModels.length > 0 ? `Select brands for selected models` : "Select brands"}
                  searchPlaceholder="Search brands..."
                  emptyText={selectedModels.length > 0 ? `No brands found for selected models` : "No brands found."}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-filter">
                  Filter by Model
                  {selectedBrands.length > 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (filtered by {selectedBrands.length} brand{selectedBrands.length > 1 ? 's' : ''})
                    </span>
                  )}
                </Label>
                <MultiSelect
                  value={selectedModels}
                  onValueChange={setSelectedModels}
                  options={filteredModels}
                  placeholder={selectedBrands.length > 0 ? `Select models for selected brands` : "Select models"}
                  searchPlaceholder="Search models..."
                  emptyText={selectedBrands.length > 0 ? `No models found for selected brands` : "No models found."}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="username-filter">Filter by Booking Person</Label>
                <MultiSelect
                  value={selectedBookingPersons}
                  onValueChange={setSelectedBookingPersons}
                  options={availableBookingPersons}
                  placeholder="Select booking persons"
                  searchPlaceholder="Search booking persons..."
                  emptyText="No booking persons found."
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Inventory Details</h3>
              {(selectedModels.length > 0 || selectedBrands.length > 0 || selectedBookingPersons.length > 0) && (
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
                                <div className="flex justify-between items-start mb-3">
                                  <h5 className="font-semibold text-foreground">Entry: {entry.imei}</h5>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEdit(entry.imei)}
                                      className="h-8"
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    {isAdmin && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" className="h-8">
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                              This action cannot be undone. This will permanently delete the entry with IMEI: {entry.imei}.
                                            </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(entry.imei)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </div>
                                </div>
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
                                    <span className="ml-2 text-foreground">{entry.inwardAmount ? `₹${entry.inwardAmount}` : 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Outward Date:</span>
                                    <span className="ml-2 text-foreground">
                                      {entry.outwardDate ? new Date(entry.outwardDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-muted-foreground">Outward Amount:</span>
                                    <span className="ml-2 text-foreground">{entry.outwardAmount ? `₹${entry.outwardAmount}` : 'N/A'}</span>
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