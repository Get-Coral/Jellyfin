import { describe, expect, it } from "vitest";
import type { JellyfinMediaSource } from "../types/index.js";
import { describeRemotePlaybackSupport } from "./remote-playback.js";

function source(
  container: string | undefined,
  streams: Array<{ Type: string; Codec?: string }> = [],
): JellyfinMediaSource {
  return {
    ...(container !== undefined && { Container: container }),
    MediaStreams: streams.map((s, Index) => ({ Index, ...s })),
  };
}

const H264_AAC = [
  { Type: "Video", Codec: "h264" },
  { Type: "Audio", Codec: "aac" },
];

describe("transcoded streams", () => {
  it("are always safe, whatever the source was", () => {
    expect(describeRemotePlaybackSupport("Transcode", source("mkv", H264_AAC)).safe).toBe(true);
    expect(describeRemotePlaybackSupport("Transcode", undefined).safe).toBe(true);
  });
});

describe("direct play", () => {
  it("accepts mp4 with h264 and aac", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("mp4", H264_AAC))).toEqual({
      safe: true,
    });
  });

  it("accepts a multi-container list when every entry is safe", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("mp4,m4v", H264_AAC)).safe).toBe(
      true,
    );
  });

  it("rejects mkv, the case that silently blanks a Chromecast", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("mkv", H264_AAC))).toEqual({
      safe: false,
      blockedBy: { kind: "container", value: "mkv" },
    });
  });

  it("rejects a container list where any entry is unsafe", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("mp4,mkv", H264_AAC))).toEqual({
      safe: false,
      blockedBy: { kind: "container", value: "mkv" },
    });
  });

  it("rejects webm, which no AirPlay receiver decodes", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("webm", H264_AAC)).safe).toBe(false);
  });

  it("names the video codec when the container is fine", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source("mp4", [
          { Type: "Video", Codec: "hevc" },
          { Type: "Audio", Codec: "aac" },
        ]),
      ),
    ).toEqual({ safe: false, blockedBy: { kind: "videoCodec", value: "hevc" } });
  });

  it("names the audio codec when video is fine", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source("mp4", [
          { Type: "Video", Codec: "h264" },
          { Type: "Audio", Codec: "flac" },
        ]),
      ),
    ).toEqual({ safe: false, blockedBy: { kind: "audioCodec", value: "flac" } });
  });

  it("reports the container first when several things are wrong", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source("mkv", [
          { Type: "Video", Codec: "av1" },
          { Type: "Audio", Codec: "opus" },
        ]),
      ).blockedBy?.kind,
    ).toBe("container");
  });

  it("is case and whitespace insensitive", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source(" MP4 , M4V ", [
          { Type: "VIDEO", Codec: "H264" },
          { Type: "Audio", Codec: "AAC" },
        ]),
      ).safe,
    ).toBe(true);
  });

  it("accepts avc1 and mp4a spellings", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source("mp4", [
          { Type: "Video", Codec: "avc1" },
          { Type: "Audio", Codec: "mp4a" },
        ]),
      ).safe,
    ).toBe(true);
  });

  it("ignores subtitle streams when judging codecs", () => {
    expect(
      describeRemotePlaybackSupport(
        "DirectPlay",
        source("mp4", [
          { Type: "Video", Codec: "h264" },
          { Type: "Audio", Codec: "aac" },
          { Type: "Subtitle", Codec: "subrip" },
        ]),
      ).safe,
    ).toBe(true);
  });

  it("withholds a promise it can't keep when metadata is missing", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", undefined)).toEqual({
      safe: false,
      blockedBy: { kind: "unknown", value: "" },
    });
    expect(describeRemotePlaybackSupport("DirectPlay", source(undefined, H264_AAC))).toEqual({
      safe: false,
      blockedBy: { kind: "unknown", value: "" },
    });
  });

  it("accepts a source with no stream metadata but a safe container", () => {
    expect(describeRemotePlaybackSupport("DirectPlay", source("mp4")).safe).toBe(true);
  });
});
