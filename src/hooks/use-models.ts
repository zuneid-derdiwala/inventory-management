"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const TABLE_NAME = "models";

export function useModels() {
  const [availableModels, setAvailableModels] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchModels = useCallback(async () => {
    setIsLoading(true);
    
    // Only fetch if user is authenticated
    if (!user) {
      setAvailableModels({});
      setIsLoading(false);
      return;
    }
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      // Get all models (no user filtering for reference data)
      const response: any = await supabase.from(TABLE_NAME).select("brand_name, name").order("brand_name", { ascending: true }).order("name", { ascending: true });

      if (response.error) {
        console.error("Supabase Error fetching models:", response.error); // Detailed log
        showError("Failed to load models.");
        setAvailableModels({});
      } else {
        const modelsByBrand: Record<string, string[]> = {};
        (response.data || []).forEach((item: { brand_name: string; name: string }) => {
          if (!modelsByBrand[item.brand_name]) {
            modelsByBrand[item.brand_name] = [];
          }
          modelsByBrand[item.brand_name].push(item.name);
        });
        setAvailableModels(modelsByBrand);
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const storedModels = localStorage.getItem("models");
      if (storedModels) {
        try {
          setAvailableModels(JSON.parse(storedModels));
        } catch (e) {
          console.error("Error parsing stored models from local storage:", e); // Detailed log
          setAvailableModels({});
        }
      }
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const addModel = async (brand: string, model: string): Promise<boolean> => {
    const trimmedModel = model.trim();
    if (!brand) {
      console.warn("Attempted to add model without a brand.");
      return false;
    }
    if (!trimmedModel) {
      console.warn(`Attempted to add an empty model name for brand '${brand}'.`);
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .upsert({ brand_name: brand, name: trimmedModel }, { onConflict: 'brand_name,name', ignoreDuplicates: true })
        .select('brand_name, name');

      if (upsertError) {
        console.error(`Supabase Error adding/upserting model '${trimmedModel}' for brand '${brand}':`, upsertError); // Detailed log
        showError(`Failed to add model '${trimmedModel}' to database.`);
        return false;
      }

      if (data && data.length > 0) {
        setAvailableModels(prev => {
          const updatedModels = { ...prev };
          if (!updatedModels[brand]?.includes(trimmedModel)) {
            updatedModels[brand] = [...(updatedModels[brand] || []), trimmedModel].sort();
          }
          return updatedModels;
        });
      } else {
        setAvailableModels(prev => {
          const updatedModels = { ...prev };
          if (!updatedModels[brand]?.includes(trimmedModel)) {
            updatedModels[brand] = [...(updatedModels[brand] || []), trimmedModel].sort();
          }
          return updatedModels;
        });
      }
      return true;
    } else {
      // Fallback to local storage if Supabase is not configured
      const brandModels = availableModels[brand] || [];
      if (brandModels.includes(trimmedModel)) {
        return true;
      }
      const updatedModels = { ...availableModels };
      updatedModels[brand] = [...brandModels, trimmedModel].sort();
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
      return true;
    }
  };

  const updateModel = async (brand: string, oldModel: string, newModel: string): Promise<boolean> => {
    const trimmedNewModel = newModel.trim();
    if (!brand) {
      showError("Brand is required to update a model.");
      return false;
    }
    if (!trimmedNewModel) {
      showError("New model name cannot be empty.");
      return false;
    }
    const brandModels = availableModels[brand] || [];
    if (!brandModels.includes(oldModel)) {
      showError(`Model '${oldModel}' not found for brand '${brand}'.`);
      return false;
    }
    if (brandModels.includes(trimmedNewModel) && trimmedNewModel !== oldModel) {
      showError(`Model '${trimmedNewModel}' already exists for brand '${brand}'.`);
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewModel })
        .eq("brand_name", brand)
        .eq("name", oldModel);

      if (updateError) {
        console.error(`Supabase Error updating model from '${oldModel}' to '${trimmedNewModel}' for brand '${brand}':`, updateError); // Detailed log
        showError("Failed to update model.");
        return false;
      }
    } else {
      const updatedModels = { ...availableModels };
      updatedModels[brand] = brandModels.map((m) => (m === oldModel ? trimmedNewModel : m)).sort();
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
    }

    setAvailableModels(prev => {
      const updatedModels = { ...prev };
      updatedModels[brand] = brandModels.map((m) => (m === oldModel ? trimmedNewModel : m)).sort();
      return updatedModels;
    });
    showSuccess(`Model '${oldModel}' updated to '${trimmedNewModel}' for brand '${brand}'.`);
    return true;
  };

  const deleteModel = async (brand: string, model: string): Promise<boolean> => {
    if (!brand) {
      showError("Brand is required to delete a model.");
      return false;
    }
    const brandModels = availableModels[brand] || [];
    if (!brandModels.includes(model)) {
      showError(`Model '${model}' not found for brand '${brand}'.`);
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: deleteError } = await supabase.from(TABLE_NAME).delete()
        .eq("brand_name", brand)
        .eq("name", model);

      if (deleteError) {
        console.error(`Supabase Error deleting model '${model}' from brand '${brand}':`, deleteError); // Detailed log
        showError("Failed to delete model.");
        return false;
      }
    } else {
      const updatedModels = { ...availableModels };
      updatedModels[brand] = brandModels.filter((m) => m !== model);
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
    }

    setAvailableModels(prev => {
      const updatedModels = { ...prev };
      updatedModels[brand] = brandModels.filter((m) => m !== model);
      return updatedModels;
    });
    showSuccess(`Model '${model}' deleted from brand '${brand}'.`);
    return true;
  };

  const getModelsByBrand = (brand: string): string[] => {
    return availableModels[brand] || [];
  };

  return {
    availableModels,
    setAvailableModels,
    addModel,
    updateModel,
    deleteModel,
    getModelsByBrand,
    isLoading,
    fetchModels,
  };
}