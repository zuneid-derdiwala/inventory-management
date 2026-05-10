import { defineConfig, loadEnv } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import type { ProxyServer } from "http-proxy";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

const GROQ_ORIGIN = "https://api.groq.com";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const allEnv = loadEnv(mode, process.cwd(), "");
  const groqApiKey = String(allEnv.GROQ_API_KEY || "").trim();
  const groqModel = String(
    allEnv.GROQ_MODEL || allEnv.VITE_GROQ_MODEL || "llama-3.1-8b-instant"
  ).trim();
  const groqEnabled =
    String(allEnv.VITE_GROQ_ENABLED || allEnv.GROQ_ENABLED || "")
      .trim()
      .toLowerCase() === "true";

  const groqProxy = {
    target: GROQ_ORIGIN,
    changeOrigin: true,
    secure: true,
    rewrite: (p: string) => p.replace(/^\/groq-proxy/, ""),
    configure(proxy: ProxyServer) {
      proxy.on("proxyReq", (proxyReq) => {
        if (groqApiKey) {
          proxyReq.setHeader("Authorization", `Bearer ${groqApiKey}`);
        }
      });
      proxy.on("error", (err: Error, _req: IncomingMessage, res: ServerResponse | import("net").Socket) => {
        const msg = `Groq proxy error (${GROQ_ORIGIN}). Set GROQ_API_KEY in .env and restart the dev server. ${err?.message || err}`;
        if ("writeHead" in res && typeof res.writeHead === "function" && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(msg);
        }
      });
    },
  };

  return {
    envPrefix: ["VITE_"],
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/groq-proxy": groqProxy,
      },
    },
    preview: {
      host: "::",
      port: 8080,
      proxy: {
        "/groq-proxy": groqProxy,
      },
    },
    plugins: [dyadComponentTagger(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      "import.meta.env.VITE_HCAPTCHA_SITE_KEY": JSON.stringify(env.VITE_HCAPTCHA_SITE_KEY),
      "import.meta.env.VITE_GROQ_ENABLED": JSON.stringify(groqEnabled ? "true" : "false"),
      "import.meta.env.VITE_GROQ_MODEL": JSON.stringify(groqModel),
    },
  };
});
