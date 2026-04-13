// ── Client ────────────────────────────────────────────────────────────────────

// ── Admin ─────────────────────────────────────────────────────────────────────
export {
  createUser,
  deleteUser,
  getActiveSessions,
  getItemCounts,
  getSystemInfo,
  getUserById,
  getUsers,
  getVirtualFolders,
  scanAllLibraries,
  scanLibrary,
  updateUserPolicy,
} from "./modules/admin.js";
export type { PlaybackAuth } from "./modules/client.js";
export { createClient, JellyfinClient, JellyfinError } from "./modules/client.js";
export type { SearchCollectionItemsOptions } from "./modules/collections.js";
// ── Collections ───────────────────────────────────────────────────────────────
export {
  addItemsToCollection,
  createCollection,
  getCollectionItems,
  getCollections,
  removeItemsFromCollection,
  searchCollectionItems,
} from "./modules/collections.js";
// ── Items ─────────────────────────────────────────────────────────────────────
export {
  deleteItem,
  downloadRemoteImage,
  getContinueWatching,
  getFavoriteItems,
  getFeaturedItem,
  getItem,
  getLatestMedia,
  getLibraryItems,
  getMostPlayed,
  getRemoteImages,
  getSimilarItems,
  getWatchHistory,
  searchItems,
  setFavorite,
  setPlayed,
  updateItem,
  updateItemName,
} from "./modules/items.js";
// ── Mapper ────────────────────────────────────────────────────────────────────
export { fromJellyfin, fromJellyfinDetailed, isResumable } from "./modules/mapper.js";

// ── Playback ──────────────────────────────────────────────────────────────────
export { createPlaybackSession, syncPlaybackState } from "./modules/playback.js";
// ── Shows ─────────────────────────────────────────────────────────────────────
export { getEpisodesForSeries, getNextUpForSeries } from "./modules/shows.js";
// ── URL builders ──────────────────────────────────────────────────────────────
export { imageUrl, personImageUrl, streamUrl, subtitleUrl, transcodeUrl } from "./modules/urls.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  DetailedMediaItem,
  GetLibraryItemsOptions,
  ImageType,
  JellyfinActiveSession,
  JellyfinClientConfig,
  JellyfinItem,
  JellyfinItemCounts,
  JellyfinItemUpdate,
  JellyfinMediaSource,
  JellyfinMediaStream,
  JellyfinMediaType,
  JellyfinPerson,
  JellyfinPlaybackInfo,
  JellyfinPlaybackSession,
  JellyfinRemoteImageInfo,
  JellyfinRemoteImageResult,
  JellyfinResponse,
  JellyfinSystemInfo,
  JellyfinUser,
  JellyfinUserData,
  JellyfinUserPolicy,
  JellyfinVirtualFolder,
  MediaItem,
  MediaPerson,
  MediaSource,
  MediaType,
  PlaybackSyncInput,
  PlayMethod,
  SortOrder,
  SubtitleTrack,
  WatchStatus,
} from "./types/index.js";
