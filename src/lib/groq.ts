/**
 * Groq (OpenAI-compatible API) — browser never sees GROQ_API_KEY.
 * Dev / preview: Vite proxy `/groq-proxy` → api.groq.com (key injected server-side).
 * Production (Vercel): `/api/groq-chat` and `/api/groq-models` Edge handlers.
 */

export type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function chatUrl(): string {
  return import.meta.env.DEV
    ? "/groq-proxy/openai/v1/chat/completions"
    : "/api/groq-chat";
}

function modelsUrl(): string {
  return import.meta.env.DEV
    ? "/groq-proxy/openai/v1/models"
    : "/api/groq-models";
}

function parseEnabled(value: unknown): boolean {
  if (value === true) return true;
  if (value === false || value == null) return false;
  return String(value).trim().toLowerCase() === "true";
}

export function isGroqEnabled(): boolean {
  return parseEnabled(import.meta.env.VITE_GROQ_ENABLED);
}

export function getGroqModel(): string {
  return String(import.meta.env.VITE_GROQ_MODEL || "llama-3.1-8b-instant").trim();
}

function groqErrorMessage(raw: string, status: number): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string } | string };
    if (j && typeof j.error === "object" && j.error?.message) return j.error.message;
    if (typeof j.error === "string") return j.error;
  } catch {
    /* ignore */
  }
  return raw.trim() || `Groq request failed (${status})`;
}

export async function groqListModels(): Promise<{ models: { name: string }[] }> {
  const res = await fetch(modelsUrl(), { method: "GET" });
  const raw = (await res.text().catch(() => "")).trim();
  if (!res.ok) {
    throw new Error(groqErrorMessage(raw, res.status));
  }
  const data = raw ? (JSON.parse(raw) as { data?: { id: string }[] }) : {};
  const rows = Array.isArray(data.data) ? data.data : [];
  return { models: rows.map((m) => ({ name: m.id })) };
}

export async function groqChat(
  messages: GroqChatMessage[],
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const model = options?.model ?? getGroqModel();
  const temperature = options?.temperature ?? 0.55;
  const res = await fetch(chatUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });
  const raw = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(groqErrorMessage(raw, res.status));
  }
  let data: { choices?: { message?: { content?: string } }[] };
  try {
    data = raw ? (JSON.parse(raw) as typeof data) : {};
  } catch {
    throw new Error(`Groq chat failed (${res.status})`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Groq returned no message content");
  }
  return content;
}
