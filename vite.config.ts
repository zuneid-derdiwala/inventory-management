import { defineConfig, loadEnv } from "vite"; // Import loadEnv
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => { // Use a function to access mode
  const env = loadEnv(mode, process.cwd(), 'VITE_'); // Load env variables with VITE_ prefix

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [dyadComponentTagger(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Expose environment variables to your client-side code
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_HCAPTCHA_SITE_KEY': JSON.stringify(env.VITE_HCAPTCHA_SITE_KEY),
    },
  };
});