"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLE_NAME = "brands";

export function useBrands() {
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchBrands = useCallback(async () => {
    setIsLoading(true);
    
    // console.log("Fetching brands - User:", !!user, "Supabase client:", !!supabase);
    
    // Only fetch if user is authenticated
    if (!user) {
      console.log("No user authenticated, skipping brands fetch");
      setAvailableBrands([]);
      setIsLoading(false);
      return;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      const response: any = await supabase.from(TABLE_NAME).select("name").order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching brands:", response.error); // Detailed log
        showError("Failed to load brands.");
        setAvailableBrands([]);
      } else {
        const brands = (response.data || []).map((item: { name: string }) => item.name);
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
          console.log("Fetched brands from localStorage:", brands);
          setAvailableBrands(brands);
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
  }, [user]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const addBrand = async (brand: string): Promise<boolean> => {
    const trimmedBrand = brand.trim();
    if (!trimmedBrand) {
      console.warn("Attempted to add an empty brand name.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert({ name: trimmedBrand }, { onConflict: 'name', ignoreDuplicates: true })
        .select('name');

      if (upsertError) {
        console.error(`Supabase Error adding/upserting brand '${trimmedBrand}':`, upsertError); // Detailed log
        showError(`Failed to add brand '${trimmedBrand}' to database.`);
        return false;
      }

      if (data && data.length > 0) {
        setAvailableBrands(prev => {
          if (!prev.includes(trimmedBrand)) {
            return [...prev, trimmedBrand].sort();
          }
          return prev;
        });
      } else {
        setAvailableBrands(prev => {
          if (!prev.includes(trimmedBrand)) {
            return [...prev, trimmedBrand].sort();
          }
          return prev;
        });
      }
      return true;
    } else {
      // Fallback to local storage if Supabase is not configured
      if (availableBrands.includes(trimmedBrand)) {
        return true;
      }
      const newBrands = [...availableBrands, trimmedBrand].sort();
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
      return true;
    }
  };

  const updateBrand = async (oldBrand: string, newBrand: string): Promise<boolean> => {
    const trimmedNewBrand = newBrand.trim();
    if (!trimmedNewBrand) {
      showError("New brand name cannot be empty.");
      return false;
    }
    if (availableBrands.includes(trimmedNewBrand) && trimmedNewBrand !== oldBrand) {
      showError("Brand already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewBrand }).eq("name", oldBrand);

      if (updateError) {
        console.error(`Supabase Error updating brand from '${oldBrand}' to '${trimmedNewBrand}':`, updateError); // Detailed log
        showError("Failed to update brand.");
        return false;
      }
    } else {
      const newBrands = availableBrands.map((b) => (b === oldBrand ? trimmedNewBrand : b)).sort();
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
    }

    setAvailableBrands((prev) =>
      prev.map((b) => (b === oldBrand ? trimmedNewBrand : b)).sort()
    );
    showSuccess(`Brand '${oldBrand}' updated to '${trimmedNewBrand}'.`);
    return true;
  };

  const deleteBrand = async (brand: string): Promise<boolean> => {
    if (!availableBrands.includes(brand)) {
      showError("Brand not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete().eq("name", brand);

      if (deleteError) {
        console.error(`Supabase Error deleting brand '${brand}':`, deleteError); // Detailed log
        showError("Failed to delete brand.");
        return false;
      }
    } else {
      const newBrands = availableBrands.filter((b) => b !== brand);
      setAvailableBrands(newBrands);
      localStorage.setItem("brands", JSON.stringify(newBrands));
    }

    setAvailableBrands((prev) => prev.filter((b) => b !== brand));
    showSuccess(`Brand '${brand}' deleted.`);
    return true;
  };

  return {
    availableBrands,
    setAvailableBrands,
    addBrand,
    updateBrand,
    deleteBrand,
    isLoading,
    fetchBrands,
  };
}