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
  const { availableBrands: brandsData, setAvailableBrands, addBrand: addBrandRaw, updateBrand: updateBrandRaw, deleteBrand: deleteBrandRaw, isLoading: isLoadingBrands, fetchBrands, getBrandNames, getBrandByName } = useBrands();
  const { availableModels: modelsData, setAvailableModels, addModel: addModelRaw, updateModel: updateModelRaw, deleteModel: deleteModelRaw, getModelsByBrand: getModelsByBrandRaw, isLoading: isLoadingModels, fetchModels } = useModels();
  const { availableSellers: sellersData, setAvailableSellers, addSeller: addSellerRaw, updateSeller: updateSellerRaw, deleteSeller: deleteSellerRaw, isLoading: isLoadingSellers, fetchSellers, getSellerNames, getSellerByName } = useSellers();
  const { availableBookingPersons: bookingPersonsData, setAvailableBookingPersons, addBookingPerson: addBookingPersonRaw, updateBookingPerson: updateBookingPersonRaw, deleteBookingPerson: deleteBookingPersonRaw, isLoading: isLoadingBookingPersons, fetchBookingPersons, getBookingPersonNames, getBookingPersonByName } = useBookingPersons();

  // Convert to string arrays for backward compatibility (useMemo to recompute when data changes)
  // Remove duplicates to prevent React key warnings
  const availableBrands = React.useMemo(() => {
    const brands = getBrandNames ? getBrandNames() : brandsData.map(b => b.name);
    return Array.from(new Set(brands)); // Remove duplicates
  }, [brandsData, getBrandNames]);

  const availableSellers = React.useMemo(() => {
    const sellers = getSellerNames ? getSellerNames() : sellersData.map(s => s.name);
    return Array.from(new Set(sellers)); // Remove duplicates
  }, [sellersData, getSellerNames]);

  const availableBookingPersons = React.useMemo(() => {
    const persons = getBookingPersonNames ? getBookingPersonNames() : bookingPersonsData.map(bp => bp.name);
    return Array.from(new Set(persons)); // Remove duplicates
  }, [bookingPersonsData, getBookingPersonNames]);
  
  // Convert models to Record<string, string[]> format
  const availableModels: Record<string, string[]> = React.useMemo(() => {
    const result: Record<string, string[]> = {};
    if (getModelsByBrandRaw) {
      // Use the helper function if available
      brandsData.forEach(brand => {
        result[brand.name] = getModelsByBrandRaw(brand.name);
      });
    } else {
      // Fallback: group models by brand_name
      modelsData.forEach(model => {
        if (model.brand_name) {
          if (!result[model.brand_name]) {
            result[model.brand_name] = [];
          }
          result[model.brand_name].push(model.name);
        }
      });
    }
    return result;
  }, [brandsData, modelsData, getModelsByBrandRaw]);

  const getModelsByBrand = React.useCallback((brandName: string): string[] => {
    return availableModels[brandName] || [];
  }, [availableModels]);

  // Wrapper functions to convert string inputs to ID-based operations
  const addBrand = async (brand: string): Promise<boolean> => {
    const result = await addBrandRaw(brand);
    return result !== null;
  };

  const updateBrand = async (oldBrand: string, newBrand: string): Promise<boolean> => {
    const brandObj = getBrandByName ? getBrandByName(oldBrand) : brandsData.find(b => b.name === oldBrand);
    if (!brandObj) return false;
    return await updateBrandRaw(brandObj.id, newBrand);
  };

  const deleteBrand = async (brand: string): Promise<boolean> => {
    const brandObj = getBrandByName ? getBrandByName(brand) : brandsData.find(b => b.name === brand);
    if (!brandObj) return false;
    return await deleteBrandRaw(brandObj.id);
  };

  const addModel = async (brand: string, model: string): Promise<boolean> => {
    const brandObj = getBrandByName ? getBrandByName(brand) : brandsData.find(b => b.name === brand);
    if (!brandObj) return false;
    const result = await addModelRaw(brandObj.id, model);
    return result !== null;
  };

  const updateModel = async (brand: string, oldModel: string, newModel: string): Promise<boolean> => {
    const brandObj = getBrandByName ? getBrandByName(brand) : brandsData.find(b => b.name === brand);
    if (!brandObj) return false;
    const modelObj = modelsData.find(m => m.brand_id === brandObj.id && m.name === oldModel);
    if (!modelObj) return false;
    return await updateModelRaw(modelObj.id, newModel);
  };

  const deleteModel = async (brand: string, model: string): Promise<boolean> => {
    const brandObj = getBrandByName ? getBrandByName(brand) : brandsData.find(b => b.name === brand);
    if (!brandObj) return false;
    const modelObj = modelsData.find(m => m.brand_id === brandObj.id && m.name === model);
    if (!modelObj) return false;
    return await deleteModelRaw(modelObj.id);
  };

  const addSeller = async (seller: string): Promise<boolean> => {
    const result = await addSellerRaw(seller);
    return result !== null;
  };

  const updateSeller = async (oldSeller: string, newSeller: string): Promise<boolean> => {
    const sellerObj = getSellerByName ? getSellerByName(oldSeller) : sellersData.find(s => s.name === oldSeller);
    if (!sellerObj) return false;
    return await updateSellerRaw(sellerObj.id, newSeller);
  };

  const deleteSeller = async (seller: string): Promise<boolean> => {
    const sellerObj = getSellerByName ? getSellerByName(seller) : sellersData.find(s => s.name === seller);
    if (!sellerObj) return false;
    return await deleteSellerRaw(sellerObj.id);
  };

  const addBookingPerson = async (person: string): Promise<boolean> => {
    const result = await addBookingPersonRaw(person);
    return result !== null;
  };

  const updateBookingPerson = async (oldPerson: string, newPerson: string): Promise<boolean> => {
    const personObj = getBookingPersonByName ? getBookingPersonByName(oldPerson) : bookingPersonsData.find(bp => bp.name === oldPerson);
    if (!personObj) return false;
    return await updateBookingPersonRaw(personObj.id, newPerson);
  };

  const deleteBookingPerson = async (person: string): Promise<boolean> => {
    const personObj = getBookingPersonByName ? getBookingPersonByName(person) : bookingPersonsData.find(bp => bp.name === person);
    if (!personObj) return false;
    return await deleteBookingPersonRaw(personObj.id);
  };

  // Helper functions to get IDs from names
  const getBrandIdByName = (name: string): string | undefined => {
    const brand = getBrandByName ? getBrandByName(name) : brandsData.find(b => b.name === name);
    return brand?.id;
  };

  const getModelIdByName = (brandName: string, modelName: string): string | undefined => {
    const brand = getBrandByName ? getBrandByName(brandName) : brandsData.find(b => b.name === brandName);
    if (!brand) return undefined;
    const model = modelsData.find(m => m.brand_id === brand.id && m.name === modelName);
    return model?.id;
  };

  const getSellerIdByName = (name: string): string | undefined => {
    const seller = getSellerByName ? getSellerByName(name) : sellersData.find(s => s.name === name);
    return seller?.id;
  };

  const getBookingPersonIdByName = (name: string): string | undefined => {
    const person = getBookingPersonByName ? getBookingPersonByName(name) : bookingPersonsData.find(bp => bp.name === name);
    return person?.id;
  };

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
    getBrandIdByName,
    getModelIdByName,
    getSellerIdByName,
    getBookingPersonIdByName,
    refreshDependencies: async () => {
      // Refresh all dependency data after bulk creation
      await Promise.all([
        fetchBrands(),
        fetchModels(),
        fetchSellers(),
        fetchBookingPersons(),
      ]);
    },
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
      setAvailableModels([]);
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
      setAvailableModels([]);
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
        // Refresh models from database after deletion
        await fetchModels();
      } else {
        // Fallback to local storage
        // Update the Model[] array by filtering out models with matching brand_name
        setAvailableModels(prev => prev.filter(m => m.brand_name !== brand));
        // Also update local storage if needed
        const currentModels = { ...availableModels };
        delete currentModels[brand];
        localStorage.setItem("models", JSON.stringify(currentModels));
      }
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