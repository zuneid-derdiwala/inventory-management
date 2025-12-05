import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are properly set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL and/or Anon Key are not set in environment variables. Data operations will fall back to local storage.");
  console.warn("To connect to your Supabase database, create a .env file with:");
  console.warn("VITE_SUPABASE_URL=your_supabase_project_url");
  console.warn("VITE_SUPABASE_ANON_KEY=your_supabase_anon_key");
} else {
  // Only log that configuration is successful, without exposing the URL or key
  console.log("Supabase configured successfully");
}

// Create the Supabase client
export const supabase = createClient(supabaseUrl || "YOUR_SUPABASE_URL", supabaseAnonKey || "YOUR_SUPABASE_ANON_KEY");