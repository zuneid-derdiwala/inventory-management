"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const TABLE_NAME = "sellers";

export interface Seller {
  id: string;
  name: string;
}

export function useSellers() {
  const [availableSellers, setAvailableSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchSellers = useCallback(async () => {
    setIsLoading(true);
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get sellers filtered by is_deleted = false (visible to everyone, no user_id restriction)
      let query = supabase.from(TABLE_NAME).select("id, name");
      
      // Only show non-deleted sellers
      query = query.eq('is_deleted', false);
      
      const response: any = await query.order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching sellers:", response.error); // Detailed log
        showError("Failed to load sellers.");
        setAvailableSellers([]);
      } else {
        const sellers = (response.data || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }));
        setAvailableSellers(sellers);
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedSellers = localStorage.getItem("sellers");
      if (storedSellers) {
        try {
          const parsed = JSON.parse(storedSellers);
          // Convert old format (string[]) to new format (Seller[])
          const convertedSellers = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string'
            ? parsed.map((name: string, index: number) => ({ id: `local-${index}`, name }))
            : parsed;
          setAvailableSellers(convertedSellers);
        } catch (e) {
          console.error("Error parsing stored sellers from local storage:", e); // Detailed log
          setAvailableSellers([]);
        }
      }
    }
    setIsLoading(false);
    setHasFetched(true);
  }, []); // Remove user dependency - fetch for everyone

  useEffect(() => {
    // Only fetch on initial mount, not on tab/route changes
    if (!hasFetched) {
      fetchSellers();
    }
  }, [fetchSellers, hasFetched]);

  const addSeller = async (seller: string): Promise<Seller | null> => {
    const trimmedSeller = seller.trim();
    if (!trimmedSeller) {
      console.warn("Attempted to add an empty seller name.");
      return null;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // First, fetch all sellers (including deleted) to check for case-insensitive matches
      const { data: allSellers, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id, name, is_deleted');
      
      if (fetchError) {
        console.error("Error fetching sellers:", fetchError);
      }
      
      // Find deleted seller using case-insensitive comparison
      const deletedSeller = allSellers?.find(
        s => s.name.toLowerCase() === trimmedSeller.toLowerCase() && s.is_deleted === true
      );
      
      if (deletedSeller) {
        // Restore the deleted seller
        const { data: restoredSeller, error: restoreError } = await supabase
          .from(TABLE_NAME)
          .update({ is_deleted: false })
          .eq('id', deletedSeller.id)
          .select('id, name')
          .single();
        
        if (restoreError) {
          console.error("Error restoring seller:", restoreError);
          showError("Failed to restore seller.");
          return null;
        }
        
        if (restoredSeller) {
          // Refresh the list
          await fetchSellers();
          showSuccess(`Seller '${restoredSeller.name}' restored.`);
          return { id: restoredSeller.id, name: restoredSeller.name };
        }
      }
      
      // Check if seller already exists (non-deleted, case-insensitive comparison)
      const existingSeller = allSellers?.find(
        s => s.name.toLowerCase() === trimmedSeller.toLowerCase() && s.is_deleted === false
      );
      
      if (existingSeller) {
        // Seller already exists, return it (don't show error, just return it)
        return { id: existingSeller.id, name: existingSeller.name };
      }
      
      // Seller doesn't exist, insert it with created_at
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .insert({ 
          name: trimmedSeller, 
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
          // Fetch all sellers to find case-insensitive match
          const { data: allSellersCheck } = await supabase
            .from(TABLE_NAME)
            .select('id, name, is_deleted');
          
          // Find deleted seller (case-insensitive)
          const deletedSellerCheck = allSellersCheck?.find(
            s => s.name.toLowerCase() === trimmedSeller.toLowerCase() && s.is_deleted === true
          );
          
          if (deletedSellerCheck) {
            // Restore it
            const { data: restored } = await supabase
              .from(TABLE_NAME)
              .update({ is_deleted: false })
              .eq('id', deletedSellerCheck.id)
              .select('id, name')
              .single();
            
            if (restored) {
              await fetchSellers();
              showSuccess(`Seller '${restored.name}' restored.`);
              return { id: restored.id, name: restored.name };
            }
          }
          
          // Find existing non-deleted seller (case-insensitive)
          const existingSellerCheck = allSellersCheck?.find(
            s => s.name.toLowerCase() === trimmedSeller.toLowerCase() && s.is_deleted === false
          );
          
          if (existingSellerCheck) {
            return { id: existingSellerCheck.id, name: existingSellerCheck.name };
          }
        }
        
        console.warn(`Supabase Error adding seller '${trimmedSeller}':`, upsertError);
        showError(`Failed to add seller: ${upsertError.message || 'Unknown error'}`);
        return null;
      }

      if (data && data.length > 0) {
        const newSeller = { id: data[0].id, name: data[0].name };
        setAvailableSellers(prev => {
          if (!prev.find(s => s.id === newSeller.id || s.name === newSeller.name)) {
            return [...prev, newSeller].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        return newSeller;
      } else {
        // Seller already exists, find and return it
        const existingSeller = availableSellers.find(s => s.name === trimmedSeller);
        return existingSeller || null;
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const existingSeller = availableSellers.find(s => s.name === trimmedSeller);
      if (existingSeller) {
        return existingSeller;
      }
      const newSeller: Seller = { id: `local-${Date.now()}`, name: trimmedSeller };
      const newSellers = [...availableSellers, newSeller].sort((a, b) => a.name.localeCompare(b.name));
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
      return newSeller;
    }
  };

  const updateSeller = async (sellerId: string, newSeller: string): Promise<boolean> => {
    const trimmedNewSeller = newSeller.trim();
    if (!trimmedNewSeller) {
      showError("New seller name cannot be empty.");
      return false;
    }
    const existingSeller = availableSellers.find(s => s.name === trimmedNewSeller && s.id !== sellerId);
    if (existingSeller) {
      showError("Seller already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewSeller }).eq("id", sellerId);

      if (updateError) {
        console.error(`Supabase Error updating seller:`, updateError); // Detailed log
        showError("Failed to update seller.");
        return false;
      }
    } else {
      const newSellers = availableSellers.map((s) => (s.id === sellerId ? { ...s, name: trimmedNewSeller } : s)).sort((a, b) => a.name.localeCompare(b.name));
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
    }

    setAvailableSellers((prev) =>
      prev.map((s) => (s.id === sellerId ? { ...s, name: trimmedNewSeller } : s)).sort((a, b) => a.name.localeCompare(b.name))
    );
    const oldSellerName = availableSellers.find(s => s.id === sellerId)?.name || sellerId;
    showSuccess(`Seller '${oldSellerName}' updated to '${trimmedNewSeller}'.`);
    return true;
  };

  const deleteSeller = async (sellerId: string): Promise<boolean> => {
    const seller = availableSellers.find(s => s.id === sellerId);
    if (!seller) {
      showError("Seller not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // Soft delete: set is_deleted = true instead of actually deleting
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .update({ is_deleted: true })
        .eq("id", sellerId);

      if (deleteError) {
        console.error(`Supabase Error deleting seller:`, deleteError); // Detailed log
        showError("Failed to delete seller.");
        return false;
      }
    } else {
      const newSellers = availableSellers.filter((s) => s.id !== sellerId);
      setAvailableSellers(newSellers);
      localStorage.setItem("sellers", JSON.stringify(newSellers));
    }

    // Remove from local state (it will be filtered out on next fetch)
    setAvailableSellers((prev) => prev.filter((s) => s.id !== sellerId));
    showSuccess(`Seller '${seller.name}' deleted.`);
    return true;
  };

  // Helper to get seller names array (for backward compatibility)
  const getSellerNames = (): string[] => {
    return availableSellers.map(s => s.name);
  };

  // Helper to get seller by name
  const getSellerByName = (name: string): Seller | undefined => {
    return availableSellers.find(s => s.name === name);
  };

  // Helper to get seller by id
  const getSellerById = (id: string): Seller | undefined => {
    return availableSellers.find(s => s.id === id);
  };

  return {
    availableSellers,
    setAvailableSellers,
    addSeller,
    updateSeller,
    deleteSeller,
    isLoading,
    fetchSellers,
    getSellerNames,
    getSellerByName,
    getSellerById,
  };
}