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
}: UseEntriesProps) {
  const [database, setDatabase] = useState<EntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

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
      const response: any = await supabase.from("entries").select("*").then((res: any) => res);

      if (response.error) {
        console.error("Error fetching entries:", response.error);
        showError("Failed to load inventory data.");
        setDatabase([]);
      } else {
        console.log("Raw entries data from Supabase:", response.data);
        const fetchedData: EntryData[] = (response.data || []).map((item: any) => ({
          imei: item.imei,
          brand: item.brand,
          model: item.model,
          seller: item.seller,
          bookingPerson: item.booking_person,
          inwardDate: parseSupabaseDate(item.inward_date),
          inwardAmount: item.inward_amount,
          buyer: item.buyer,
          outwardDate: parseSupabaseDate(item.outward_date),
          outwardAmount: item.outward_amount,
        }));
        console.log("Processed entries data:", fetchedData);
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
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const addEntry = async (entry: EntryData): Promise<boolean> => {
    if (!entry.imei) {
      showError("IMEI is required to add an entry.");
      return false;
    }
    if (database.some((e) => e.imei === entry.imei)) {
      showError("IMEI already entered.");
      return false;
    }

    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      const response: any = await supabase.from("entries").insert({
        imei: entry.imei,
        brand: entry.brand || null, // Explicitly null
        model: entry.model || null, // Explicitly null
        seller: entry.seller || null, // Explicitly null
        booking_person: entry.bookingPerson || null, // Explicitly null
        inward_date: entry.inwardDate?.toISOString() || null,
        inward_amount: entry.inwardAmount ?? null,
        buyer: entry.buyer || null,
        outward_date: entry.outwardDate?.toISOString() || null,
        outward_amount: entry.outwardAmount ?? null,
        user_id: user?.id, // Add user_id to the insert
      }).select();

      if (response.error) {
        console.error("Error adding entry:", response.error);
        showError("Failed to add entry.");
        return false;
      }

      setDatabase((prev) => [...prev, {
        ...entry,
        inwardDate: parseSupabaseDate(response.data?.[0]?.inward_date),
        outwardDate: parseSupabaseDate(response.data?.[0]?.outward_date),
      }]);
    } else {
      // Fallback to local storage
      const newEntry = { ...entry };
      const updatedDatabase = [...database, newEntry];
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }

    // Automatically add brand, model, seller, booking person to their respective lists
    if (entry.brand) addBrandToSupabase(entry.brand);
    if (entry.brand && entry.model) {
      addModelToSupabase(entry.brand, entry.model);
    }
    if (entry.seller) addSellerToSupabase(entry.seller);
    if (entry.bookingPerson) addBookingPersonToSupabase(entry.bookingPerson);

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
      const dependencyPromises: Promise<boolean>[] = [];

      Array.from(uniqueBrands).forEach(brand => {
        dependencyPromises.push(addBrandToSupabase(brand));
      });
      for (const brand in uniqueModelsByBrand) {
        Array.from(uniqueModelsByBrand[brand]).forEach(model => {
          dependencyPromises.push(addModelToSupabase(brand, model));
        });
      }
      Array.from(uniqueSellers).forEach(seller => {
        dependencyPromises.push(addSellerToSupabase(seller));
      });
      Array.from(uniqueBookingPersons).forEach(person => {
        dependencyPromises.push(addBookingPersonToSupabase(person));
      });

      const dependencyResults = await Promise.all(dependencyPromises);
      if (dependencyResults.some(result => !result)) {
        showError("Failed to add all necessary brands, models, sellers, or booking persons. Import aborted.");
        return false;
      }

      // 3. Proceed with entries bulk insert
      if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
        const { data, error: entriesInsertError } = await supabase.from("entries").insert(
          validNewEntriesToInsert.map(entry => ({
            imei: entry.imei,
            brand: entry.brand || null, // Explicitly null
            model: entry.model || null, // Explicitly null
            seller: entry.seller || null, // Explicitly null
            booking_person: entry.bookingPerson || null, // Explicitly null
            inward_date: entry.inwardDate?.toISOString() || null,
            inward_amount: entry.inwardAmount ?? null,
            buyer: entry.buyer || null,
            outward_date: entry.outwardDate?.toISOString() || null,
            outward_amount: entry.outwardAmount ?? null,
          }))
        ).select(); // .select() is important to get the inserted data back

        if (entriesInsertError) {
          console.error("Error bulk adding entries to Supabase:", entriesInsertError);
          showError(`Failed to import data: ${entriesInsertError.message || "Unknown database error"}`);
          return false;
        }

        const importedData: EntryData[] = (data || []).map((item: any) => ({
          imei: item.imei,
          brand: item.brand,
          model: item.model,
          seller: item.seller,
          bookingPerson: item.booking_person,
          inwardDate: parseSupabaseDate(item.inward_date),
          inwardAmount: item.inward_amount,
          buyer: item.buyer,
          outwardDate: parseSupabaseDate(item.outward_date),
          outwardAmount: item.outward_amount,
        }));

        setDatabase(prev => {
          const updatedDatabase = [...prev, ...importedData];
          return updatedDatabase;
        });
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
      const response: any = await supabase.from("entries").select("*").eq("imei", imei).single();

      if (response.error) {
        console.error("Error searching entry:", response.error);
        showError("No data found.");
        return undefined;
      }

      if (response.data) {
        showSuccess("Data found!");
        return {
          imei: response.data.imei,
          brand: response.data.brand,
          model: response.data.model,
          seller: response.data.seller,
          bookingPerson: response.data.booking_person,
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
      const response: any = await supabase.from("entries").update({
        brand: entry.brand || null, // Explicitly null
        model: entry.model || null, // Explicitly null
        seller: entry.seller || null, // Explicitly null
        booking_person: entry.bookingPerson || null, // Explicitly null
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

      setDatabase((prev) =>
        prev.map((e) => (e.imei === entry.imei ? {
          ...entry,
          inwardDate: entry.inwardDate,
          outwardDate: entry.outwardDate,
        } : e))
      );
    } else {
      // Fallback to local storage
      const updatedDatabase = database.map((e) => 
        e.imei === entry.imei ? entry : e
      );
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }

    // Automatically add brand, model, seller, booking person to their respective lists
    if (entry.brand) addBrandToSupabase(entry.brand);
    if (entry.brand && entry.model) {
      addModelToSupabase(entry.brand, entry.model);
    }
    if (entry.seller) addSellerToSupabase(entry.seller);
    if (entry.bookingPerson) addBookingPersonToSupabase(entry.bookingPerson);

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
      const response: any = await supabase.from("entries").delete().eq("imei", imei);

      if (response.error) {
        console.error("Error deleting entry:", response.error);
        showError("Failed to delete data.");
        return false;
      }

      setDatabase((prev) => prev.filter((entry) => entry.imei !== imei));
    } else {
      // Fallback to local storage
      const updatedDatabase = database.filter((entry) => entry.imei !== imei);
      setDatabase(updatedDatabase);
      localStorage.setItem("entries", JSON.stringify(updatedDatabase));
    }
    
    showSuccess("Data deleted!");
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