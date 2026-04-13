import type {
  DetailedMediaItem,
  JellyfinItem,
  MediaItem,
  MediaPerson,
  MediaType,
} from "../types/index.js";
import type { JellyfinClient } from "./client.js";
import { imageUrl, personImageUrl, streamUrl } from "./urls.js";

function resolveMediaType(type: JellyfinItem["Type"]): MediaType {
  switch (type) {
    case "Movie":
      return "movie";
    case "Episode":
      return "episode";
    case "BoxSet":
      return "collection";
    case "MusicAlbum":
      return "music";
    case "Book":
      return "book";
    default:
      return "series";
  }
}

function resolveRuntimeMinutes(item: JellyfinItem): number | undefined {
  return item.RunTimeTicks ? Math.round(item.RunTimeTicks / 600_000_000) : undefined;
}

function resolveArtworkUrls(client: JellyfinClient, item: JellyfinItem) {
  return {
    posterUrl: item.ImageTags?.Primary ? imageUrl(client, item.Id, "Primary", 400) : undefined,
    backdropUrl:
      item.BackdropImageTags && item.BackdropImageTags.length > 0
        ? imageUrl(client, item.Id, "Backdrop", 1920)
        : undefined,
    thumbUrl: item.ImageTags?.Thumb ? imageUrl(client, item.Id, "Thumb", 600) : undefined,
    logoUrl: item.ImageTags?.Logo ? imageUrl(client, item.Id, "Logo", 900) : undefined,
  };
}

function resolveStreamUrl(client: JellyfinClient, item: JellyfinItem, type: MediaType) {
  return type === "collection" ? undefined : streamUrl(client, item.Id);
}

function resolveUserDataFields(item: JellyfinItem) {
  return {
    ...(item.UserData?.PlayedPercentage !== undefined && {
      progress: item.UserData.PlayedPercentage,
    }),
    ...(item.UserData?.PlaybackPositionTicks !== undefined && {
      playbackPositionTicks: item.UserData.PlaybackPositionTicks,
    }),
    ...(item.UserData?.Played !== undefined && { played: item.UserData.Played }),
    ...(item.UserData?.IsFavorite !== undefined && { isFavorite: item.UserData.IsFavorite }),
    ...(item.UserData?.LastPlayedDate !== undefined && {
      watchedAt: item.UserData.LastPlayedDate,
    }),
  };
}

export function fromJellyfin(client: JellyfinClient, item: JellyfinItem): MediaItem {
  const type = resolveMediaType(item.Type);
  const runtimeMinutes = resolveRuntimeMinutes(item);
  const artwork = resolveArtworkUrls(client, item);
  const resolvedStreamUrl = resolveStreamUrl(client, item, type);

  return {
    id: item.Id,
    source: "jellyfin",
    type,
    title: item.Name,
    genres: item.GenreItems?.map((g) => g.Name) ?? [],
    ...(item.ProductionYear !== undefined && { year: item.ProductionYear }),
    ...(runtimeMinutes !== undefined && { runtimeMinutes }),
    ...(item.Overview !== undefined && { overview: item.Overview }),
    ...(item.CommunityRating !== undefined && { rating: item.CommunityRating }),
    ...(item.OfficialRating !== undefined && { ageRating: item.OfficialRating }),
    ...(artwork.posterUrl !== undefined && { posterUrl: artwork.posterUrl }),
    ...(artwork.backdropUrl !== undefined && { backdropUrl: artwork.backdropUrl }),
    ...(artwork.thumbUrl !== undefined && { thumbUrl: artwork.thumbUrl }),
    ...(artwork.logoUrl !== undefined && { logoUrl: artwork.logoUrl }),
    ...resolveUserDataFields(item),
    ...(item.SeriesName !== undefined && { seriesTitle: item.SeriesName }),
    ...(item.ParentIndexNumber !== undefined && { seasonNumber: item.ParentIndexNumber }),
    ...(item.IndexNumber !== undefined && { episodeNumber: item.IndexNumber }),
    ...(item.ChildCount !== undefined && { childCount: item.ChildCount }),
    ...(resolvedStreamUrl !== undefined && { streamUrl: resolvedStreamUrl }),
  };
}

export function fromJellyfinDetailed(
  client: JellyfinClient,
  item: JellyfinItem,
): DetailedMediaItem {
  const cast: MediaPerson[] =
    item.People?.filter((p) => p.Type === "Actor" || Boolean(p.Role))
      .slice(0, 10)
      .map((p): MediaPerson => {
        const personImageUrl_ = p.PrimaryImageTag ? personImageUrl(client, p.Id, 240) : undefined;
        return {
          id: p.Id,
          name: p.Name,
          ...(p.Role !== undefined && { role: p.Role }),
          ...(p.Type !== undefined && { type: p.Type }),
          ...(personImageUrl_ !== undefined && { imageUrl: personImageUrl_ }),
        };
      }) ?? [];

  return {
    ...fromJellyfin(client, item),
    cast,
    studios: item.Studios?.map((s) => s.Name) ?? [],
    tags: item.Tags ?? [],
  };
}

export function isResumable(
  item: Pick<MediaItem, "progress" | "playbackPositionTicks" | "played">,
): boolean {
  return Boolean(
    !item.played &&
      ((item.progress != null && item.progress > 0) ||
        (item.playbackPositionTicks != null && item.playbackPositionTicks > 0)),
  );
}
