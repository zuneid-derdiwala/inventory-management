/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_HCAPTCHA_SITE_KEY?: string;
  /** Injected at build from GROQ_ENABLED / VITE_GROQ_ENABLED (see vite.config.ts). */
  readonly VITE_GROQ_ENABLED?: string;
  /** Model id, e.g. llama-3.1-8b-instant (from GROQ_MODEL / VITE_GROQ_MODEL). */
  readonly VITE_GROQ_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
