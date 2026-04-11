import type {
  GetLibraryItemsOptions,
  JellyfinItem,
  JellyfinItemUpdate,
  JellyfinMediaType,
  JellyfinResponse,
} from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export async function getItem(client: JellyfinClient, itemId: string): Promise<JellyfinItem> {
  return client.fetch<JellyfinItem>(`/Users/${client.config.userId}/Items/${itemId}`, {
    Fields: "Overview,GenreItems,UserData,People,Studios",
  });
}

export async function searchItems(
  client: JellyfinClient,
  query: string,
  types: JellyfinMediaType[] = ["Movie", "Series"],
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      SearchTerm: query,
      Recursive: "true",
      Limit: "20",
      Fields: "Overview,GenreItems,UserData",
      IncludeItemTypes: types.join(","),
    },
  );
  return data.Items;
}

export async function getFeaturedItem(
  client: JellyfinClient,
  type: JellyfinMediaType = "Movie",
): Promise<JellyfinItem | null> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      IncludeItemTypes: type,
      SortBy: "Random",
      Recursive: "true",
      Limit: "1",
      HasBackdrop: "true",
      Fields: "Overview,GenreItems,UserData",
    },
  );
  return data.Items[0] ?? null;
}

export async function getContinueWatching(
  client: JellyfinClient,
  limit = 6,
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items/Resume`,
    { MediaTypes: "Video", Limit: String(limit), Fields: "Overview,GenreItems,UserData" },
  );
  return data.Items;
}

export async function getLatestMedia(
  client: JellyfinClient,
  type: JellyfinMediaType = "Movie",
  limit = 12,
): Promise<JellyfinItem[]> {
  return client.fetch<JellyfinItem[]>(`/Users/${client.config.userId}/Items/Latest`, {
    IncludeItemTypes: type,
    Limit: String(limit),
    Fields: "Overview,GenreItems,UserData",
  });
}

export async function getFavoriteItems(
  client: JellyfinClient,
  type: JellyfinMediaType = "Movie",
  limit = 12,
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      IncludeItemTypes: type,
      Recursive: "true",
      Filters: "IsFavorite",
      Limit: String(limit),
      SortBy: "DateCreated",
      SortOrder: "Descending",
      Fields: "Overview,GenreItems,UserData",
    },
  );
  return data.Items;
}

export async function getMostPlayed(
  client: JellyfinClient,
  type: JellyfinMediaType = "Movie",
  limit = 12,
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      IncludeItemTypes: type,
      SortBy: "PlayCount",
      SortOrder: "Descending",
      Recursive: "true",
      Limit: String(limit),
      Filters: "IsPlayed",
      Fields: "Overview,GenreItems,UserData",
    },
  );
  return data.Items;
}

export async function getLibraryItems(
  client: JellyfinClient,
  type: JellyfinMediaType,
  options: GetLibraryItemsOptions = {},
): Promise<JellyfinResponse<JellyfinItem>> {
  const {
    sortBy = "SortName",
    sortOrder = "Ascending",
    limit = 24,
    startIndex = 0,
    genre,
    filters,
    watchStatus,
    officialRatings,
    minCommunityRating,
    minPremiereDate,
    maxPremiereDate,
  } = options;

  const params: Record<string, string> = {
    IncludeItemTypes: type,
    SortBy: sortBy,
    SortOrder: sortOrder,
    Recursive: "true",
    Limit: String(limit),
    StartIndex: String(startIndex),
    Fields: "Overview,GenreItems,UserData",
  };

  const filterParts: string[] = [];
  if (filters) filterParts.push(filters);
  if (watchStatus === "watched") filterParts.push("IsPlayed");
  else if (watchStatus === "unwatched") filterParts.push("IsUnplayed");
  else if (watchStatus === "inprogress") filterParts.push("IsResumable");
  if (filterParts.length > 0) params.Filters = filterParts.join(",");

  if (genre) params.Genres = genre;
  if (officialRatings) params.OfficialRatings = officialRatings;
  if (minCommunityRating != null) params.MinCommunityRating = String(minCommunityRating);
  if (minPremiereDate) params.MinPremiereDate = minPremiereDate;
  if (maxPremiereDate) params.MaxPremiereDate = maxPremiereDate;

  return client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    params,
  );
}

export async function getWatchHistory(
  client: JellyfinClient,
  { limit = 24, startIndex = 0 }: { limit?: number; startIndex?: number } = {},
): Promise<JellyfinResponse<JellyfinItem>> {
  return client.fetch<JellyfinResponse<JellyfinItem>>(`/Users/${client.config.userId}/Items`, {
    Filters: "IsPlayed",
    SortBy: "DatePlayed",
    SortOrder: "Descending",
    Recursive: "true",
    IncludeItemTypes: "Movie,Series",
    Limit: String(limit),
    StartIndex: String(startIndex),
    Fields: "Overview,GenreItems,UserData",
  });
}

export async function getSimilarItems(
  client: JellyfinClient,
  itemId: string,
  limit = 8,
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(`/Items/${itemId}/Similar`, {
    UserId: client.config.userId,
    Limit: String(limit),
    Fields: "Overview,GenreItems,UserData",
  });
  return data.Items;
}

export async function setFavorite(
  client: JellyfinClient,
  itemId: string,
  isFavorite: boolean,
): Promise<{ IsFavorite: boolean }> {
  const res = await client.fetchRaw(`/Users/${client.config.userId}/FavoriteItems/${itemId}`, {
    method: isFavorite ? "DELETE" : "POST",
  });
  if (!res.ok) throw new Error(`Jellyfin favorite error: ${res.status}`);
  return res.json() as Promise<{ IsFavorite: boolean }>;
}

export async function setPlayed(
  client: JellyfinClient,
  itemId: string,
  played: boolean,
): Promise<{ Played: boolean; PlaybackPositionTicks?: number }> {
  const res = await client.fetchRaw(`/Users/${client.config.userId}/PlayedItems/${itemId}`, {
    method: played ? "POST" : "DELETE",
  });
  if (!res.ok) throw new Error(`Jellyfin played-state error: ${res.status}`);
  return res.json() as Promise<{ Played: boolean; PlaybackPositionTicks?: number }>;
}

export async function deleteItem(client: JellyfinClient, id: string): Promise<void> {
  const res = await client.fetchRaw(`/Items/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Jellyfin delete error: ${res.status}`);
}

export async function updateItemName(
  client: JellyfinClient,
  id: string,
  name: string,
): Promise<void> {
  await updateItem(client, id, { name });
}

export async function updateItem(
  client: JellyfinClient,
  id: string,
  patch: JellyfinItemUpdate,
): Promise<void> {
  const item = await getItem(client, id);
  const nextOverview = patch.overview ?? item.Overview ?? "";
  const nextProductionYear =
    patch.productionYear === undefined
      ? item.ProductionYear
      : patch.productionYear === null
        ? undefined
        : patch.productionYear;
  const nextGenres = patch.genres ?? item.GenreItems?.map((genre) => genre.Name) ?? [];
  const url = new URL(`${client.config.url}/Items/${id}`);
  url.searchParams.set("api_key", client.config.apiKey);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...item,
      Name: patch.name ?? item.Name,
      Overview: nextOverview,
      ProductionYear: nextProductionYear,
      Genres: nextGenres,
    }),
  });
  if (!res.ok) throw new Error(`Jellyfin update error: ${res.status}`);
}
