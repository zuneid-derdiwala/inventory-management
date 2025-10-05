"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLE_NAME = "sellers";

export function useSellers() {
  const [availableSellers, setAvailableSellers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchSellers = useCallback(async () => {
    setIsLoading(true);
    
    // Only fetch if user is authenticated
    if (!user) {
      setAvailableSellers([]);
      setIsLoading(false);
      return;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get all sellers (no user filtering for reference data)
      const response: any = await supabase.from(TABLE_NAME).select("name").order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching sellers:", response.error); // Detailed log
        showError("Failed to load sellers.");
        setAvailableSellers([]);
      } else {
        setAvailableSellers((response.data || []).map((item: { name: string }) => item.name));
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedSellers = localStorage.getItem("sellers");
      if (storedSellers) {
        try {
          setAvailableSellers(JSON.parse(storedSellers));
        } catch (e) {
          console.error("Error parsing stored sellers from local storage:", e); // Detailed log
          setAvailableSellers([]);
        }
      }
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSellers();
  }, [fetchSellers]);

  const addSeller = async (seller: string): Promise<boolean> => {
    const trimmedSeller = seller.trim();
    if (!trimmedSeller) {
      console.warn("Attempted to add an empty seller name.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert({ name: trimmedSeller }, { onConflict: 'name', ignoreDuplicates: true })
        .select('name');

      if (upsertError) {
        console.error(`Supabase Error adding/upserting seller '${trimmedSeller}':`, upsertError); // Detailed log
        showError(`Failed to add seller '${trimmedSeller}' to database.`);
        return false;
      }

      if (data && data.length > 0) {
        setAvailableSellers(prev => {
          if (!prev.includes(trimmedSeller)) {
            return [...prev, trimmedSeller].sort();
          }
          return prev;
        });
      } else {
        setAvailableSellers(prev => {
          if (!prev.includes(trimmedSeller)) {
            return [...prev, trimmedSeller].sort();
          }
          return prev;
        });
      }
      return true;
    } else {
      // Fallback to local storage if Supabase is not configured
      if (availableSellers.includes(trimmedSeller)) {
        return true;
      }
      const newSellers = [...availableSellers, trimmedSeller].sort();
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
      return true;
    }
  };

  const updateSeller = async (oldSeller: string, newSeller: string): Promise<boolean> => {
    const trimmedNewSeller = newSeller.trim();
    if (!trimmedNewSeller) {
      showError("New seller name cannot be empty.");
      return false;
    }
    if (availableSellers.includes(trimmedNewSeller) && trimmedNewSeller !== oldSeller) {
      showError("Seller already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewSeller }).eq("name", oldSeller);

      if (updateError) {
        console.error(`Supabase Error updating seller from '${oldSeller}' to '${trimmedNewSeller}':`, updateError); // Detailed log
        showError("Failed to update seller.");
        return false;
      }
    } else {
      const newSellers = availableSellers.map((s) => (s === oldSeller ? trimmedNewSeller : s)).sort();
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
    }

    setAvailableSellers((prev) =>
      prev.map((s) => (s === oldSeller ? trimmedNewSeller : s)).sort()
    );
    showSuccess(`Seller '${oldSeller}' updated to '${trimmedNewSeller}'.`);
    return true;
  };

  const deleteSeller = async (seller: string): Promise<boolean> => {
    if (!availableSellers.includes(seller)) {
      showError("Seller not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete().eq("name", seller);

      if (deleteError) {
        console.error(`Supabase Error deleting seller '${seller}':`, deleteError); // Detailed log
        showError("Failed to delete seller.");
        return false;
      }
    } else {
      const newSellers = availableSellers.filter((s) => s !== seller);
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
    }

    setAvailableSellers((prev) => prev.filter((s) => s !== seller));
    showSuccess(`Seller '${seller}' deleted.`);
    return true;
  };

  return {
    availableSellers,
    setAvailableSellers,
    addSeller,
    updateSeller,
    deleteSeller,
    isLoading,
    fetchSellers,
  };
}