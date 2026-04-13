import type { JellyfinItem, JellyfinResponse } from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export interface SearchCollectionItemsOptions {
  query?: string;
  limit?: number;
  includeItemTypes?: string[];
}

export async function getCollections(client: JellyfinClient): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      IncludeItemTypes: "BoxSet",
      Recursive: "true",
      SortBy: "SortName",
      SortOrder: "Ascending",
      Fields: "Overview,GenreItems,UserData,ChildCount",
    },
  );
  return data.Items;
}

export async function getCollectionItems(
  client: JellyfinClient,
  collectionId: string,
): Promise<JellyfinItem[]> {
  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    {
      ParentId: collectionId,
      SortBy: "PremiereDate,SortName",
      SortOrder: "Ascending",
      Fields: "Overview,GenreItems,UserData",
    },
  );
  return data.Items;
}

export async function searchCollectionItems(
  client: JellyfinClient,
  collectionId: string,
  options: SearchCollectionItemsOptions = {},
): Promise<JellyfinItem[]> {
  const { query, limit = 24, includeItemTypes = ["Movie", "Video", "MusicVideo"] } = options;

  const params: Record<string, string> = {
    ParentId: collectionId,
    Recursive: "true",
    SortBy: "SortName",
    SortOrder: "Ascending",
    Limit: String(limit),
    IncludeItemTypes: includeItemTypes.join(","),
    Fields: "Overview,GenreItems,UserData",
  };

  const trimmedQuery = query?.trim();
  if (trimmedQuery) {
    params.SearchTerm = trimmedQuery;
  }

  const data = await client.fetch<JellyfinResponse<JellyfinItem>>(
    `/Users/${client.config.userId}/Items`,
    params,
  );

  return data.Items;
}

export async function createCollection(
  client: JellyfinClient,
  name: string,
  itemIds: string[] = [],
): Promise<{ Id: string }> {
  const url = new URL(`${client.config.url}/Collections`);
  url.searchParams.set("api_key", client.config.apiKey);
  url.searchParams.set("Name", name);
  if (itemIds.length > 0) url.searchParams.set("Ids", itemIds.join(","));
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Create collection error: ${res.status}`);
  return res.json() as Promise<{ Id: string }>;
}

export async function addItemsToCollection(
  client: JellyfinClient,
  collectionId: string,
  itemIds: string[],
): Promise<void> {
  const url = new URL(`${client.config.url}/Collections/${collectionId}/Items`);
  url.searchParams.set("api_key", client.config.apiKey);
  url.searchParams.set("Ids", itemIds.join(","));
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Add to collection error: ${res.status}`);
}

export async function removeItemsFromCollection(
  client: JellyfinClient,
  collectionId: string,
  itemIds: string[],
): Promise<void> {
  const url = new URL(`${client.config.url}/Collections/${collectionId}/Items`);
  url.searchParams.set("api_key", client.config.apiKey);
  url.searchParams.set("Ids", itemIds.join(","));
  const res = await fetch(url.toString(), { method: "DELETE" });
  if (!res.ok) throw new Error(`Remove from collection error: ${res.status}`);
}
