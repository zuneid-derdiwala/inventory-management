"use client";

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Separator } from "@/components/ui/separator"; // Import Separator
import DataImporter from "@/components/DataImporter"; // Import DataImporter
import DataExporter from "@/components/DataExporter"; // Import DataExporter
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { supabase } from "@/lib/supabase";
import { EntryData } from "@/context/DataContext";
import { MultiSelect } from "@/components/ui/multi-select";
import { sanitizeUserInput } from "@/utils/sanitize";

const Database = () => {
  const { database, deleteEntry, availableBrands, isLoadingData, getModelsByBrand } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // State for all data (for admin users)
  const [allData, setAllData] = useState<EntryData[]>([]);
  const [isLoadingAllData, setIsLoadingAllData] = useState(false);

  // Multi-select states for IMEI, Outward Date, Brand, Model, Booking Person, and Buyer
  const [selectedIMEIs, setSelectedIMEIs] = useState<string[]>(() => {
    const stored = localStorage.getItem('database_selectedIMEIs');
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
  const [selectedOutwardDates, setSelectedOutwardDates] = useState<string[]>(() => {
    const stored = localStorage.getItem('database_selectedOutwardDates');
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
    const stored = localStorage.getItem('database_selectedBrands');
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
  const [selectedModels, setSelectedModels] = useState<string[]>(() => {
    const stored = localStorage.getItem('database_selectedModels');
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
    const stored = localStorage.getItem('database_selectedBookingPersons');
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
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>(() => {
    const stored = localStorage.getItem('database_selectedBuyers');
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 20;


  // Track page navigation
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', 'database');
  }, []);

  // Save multi-select filter state to localStorage
  useEffect(() => {
    localStorage.setItem('database_selectedBrands', JSON.stringify(selectedBrands));
  }, [selectedBrands]);

  useEffect(() => {
    localStorage.setItem('database_selectedModels', JSON.stringify(selectedModels));
  }, [selectedModels]);

  useEffect(() => {
    localStorage.setItem('database_selectedBookingPersons', JSON.stringify(selectedBookingPersons));
  }, [selectedBookingPersons]);

  useEffect(() => {
    localStorage.setItem('database_selectedBuyers', JSON.stringify(selectedBuyers));
  }, [selectedBuyers]);

  useEffect(() => {
    localStorage.setItem('database_selectedIMEIs', JSON.stringify(selectedIMEIs));
  }, [selectedIMEIs]);

  useEffect(() => {
    localStorage.setItem('database_selectedOutwardDates', JSON.stringify(selectedOutwardDates));
  }, [selectedOutwardDates]);

  // Fetch all data for admin users
  useEffect(() => {
    const fetchAllData = async () => {
      if (!isAdmin) {
        setAllData([]);
        return;
      }

      setIsLoadingAllData(true);
      try {
        const { data, error } = await supabase
          .from("entries")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching all data:", { code: error.code, message: error.message });
          setAllData([]);
          return;
        }

        // Fetch with joins to get names from related tables
        // Filter out soft-deleted entries (is_deleted = false)
        let entriesQuery = supabase
          .from("entries")
          .select(`
            *,
            brands:brand_id(name),
            models:model_id(name),
            sellers:seller_id(name),
            booking_persons:booking_person_id(name)
          `)
          .eq('is_deleted', false)
          .order("created_at", { ascending: false });
        
        const { data: entriesWithJoins, error: joinError } = await entriesQuery;

        if (joinError) {
          // If error is about is_deleted column not existing, try without filter
          if (joinError.code === '42703' || joinError.message?.includes('column "is_deleted" does not exist')) {
            const { data: entriesWithoutFilter, error: retryError } = await supabase
              .from("entries")
              .select(`
                *,
                brands:brand_id(name),
                models:model_id(name),
                sellers:seller_id(name),
                booking_persons:booking_person_id(name)
              `)
              .order("created_at", { ascending: false });
            
            if (retryError) {
              console.error("Error fetching entries with joins (retry):", { code: retryError.code, message: retryError.message });
            } else {
              // Use entries without filter if is_deleted column doesn't exist
              const convertedData: EntryData[] = (entriesWithoutFilter || []).map((entry: any) => ({
                imei: entry.imei || "",
                brand: entry.brands?.name || entry.brand || undefined,
                model: entry.models?.name || entry.model || undefined,
                seller: entry.sellers?.name || entry.seller || undefined,
                bookingPerson: entry.booking_persons?.name || entry.booking_person || undefined,
                inwardDate: entry.inward_date ? new Date(entry.inward_date) : undefined,
                inwardAmount: entry.inward_amount || undefined,
                buyer: entry.buyer || undefined,
                outwardDate: entry.outward_date ? new Date(entry.outward_date) : undefined,
                outwardAmount: entry.outward_amount || undefined,
              }));
              setAllData(convertedData);
              return;
            }
          } else {
            console.error("Error fetching entries with joins:", { code: joinError.code, message: joinError.message });
          }
        }

        // Convert Supabase data to EntryData format
        const convertedData: EntryData[] = (entriesWithJoins || data || []).map((entry: any) => ({
          imei: entry.imei || "",
          brand: entry.brands?.name || entry.brand || undefined,
          model: entry.models?.name || entry.model || undefined,
          seller: entry.sellers?.name || entry.seller || undefined,
          bookingPerson: entry.booking_persons?.name || entry.booking_person || undefined,
          inwardDate: entry.inward_date ? new Date(entry.inward_date) : undefined,
          inwardAmount: entry.inward_amount || undefined,
          buyer: entry.buyer || undefined,
          outwardDate: entry.outward_date ? new Date(entry.outward_date) : undefined,
          outwardAmount: entry.outward_amount || undefined,
        }));

        setAllData(convertedData);
      } catch (error) {
        console.error("Error fetching all data:", error instanceof Error ? error.message : 'Unknown error');
        setAllData([]);
      } finally {
        setIsLoadingAllData(false);
      }
    };

    fetchAllData();
  }, [isAdmin]);



  // Clear all filters
  const clearFilters = () => {
    // Clear multi-select filters
    setSelectedIMEIs([]);
    setSelectedOutwardDates([]);
    setSelectedBrands([]);
    setSelectedModels([]);
    setSelectedBookingPersons([]);
    setSelectedBuyers([]);
    
    // Clear localStorage
    localStorage.removeItem('database_selectedIMEIs');
    localStorage.removeItem('database_selectedOutwardDates');
    localStorage.removeItem('database_selectedBrands');
    localStorage.removeItem('database_selectedModels');
    localStorage.removeItem('database_selectedBookingPersons');
    localStorage.removeItem('database_selectedBuyers');
    
    // Reset to page 1
    setCurrentPage(1);
  };

  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // Use appropriate data source based on user role
  // This contains ALL data - filters will work on the complete dataset
  const dataSource = isAdmin ? allData : database;

  // Get all available models from all brands
  const allAvailableModels = useMemo(() => {
    const modelsSet = new Set<string>();
    availableBrands.forEach(brand => {
      const modelsForBrand = getModelsByBrand(brand);
      modelsForBrand.forEach(model => modelsSet.add(model));
    });
    // Also include models from entries
    dataSource.forEach(entry => {
      if (entry.model) modelsSet.add(entry.model);
    });
    return Array.from(modelsSet).sort();
  }, [availableBrands, getModelsByBrand, dataSource]);

  // Filter models based on selected brands
  const filteredModels = useMemo(() => {
    if (selectedBrands.length === 0) {
      return allAvailableModels;
    }
    const modelsSet = new Set<string>();
    selectedBrands.forEach(brand => {
      const modelsForBrand = getModelsByBrand(brand);
      modelsForBrand.forEach(model => modelsSet.add(model));
    });
    // Also include models from entries that match selected brands
    dataSource.forEach(entry => {
      if (entry.brand && selectedBrands.includes(entry.brand) && entry.model) {
        modelsSet.add(entry.model);
      }
    });
    return Array.from(modelsSet).sort();
  }, [selectedBrands, getModelsByBrand, dataSource, allAvailableModels]);

  // Filter brands based on selected models
  const filteredBrands = useMemo(() => {
    if (selectedModels.length === 0) {
      return availableBrands;
    }
    return availableBrands.filter(brand => {
      const modelsForBrand = getModelsByBrand(brand);
      return selectedModels.some(model => modelsForBrand.includes(model));
    });
  }, [availableBrands, selectedModels, getModelsByBrand]);

  // Get all available buyers from data
  const availableBuyers = useMemo(() => {
    const buyersSet = new Set<string>();
    dataSource.forEach(entry => {
      if (entry.buyer) buyersSet.add(entry.buyer);
    });
    return Array.from(buyersSet).sort();
  }, [dataSource]);

  // Get all available booking persons from data (not filtered by user_id)
  // This shows ALL booking persons that exist in the entries, regardless of which user created them
  // For admin users: shows booking persons from all entries (all users)
  // For regular users: shows booking persons from their own entries
  const allAvailableBookingPersons = useMemo(() => {
    const bookingPersonsSet = new Set<string>();
    dataSource.forEach(entry => {
      if (entry.bookingPerson) bookingPersonsSet.add(entry.bookingPerson);
    });
    return Array.from(bookingPersonsSet).sort();
  }, [dataSource]);

  // Filter ALL data first (not just current page)
  // This ensures filters work on the complete dataset
  const filteredData = useMemo(() => {
    return dataSource.filter(entry => {
      // IMEI filter (multi-select)
      const matchesIMEI = selectedIMEIs.length === 0 || 
        (entry.imei && selectedIMEIs.includes(entry.imei));

      // Outward Date filter (multi-select) - matches outward date only
      const matchesOutwardDate = selectedOutwardDates.length === 0 || 
        (entry.outwardDate && selectedOutwardDates.includes(format(entry.outwardDate, "dd/MM/yyyy")));

      // Brand filter (multi-select)
      const matchesBrand = selectedBrands.length === 0 || 
        (entry.brand && selectedBrands.includes(entry.brand));

      // Model filter (multi-select)
      const matchesModel = selectedModels.length === 0 || 
        (entry.model && selectedModels.includes(entry.model));

      // Booking Person filter (multi-select)
      const matchesBookingPerson = selectedBookingPersons.length === 0 || 
        (entry.bookingPerson && selectedBookingPersons.includes(entry.bookingPerson));

      // Buyer filter (multi-select)
      const matchesBuyer = selectedBuyers.length === 0 || 
        (entry.buyer && selectedBuyers.includes(entry.buyer));

      // An entry matches if it satisfies all filters
      // If all filters are empty, all entries are shown.
      if (selectedIMEIs.length === 0 && selectedOutwardDates.length === 0 && selectedBrands.length === 0 && 
          selectedModels.length === 0 && selectedBookingPersons.length === 0 && selectedBuyers.length === 0) {
        return true;
      }

      return matchesIMEI && matchesOutwardDate && matchesBrand && matchesModel && matchesBookingPerson && matchesBuyer;
    });
  }, [dataSource, selectedIMEIs, selectedOutwardDates, selectedBrands, selectedModels, selectedBookingPersons, selectedBuyers]);

  // Pagination calculations
  // After filtering ALL data, show only 20 records per page
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedIMEIs, selectedOutwardDates, selectedBrands, selectedModels, selectedBookingPersons, selectedBuyers]);

  // Calculate summary based on user role
  // For admin: show overall data (all users)
  // For regular users: show user-specific data (already filtered in use-entries hook)
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

  const handleEdit = (imei: string) => {
    navigate(`/entry-form?imei=${imei}`);
  };

  const handleDelete = async (imei: string) => {
    const success = await deleteEntry(imei);
    if (success) {
      // For admin users, refresh all data
      if (isAdmin) {
        setIsLoadingAllData(true);
        try {
          const { data, error } = await supabase.from("entries").select("*");
          if (error) {
            console.error("Error fetching all data after delete:", { code: error.code, message: error.message });
          } else {
            setAllData(data || []);
          }
        } catch (error) {
          console.error("Error fetching all data after delete:", error instanceof Error ? error.message : 'Unknown error');
        } finally {
          setIsLoadingAllData(false);
        }
      } else {
        // For regular users, the deleteEntry function already calls fetchEntries()
        // No additional action needed
      }
    }
  };

  // --- Available Options for Multi-Select ---

  // IMEI options
  const availableIMEIs = useMemo(() => {
    const imeis = new Set<string>();
    dataSource.forEach(entry => {
      if (entry.imei) imeis.add(String(entry.imei));
    });
    return Array.from(imeis).sort();
  }, [dataSource]);

  // Outward Date options (only outward dates)
  const availableOutwardDates = useMemo(() => {
    const dates = new Set<string>();
    dataSource.forEach(entry => {
      if (entry.outwardDate) {
        try {
          const dateStr = format(entry.outwardDate, "dd/MM/yyyy");
          if (dateStr) dates.add(dateStr);
        } catch (e) {
          // Invalid date, skip
        }
      }
    });
    return Array.from(dates).sort();
  }, [dataSource]);


  if (isLoadingData || (isAdmin && isLoadingAllData)) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader className="flex items-center justify-center space-y-0 pb-2 p-4 sm:p-6">
            <CardTitle className="uppercase text-center text-lg sm:text-xl flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              Loading Database...
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

            {/* Search filters skeleton with better animations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32 animate-pulse" />
                <Skeleton className="h-10 w-full animate-pulse" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-32 animate-pulse" />
                <Skeleton className="h-10 w-full animate-pulse" />
              </div>
              <div className="grid gap-2">
                <Skeleton className="h-4 w-40 animate-pulse" />
                <Skeleton className="h-10 w-full animate-pulse" />
              </div>
            </div>

            {/* Search button skeleton */}
            <Skeleton className="h-10 w-full md:w-auto animate-pulse" />

            {/* Import/Export buttons skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
              <Skeleton className="h-10 w-full sm:w-1/2 animate-pulse" />
              <Skeleton className="h-10 w-full sm:w-1/2 animate-pulse" />
            </div>

            {/* Table skeleton with staggered animation */}
            <div className="mt-4 overflow-x-auto">
              {/* Table header */}
              <div className="grid grid-cols-10 gap-4 p-4 border-b bg-muted/50">
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-4 w-16 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
                <Skeleton className="h-4 w-20 animate-pulse" />
              </div>
              
              {/* Table rows with staggered animation */}
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid grid-cols-10 gap-4 p-4 border-b">
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-16 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-16 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-16 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-16 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                  <Skeleton className="h-4 w-20 animate-pulse" style={{ animationDelay: `${index * 0.1}s` }} />
                </div>
              ))}
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center py-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">
                  {isAdmin ? 'Loading all database entries...' : 'Loading your data entries...'}
                </span>
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
        <CardHeader className="flex items-center justify-center space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="uppercase text-center text-lg sm:text-xl">All Data Entries</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="imei-filter">Filter by IMEI</Label>
              <MultiSelect
                value={selectedIMEIs}
                onValueChange={setSelectedIMEIs}
                options={availableIMEIs}
                placeholder="Select IMEIs"
                searchPlaceholder="Search IMEIs..."
                emptyText="No IMEIs found."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="outward-date-filter">Filter by Outward Date</Label>
              <MultiSelect
                value={selectedOutwardDates}
                onValueChange={setSelectedOutwardDates}
                options={availableOutwardDates}
                placeholder="Select Outward Dates"
                searchPlaceholder="Search dates..."
                emptyText="No outward dates found."
              />
            </div>
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
              <Label htmlFor="booking-person-filter">Filter by Booking Person</Label>
              <MultiSelect
                value={selectedBookingPersons}
                onValueChange={setSelectedBookingPersons}
                options={allAvailableBookingPersons}
                placeholder="Select booking persons"
                searchPlaceholder="Search booking persons..."
                emptyText="No booking persons found."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="buyer-filter">Filter by Buyer</Label>
              <MultiSelect
                value={selectedBuyers}
                onValueChange={setSelectedBuyers}
                options={availableBuyers}
                placeholder="Select buyers"
                searchPlaceholder="Search buyers..."
                emptyText="No buyers found."
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={clearFilters} variant="outline" className="w-full md:w-auto">
              <X className="mr-2 h-4 w-4" /> Clear Filters
            </Button>
          </div>

          {/* Data Import/Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center"> {/* Changed gap-2 to gap-4 */}
            <DataImporter />
            <DataExporter />
          </div>

          <div className="mt-4 overflow-x-auto">
            {filteredData.length > 0 ? (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredData.length)} of {filteredData.length} entries
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IMEI</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Seller</TableHead>
                      <TableHead>Booking Person</TableHead>
                      <TableHead>Inward Date</TableHead>
                      <TableHead>Inward Amount</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Outward Date</TableHead>
                      <TableHead>Outward Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.map((entry, index) => (
                    <TableRow key={entry.imei || index}>
                      <TableCell className="font-medium">{sanitizeUserInput(entry.imei)}</TableCell>
                      <TableCell>{sanitizeUserInput(entry.brand)}</TableCell>
                      <TableCell>{sanitizeUserInput(entry.model)}</TableCell>
                      <TableCell>{sanitizeUserInput(entry.seller)}</TableCell>
                      <TableCell>{sanitizeUserInput(entry.bookingPerson)}</TableCell>
                      <TableCell>{entry.inwardDate ? format(entry.inwardDate, "dd/MM/yyyy") : "N/A"}</TableCell>
                      <TableCell>{entry.inwardAmount ? `₹${entry.inwardAmount}` : "N/A"}</TableCell>
                      <TableCell>{sanitizeUserInput(entry.buyer) || "N/A"}</TableCell>
                      <TableCell>{entry.outwardDate ? format(entry.outwardDate, "dd/MM/yyyy") : "N/A"}</TableCell>
                      <TableCell>{entry.outwardAmount ? `₹${entry.outwardAmount}` : "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => handleEdit(entry.imei)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the entry with IMEI: {sanitizeUserInput(entry.imei)}.
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
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      
                      {/* Page numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(page)}
                                className="min-w-[2.5rem]"
                              >
                                {page}
                              </Button>
                            );
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <span key={page} className="px-2 text-muted-foreground">
                                ...
                              </span>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data entries found matching your search.</p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Data Import/Export Section */}
          {/* Removed Collapsible wrapper as per previous request */}
          {/* <Collapsible open={isDataManagementOpen} onOpenChange={setIsDataManagementOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Data Import / Export</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 border rounded-md">
              <DataImporter />
              <DataExporter />
            </CollapsibleContent>
          </Collapsible> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Database;