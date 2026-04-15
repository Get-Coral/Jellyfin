import type {
  JellyfinPlaybackInfo,
  JellyfinPlaybackSession,
  PlaybackSyncInput,
  SubtitleTrack,
} from "../types/index.js";
import type { JellyfinClient, PlaybackAuth } from "./client.js";
import { setPlayed } from "./items.js";
import { streamUrl, subtitleUrl, transcodeUrl } from "./urls.js";

const SAFE_HLS_MAX_STREAMING_BITRATE = 8_000_000;
const SAFE_HLS_VIDEO_BITRATE = 6_000_000;
const SAFE_HLS_AUDIO_BITRATE = 192_000;

function buildDeviceProfile(prefersSafeVideo: boolean | undefined) {
  return {
    DirectPlayProfiles: [
      {
        Type: "Video",
        Container: prefersSafeVideo ? "mp4" : "mp4,mkv,webm",
        VideoCodec: prefersSafeVideo ? "h264" : "h264,vp8,vp9,av1",
        AudioCodec: prefersSafeVideo ? "aac,mp3" : "aac,mp3,opus,flac,vorbis",
      },
      { Type: "Audio", Container: "mp3,aac,flac,ogg,opus" },
    ],
    TranscodingProfiles: [
      prefersSafeVideo
        ? {
            Type: "Video",
            Container: "ts",
            VideoCodec: "h264",
            AudioCodec: "aac",
            Protocol: "hls",
            Context: "Streaming",
            MinSegments: 1,
            SegmentLength: 3,
            BreakOnNonKeyFrames: true,
            TranscodeSeekInfo: "Auto",
          }
        : {
            Type: "Video",
            Container: "mp4",
            VideoCodec: "h264",
            AudioCodec: "aac",
            Protocol: "http",
            Context: "Streaming",
            TranscodeSeekInfo: "Auto",
          },
    ],
    CodecProfiles: [],
    SubtitleProfiles: [
      { Format: "vtt", Method: "External" },
      { Format: "srt", Method: "External" },
    ],
  };
}

export async function createPlaybackSession(
  client: JellyfinClient,
  itemId: string,
  options?: { prefersSafeVideo?: boolean },
): Promise<JellyfinPlaybackSession> {
  const auth = await client.getPlaybackAuth().catch(() => null);

  if (!auth) {
    return {
      streamUrl: streamUrl(client, itemId),
      canSyncProgress: false,
      playMethod: "DirectPlay",
      subtitleTracks: [],
    };
  }

  const url = new URL(`${client.config.url}/Items/${itemId}/PlaybackInfo`);
  url.searchParams.set("UserId", client.config.userId);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": client.buildAuthHeader((auth as PlaybackAuth).token),
      "X-Emby-Token": (auth as PlaybackAuth).token,
    },
    body: JSON.stringify({
      UserId: client.config.userId,
      StartTimeTicks: 0,
      IsPlayback: true,
      AutoOpenLiveStream: true,
      DeviceProfile: buildDeviceProfile(options?.prefersSafeVideo),
    }),
  });

  if (res.status === 401) {
    client.clearPlaybackAuth();
    return createPlaybackSession(client, itemId, options);
  }

  if (!res.ok) {
    throw new Error(`Playback session error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as JellyfinPlaybackInfo;
  const playSessionId = data.PlaySessionId ?? undefined;
  const mediaSource = data.MediaSources?.[0];
  const mediaSourceId = mediaSource?.Id ?? undefined;

  const supportsDirectPlay = mediaSource?.SupportsDirectPlay !== false;
  const shouldTranscode = !supportsDirectPlay || options?.prefersSafeVideo === true;
  const playMethod = shouldTranscode ? "Transcode" : "DirectPlay";

  // Build URL options only with defined values to satisfy exactOptionalPropertyTypes
  const urlOptions = {
    ...(playSessionId !== undefined && { playSessionId }),
    ...(mediaSourceId !== undefined && { mediaSourceId }),
  };

  const resolvedStreamUrl = shouldTranscode
    ? resolveTranscodeStreamUrl(
        client,
        itemId,
        mediaSource?.TranscodingUrl,
        urlOptions,
        options?.prefersSafeVideo === true,
      )
    : streamUrl(client, itemId, urlOptions);

  const subtitleTracks: SubtitleTrack[] = (mediaSource?.MediaStreams ?? [])
    .filter((s) => s.Type === "Subtitle" && s.IsTextSubtitleStream)
    .map((s, position) => ({
      index: position,
      label: s.DisplayTitle ?? s.Language ?? `Track ${s.Index}`,
      language: s.Language ?? "und",
      url: subtitleUrl(client, itemId, mediaSourceId ?? itemId, s.Index),
    }));

  const sessionId = (auth as PlaybackAuth).sessionId;

  return {
    streamUrl: resolvedStreamUrl,
    canSyncProgress: Boolean(playSessionId),
    playMethod,
    subtitleTracks,
    ...(playSessionId !== undefined && { playSessionId }),
    ...(mediaSourceId !== undefined && { mediaSourceId }),
    ...(sessionId !== undefined && { sessionId }),
  };
}

function resolveTranscodeStreamUrl(
  client: JellyfinClient,
  itemId: string,
  transcodingUrl: string | null | undefined,
  options?: { playSessionId?: string; mediaSourceId?: string },
  prefersSafeVideo?: boolean,
): string {
  if (!transcodingUrl) {
    return transcodeUrl(client, itemId, options);
  }

  const url = new URL(transcodingUrl, `${client.config.url}/`);
  if (!url.searchParams.has("api_key")) {
    url.searchParams.set("api_key", client.config.apiKey);
  }
  if (options?.playSessionId && !url.searchParams.has("PlaySessionId")) {
    url.searchParams.set("PlaySessionId", options.playSessionId);
  }
  if (options?.mediaSourceId && !url.searchParams.has("MediaSourceId")) {
    url.searchParams.set("MediaSourceId", options.mediaSourceId);
  }

  const isHlsTranscode = url.pathname.endsWith(".m3u8") || url.searchParams.get("SegmentContainer") === "ts";
  if (prefersSafeVideo && isHlsTranscode) {
    url.searchParams.set("MaxStreamingBitrate", String(SAFE_HLS_MAX_STREAMING_BITRATE));
    url.searchParams.set("VideoBitrate", String(SAFE_HLS_VIDEO_BITRATE));
    url.searchParams.set("AudioBitrate", String(SAFE_HLS_AUDIO_BITRATE));
    url.searchParams.delete("EnableSubtitlesInManifest");
    url.searchParams.delete("SubtitleMethod");
    url.searchParams.delete("SubtitleStreamIndex");
  }

  return url.toString();
}

export async function syncPlaybackState(
  client: JellyfinClient,
  {
    itemId,
    positionTicks,
    playMethod = "DirectPlay",
    playSessionId,
    mediaSourceId,
    sessionId,
    isPaused = false,
    isStopped = false,
    played,
  }: PlaybackSyncInput,
): Promise<{ progressSynced: boolean; playedSynced: boolean }> {
  let progressSynced = false;

  if (playSessionId) {
    progressSynced = await client
      .playbackRequest(isStopped ? "/Sessions/Playing/Stopped" : "/Sessions/Playing/Progress", {
        ItemId: itemId,
        PositionTicks: positionTicks,
        IsPaused: isPaused,
        CanSeek: true,
        PlayMethod: playMethod,
        PlaySessionId: playSessionId,
        MediaSourceId: mediaSourceId,
        SessionId: sessionId,
      })
      .catch(() => false);
  }

  let playedSynced = false;
  if (typeof played === "boolean") {
    await setPlayed(client, itemId, played);
    playedSynced = true;
  }

  return { progressSynced, playedSynced };
}
