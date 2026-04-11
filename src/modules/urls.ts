import type { ImageType } from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export function imageUrl(
  client: JellyfinClient,
  itemId: string,
  type: ImageType = "Primary",
  width = 400,
): string {
  return `${client.config.url}/Items/${itemId}/Images/${type}?maxWidth=${width}&api_key=${client.config.apiKey}`;
}

export function personImageUrl(client: JellyfinClient, personId: string, width = 240): string {
  return `${client.config.url}/Items/${personId}/Images/Primary?maxWidth=${width}&api_key=${client.config.apiKey}`;
}

export function streamUrl(
  client: JellyfinClient,
  itemId: string,
  options?: { playSessionId?: string; mediaSourceId?: string },
): string {
  const url = new URL(`${client.config.url}/Videos/${itemId}/stream`);
  url.searchParams.set("static", "true");
  url.searchParams.set("api_key", client.config.apiKey);
  if (options?.playSessionId) url.searchParams.set("PlaySessionId", options.playSessionId);
  if (options?.mediaSourceId) url.searchParams.set("MediaSourceId", options.mediaSourceId);
  return url.toString();
}

export function transcodeUrl(
  client: JellyfinClient,
  itemId: string,
  options?: { playSessionId?: string; mediaSourceId?: string },
): string {
  const url = new URL(`${client.config.url}/Videos/${itemId}/stream.mp4`);
  url.searchParams.set("api_key", client.config.apiKey);
  url.searchParams.set("VideoCodec", "h264");
  url.searchParams.set("AudioCodec", "aac");
  url.searchParams.set("DeviceId", client.config.deviceId);
  if (options?.playSessionId) url.searchParams.set("PlaySessionId", options.playSessionId);
  if (options?.mediaSourceId) url.searchParams.set("MediaSourceId", options.mediaSourceId);
  return url.toString();
}

export function subtitleUrl(
  client: JellyfinClient,
  itemId: string,
  mediaSourceId: string,
  streamIndex: number,
): string {
  return `${client.config.url}/Videos/${itemId}/${mediaSourceId}/Subtitles/${streamIndex}/Stream.vtt?api_key=${client.config.apiKey}`;
}
