"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useEntries } from "@/hooks/use-entries";
import { useBrands } from "@/hooks/use-brands";
import { useModels } from "@/hooks/use-models";
import { useSellers } from "@/hooks/use-sellers";
import { useBookingPersons } from "@/hooks/use-booking-persons";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface EntryData {
  imei: string;
  brand: string | undefined; // Made optional
  model: string | undefined; // Made optional
  seller: string | undefined; // Made optional
  bookingPerson: string | undefined; // Made optional
  inwardDate: Date | undefined;
  inwardAmount: number | undefined;
  buyer: string | undefined; // Already optional, but explicitly set to undefined for consistency
  outwardDate: Date | undefined;
  outwardAmount: number | undefined;
}

interface DataContextType {
  database: EntryData[];
  addEntry: (entry: EntryData) => Promise<boolean>;
  bulkAddEntries: (entries: EntryData[]) => Promise<boolean>;
  searchEntry: (imei: string) => Promise<EntryData | undefined>;
  updateEntry: (entry: EntryData) => Promise<boolean>;
  deleteEntry: (imei: string) => Promise<boolean>;
  resetAllData: () => Promise<void>;
  availableBrands: string[];
  addBrand: (brand: string) => Promise<boolean>;
  updateBrand: (oldBrand: string, newBrand: string) => Promise<boolean>;
  deleteBrand: (brand: string) => Promise<boolean>;
  availableModels: Record<string, string[]>;
  addModel: (brand: string, model: string) => Promise<boolean>;
  updateModel: (brand: string, oldModel: string, newModel: string) => Promise<boolean>;
  deleteModel: (brand: string, model: string) => Promise<boolean>;
  getModelsByBrand: (brand: string) => string[];
  availableSellers: string[];
  addSeller: (seller: string) => Promise<boolean>;
  updateSeller: (oldSeller: string, newSeller: string) => Promise<boolean>;
  deleteSeller: (seller: string) => Promise<boolean>;
  availableBookingPersons: string[];
  addBookingPerson: (person: string) => Promise<boolean>;
  updateBookingPerson: (oldPerson: string, newPerson: string) => Promise<boolean>;
  deleteBookingPerson: (person: string) => Promise<boolean>;
  isLoadingData: boolean;
  isResetting: boolean; // New state for reset operation
  fetchEntries: () => Promise<void>; // Added
  fetchBrands: () => Promise<void>; // Added
  fetchModels: () => Promise<void>; // Added
  fetchSellers: () => Promise<void>; // Added
  fetchBookingPersons: () => Promise<void>; // Added
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { availableBrands, setAvailableBrands, addBrand, updateBrand, deleteBrand, isLoading: isLoadingBrands, fetchBrands } = useBrands();
  const { availableModels, setAvailableModels, addModel, updateModel, deleteModel, getModelsByBrand, isLoading: isLoadingModels, fetchModels } = useModels();
  const { availableSellers, setAvailableSellers, addSeller, updateSeller, deleteSeller, isLoading: isLoadingSellers, fetchSellers } = useSellers();
  const { availableBookingPersons, setAvailableBookingPersons, addBookingPerson, updateBookingPerson, deleteBookingPerson, isLoading: isLoadingBookingPersons, fetchBookingPersons } = useBookingPersons();

  const {
    database,
    addEntry,
    bulkAddEntries,
    searchEntry,
    updateEntry,
    deleteEntry,
    resetEntries,
    isLoading: isLoadingEntries,
    fetchEntries,
  } = useEntries({
    addBrandToSupabase: addBrand,
    addModelToSupabase: addModel,
    addSellerToSupabase: addSeller,
    addBookingPersonToSupabase: addBookingPerson,
  });

  const [isResetting, setIsResetting] = useState(false); // Initialize new state

  // Refresh all data when user changes (login/logout)
  useEffect(() => {
    if (user) {
      // User logged in, fetch all data
      Promise.all([
        fetchEntries(),
        fetchBrands(),
        fetchModels(),
        fetchSellers(),
        fetchBookingPersons(),
      ]).catch(error => {
        console.error("Error refreshing data after login:", error);
      });
    } else {
      // User logged out, clear all data
      setAvailableBrands([]);
      setAvailableModels({});
      setAvailableSellers([]);
      setAvailableBookingPersons([]);
    }
  }, [user, fetchEntries, fetchBrands, fetchModels, fetchSellers, fetchBookingPersons, setAvailableBrands, setAvailableModels, setAvailableSellers, setAvailableBookingPersons]);

  const isLoadingData = isLoadingBrands || isLoadingModels || isLoadingSellers || isLoadingBookingPersons || isLoadingEntries || isResetting;

  const resetAllData = async () => {
    setIsResetting(true); // Set resetting to true
    const loadingToastId = showLoading("Resetting all data...");
    try {
      // Check if supabase is properly configured
      if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
        // Delete all entries
        const { error: entriesError } = await supabase.from("entries").delete().neq("imei", "NON_EXISTENT_IMEI");
        if (entriesError) throw entriesError;

        // Delete all brands
        const { error: brandsError } = await supabase.from("brands").delete().neq("name", "NON_EXISTENT_BRAND");
        if (brandsError) throw brandsError;

        // Delete all models
        const { error: modelsError } = await supabase.from("models").delete().neq("name", "NON_EXISTENT_MODEL");
        if (modelsError) throw modelsError;

        // Delete all sellers
        const { error: sellersError } = await supabase.from("sellers").delete().neq("name", "NON_EXISTENT_SELLER");
        if (sellersError) throw sellersError;

        // Delete all booking persons
        const { error: bookingPersonsError } = await supabase.from("booking_persons").delete().neq("name", "NON_EXISTENT_PERSON");
        if (bookingPersonsError) throw bookingPersonsError;
      } else {
        // Fallback to local storage (resets all local data)
        localStorage.removeItem("entries");
        localStorage.removeItem("brands");
        localStorage.removeItem("models");
        localStorage.removeItem("sellers");
        localStorage.removeItem("booking_persons");
      }

      // Reset local states after successful deletion
      resetEntries(); // This clears `database` state in useEntries
      setAvailableBrands([]);
      setAvailableModels({});
      setAvailableSellers([]);
      setAvailableBookingPersons([]);

      // Add a small delay to allow database operations to fully settle
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

      // Explicitly re-fetch data to synchronize local state with the now empty database
      await Promise.all([
        fetchEntries(),
        fetchBrands(),
        fetchModels(),
        fetchSellers(),
        fetchBookingPersons(),
      ]);

      showSuccess("All data has been reset.");
    } catch (error) {
      console.error("Error resetting all data:", error);
      showError("Failed to reset all data.");
    } finally {
      dismissToast(loadingToastId);
      setIsResetting(false); // Set resetting to false
    }
  };

  // Override deleteBrand and deleteModel to also remove associated models/entries if needed
  const deleteBrandAndModels = async (brand: string): Promise<boolean> => {
    const success = await deleteBrand(brand);
    if (success) {
      // Also delete models associated with this brand
      // Check if supabase is properly configured
      if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
        const { error } = await supabase.from("models").delete().eq("brand_name", brand);
        if (error) {
          console.error("Error deleting models for brand:", error);
          showError(`Brand '${brand}' deleted, but failed to delete associated models.`);
          return false;
        }
      } else {
        // Fallback to local storage
        const currentModels = { ...availableModels };
        delete currentModels[brand];
        setAvailableModels(currentModels);
        localStorage.setItem("models", JSON.stringify(currentModels));
      }
      
      setAvailableModels(prev => {
        const updatedModels = { ...prev };
        delete updatedModels[brand];
        return updatedModels;
      });
    }
    return success;
  };

  const deleteModelFromBrand = async (brand: string, model: string): Promise<boolean> => {
    const success = await deleteModel(brand, model);
    return success;
  };

  return (
    <DataContext.Provider
      value={{
        database,
        addEntry,
        bulkAddEntries,
        searchEntry,
        updateEntry,
        deleteEntry,
        resetAllData,
        availableBrands,
        addBrand,
        updateBrand,
        deleteBrand: deleteBrandAndModels,
        availableModels,
        addModel,
        updateModel,
        deleteModel: deleteModelFromBrand,
        getModelsByBrand,
        availableSellers,
        addSeller,
        updateSeller,
        deleteSeller,
        availableBookingPersons,
        addBookingPerson,
        updateBookingPerson,
        deleteBookingPerson,
        isLoadingData,
        isResetting, // Expose isResetting
        fetchEntries, // Exposed
        fetchBrands, // Exposed
        fetchModels, // Exposed
        fetchSellers, // Exposed
        fetchBookingPersons, // Exposed
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};