import type { EntryData } from "@/context/DataContext";

const MAX_TOP = 12;

function norm(s: string | undefined): string {
  return (s ?? "").trim() || "(unspecified)";
}

function modelKey(e: EntryData): string {
  const b = norm(e.brand);
  const m = norm(e.model);
  if (b === "(unspecified)" && m === "(unspecified)") return "(no brand/model)";
  return `${b} / ${m}`;
}

function monthKey(d: Date | undefined): string | null {
  if (!d || !(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addAgg(
  map: Map<string, { entries: number; sold: number; revenue: number }>,
  key: string,
  sold: boolean,
  outwardAmount: number | undefined
) {
  const cur = map.get(key) ?? { entries: 0, sold: 0, revenue: 0 };
  cur.entries += 1;
  if (sold) {
    cur.sold += 1;
    if (typeof outwardAmount === "number" && !Number.isNaN(outwardAmount)) {
      cur.revenue += outwardAmount;
    }
  }
  map.set(key, cur);
}

function topN(
  map: Map<string, { entries: number; sold: number; revenue: number }>,
  sort: "entries" | "sold" | "revenue",
  n: number
): { key: string; entries: number; sold: number; revenue: number }[] {
  const rows = [...map.entries()].map(([key, v]) => ({ key, ...v }));
  rows.sort((a, b) => b[sort] - a[sort]);
  return rows.slice(0, n);
}

/**
 * Compact snapshot for LLM system context (Groq). Keep reasonably small for token limits.
 */
export function buildInventorySystemContext(entries: EntryData[]): string {
  const list = Array.isArray(entries) ? entries : [];
  const total = list.length;
  const sold = list.filter((e) => e.outwardDate != null).length;
  const inStock = total - sold;

  const bySeller = new Map<string, { entries: number; sold: number; revenue: number }>();
  const byModel = new Map<string, { entries: number; sold: number; revenue: number }>();
  const byBrand = new Map<string, { entries: number; sold: number; revenue: number }>();
  const byBooking = new Map<string, { entries: number; sold: number; revenue: number }>();
  const byMonthInward = new Map<string, number>();

  for (const e of list) {
    const isSold = e.outwardDate != null;
    addAgg(bySeller, norm(e.seller), isSold, e.outwardAmount);
    addAgg(byModel, modelKey(e), isSold, e.outwardAmount);
    addAgg(byBrand, norm(e.brand), isSold, e.outwardAmount);
    addAgg(byBooking, norm(e.bookingPerson), isSold, e.outwardAmount);
    const mk = monthKey(e.inwardDate);
    if (mk) byMonthInward.set(mk, (byMonthInward.get(mk) ?? 0) + 1);
  }

  const topSellersEntries = topN(bySeller, "entries", MAX_TOP);
  const topSellersSold = topN(bySeller, "sold", MAX_TOP);
  const topModelsEntries = topN(byModel, "entries", MAX_TOP);
  const topModelsSold = topN(byModel, "sold", MAX_TOP);
  const topBrands = topN(byBrand, "entries", MAX_TOP);
  const topBooking = topN(byBooking, "entries", MAX_TOP);

  const monthsSorted = [...byMonthInward.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6);
  const trendingMonths = monthsSorted.map(([m, c]) => `${m}: ${c} inward`).join("; ");

  const fmtRow = (r: { key: string; entries: number; sold: number; revenue: number }) =>
    `${r.key} — entries: ${r.entries}, sold (has outward date): ${r.sold}, sum outward amount: ${r.revenue.toFixed(0)}`;

  const lines = [
    "You are an inventory assistant for a phone/device stock app.",
    "Answer questions using ONLY the snapshot below. If something is not in the data, say you do not see it.",
    "Sold means the row has an outward date. Revenue is the sum of outward amounts where present (same currency as stored).",
    "",
    `Snapshot: total rows=${total}, marked sold (outward date set)=${sold}, still in stock (no outward date)=${inStock}.`,
    "",
    "Top sellers by number of entries:",
    topSellersEntries.length ? topSellersEntries.map(fmtRow).join("\n") : "(none)",
    "",
    "Top sellers by sold count:",
    topSellersSold.length ? topSellersSold.map(fmtRow).join("\n") : "(none)",
    "",
    "Top brand/model combinations by entries (trending stock mix):",
    topModelsEntries.length ? topModelsEntries.map(fmtRow).join("\n") : "(none)",
    "",
    "Top brand/model by sold count:",
    topModelsSold.length ? topModelsSold.map(fmtRow).join("\n") : "(none)",
    "",
    "Top brands by entries:",
    topBrands.length ? topBrands.map(fmtRow).join("\n") : "(none)",
    "",
    "Top booking persons by entries:",
    topBooking.length ? topBooking.map(fmtRow).join("\n") : "(none)",
    "",
    "Inward activity by calendar month (device inward dates, last few months):",
    trendingMonths || "(no inward dates)",
  ];

  return lines.join("\n");
}
