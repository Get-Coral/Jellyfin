import type {
  DetailedMediaItem,
  JellyfinItem,
  MediaItem,
  MediaPerson,
  MediaType,
} from "../types/index.js";
import type { JellyfinClient } from "./client.js";
import { imageUrl, personImageUrl, streamUrl } from "./urls.js";

export function fromJellyfin(client: JellyfinClient, item: JellyfinItem): MediaItem {
  const type: MediaType =
    item.Type === "Movie"
      ? "movie"
      : item.Type === "Episode"
        ? "episode"
        : item.Type === "BoxSet"
          ? "collection"
          : item.Type === "MusicAlbum"
            ? "music"
            : item.Type === "Book"
              ? "book"
              : "series";

  const runtimeMinutes = item.RunTimeTicks
    ? Math.round(item.RunTimeTicks / 600_000_000)
    : undefined;

  const posterUrl = item.ImageTags?.Primary ? imageUrl(client, item.Id, "Primary", 400) : undefined;

  const backdropUrl =
    item.BackdropImageTags && item.BackdropImageTags.length > 0
      ? imageUrl(client, item.Id, "Backdrop", 1920)
      : undefined;

  const thumbUrl = item.ImageTags?.Thumb ? imageUrl(client, item.Id, "Thumb", 600) : undefined;

  const logoUrl = item.ImageTags?.Logo ? imageUrl(client, item.Id, "Logo", 900) : undefined;

  const resolvedStreamUrl = type === "collection" ? undefined : streamUrl(client, item.Id);

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
    ...(posterUrl !== undefined && { posterUrl }),
    ...(backdropUrl !== undefined && { backdropUrl }),
    ...(thumbUrl !== undefined && { thumbUrl }),
    ...(logoUrl !== undefined && { logoUrl }),
    ...(item.UserData?.PlayedPercentage !== undefined && {
      progress: item.UserData.PlayedPercentage,
    }),
    ...(item.UserData?.PlaybackPositionTicks !== undefined && {
      playbackPositionTicks: item.UserData.PlaybackPositionTicks,
    }),
    ...(item.UserData?.Played !== undefined && { played: item.UserData.Played }),
    ...(item.UserData?.IsFavorite !== undefined && { isFavorite: item.UserData.IsFavorite }),
    ...(item.SeriesName !== undefined && { seriesTitle: item.SeriesName }),
    ...(item.ParentIndexNumber !== undefined && { seasonNumber: item.ParentIndexNumber }),
    ...(item.IndexNumber !== undefined && { episodeNumber: item.IndexNumber }),
    ...(item.ChildCount !== undefined && { childCount: item.ChildCount }),
    ...(item.UserData?.LastPlayedDate !== undefined && {
      watchedAt: item.UserData.LastPlayedDate,
    }),
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
