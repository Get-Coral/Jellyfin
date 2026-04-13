import type { JellyfinItem } from "../types/index.js";

export type MetadataGapKey = "overview" | "artwork" | "year" | "genres";

const GAP_REASON_LABEL: Record<MetadataGapKey, string> = {
  overview: "Missing overview",
  artwork: "Missing primary artwork",
  year: "Missing release year",
  genres: "Missing genres",
};

export function getMetadataGapKeys(item: JellyfinItem): MetadataGapKey[] {
  const keys: MetadataGapKey[] = [];

  if (!item.Overview?.trim()) keys.push("overview");
  if (!item.ImageTags?.Primary) keys.push("artwork");
  if (!item.ProductionYear) keys.push("year");
  if (!item.GenreItems?.length) keys.push("genres");

  return keys;
}

export function getMetadataGapReasons(item: JellyfinItem): string[] {
  return getMetadataGapKeys(item).map((key) => GAP_REASON_LABEL[key]);
}

export function metadataGapReasonForKey(key: MetadataGapKey): string {
  return GAP_REASON_LABEL[key];
}
