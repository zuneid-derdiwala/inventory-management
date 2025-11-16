"use client";

import { useState, useEffect, useCallback } from "react";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const TABLE_NAME = "models";

export interface Model {
  id: string;
  name: string;
  brand_id: string;
  brand_name?: string; // Optional for backward compatibility
}

export function useModels() {
  const [availableModels, setAvailableModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchModels = useCallback(async () => {
    console.log("fetchModels called - starting fetch...");
    setIsLoading(true);
    
    // Check if supabase is properly configured
    if (typeof supabase === 'object' && 'from' in supabase) {
      console.log("Supabase configured, fetching models...");
      // Get models - use brand_name directly since it's stored in the table
      // Try to join with brands table, but fallback to brand_name if join fails
      let query = supabase
        .from(TABLE_NAME)
        .select("id, name, brand_id, brand_name");
      
      // Only show non-deleted models (if column exists)
      query = query.eq('is_deleted', false);
      
      console.log("Executing models query...");
      const response: any = await query.order("name", { ascending: true });
      console.log("Models query response:", response);

      if (response.error) {
        console.error("Supabase Error fetching models:", response.error);
        
        // If error is about is_deleted column not existing, try without filter
        if (response.error.code === '42703' || response.error.message?.includes('column "is_deleted" does not exist')) {
          console.log("is_deleted column doesn't exist, fetching all models...");
          const retryResponse: any = await supabase
            .from(TABLE_NAME)
            .select("id, name, brand_id, brand_name")
            .order("name", { ascending: true });
          
          if (retryResponse.error) {
            console.error("Supabase Error fetching models (retry):", retryResponse.error);
            showError(`Failed to load models: ${retryResponse.error.message}`);
            setAvailableModels([]);
          } else {
        const models = (retryResponse.data || []).map((item: any) => {
          // Use brand_name directly from the table (it's already stored there)
          return {
            id: item.id,
            name: item.name,
            brand_id: item.brand_id,
            brand_name: item.brand_name,
          };
        });
            console.log("Fetched models from Supabase (without is_deleted filter):", models);
            setAvailableModels(models);
          }
        } else {
          console.error("Supabase Error details:", response.error);
          showError(`Failed to load models: ${response.error.message || 'Unknown error'}`);
          setAvailableModels([]);
        }
      } else {
        const models = (response.data || []).map((item: any) => {
          // Use brand_name directly from the table (it's already stored there)
          return {
            id: item.id,
            name: item.name,
            brand_id: item.brand_id,
            brand_name: item.brand_name,
          };
        });
        console.log("Fetched models from Supabase:", models.length, "models");
        setAvailableModels(models);
      }
    } else {
      console.log("Supabase not configured, using localStorage fallback");
      // Fallback to local storage if Supabase is not configured
      const storedModels = localStorage.getItem("models");
      if (storedModels) {
        try {
          const parsed = JSON.parse(storedModels);
          // Convert old format (Record<string, string[]>) to new format (Model[])
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const convertedModels: Model[] = [];
            Object.entries(parsed).forEach(([brandName, modelNames]: [string, any]) => {
              if (Array.isArray(modelNames)) {
                modelNames.forEach((modelName: string, index: number) => {
                  convertedModels.push({
                    id: `local-${brandName}-${index}`,
                    name: modelName,
                    brand_id: `local-brand-${brandName}`,
                    brand_name: brandName,
                  });
                });
              }
            });
            setAvailableModels(convertedModels);
          } else if (Array.isArray(parsed)) {
            setAvailableModels(parsed);
          } else {
            setAvailableModels([]);
          }
        } catch (e) {
          console.error("Error parsing stored models from local storage:", e); // Detailed log
          setAvailableModels([]);
        }
      }
    }
    setIsLoading(false);
    setHasFetched(true);
  }, []); // Remove user dependency - fetch for everyone

  useEffect(() => {
    // Only fetch on initial mount, not on tab/route changes
    if (!hasFetched) {
      fetchModels();
    }
  }, [fetchModels, hasFetched]);

  // Debug: Log models when they change
  useEffect(() => {
    console.log("Available models updated:", availableModels.length, "models");
    if (availableModels.length > 0) {
      console.log("Sample models:", availableModels.slice(0, 3));
      // Group by brand to see structure
      const byBrand: Record<string, string[]> = {};
      availableModels.forEach(m => {
        if (m.brand_name) {
          if (!byBrand[m.brand_name]) byBrand[m.brand_name] = [];
          byBrand[m.brand_name].push(m.name);
        } else {
          console.warn("Model without brand_name:", m);
        }
      });
      console.log("Models grouped by brand:", byBrand);
    } else {
      console.warn("No models available!");
    }
  }, [availableModels]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const addModel = async (brandId: string, model: string): Promise<Model | null> => {
    const trimmedModel = model.trim();
    if (!brandId) {
      console.warn("Attempted to add model without a brand ID.");
      return null;
    }
    if (!trimmedModel) {
      console.warn(`Attempted to add an empty model name.`);
      return null;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // Get brand name from brands table to populate brand_name field
      const { data: brandData } = await supabase
        .from('brands')
        .select('name')
        .eq('id', brandId)
        .single();
      
      const brandName = brandData?.name || '';
      
      // Check if model already exists (case-insensitive comparison)
      // Fetch all models for this brand and compare using lowercase
      const { data: allModels, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('id, name, brand_id, brand_name')
        .eq('brand_id', brandId);
      
      if (fetchError) {
        console.error("Error fetching models:", fetchError);
      }
      
      // Find existing model using case-insensitive comparison
      const existingModel = allModels?.find(
        model => model.name.toLowerCase() === trimmedModel.toLowerCase()
      );
      
      if (existingModel) {
        // Model already exists, return it
        showError(`Model '${existingModel.name}' already exists for brand '${brandName}'.`);
        return {
          id: existingModel.id,
          name: existingModel.name,
          brand_id: existingModel.brand_id,
          brand_name: existingModel.brand_name || brandName,
        };
      }
      
      // Model doesn't exist, insert it with created_at
      const { data, error: upsertError } = await supabase
        .from(TABLE_NAME)
        .insert({ 
          brand_id: brandId, 
          brand_name: brandName, // Populate brand_name from brands table
          name: trimmedModel, 
          created_at: new Date().toISOString()
        })
        .select('id, name, brand_id, brand_name');

      if (upsertError) {
        console.error(`Supabase Error adding/upserting model '${trimmedModel}':`, upsertError); // Detailed log
        showError(`Failed to add model '${trimmedModel}' to database.`);
        return null;
      }

      if (data && data.length > 0) {
        const item: any = data[0];
        // Use brand_name directly from the response (we already set it in the upsert)
        const newModel: Model = {
          id: item.id,
          name: item.name,
          brand_id: item.brand_id,
          brand_name: item.brand_name || brandName, // Use from response or fallback to what we fetched
        };
        setAvailableModels(prev => {
          if (!prev.find(m => m.id === newModel.id || (m.brand_id === newModel.brand_id && m.name === newModel.name))) {
            return [...prev, newModel].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });
        showSuccess(`Model '${trimmedModel}' added successfully.`);
        return newModel;
      } else {
        // Model already exists, find and return it
        const existingModel = Array.isArray(availableModels) ? availableModels.find(m => m.brand_id === brandId && m.name === trimmedModel) : null;
        return existingModel || null;
      }
    } else {
      // Fallback to local storage if Supabase is not configured
      const existingModel = Array.isArray(availableModels) ? availableModels.find(m => m.brand_id === brandId && m.name === trimmedModel) : null;
      if (existingModel) {
        return existingModel;
      }
      const newModel: Model = {
        id: `local-${Date.now()}`,
        name: trimmedModel,
        brand_id: brandId,
      };
      const updatedModels = [...(Array.isArray(availableModels) ? availableModels : []), newModel].sort((a, b) => a.name.localeCompare(b.name));
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
      return newModel;
    }
  };

  const updateModel = async (modelId: string, newModel: string): Promise<boolean> => {
    const trimmedNewModel = newModel.trim();
    if (!trimmedNewModel) {
      showError("New model name cannot be empty.");
      return false;
    }
    if (!Array.isArray(availableModels)) {
      showError("Models data not loaded.");
      return false;
    }
    const model = availableModels.find(m => m.id === modelId);
    if (!model) {
      showError("Model not found.");
      return false;
    }
    const existingModel = availableModels.find(m => m.brand_id === model.brand_id && m.name === trimmedNewModel && m.id !== modelId);
    if (existingModel) {
      showError(`Model '${trimmedNewModel}' already exists for this brand.`);
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      const { error: updateError } = await supabase.from(TABLE_NAME).update({ name: trimmedNewModel })
        .eq("id", modelId);

      if (updateError) {
        console.error(`Supabase Error updating model:`, updateError); // Detailed log
        showError("Failed to update model.");
        return false;
      }
    } else {
      const updatedModels = (Array.isArray(availableModels) ? availableModels : []).map(m => m.id === modelId ? { ...m, name: trimmedNewModel } : m).sort((a, b) => a.name.localeCompare(b.name));
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
    }

    setAvailableModels(prev => prev.map(m => m.id === modelId ? { ...m, name: trimmedNewModel } : m).sort((a, b) => a.name.localeCompare(b.name)));
    showSuccess(`Model '${model.name}' updated to '${trimmedNewModel}'.`);
    return true;
  };

  const deleteModel = async (modelId: string): Promise<boolean> => {
    if (!Array.isArray(availableModels)) {
      showError("Models data not loaded.");
      return false;
    }
    const model = availableModels.find(m => m.id === modelId);
    if (!model) {
      showError("Model not found.");
      return false;
    }

    if (typeof supabase === 'object' && 'from' in supabase && (supabase as any).url !== "YOUR_SUPABASE_URL") {
      // Soft delete: set is_deleted = true instead of actually deleting
      const { error: deleteError } = await supabase
        .from(TABLE_NAME)
        .update({ is_deleted: true })
        .eq("id", modelId);

      if (deleteError) {
        console.error(`Supabase Error deleting model:`, deleteError); // Detailed log
        showError("Failed to delete model.");
        return false;
      }
    } else {
      const updatedModels = (Array.isArray(availableModels) ? availableModels : []).filter(m => m.id !== modelId);
      setAvailableModels(updatedModels);
      localStorage.setItem("models", JSON.stringify(updatedModels));
    }

    // Remove from local state (it will be filtered out on next fetch)
    setAvailableModels(prev => prev.filter(m => m.id !== modelId));
    showSuccess(`Model '${model.name}' deleted.`);
    return true;
  };

  // Helper to get models by brand ID
  const getModelsByBrandId = (brandId: string): Model[] => {
    if (!Array.isArray(availableModels)) return [];
    return availableModels.filter(m => m.brand_id === brandId).sort((a, b) => a.name.localeCompare(b.name));
  };

  // Helper to get models by brand name (for backward compatibility)
  const getModelsByBrand = (brandName: string): string[] => {
    if (!brandName) return [];
    // Ensure availableModels is an array before filtering
    if (!Array.isArray(availableModels)) return [];
    const filtered = availableModels.filter(m => m.brand_name === brandName).map(m => m.name).sort();
    return filtered;
  };

  // Helper to get model by ID
  const getModelById = (id: string): Model | undefined => {
    if (!Array.isArray(availableModels)) return undefined;
    return availableModels.find(m => m.id === id);
  };

  // Helper to get model by name and brand ID
  const getModelByNameAndBrand = (name: string, brandId: string): Model | undefined => {
    if (!Array.isArray(availableModels)) return undefined;
    return availableModels.find(m => m.name === name && m.brand_id === brandId);
  };

  return {
    availableModels,
    setAvailableModels,
    addModel,
    updateModel,
    deleteModel,
    getModelsByBrand,
    getModelsByBrandId,
    getModelById,
    getModelByNameAndBrand,
    isLoading,
    fetchModels,
  };
}