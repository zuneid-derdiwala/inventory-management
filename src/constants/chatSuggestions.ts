/**
 * Quick prompts for /chat — answers use your loaded inventory + Groq (see buildInventorySystemContext).
 */
export type ChatSuggestion = {
  label: string;
  prompt: string;
};

export const CHAT_SUGGESTIONS: readonly ChatSuggestion[] = [
  {
    label: "Seller performance",
    prompt:
      "From my inventory snapshot: which sellers have the most entries, and which have sold the most devices (outward date set)? Summarize in a short bullet list.",
  },
  {
    label: "Trending models",
    prompt:
      "Using only my snapshot data, which brand/model combinations show up most often in stock, and which have the highest sold count? Name the top few and one sentence on what that might mean.",
  },
  {
    label: "Best-selling models",
    prompt:
      "Which models (brand + model) have the highest number of sold units in my data, and how does that compare to their total entry count?",
  },
  {
    label: "Stock vs sold",
    prompt:
      "How many total devices are in my snapshot, how many are sold vs still in stock, and what is the overall sold rate as a percentage?",
  },
  {
    label: "Brand mix",
    prompt:
      "Which brands dominate my inventory by entry count, and which have the strongest sales (sold count) relative to entries?",
  },
  {
    label: "Booking persons",
    prompt:
      "Which booking persons are linked to the most entries in my snapshot, and do any stand out for sold vs unsold mix?",
  },
  {
    label: "Inward trend",
    prompt:
      "Based on inward counts by month in the snapshot, how did recent months compare? Keep it brief.",
  },
] as const;
