"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLE_NAME = "booking_persons";

export function useBookingPersons() {
  const [availableBookingPersons, setAvailableBookingPersons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchBookingPersons = useCallback(async () => {
    setIsLoading(true);
    
    // Only fetch if user is authenticated
    if (!user) {
      setAvailableBookingPersons([]);
      setIsLoading(false);
      return;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get all booking persons (no user filtering for reference data)
      const response: any = await supabase.from(TABLE_NAME).select("name").order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching booking persons:", response.error); // Detailed log
        showError("Failed to load booking persons.");
        setAvailableBookingPersons([]);
      } else {
        setAvailableBookingPersons((response.data || []).map((item: { name: string }) => item.name));
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedBookingPersons = localStorage.getItem("booking_persons");
      if (storedBookingPersons) {
        try {
          setAvailableBookingPersons(JSON.parse(storedBookingPersons));
        } catch (e) {
          console.error("Error parsing stored booking persons from local storage:", e); // Detailed log
          setAvailableBookingPersons([]);
        }
      }
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBookingPersons();
  }, [fetchBookingPersons]);

  const addBookingPerson = async (person: string): Promise<boolean> => {
    const trimmedPerson = person.trim();
    if (!trimmedPerson) {
      console.warn("Attempted to add an empty booking person name.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert({ name: trimmedPerson }, { onConflict: 'name', ignoreDuplicates: true })
        .select('name');

      if (upsertError) {
        console.error(`Supabase Error adding/upserting booking person '${trimmedPerson}':`, upsertError); // Detailed log
        showError(`Failed to add booking person '${trimmedPerson}' to database.`);
        return false;
      }

      if (data && data.length > 0) {
        setAvailableBookingPersons(prev => {
          if (!prev.includes(trimmedPerson)) {
            return [...prev, trimmedPerson].sort();
          }
          return prev;
        });
      } else {
        setAvailableBookingPersons(prev => {
          if (!prev.includes(trimmedPerson)) {
            return [...prev, trimmedPerson].sort();
          }
          return prev;
        });
      }
      return true;
    } else {
      // Fallback to local storage if Supabase is not configured
      if (availableBookingPersons.includes(trimmedPerson)) {
        return true;
      }
      const newBookingPersons = [...availableBookingPersons, trimmedPerson].sort();
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
      return true;
    }
  };

  const updateBookingPerson = async (oldPerson: string, newPerson: string): Promise<boolean> => {
    const trimmedNewPerson = newPerson.trim();
    if (!trimmedNewPerson) {
      showError("New Booking Person name cannot be empty.");
      return false;
    }
    if (availableBookingPersons.includes(trimmedNewPerson) && trimmedNewPerson !== oldPerson) {
      showError("Booking Person already exists.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewPerson }).eq("name", oldPerson);

      if (updateError) {
        console.error(`Supabase Error updating booking person from '${oldPerson}' to '${trimmedNewPerson}':`, updateError); // Detailed log
        showError("Failed to update booking person.");
        return false;
      }
    } else {
      const newBookingPersons = availableBookingPersons.map((p) => (p === oldPerson ? trimmedNewPerson : p)).sort();
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
    }

    setAvailableBookingPersons((prev) =>
      prev.map((p) => (p === oldPerson ? trimmedNewPerson : p)).sort()
    );
    showSuccess(`Booking Person '${oldPerson}' updated to '${trimmedNewPerson}'.`);
    return true;
  };

  const deleteBookingPerson = async (person: string): Promise<boolean> => {
    if (!availableBookingPersons.includes(person)) {
      showError("Booking Person not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete().eq("name", person);

      if (deleteError) {
        console.error(`Supabase Error deleting booking person '${person}':`, deleteError); // Detailed log
        showError("Failed to delete booking person.");
        return false;
      }
    } else {
      const newBookingPersons = availableBookingPersons.filter((p) => p !== person);
      setAvailableBookingPersons(newBookingPersons);
      localStorage.setItem("booking_persons", JSON.stringify(newBookingPersons));
    }

    setAvailableBookingPersons((prev) => prev.filter((p) => p !== person));
    showSuccess(`Booking Person '${person}' deleted.`);
    return true;
  };

  return {
    availableBookingPersons,
    setAvailableBookingPersons,
    addBookingPerson,
    updateBookingPerson,
    deleteBookingPerson,
    isLoading,
    fetchBookingPersons,
  };
}