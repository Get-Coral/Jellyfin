import type { JellyfinMediaSource, PlayMethod, RemotePlaybackSupport } from "../types/index.js";

/**
 * Whether a stream can be played by a TV rather than by the browser.
 *
 * AirPlay and Cast don't proxy media through the page — the receiver is handed
 * the URL and decodes it itself. So the question "can this play?" stops being
 * about the browser and becomes about the receiver, and the two disagree: a
 * desktop browser happily direct-plays an MKV that no Chromecast can demux.
 *
 * Without this, a cast looks like it worked and the TV just sits black.
 *
 * The lists below are the intersection of what Apple's AVPlayer and the Google
 * Cast default receiver both handle, which is deliberately conservative. A
 * receiver may well play more (an Apple TV decodes HEVC, newer Chromecasts do
 * VP9), but we can't tell which device is on the other end — the pickers don't
 * report model or capabilities — so "safe" here means safe for either.
 */

const REMOTE_SAFE_CONTAINERS = ["mp4", "m4v", "mov", "mpegts", "ts", "hls"];
const REMOTE_SAFE_VIDEO_CODECS = ["h264", "avc", "avc1"];
const REMOTE_SAFE_AUDIO_CODECS = ["aac", "mp3", "mp4a"];

function normalize(value: string | undefined | null): string {
  return (value ?? "").trim().toLowerCase();
}

/**
 * A container field can list several, e.g. "mp4,m4v". Direct play only happens
 * when the real file matches, but Jellyfin echoes the list back, so treat it as
 * safe when every candidate is.
 */
function splitContainers(container: string | undefined | null): string[] {
  return normalize(container)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function firstStreamCodec(source: JellyfinMediaSource, type: string): string {
  const stream = source.MediaStreams?.find((candidate) => normalize(candidate.Type) === type);
  return normalize(stream?.Codec);
}

/**
 * Can an AirPlay or Cast receiver play this stream?
 *
 * Transcoded streams always can: the device profile pins them to H.264/AAC in
 * either fragmented MP4 or HLS, which both receiver families handle. Only
 * direct play needs inspecting, because then the file goes to the TV as-is.
 */
export function describeRemotePlaybackSupport(
  playMethod: PlayMethod,
  mediaSource: JellyfinMediaSource | undefined,
): RemotePlaybackSupport {
  if (playMethod === "Transcode") return { safe: true };

  if (!mediaSource) {
    // No metadata to judge by. Claim unsupported rather than promise a TV
    // something it may not deliver — a hidden button beats a black screen.
    return { safe: false, blockedBy: { kind: "unknown", value: "" } };
  }

  const containers = splitContainers(mediaSource.Container);
  const unsafeContainer = containers.find(
    (container) => !REMOTE_SAFE_CONTAINERS.includes(container),
  );
  if (containers.length === 0) {
    return { safe: false, blockedBy: { kind: "unknown", value: "" } };
  }
  if (unsafeContainer) {
    return { safe: false, blockedBy: { kind: "container", value: unsafeContainer } };
  }

  const videoCodec = firstStreamCodec(mediaSource, "video");
  if (videoCodec && !REMOTE_SAFE_VIDEO_CODECS.includes(videoCodec)) {
    return { safe: false, blockedBy: { kind: "videoCodec", value: videoCodec } };
  }

  const audioCodec = firstStreamCodec(mediaSource, "audio");
  if (audioCodec && !REMOTE_SAFE_AUDIO_CODECS.includes(audioCodec)) {
    return { safe: false, blockedBy: { kind: "audioCodec", value: audioCodec } };
  }

  return { safe: true };
}
