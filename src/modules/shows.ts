import type { JellyfinItem, JellyfinResponse } from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export async function getEpisodesForSeries(
  client: JellyfinClient,
  seriesId: string,
): Promise<JellyfinItem[]> {
  const data = await client
    .fetch<JellyfinResponse<JellyfinItem>>(`/Shows/${seriesId}/Episodes`, {
      UserId: client.config.userId,
      Limit: "200",
      SortBy: "ParentIndexNumber,IndexNumber",
      Fields: "Overview,GenreItems,UserData",
    })
    .catch(() => ({ Items: [] as JellyfinItem[], TotalRecordCount: 0 }));
  return data.Items;
}

export async function getNextUpForSeries(
  client: JellyfinClient,
  seriesId: string,
  limit = 6,
): Promise<JellyfinItem[]> {
  const data = await client
    .fetch<JellyfinResponse<JellyfinItem>>("/Shows/NextUp", {
      UserId: client.config.userId,
      SeriesId: seriesId,
      Limit: String(limit),
      Fields: "Overview,GenreItems,UserData",
    })
    .catch(() => ({ Items: [] as JellyfinItem[], TotalRecordCount: 0 }));
  return data.Items;
}
