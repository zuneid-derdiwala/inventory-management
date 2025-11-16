"use client";

import { useEffect, useState, useCallback } from "react";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import { EntryData } from "@/context/DataContext";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface UseEntriesProps {
  addBrandToSupabase: (brand: string) => Promise<boolean>;
  addModelToSupabase: (brand: string, model: string) => Promise<boolean>;
  addSellerToSupabase: (seller: string) => Promise<boolean>;
  addBookingPersonToSupabase: (person: string) => Promise<boolean>;
  getBrandIdByName?: (name: string) => string | undefined;
  getModelIdByName?: (brandName: string, modelName: string) => string | undefined;
  getSellerIdByName?: (name: string) => string | undefined;
  getBookingPersonIdByName?: (name: string) => string | undefined;
  refreshDependencies?: () => Promise<void>; // Optional function to refresh brands/models/sellers/booking_persons
}

// Helper to convert Supabase ISO string to Date object
const parseSupabaseDate = (dateString: string | null): Date | undefined => {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? undefined : date;
};

export function useEntries({
  addBrandToSupabase,
  addModelToSupabase,
  addSellerToSupabase,
  addBookingPersonToSupabase,
  getBrandIdByName,
  getModelIdByName,
  getSellerIdByName,
  getBookingPersonIdByName,
  refreshDependencies,
}: UseEntriesProps) {
  const [database, setDatabase] = useState<EntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const { user, isAdmin } = useAuth();

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    
    // Only fetch if user is authenticated
    if (!user) {
      setDatabase([]);
      setIsLoading(false);
      return;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Build query with joins to get names from related tables
      let query = supabase
        .from("entries")
        .select(`
          *,
          brand_id,
          model_id,
          seller_id,
          booking_person_id,
          brands:brand_id(name),
          models:model_id(name, brand_id),
          sellers:seller_id(name),
          booking_persons:booking_person_id(name)
        `);
      
      // If user is not admin, filter by user_id
      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }
      
      // Filter out soft-deleted entries (is_deleted = false or null)
      // Try to filter by is_deleted, but handle gracefully if column doesn't exist
      query = query.eq('is_deleted', false);
      
      const response: any = await query.then((res: any) => res);

      if (response.error) {
        // If error is about is_deleted column not existing, try without filter
        if (response.error.code === '42703' || response.error.message?.includes('column "is_deleted" does not exist')) {
          console.log("is_deleted column doesn't exist, fetching all entries...");
          let retryQuery = supabase
            .from("entries")
            .select(`
              *,
              brand_id,
              model_id,
              seller_id,
              booking_person_id,
              brands:brand_id(name),
              models:model_id(name, brand_id),
              sellers:seller_id(name),
              booking_persons:booking_person_id(name)
            `);
          
          if (!isAdmin) {
            retryQuery = retryQuery.eq('user_id', user.id);
          }
          
          const retryResponse: any = await retryQuery.then((res: any) => res);
          
          if (retryResponse.error) {
            console.error("Error fetching entries (retry):", retryResponse.error);
            showError("Failed to load inventory data.");
            setDatabase([]);
          } else {
            const fetchedData: EntryData[] = (retryResponse.data || []).map((item: any) => ({
              imei: item.imei,
              brand: item.brands?.name || item.brand || undefined,
              model: item.models?.name || item.model || undefined,
              seller: item.sellers?.name || item.seller || undefined,
              bookingPerson: item.booking_persons?.name || item.booking_person || undefined,
              inwardDate: parseSupabaseDate(item.inward_date),
              inwardAmount: item.inward_amount,
              buyer: item.buyer,
              outwardDate: parseSupabaseDate(item.outward_date),
              outwardAmount: item.outward_amount,
            }));
            setDatabase(fetchedData);
          }
        } else {
          console.error("Error fetching entries:", response.error);
          showError("Failed to load inventory data.");
          setDatabase([]);
        }
      } else {
        const fetchedData: EntryData[] = (response.data || []).map((item: any) => ({
          imei: item.imei,
          // Get name from joined table, fallback to direct field for backward compatibility
          brand: item.brands?.name || item.brand || undefined,
          model: item.models?.name || item.model || undefined,
          seller: item.sellers?.name || item.seller || undefined,
          bookingPerson: item.booking_persons?.name || item.booking_person || undefined,
          inwardDate: parseSupabaseDate(item.inward_date),
          inwardAmount: item.inward_amount,
          buyer: item.buyer,
          outwardDate: parseSupabaseDate(item.outward_date),
          outwardAmount: item.outward_amount,
        }));
        setDatabase(fetchedData);
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedEntries = localStorage.getItem("entries");
      if (storedEntries) {
        try {
          const parsedEntries = JSON.parse(storedEntries);
          // Convert date strings back to Date objects
          const entriesWithDates: EntryData[] = parsedEntries.map((entry: any) => ({
            ...entry,
            inwardDate: entry.inwardDate ? new Date(entry.inwardDate) : undefined,
            outwardDate: entry.outwardDate ? new Date(entry.outwardDate) : undefined,
          }));
          setDatabase(entriesWithDates);
        } catch (e) {
          console.error("Error parsing stored entries:", e);
          setDatabase([]);
        }
      }
    }
    setIsLoading(false);
    setHasFetched(true);
  }, [user, isAdmin]);

  useEffect(() => {
    // Only fetch on initial mount or when user changes, not on tab/route changes
    if (!hasFetched) {
      fetchEntries();
    }
  }, [fetchEntries, hasFetched]);
  
  // Reset hasFetched when user changes (login/logout)
  useEffect(() => {
    setHasFetched(false);
  }, [user, isAdmin]);

  const addEntry = async (entry: EntryData): Promise<boolean> => {
    if (!entry.imei) {
      showError("IMEI is required to add an entry.");
      return false;
    }
    
    // Check if user is authenticated
    if (!user || !user.id) {
      showError("You must be logged in to add entries. Please sign in and try again.");
      return false;
    }
    
    // Check for duplicate IMEI in current database state
    if (database.some((e) => e.imei === entry.imei)) {
      showError("IMEI already exists in your current data. Please check the Database tab.");
      return false;
    }

    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Convert names to IDs (only use existing ones, don't create new)
      const brandId = entry.brand && getBrandIdByName ? getBrandIdByName(entry.brand) : undefined;
      const modelId = entry.model && entry.brand && getModelIdByName ? getModelIdByName(entry.brand, entry.model) : undefined;
      const sellerId = entry.seller && getSellerIdByName ? getSellerIdByName(entry.seller) : undefined;
      const bookingPersonId = entry.bookingPerson && getBookingPersonIdByName ? getBookingPersonIdByName(entry.bookingPerson) : undefined;

      // Validate that required IDs exist (if names were provided)
      // This ensures brands/models/sellers/booking_persons are managed separately
      if (entry.brand && !brandId) {
        showError(`Brand "${entry.brand}" not found. Please add it in the Manage Data page first.`);
        return false;
      }
      if (entry.model && entry.brand && !modelId) {
        showError(`Model "${entry.model}" for brand "${entry.brand}" not found. Please add it in the Manage Data page first.`);
        return false;
      }
      if (entry.seller && !sellerId) {
        showError(`Seller "${entry.seller}" not found. Please add it in the Manage Data page first.`);
        return false;
      }
      if (entry.bookingPerson && !bookingPersonId) {
        showError(`Booking person "${entry.bookingPerson}" not found. Please add it in the Manage Data page first.`);
        return false;
      }

      // Verify user is authenticated in Supabase
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      if (!supabaseUser || supabaseUser.id !== user.id) {
        console.error("User authentication mismatch:", { supabaseUser, appUser: user });
        showError("Authentication error. Please sign out and sign in again.");
        return false;
      }

      const response: any = await supabase.from("entries").insert({
        imei: entry.imei,
        brand_id: brandId || null,
        model_id: modelId || null,
        seller_id: sellerId || null,
        booking_person_id: bookingPersonId || null,
        inward_date: entry.inwardDate?.toISOString() || null,
        inward_amount: entry.inwardAmount ?? null,
        buyer: entry.buyer || null,
        outward_date: entry.outwardDate?.toISOString() || null,
        outward_amount: entry.outwardAmount ?? null,
        user_id: user.id, // Use user.id directly (already verified above)
      }).select();

      if (response.error) {
        console.error("Error adding entry:", response.error);
        console.error("User ID being used:", user.id);
        console.error("Supabase auth user:", supabaseUser?.id);
        
        // Handle specific error cases
        if (response.error.code === "23505") {
          if (response.error.message.includes("entries_pkey")) {
            showError("An entry with this IMEI already exists for your account.");
          } else if (response.error.message.includes("imei")) {
            showError("An entry with this IMEI already exists for your account.");
          } else {
            showError("Duplicate entry detected. Please check your data.");
          }
        } else if (response.error.code === "42501") {
          // RLS policy violation
          showError("Permission denied. Please ensure you're logged in and run 'supabase_fix_entries_rls.sql' in your Supabase dashboard.");
          console.error("RLS Policy Error Details:", {
            user_id: user.id,
            supabase_user_id: supabaseUser?.id,
            error: response.error
          });
        } else {
          showError(`Failed to add entry: ${response.error.message}`);
        }
        return false;
      }

      // Instead of just adding to local state, refresh all data from database
      await fetchEntries();
    } else {
      // Fallback to local storage
      const newEntry = { ...entry };
      const updatedDatabase = [...database, newEntry];
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }

    // Note: We don't automatically create brands/models/sellers/booking_persons here
    // because they are shared data and should be managed separately in the Manage Data page
    // The entry creation will fail if the brand/model/seller/booking_person doesn't exist,
    // which is the correct behavior - users should add them first in Manage Data

    showSuccess("Data entered successfully!");
    return true;
  };

  const bulkAddEntries = async (entries: EntryData[]): Promise<boolean> => {
    if (!entries || entries.length === 0) {
      showError("No entries provided for bulk import.");
      return false;
    }

    const existingImeis = new Set(database.map(e => e.imei));
    const validNewEntriesToInsert = entries.filter(entry => {
      // Filter out entries with missing IMEI or existing IMEI
      if (!entry.imei || existingImeis.has(entry.imei)) {
        if (entry.imei) {
          console.warn(`Skipping entry with IMEI '${entry.imei}' because it already exists.`);
        } else {
          console.warn("Skipping an entry due to missing IMEI.");
        }
        return false;
      }
      return true;
    });

    if (validNewEntriesToInsert.length === 0) {
      showError("No valid new entries found in the file to import (either already exist or missing IMEI).");
      return false;
    }

    const loadingToastId = showLoading(`Importing ${validNewEntriesToInsert.length} entries...`);

    try {
      // 1. Collect all unique brands, models, sellers, booking persons from new entries
      const uniqueBrands = new Set<string>();
      const uniqueModelsByBrand: Record<string, Set<string>> = {};
      const uniqueSellers = new Set<string>();
      const uniqueBookingPersons = new Set<string>();

      validNewEntriesToInsert.forEach(entry => {
        if (entry.brand) uniqueBrands.add(entry.brand);
        if (entry.brand && entry.model) {
          if (!uniqueModelsByBrand[entry.brand]) uniqueModelsByBrand[entry.brand] = new Set();
          uniqueModelsByBrand[entry.brand].add(entry.model);
        }
        if (entry.seller) uniqueSellers.add(entry.seller);
        if (entry.bookingPerson) uniqueBookingPersons.add(entry.bookingPerson);
      });

      // 2. Ensure all dependencies exist in Supabase (or local storage)
      // Process sequentially to avoid race conditions with duplicate key errors
      
      // First, create all brands
      for (const brand of uniqueBrands) {
        const result = await addBrandToSupabase(brand);
        if (!result) {
          console.warn(`Failed to add brand '${brand}', but continuing...`);
        }
      }
      
      // Then, create all models (brands must exist first)
      for (const brand in uniqueModelsByBrand) {
        for (const model of uniqueModelsByBrand[brand]) {
          const result = await addModelToSupabase(brand, model);
          if (!result) {
            console.warn(`Failed to add model '${model}' for brand '${brand}', but continuing...`);
          }
        }
      }
      
      // Create all sellers
      for (const seller of uniqueSellers) {
        const result = await addSellerToSupabase(seller);
        if (!result) {
          console.warn(`Failed to add seller '${seller}', but continuing...`);
        }
      }
      
      // Create all booking persons
      for (const person of uniqueBookingPersons) {
        const result = await addBookingPersonToSupabase(person);
        if (!result) {
          console.warn(`Failed to add booking person '${person}', but continuing...`);
        }
      }
      
      // Refresh data to ensure all newly created items are available for ID lookup
      // This is important because the ID lookup functions need the latest data
      if (refreshDependencies) {
        await refreshDependencies();
      } else if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
        // Fallback: wait a bit to ensure data is synced
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 3. Proceed with entries bulk insert
      if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
        const entriesToInsert = validNewEntriesToInsert
          .map(entry => {
            // Convert names to IDs
            const brandId = entry.brand && getBrandIdByName ? getBrandIdByName(entry.brand) : undefined;
            const modelId = entry.model && entry.brand && getModelIdByName ? getModelIdByName(entry.brand, entry.model) : undefined;
            const sellerId = entry.seller && getSellerIdByName ? getSellerIdByName(entry.seller) : undefined;
            const bookingPersonId = entry.bookingPerson && getBookingPersonIdByName ? getBookingPersonIdByName(entry.bookingPerson) : undefined;

            return {
              imei: entry.imei,
              brand_id: brandId || null,
              model_id: modelId || null,
              seller_id: sellerId || null,
              booking_person_id: bookingPersonId || null,
              inward_date: entry.inwardDate?.toISOString() || null,
              inward_amount: entry.inwardAmount ?? null,
              buyer: entry.buyer || null,
              outward_date: entry.outwardDate?.toISOString() || null,
              outward_amount: entry.outwardAmount ?? null,
              user_id: user?.id,
            };
          })
          .filter(entry => {
            // Filter out entries where required fields are missing
            // IMEI is always required, but brand/model/seller/booking_person can be null
            // However, if model_id is required by DB schema, we need to handle it
            return entry.imei && entry.imei.trim().length > 0;
          });

        if (entriesToInsert.length === 0) {
          showError("No valid entries to insert after filtering.");
          return false;
        }

        const { error: entriesInsertError } = await supabase.from("entries").insert(entriesToInsert).select();

        if (entriesInsertError) {
          console.error("Error bulk adding entries to Supabase:", entriesInsertError);
          showError(`Failed to import data: ${entriesInsertError.message || "Unknown database error"}`);
          return false;
        }

        // Instead of just adding to local state, refresh all data from database
        await fetchEntries();
      } else {
        // Fallback to local storage
        const updatedDatabase = [...database, ...validNewEntriesToInsert];
        setDatabase(updatedDatabase);
        localStorage.setItem("entries", JSON.stringify(updatedDatabase));
      }

      showSuccess(`${validNewEntriesToInsert.length} entries imported successfully!`);
      return true;
    } catch (error) {
      console.error("Error during bulk import:", error);
      showError("An unexpected error occurred during import. Check console for details.");
      return false;
    } finally {
      dismissToast(loadingToastId);
    }
  };

  const searchEntry = async (imei: string): Promise<EntryData | undefined> => {
    if (!imei) {
      showError("IMEI is required to search.");
      return undefined;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Fetch with joins to get names in a single query
      const response: any = await supabase
        .from("entries")
        .select(`
          *,
          brands:brand_id(name),
          models:model_id(name),
          sellers:seller_id(name),
          booking_persons:booking_person_id(name)
        `)
        .eq("imei", imei)
        .maybeSingle();

      if (response.error) {
        console.error("Error searching entry:", response.error);
        showError("No data found.");
        return undefined;
      }

      if (response.data) {
        showSuccess("Data found!");
        return {
          imei: response.data.imei,
          brand: response.data.brands?.name || response.data.brand || undefined,
          model: response.data.models?.name || response.data.model || undefined,
          seller: response.data.sellers?.name || response.data.seller || undefined,
          bookingPerson: response.data.booking_persons?.name || response.data.booking_person || undefined,
          inwardDate: parseSupabaseDate(response.data.inward_date),
          inwardAmount: response.data.inward_amount,
          buyer: response.data.buyer,
          outwardDate: parseSupabaseDate(response.data.outward_date),
          outwardAmount: response.data.outward_amount,
        };
      } else {
        showError("No data found.");
        return undefined;
      }
    } else {
      // Fallback to local storage
      const entry = database.find(e => e.imei === imei);
      if (entry) {
        showSuccess("Data found!");
        return entry;
      } else {
        showError("No data found.");
        return undefined;
      }
    }
  };

  const updateEntry = async (entry: EntryData): Promise<boolean> => {
    if (!entry.imei) {
      showError("IMEI is required to update.");
      return false;
    }

    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Convert names to IDs
      const brandId = entry.brand && getBrandIdByName ? getBrandIdByName(entry.brand) : undefined;
      const modelId = entry.model && entry.brand && getModelIdByName ? getModelIdByName(entry.brand, entry.model) : undefined;
      const sellerId = entry.seller && getSellerIdByName ? getSellerIdByName(entry.seller) : undefined;
      const bookingPersonId = entry.bookingPerson && getBookingPersonIdByName ? getBookingPersonIdByName(entry.bookingPerson) : undefined;

      const response: any = await supabase.from("entries").update({
        brand_id: brandId !== undefined ? (brandId || null) : undefined,
        model_id: modelId !== undefined ? (modelId || null) : undefined,
        seller_id: sellerId !== undefined ? (sellerId || null) : undefined,
        booking_person_id: bookingPersonId !== undefined ? (bookingPersonId || null) : undefined,
        inward_date: entry.inwardDate?.toISOString() || null,
        inward_amount: entry.inwardAmount ?? null,
        buyer: entry.buyer || null,
        outward_date: entry.outwardDate?.toISOString() || null,
        outward_amount: entry.outwardAmount ?? null,
      }).eq("imei", entry.imei);

      if (response.error) {
        console.error("Error updating entry:", response.error);
        showError("Failed to update data.");
        return false;
      }

      // Instead of just updating local state, refresh all data from database
      await fetchEntries();
    } else {
      // Fallback to local storage
      const updatedDatabase = database.map((e) => 
        e.imei === entry.imei ? entry : e
      );
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }

    // Note: We don't automatically create brands/models/sellers/booking_persons here
    // because they are shared data and should be managed separately in the Manage Data page

    showSuccess("Data updated successfully!");
    return true;
  };

  const deleteEntry = async (imei: string): Promise<boolean> => {
    if (!imei) {
      showError("IMEI is required to delete.");
      return false;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Soft delete: set is_deleted = true instead of actually deleting
      const response: any = await supabase
        .from("entries")
        .update({ is_deleted: true })
        .eq("imei", imei);

      if (response.error) {
        // If error is about is_deleted column not existing, try actual delete
        if (response.error.code === '42703' || response.error.message?.includes('column "is_deleted" does not exist')) {
          console.log("is_deleted column doesn't exist, performing hard delete...");
          const deleteResponse: any = await supabase
            .from("entries")
            .delete()
            .eq("imei", imei);
          
          if (deleteResponse.error) {
            console.error("Error deleting entry:", deleteResponse.error);
            showError("Failed to delete data.");
            return false;
          }
        } else {
          console.error("Error soft-deleting entry:", response.error);
          showError("Failed to delete data.");
          return false;
        }
      }

      // Instead of just updating local state, refresh all data from database
      await fetchEntries();
    } else {
      // Fallback to local storage - mark as deleted if entry has is_deleted property
      const updatedDatabase = database.map((entry) => {
        if (entry.imei === imei) {
          return { ...entry, is_deleted: true };
        }
        return entry;
      }).filter((entry) => !(entry as any).is_deleted); // Filter out deleted entries
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }
    
    showSuccess("Data deleted successfully!");
    return true;
  };

  const resetEntries = async () => {
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      const response: any = await supabase.from("entries").delete().neq("imei", "NON_EXISTENT_IMEI"); // Delete all entries
      if (response.error) {
        console.error("Error resetting entries:", response.error);
        showError("Failed to reset inventory entries.");
        return;
      }
    } else {
      // Fallback to local storage (resets all local entries)
      localStorage.removeItem("entries");
    }
    
    setDatabase([]);
    showSuccess("All inventory entries have been reset.");
  };

  return {
    database,
    addEntry,
    bulkAddEntries,
    searchEntry,
    updateEntry,
    deleteEntry,
    resetEntries,
    isLoading,
    fetchEntries,
  };
}