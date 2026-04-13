import type {
  GetLibraryItemsOptions,
  ImageType,
  JellyfinItem,
  JellyfinItemUpdate,
  JellyfinMediaType,
  JellyfinRemoteImageInfo,
  JellyfinRemoteImageResult,
  JellyfinResponse,
} from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export interface JellyfinCoverCandidate {
  url: string;
  thumbnailUrl: string;
  providerName: string;
  width?: number;
  height?: number;
  communityRating?: number;
  voteCount?: number;
}

interface OpenLibrarySearchResponse {
  docs?: Array<{
    cover_i?: number;
    cover_edition_key?: string;
    isbn?: string[];
  }>;
}

interface GoogleBooksResponse {
  items?: Array<{
    volumeInfo?: {
      imageLinks?: {
        extraLarge?: string;
        large?: string;
        medium?: string;
        small?: string;
        thumbnail?: string;
        smallThumbnail?: string;
      };
    };
  }>;
}

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

export async function getRemoteImages(
  client: JellyfinClient,
  itemId: string,
  type: ImageType = "Primary",
): Promise<JellyfinRemoteImageInfo[]> {
  const data = await client.fetch<JellyfinRemoteImageResult>(`/Items/${itemId}/RemoteImages`, {
    Type: type,
  });
  return data.Images ?? [];
}

function toCoverCandidate(image: JellyfinRemoteImageInfo): JellyfinCoverCandidate | null {
  const url = image.Url?.trim();
  if (!url) {
    return null;
  }

  return {
    url,
    thumbnailUrl: image.ThumbnailUrl?.trim() || url,
    providerName: image.ProviderName?.trim() || "Unknown provider",
    width: image.Width ?? undefined,
    height: image.Height ?? undefined,
    communityRating: image.CommunityRating ?? undefined,
    voteCount: image.VoteCount ?? undefined,
  };
}

function dedupeCoverCandidates(candidates: JellyfinCoverCandidate[]): JellyfinCoverCandidate[] {
  const seen = new Set<string>();
  const deduped: JellyfinCoverCandidate[] = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.url)) {
      continue;
    }

    seen.add(candidate.url);
    deduped.push(candidate);
  }

  return deduped;
}

function cleanTitleForCoverSearch(title: string): string {
  return title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\b\d{1,3}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toHttps(url?: string | null): string | null {
  if (!url) {
    return null;
  }

  return url.replace(/^http:\/\//i, "https://");
}

function pickAuthor(item: JellyfinItem): string | undefined {
  const author = item.People?.find((person) => {
    const role = person.Role?.toLowerCase();
    const personType = person.Type?.toLowerCase();
    return role?.includes("author") || role?.includes("writer") || personType === "author";
  });

  return author?.Name?.trim() || undefined;
}

async function fetchOpenLibraryCandidates(
  title: string,
  author?: string,
): Promise<JellyfinCoverCandidate[]> {
  const queryUrl = new URL("https://openlibrary.org/search.json");
  queryUrl.searchParams.set("title", title);
  queryUrl.searchParams.set("limit", "6");
  if (author) {
    queryUrl.searchParams.set("author", author);
  }

  const response = await fetch(queryUrl.toString());
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as OpenLibrarySearchResponse;
  const candidates: JellyfinCoverCandidate[] = [];

  for (const doc of payload.docs ?? []) {
    if (doc.cover_i) {
      candidates.push({
        url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
        thumbnailUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
        providerName: "Open Library",
      });
      continue;
    }

    const isbn13 = doc.isbn?.find((value) => /^\d{13}$/.test(value));
    if (isbn13) {
      candidates.push({
        url: `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`,
        thumbnailUrl: `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg`,
        providerName: "Open Library (ISBN)",
      });
      continue;
    }

    if (doc.cover_edition_key) {
      candidates.push({
        url: `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-L.jpg`,
        thumbnailUrl: `https://covers.openlibrary.org/b/olid/${doc.cover_edition_key}-M.jpg`,
        providerName: "Open Library (Edition)",
      });
    }
  }

  return candidates;
}

async function fetchGoogleBooksCandidates(
  title: string,
  author?: string,
): Promise<JellyfinCoverCandidate[]> {
  const queryUrl = new URL("https://www.googleapis.com/books/v1/volumes");
  const queryParts = [`intitle:${title}`];
  if (author) {
    queryParts.push(`inauthor:${author}`);
  }

  queryUrl.searchParams.set("q", queryParts.join("+"));
  queryUrl.searchParams.set("maxResults", "5");
  queryUrl.searchParams.set("printType", "books");
  queryUrl.searchParams.set("langRestrict", "en");

  const response = await fetch(queryUrl.toString());
  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GoogleBooksResponse;
  const candidates: JellyfinCoverCandidate[] = [];

  for (const entry of payload.items ?? []) {
    const imageLinks = entry.volumeInfo?.imageLinks;
    const best =
      toHttps(imageLinks?.extraLarge) ??
      toHttps(imageLinks?.large) ??
      toHttps(imageLinks?.medium) ??
      toHttps(imageLinks?.small) ??
      toHttps(imageLinks?.thumbnail) ??
      toHttps(imageLinks?.smallThumbnail);

    if (!best) {
      continue;
    }

    candidates.push({
      url: best,
      thumbnailUrl: best,
      providerName: "Google Books",
    });
  }

  return candidates;
}

async function fetchExternalCoverCandidates(item: JellyfinItem): Promise<JellyfinCoverCandidate[]> {
  const title = cleanTitleForCoverSearch(item.Name || "");
  if (!title) {
    return [];
  }

  const author = pickAuthor(item);
  const [openLibrary, googleBooks] = await Promise.all([
    fetchOpenLibraryCandidates(title, author),
    fetchGoogleBooksCandidates(title, author),
  ]);

  return dedupeCoverCandidates([...openLibrary, ...googleBooks]);
}

export async function getCoverCandidates(
  client: JellyfinClient,
  item: JellyfinItem,
  type: ImageType = "Primary",
): Promise<JellyfinCoverCandidate[]> {
  const remoteImages = await getRemoteImages(client, item.Id, type);
  const remoteCandidates = remoteImages
    .map((image) => toCoverCandidate(image))
    .filter((image): image is JellyfinCoverCandidate => image !== null);

  const externalCandidates = await fetchExternalCoverCandidates(item);
  return dedupeCoverCandidates([...remoteCandidates, ...externalCandidates]);
}

export async function getCoverCandidatesForItem(
  client: JellyfinClient,
  itemId: string,
  type: ImageType = "Primary",
): Promise<JellyfinCoverCandidate[]> {
  const item = await getItem(client, itemId);
  return getCoverCandidates(client, item, type);
}

export async function downloadRemoteImage(
  client: JellyfinClient,
  itemId: string,
  imageUrl: string,
  type: ImageType = "Primary",
): Promise<void> {
  const res = await client.fetchRaw(`/Items/${itemId}/RemoteImages/Download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Type: type,
      ImageUrl: imageUrl,
    }),
  });

  if (!res.ok) throw new Error(`Jellyfin remote image download error: ${res.status}`);
}

function detectImageMimeType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function normalizeImageMimeType(value: string): string | null {
  const normalized = value.split(";")[0]?.trim().toLowerCase() ?? "";
  if (normalized === "image/jpg") {
    return "image/jpeg";
  }

  if (
    normalized === "image/jpeg" ||
    normalized === "image/png" ||
    normalized === "image/gif" ||
    normalized === "image/webp"
  ) {
    return normalized;
  }

  return null;
}

async function tryUploadItemImage(
  client: JellyfinClient,
  itemId: string,
  type: ImageType,
  imageBuffer: ArrayBuffer,
  contentTypes: string[],
): Promise<string[]> {
  const uploadPaths = [
    `/Items/${itemId}/Images/${type}`,
    `/Items/${itemId}/Images/${type}?imageIndex=0`,
    `/Items/${itemId}/Images/${type}/0`,
  ];
  const uploadMethods: Array<"POST" | "PUT"> = ["POST", "PUT"];
  const attemptErrors: string[] = [];

  for (const contentType of contentTypes) {
    for (const path of uploadPaths) {
      for (const method of uploadMethods) {
        const response = await client.fetchRaw(path, {
          method,
          headers: {
            "Content-Type": contentType,
            "X-Emby-Token": client.config.apiKey,
            "X-MediaBrowser-Token": client.config.apiKey,
            Accept: "*/*",
          },
          body: imageBuffer,
        });

        if (response.ok) {
          return attemptErrors;
        }

        const errorBody = (await response.text()).trim();
        const bodySnippet = errorBody ? ` ${errorBody.slice(0, 140)}` : "";
        attemptErrors.push(`${method} ${path} -> ${response.status}${bodySnippet}`);
      }
    }
  }

  return attemptErrors;
}

async function deleteItemImageIfExists(
  client: JellyfinClient,
  itemId: string,
  type: ImageType,
): Promise<void> {
  const res = await client.fetchRaw(`/Items/${itemId}/Images/${type}?imageIndex=0`, {
    method: "DELETE",
  });

  // Ignore failures here; this is a best-effort cleanup before upload retry.
  if (res.ok || res.status === 404) {
    return;
  }
}

async function fetchImageForUpload(imageUrl: string): Promise<{
  headerContentType: string;
  imageBuffer: ArrayBuffer;
}> {
  const sourceResponse = await fetch(imageUrl);
  if (!sourceResponse.ok) {
    throw new Error(`Cover source fetch failed: ${sourceResponse.status}`);
  }

  let headerContentType = sourceResponse.headers.get("content-type")?.toLowerCase() ?? "";
  let imageBuffer = await sourceResponse.arrayBuffer();
  let detectedType = detectImageMimeType(new Uint8Array(imageBuffer));

  if (detectedType === "image/webp") {
    const fallbackResponse = await fetch(imageUrl, {
      headers: {
        Accept: "image/jpeg,image/png,image/*;q=0.8,*/*;q=0.6",
      },
    });

    if (fallbackResponse.ok) {
      const fallbackBuffer = await fallbackResponse.arrayBuffer();
      const fallbackType = detectImageMimeType(new Uint8Array(fallbackBuffer));
      if (fallbackType && fallbackType !== "image/webp") {
        imageBuffer = fallbackBuffer;
        headerContentType = fallbackResponse.headers.get("content-type")?.toLowerCase() ?? "";
        detectedType = fallbackType;
      }
    }
  }

  return {
    headerContentType,
    imageBuffer,
  };
}

export async function uploadItemImageFromUrl(
  client: JellyfinClient,
  itemId: string,
  imageUrl: string,
  type: ImageType = "Primary",
): Promise<void> {
  const { headerContentType, imageBuffer } = await fetchImageForUpload(imageUrl);
  const imageBytes = new Uint8Array(imageBuffer);

  const detectedContentType = detectImageMimeType(imageBytes);
  const normalizedHeaderType = normalizeImageMimeType(headerContentType);
  const uploadContentType = normalizedHeaderType ?? detectedContentType;

  if (!uploadContentType) {
    throw new Error(
      `Cover source is not a supported image: ${headerContentType || "unknown content-type"}`,
    );
  }

  const contentTypes = [uploadContentType];
  if (detectedContentType && detectedContentType !== uploadContentType) {
    contentTypes.push(detectedContentType);
  }

  let attemptErrors = await tryUploadItemImage(client, itemId, type, imageBuffer, contentTypes);

  if (attemptErrors.length > 0) {
    await deleteItemImageIfExists(client, itemId, type);
    attemptErrors = await tryUploadItemImage(client, itemId, type, imageBuffer, contentTypes);
  }

  if (attemptErrors.length === 0) {
    return;
  }

  const summary = attemptErrors.slice(0, 6).join(" | ");
  throw new Error(
    `Jellyfin image upload error: no upload strategy succeeded. ${summary || "no response details"}`,
  );
}

export async function applyRemoteImageWithFallback(
  client: JellyfinClient,
  itemId: string,
  imageUrl: string,
  type: ImageType = "Primary",
): Promise<"remote-download" | "binary-upload"> {
  try {
    await downloadRemoteImage(client, itemId, imageUrl, type);
    return "remote-download";
  } catch {
    await uploadItemImageFromUrl(client, itemId, imageUrl, type);
    return "binary-upload";
  }
}
