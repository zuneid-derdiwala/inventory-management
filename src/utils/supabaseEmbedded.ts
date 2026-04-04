/**
 * Supabase/PostgREST embedded FK rows sometimes come back as `{ name }` or `[{ name }]`.
 */
export function embeddedRelationName(
  rel: { name?: string } | { name?: string }[] | null | undefined
): string | undefined {
  if (rel == null) return undefined;
  if (Array.isArray(rel)) {
    const n = rel[0]?.name;
    return typeof n === "string" ? n.trim() || undefined : undefined;
  }
  if (typeof rel === "object" && "name" in rel) {
    const n = (rel as { name: string }).name;
    return typeof n === "string" ? n.trim() || undefined : undefined;
  }
  return undefined;
}
