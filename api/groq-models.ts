export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: { message: "Method not allowed" } }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: { message: "GROQ_API_KEY is not set" } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  const upstream = await fetch("https://api.groq.com/openai/v1/models", {
    method: "GET",
    headers: { Authorization: `Bearer ${key}` },
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    },
  });
}
