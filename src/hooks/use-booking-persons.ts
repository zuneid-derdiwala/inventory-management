"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const TABLE_NAME = "booking_persons";

export interface BookingPerson {
  id: string;
  name: string;
}

export function useBookingPersons() {
  const [availableBookingPersons, setAvailableBookingPersons] = useState<BookingPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchBookingPersons = useCallback(async () => {
    setIsLoading(true);
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get booking persons filtered by is_deleted = false (visible to everyone, no user_id restriction)
      let query = supabase.from(TABLE_NAME).select("id, name");
      
      // Only show non-deleted booking persons
      query = query.eq('is_deleted', false);
      
      const response: any = await query.order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching booking persons:", response.error); // Detailed log
        showError("Failed to load booking persons.");
        setAvailableBookingPersons([]);
      } else {
        const bookingPersons = (response.data || []).map((item: { id: string; name: string }) => ({ id: item.id, name: item.name }));
        setAvailableBookingPersons(bookingPersons);
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedBookingPersons = localStorage.getItem("booking_persons");
      if (storedBookingPersons) {
        try {
          const parsed = JSON.parse(storedBookingPersons);
          // Convert old format (string[]) to new format (BookingPerson[])
          const converted = Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string'
            ? parsed.map((name: string, index: number) => ({ id: `local-${index}`, name }))
            : parsed;
          setAvailableBookingPersons(converted);
        } catch (e) {
          console.error("Error parsing stored booking persons from local storage:", e); // Detailed log
          setAvailableBookingPersons([]);
        }
      }
    }
    setIsLoading(false);
    setHasFetched(true);
  }, []); // Remove user dependency - fetch for everyone

  useEffect(() => {
    // Only fetch on initial mount, not on tab/route changes
    if (!hasFetched) {
      fetchBookingPersons();
    }
  }, [fetchBookingPersons, hasFetched]);

  const addBookingPerson = async (person: string): Promise<BookingPerson | null> => {
    const trimmedPerson = person.trim();
    if (!trimmedPerson) {
      console.warn("Attempted to add an empty booking person name.");
      return null;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // First, fetch all booking persons (including deleted) to check for case-insensitive matches
      const { data: allBookingPersons, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id, name, is_deleted');
      
      if (fetchError) {
        console.error("Error fetching booking persons:", fetchError);
      }
      
      // Find deleted booking person using case-insensitive comparison
      const deletedPerson = allBookingPersons?.find(
        bp => bp.name.toLowerCase() === trimmedPerson.toLowerCase() && bp.is_deleted === true
      );
      
      if (deletedPerson) {
        // Restore the deleted booking person
        const { data: restoredPerson, error: restoreError } = await supabase
          .from(TABLE_NAME)
          .update({ is_deleted: false })
          .eq('id', deletedPerson.id)
          .select('id, name')
          .single();
        
        if (restoreError) {
          console.error("Error restoring booking person:", restoreError);
          showError("Failed to restore booking person.");
          return null;
        }
        
        if (restoredPerson) {
          // Refresh the list
          await fetchBookingPersons();
          showSuccess(`Booking person '${restoredPerson.name}' restored.`);
          return { id: restoredPerson.id, name: restoredPerson.name };
        }
      }
      
      // Check if booking person already exists (non-deleted, case-insensitive comparison)
      const existingPerson = allBookingPersons?.find(
        bp => bp.name.toLowerCase() === trimmedPerson.toLowerCase() && bp.is_deleted === false
      );
      
      if (existingPerson) {
        // Booking person already exists, return it (don't show error, just return it)
        return { id: existingPerson.id, name: existingPerson.name };
      }
      
      // Booking person doesn't exist, insert it with created_at
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .insert({ 
          name: trimmedPerson, 
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
          // Fetch all booking persons to find case-insensitive match
          const { data: allBookingPersonsCheck } = await supabase
            .from(TABLE_NAME)
            .select('id, name, is_deleted');
          
          // Find deleted booking person (case-insensitive)
          const deletedPersonCheck = allBookingPersonsCheck?.find(
            bp => bp.name.toLowerCase() === trimmedPerson.toLowerCase() && bp.is_deleted === true
          );
          
          if (deletedPersonCheck) {
            // Restore it
            const { data: restored } = await supabase
              .from(TABLE_NAME)
              .update({ is_deleted: false })
              .eq('id', deletedPersonCheck.id)
              .select('id, name')
              .single();
            
            if (restored) {
              await fetchBookingPersons();
              showSuccess(`Booking person '${restored.name}' restored.`);
              return { id: restored.id, name: restored.name };
            }
          }
          
          // Find existing non-deleted booking person (case-insensitive)
          const existingPersonCheck = allBookingPersonsCheck?.find(
            bp => bp.name.toLowerCase() === trimmedPerson.toLowerCase() && bp.is_deleted === false
          );
          
          if (existingPersonCheck) {
            return { id: existingPersonCheck.id, name: existingPersonCheck.name };
          }
        }
        
        console.warn(`Supabase Error adding booking person '${trimmedPerson}':`, upsertError);
        showError(`Failed to add booking person: ${upsertError.message || 'Unknown error'}`);
        return null;
      }

      if (data && data.length > 0) {
        const newBookingPerson = { id: data[0].id, name: data[0].name };
        setAvailableBookingPersons(prev => {
          if (!prev.find(bp => bp.id === newBookingPerson.id || bp.name === newBookingPerson.name)) {
            return [...prev, newBookingPerson].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        return newBookingPerson;
      } else {
        // Booking person already exists, find and return it
        const existingBookingPerson = availableBookingPersons.find(bp => bp.name === trimmedPerson);
        return existingBookingPerson || null;
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const existingBookingPerson = availableBookingPersons.find(bp => bp.name === trimmedPerson);
      if (existingBookingPerson) {
        return existingBookingPerson;
      }
      const newBookingPerson: BookingPerson = { id: `local-${Date.now()}`, name: trimmedPerson };
      const newBookingPersons = [...availableBookingPersons, newBookingPerson].sort((a, b) => a.name.localeCompare(b.name));
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
      return newBookingPerson;
    }
  };

  const updateBookingPerson = async (bookingPersonId: string, newPerson: string): Promise<boolean> => {
    const trimmedNewPerson = newPerson.trim();
    if (!trimmedNewPerson) {
      showError("New Booking Person name cannot be empty.");
      return false;
    }
    const existingBookingPerson = availableBookingPersons.find(bp => bp.name === trimmedNewPerson && bp.id !== bookingPersonId);
    if (existingBookingPerson) {
      showError("Booking Person already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewPerson }).eq("id", bookingPersonId);

      if (updateError) {
        console.error(`Supabase Error updating booking person:`, updateError); // Detailed log
        showError("Failed to update booking person.");
        return false;
      }
    } else {
      const newBookingPersons = availableBookingPersons.map((bp) => (bp.id === bookingPersonId ? { ...bp, name: trimmedNewPerson } : bp)).sort((a, b) => a.name.localeCompare(b.name));
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
    }

    setAvailableBookingPersons((prev) =>
      prev.map((bp) => (bp.id === bookingPersonId ? { ...bp, name: trimmedNewPerson } : bp)).sort((a, b) => a.name.localeCompare(b.name))
    );
    const oldBookingPersonName = availableBookingPersons.find(bp => bp.id === bookingPersonId)?.name || bookingPersonId;
    showSuccess(`Booking Person '${oldBookingPersonName}' updated to '${trimmedNewPerson}'.`);
    return true;
  };

  const deleteBookingPerson = async (bookingPersonId: string): Promise<boolean> => {
    const bookingPerson = availableBookingPersons.find(bp => bp.id === bookingPersonId);
    if (!bookingPerson) {
      showError("Booking Person not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // Soft delete: set is_deleted = true instead of actually deleting
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .update({ is_deleted: true })
        .eq("id", bookingPersonId);

      if (deleteError) {
        console.error(`Supabase Error deleting booking person:`, deleteError); // Detailed log
        showError("Failed to delete booking person.");
        return false;
      }
    } else {
      const newBookingPersons = availableBookingPersons.filter((bp) => bp.id !== bookingPersonId);
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
    }

    // Remove from local state (it will be filtered out on next fetch)
    setAvailableBookingPersons((prev) => prev.filter((bp) => bp.id !== bookingPersonId));
    showSuccess(`Booking Person '${bookingPerson.name}' deleted.`);
    return true;
  };

  // Helper to get booking person names array (for backward compatibility)
  const getBookingPersonNames = (): string[] => {
    return availableBookingPersons.map(bp => bp.name);
  };

  // Helper to get booking person by name
  const getBookingPersonByName = (name: string): BookingPerson | undefined => {
    return availableBookingPersons.find(bp => bp.name === name);
  };

  // Helper to get booking person by id
  const getBookingPersonById = (id: string): BookingPerson | undefined => {
    return availableBookingPersons.find(bp => bp.id === id);
  };

  return {
    availableBookingPersons,
    setAvailableBookingPersons,
    addBookingPerson,
    updateBookingPerson,
    deleteBookingPerson,
    isLoading,
    fetchBookingPersons,
    getBookingPersonNames,
    getBookingPersonByName,
    getBookingPersonById,
  };
}