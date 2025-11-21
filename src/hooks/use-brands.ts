"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const TABLE_NAME = "brands";

export interface Brand {
  id: string;
  name: string;
}

export function useBrands() {
  const [availableBrands, setAvailableBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get brands (visible to everyone, no user_id restriction)
      // Try with is_deleted filter first, fallback if column doesn't exist
      let query = supabase.from(TABLE_NAME).select("id, name");
      
      // Only show non-deleted brands (if column exists)
      query = query.eq('is_deleted', false);
      
      const response: any = await query.order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching brands:", response.error);
        
        // If error is about is_deleted column not existing, try without filter
        if (response.error.code === '42703' || response.error.message?.includes('column "is_deleted" does not exist')) {
          console.log("is_deleted column doesn't exist, fetching all brands...");
          const retryResponse: any = await supabase
            .from(TABLE_NAME)
            .select("id, name")
            .order("name", { ascending: true });
          
          if (retryResponse.error) {
            console.error("Supabase Error fetching brands (retry):", retryResponse.error);
            showError(`Failed to load brands: ${retryResponse.error.message}`);
            setAvailableBrands([]);
          } else {
            const brands = (retryResponse.data || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }));
            console.log("Fetched brands from Supabase (without is_deleted filter):", brands);
            setAvailableBrands(brands);
          }
        } else {
          console.error("Supabase Error details:", response.error);
          showError(`Failed to load brands: ${response.error.message || 'Unknown error'}`);
          setAvailableBrands([]);
        }
      } else {
        const brands = (response.data || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }));
        console.log("Fetched brands from Supabase:", brands);
        setAvailableBrands(brands);
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      console.log("Supabase not configured, falling back to localStorage");
      const storedBrands = localStorage.getItem("brands");
      if (storedBrands) {
        try {
          const brands = JSON.parse(storedBrands);
          // Convert old format (string[]) to new format (Brand[])
          const convertedBrands = Array.isArray(brands) && brands.length > 0 && typeof brands[0] === 'string'
            ? brands.map((name: string, index: number) => ({ id: `local-${index}`, name }))
            : brands;
          console.log("Fetched brands from localStorage:", convertedBrands);
          setAvailableBrands(convertedBrands);
        } catch (e) {
          console.error("Error parsing stored brands from local storage:", e); // Detailed log
          setAvailableBrands([]);
        }
      } else {
        console.log("No brands found in localStorage");
        setAvailableBrands([]);
      }
    }
    setIsLoading(false);
    setHasFetched(true);
  }, []); // Remove user dependency - fetch for everyone

  useEffect(() => {
    // Only fetch on initial mount, not on tab/route changes
    if (!hasFetched) {
      fetchBrands();
    }
  }, [fetchBrands, hasFetched]);

  const addBrand = async (brand: string): Promise<Brand | null> => {
    const trimmedBrand = brand.trim();
    if (!trimmedBrand) {
      console.warn("Attempted to add an empty brand name.");
      return null;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // First, fetch all brands (including deleted) to check for case-insensitive matches
      const { data: allBrands, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id, name, is_deleted');
      
      if (fetchError) {
        console.error("Error fetching brands:", fetchError);
      }
      
      // Find deleted brand using case-insensitive comparison
      const deletedBrand = allBrands?.find(
        b => b.name.toLowerCase() === trimmedBrand.toLowerCase() && b.is_deleted === true
      );
      
      if (deletedBrand) {
        // Restore the deleted brand
        const { data: restoredBrand, error: restoreError } = await supabase
          .from(TABLE_NAME)
          .update({ is_deleted: false })
          .eq('id', deletedBrand.id)
          .select('id, name')
          .single();
        
        if (restoreError) {
          console.error("Error restoring brand:", restoreError);
          showError("Failed to restore brand.");
          return null;
        }
        
        if (restoredBrand) {
          // Refresh the list
          await fetchBrands();
          showSuccess(`Brand '${restoredBrand.name}' restored.`);
          return { id: restoredBrand.id, name: restoredBrand.name };
        }
      }
      
      // Check if brand already exists (non-deleted, case-insensitive comparison)
      const existingBrand = allBrands?.find(
        b => b.name.toLowerCase() === trimmedBrand.toLowerCase() && b.is_deleted === false
      );
      
      if (existingBrand) {
        // Brand already exists, return it (don't show error, just return it)
        return { id: existingBrand.id, name: existingBrand.name };
      }
      
      // Brand doesn't exist, insert it with created_at
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .insert({ 
          name: trimmedBrand, 
          created_at: new Date().toISOString(),
          is_deleted: false
        })
        .select('id, name');

      if (upsertError) {
        // If error is duplicate key, check for deleted entry to restore (case-insensitive)
        const isDuplicateError = upsertError.code === '23505' || 
                                 upsertError.code === 'PGRST116' || 
                                 upsertError.message?.includes('duplicate key') ||
                                 upsertError.message?.includes('already exists');
        
        if (isDuplicateError) {
          // Fetch all brands to find case-insensitive match
          const { data: allBrandsCheck } = await supabase
            .from(TABLE_NAME)
            .select('id, name, is_deleted');
          
          // Find deleted brand (case-insensitive)
          const deletedBrandCheck = allBrandsCheck?.find(
            b => b.name.toLowerCase() === trimmedBrand.toLowerCase() && b.is_deleted === true
          );
          
          if (deletedBrandCheck) {
            // Restore it
            const { data: restored } = await supabase
              .from(TABLE_NAME)
              .update({ is_deleted: false })
              .eq('id', deletedBrandCheck.id)
              .select('id, name')
              .single();
            
            if (restored) {
              await fetchBrands();
              showSuccess(`Brand '${restored.name}' restored.`);
              return { id: restored.id, name: restored.name };
            }
          }
          
          // Find existing non-deleted brand (case-insensitive)
          const existingBrandCheck = allBrandsCheck?.find(
            b => b.name.toLowerCase() === trimmedBrand.toLowerCase() && b.is_deleted === false
          );
          
          if (existingBrandCheck) {
            return { id: existingBrandCheck.id, name: existingBrandCheck.name };
          }
        }
        
        console.warn(`Supabase Error adding brand '${trimmedBrand}':`, upsertError);
        showError(`Failed to add brand: ${upsertError.message || 'Unknown error'}`);
        return null;
      }

      if (data && data.length > 0) {
        const newBrand = { id: data[0].id, name: data[0].name };
        setAvailableBrands(prev => {
          if (!prev.find(b => b.id === newBrand.id || b.name === newBrand.name)) {
            return [...prev, newBrand].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        return newBrand;
      } else {
        // Brand already exists, find and return it
        const existingBrand = availableBrands.find(b => b.name === trimmedBrand);
        return existingBrand || null;
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const existingBrand = availableBrands.find(b => b.name === trimmedBrand);
      if (existingBrand) {
        return existingBrand;
      }
      const newBrand: Brand = { id: `local-${Date.now()}`, name: trimmedBrand };
      const newBrands = [...availableBrands, newBrand].sort((a, b) => a.name.localeCompare(b.name));
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
      return newBrand;
    }
  };

  const updateBrand = async (oldBrandId: string, newBrand: string): Promise<boolean> => {
    const trimmedNewBrand = newBrand.trim();
    if (!trimmedNewBrand) {
      showError("New brand name cannot be empty.");
      return false;
    }
    const existingBrand = availableBrands.find(b => b.name === trimmedNewBrand && b.id !== oldBrandId);
    if (existingBrand) {
      showError("Brand already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewBrand }).eq("id", oldBrandId);

      if (updateError) {
        console.error(`Supabase Error updating brand:`, updateError); // Detailed log
        showError("Failed to update brand.");
        return false;
      }
    } else {
      const newBrands = availableBrands.map((b) => (b.id === oldBrandId ? { ...b, name: trimmedNewBrand } : b)).sort((a, b) => a.name.localeCompare(b.name));
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
    }

    setAvailableBrands((prev) =>
      prev.map((b) => (b.id === oldBrandId ? { ...b, name: trimmedNewBrand } : b)).sort((a, b) => a.name.localeCompare(b.name))
    );
    const oldBrandName = availableBrands.find(b => b.id === oldBrandId)?.name || oldBrandId;
    showSuccess(`Brand '${oldBrandName}' updated to '${trimmedNewBrand}'.`);
    return true;
  };

  const deleteBrand = async (brandId: string): Promise<boolean> => {
    const brand = availableBrands.find(b => b.id === brandId);
    if (!brand) {
      showError("Brand not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // Soft delete: set is_deleted = true instead of actually deleting
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .update({ is_deleted: true })
        .eq("id", brandId);

      if (deleteError) {
        console.error(`Supabase Error deleting brand:`, deleteError); // Detailed log
        showError("Failed to delete brand.");
        return false;
      }
    } else {
      const newBrands = availableBrands.filter((b) => b.id !== brandId);
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
    }

    // Remove from local state (it will be filtered out on next fetch)
    setAvailableBrands((prev) => prev.filter((b) => b.id !== brandId));
    showSuccess(`Brand '${brand.name}' deleted.`);
    return true;
  };

  // Helper to get brand names array (for backward compatibility)
  const getBrandNames = (): string[] => {
    return availableBrands.map(b => b.name);
  };

  // Helper to get brand by name
  const getBrandByName = (name: string): Brand | undefined => {
    return availableBrands.find(b => b.name === name);
  };

  // Helper to get brand by id
  const getBrandById = (id: string): Brand | undefined => {
    return availableBrands.find(b => b.id === id);
  };

  return {
    availableBrands,
    setAvailableBrands,
    addBrand,
    updateBrand,
    deleteBrand,
    isLoading,
    fetchBrands,
    getBrandNames,
    getBrandByName,
    getBrandById,
  };
}