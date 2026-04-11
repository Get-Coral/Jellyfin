// ── Core ─────────────────────────────────────────────────────────────────────

export type JellyfinMediaType =
  | "Movie"
  | "Series"
  | "Episode"
  | "MusicAlbum"
  | "MusicVideo"
  | "BoxSet"
  | "Audio"
  | "Book";

export type MediaSource = "jellyfin";
export type MediaType = "movie" | "series" | "episode" | "collection" | "music" | "book";
export type SortOrder = "Ascending" | "Descending";
export type ImageType = "Primary" | "Backdrop" | "Thumb" | "Logo" | "Banner";
export type PlayMethod = "DirectPlay" | "Transcode";
export type WatchStatus = "watched" | "unwatched" | "inprogress";

// ── Jellyfin API shapes ───────────────────────────────────────────────────────

export interface JellyfinItem {
  Id: string;
  Name: string;
  Type: JellyfinMediaType;
  ProductionYear?: number;
  RunTimeTicks?: number;
  OfficialRating?: string;
  Overview?: string;
  CommunityRating?: number;
  ChildCount?: number;
  ImageTags?: {
    Primary?: string;
    Backdrop?: string;
    Thumb?: string;
    Logo?: string;
    Banner?: string;
  };
  BackdropImageTags?: string[];
  GenreItems?: { Id: string; Name: string }[];
  People?: JellyfinPerson[];
  Studios?: { Id?: string; Name: string }[];
  Tags?: string[];
  SeriesName?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  UserData?: JellyfinUserData;
}

export interface JellyfinPerson {
  Id: string;
  Name: string;
  Role?: string;
  Type?: string;
  PrimaryImageTag?: string;
}

export interface JellyfinUserData {
  PlaybackPositionTicks?: number;
  PlayedPercentage?: number;
  Played?: boolean;
  IsFavorite?: boolean;
  LastPlayedDate?: string;
  PlayCount?: number;
}

export interface JellyfinResponse<T> {
  Items: T[];
  TotalRecordCount: number;
}

export interface JellyfinMediaStream {
  Type: string;
  Index: number;
  Language?: string;
  DisplayTitle?: string;
  IsTextSubtitleStream?: boolean;
  Codec?: string;
  BitRate?: number;
}

export interface JellyfinMediaSource {
  Id?: string | null;
  MediaStreams?: JellyfinMediaStream[];
  SupportsDirectPlay?: boolean;
  SupportsDirectStream?: boolean;
  TranscodingUrl?: string | null;
  Container?: string;
  Size?: number;
  Bitrate?: number;
}

export interface JellyfinPlaybackInfo {
  MediaSources?: JellyfinMediaSource[];
  PlaySessionId?: string | null;
}

export interface JellyfinAuthResponse {
  AccessToken?: string;
  SessionInfo?: { Id?: string };
}

export interface JellyfinSystemInfo {
  ServerName: string;
  Version: string;
  OperatingSystem?: string;
  HasUpdateAvailable?: boolean;
  LocalAddress?: string;
  WanAddress?: string;
}

export interface JellyfinItemCounts {
  MovieCount?: number;
  SeriesCount?: number;
  EpisodeCount?: number;
  MusicAlbumCount?: number;
  SongCount?: number;
  BookCount?: number;
  MusicVideoCount?: number;
}

export interface JellyfinActiveSession {
  Id: string;
  UserId?: string;
  UserName?: string;
  Client?: string;
  DeviceName?: string;
  LastActivityDate?: string;
  NowPlayingItem?: {
    Id: string;
    Name: string;
    Type: string;
    RunTimeTicks?: number;
    PrimaryImageTag?: string;
    SeriesName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
  };
  PlayState?: {
    PositionTicks?: number;
    IsPaused?: boolean;
    PlayMethod?: string;
  };
}

export interface JellyfinUserPolicy {
  IsAdministrator?: boolean;
  IsDisabled?: boolean;
  IsHidden?: boolean;
  EnableRemoteControlOfOtherUsers?: boolean;
  EnableSharedDeviceControl?: boolean;
  EnableRemoteAccess?: boolean;
  EnableMediaPlayback?: boolean;
  EnableAudioPlaybackTranscoding?: boolean;
  EnableVideoPlaybackTranscoding?: boolean;
  EnablePlaybackRemuxing?: boolean;
  EnableContentDeletion?: boolean;
  EnableContentDownloading?: boolean;
  EnableAllDevices?: boolean;
  EnableAllChannels?: boolean;
  EnableAllFolders?: boolean;
  EnablePublicSharing?: boolean;
  InvalidLoginAttemptCount?: number;
  LoginAttemptsBeforeLockout?: number;
  MaxActiveSessions?: number;
  SimultaneousStreamLimit?: number;
  [key: string]: unknown;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
  HasPassword: boolean;
  LastLoginDate?: string;
  LastActivityDate?: string;
  PrimaryImageTag?: string;
  Policy?: JellyfinUserPolicy;
}

export interface JellyfinVirtualFolder {
  Name: string;
  CollectionType?: string;
  ItemId: string;
  Locations?: string[];
  PrimaryImageItemId?: string;
}

export interface MediaItem {
  id: string;
  source: MediaSource;
  type: MediaType;
  title: string;
  year?: number;
  runtimeMinutes?: number;
  overview?: string;
  rating?: number;
  ageRating?: string;
  genres: string[];
  posterUrl?: string;
  backdropUrl?: string;
  thumbUrl?: string;
  logoUrl?: string;
  progress?: number;
  playbackPositionTicks?: number;
  played?: boolean;
  isFavorite?: boolean;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  streamUrl?: string;
  childCount?: number;
  watchedAt?: string;
}

export interface MediaPerson {
  id: string;
  name: string;
  role?: string;
  type?: string;
  imageUrl?: string;
}

export interface DetailedMediaItem extends MediaItem {
  cast: MediaPerson[];
  studios: string[];
  tags: string[];
}

export interface JellyfinClientConfig {
  url: string;
  apiKey: string;
  userId: string;
  username?: string;
  password?: string;
  clientName?: string;
  deviceName?: string;
  deviceId?: string;
  version?: string;
}

export interface SubtitleTrack {
  index: number;
  label: string;
  language: string;
  url: string;
}

export interface JellyfinPlaybackSession {
  streamUrl: string;
  canSyncProgress: boolean;
  playMethod: PlayMethod;
  playSessionId?: string;
  mediaSourceId?: string;
  sessionId?: string;
  subtitleTracks: SubtitleTrack[];
}

export interface PlaybackSyncInput {
  itemId: string;
  positionTicks: number;
  playMethod?: PlayMethod;
  playSessionId?: string;
  mediaSourceId?: string;
  sessionId?: string;
  isPaused?: boolean;
  isStopped?: boolean;
  played?: boolean;
}

export interface GetLibraryItemsOptions {
  sortBy?: string;
  sortOrder?: SortOrder;
  limit?: number;
  startIndex?: number;
  genre?: string;
  filters?: string;
  watchStatus?: WatchStatus;
  officialRatings?: string;
  minCommunityRating?: number;
  minPremiereDate?: string;
  maxPremiereDate?: string;
}
