import type {
  JellyfinPlaybackInfo,
  JellyfinPlaybackSession,
  PlaybackSyncInput,
  SubtitleTrack,
} from "../types/index.js";
import type { JellyfinClient, PlaybackAuth } from "./client.js";
import { setPlayed } from "./items.js";
import { streamUrl, subtitleUrl, transcodeUrl } from "./urls.js";

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
      DeviceProfile: {
        DirectPlayProfiles: [
          {
            Type: "Video",
            Container: "mp4,mkv,webm",
            VideoCodec: "h264,vp8,vp9,av1",
            AudioCodec: "aac,mp3,opus,flac,vorbis",
          },
          { Type: "Audio", Container: "mp3,aac,flac,ogg,opus" },
        ],
        TranscodingProfiles: [],
        CodecProfiles: [],
        SubtitleProfiles: [
          { Format: "vtt", Method: "External" },
          { Format: "srt", Method: "External" },
        ],
      },
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
    ? transcodeUrl(client, itemId, urlOptions)
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
