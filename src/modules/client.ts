import type { JellyfinAuthResponse, JellyfinClientConfig, JellyfinUser } from "../types/index.js";

export interface PlaybackAuth {
  cacheKey: string;
  token: string;
  sessionId?: string | undefined;
}

interface ResolvedConfig {
  url: string;
  apiKey: string;
  userId: string;
  username?: string | undefined;
  password?: string | undefined;
  accessToken?: string | undefined;
  clientName: string;
  deviceName: string;
  deviceId: string;
  version: string;
}

export class JellyfinClient {
  readonly config: ResolvedConfig;
  #playbackAuth: PlaybackAuth | null = null;

  constructor(config: JellyfinClientConfig) {
    this.config = {
      url: config.url.replace(/\/+$/, ""),
      apiKey: config.apiKey,
      userId: config.userId,
      ...(config.username !== undefined && { username: config.username }),
      ...(config.password !== undefined && { password: config.password }),
      ...(config.accessToken !== undefined && { accessToken: config.accessToken }),
      clientName: config.clientName ?? "Coral",
      deviceName: config.deviceName ?? "Coral Web",
      deviceId: config.deviceId ?? "coral-web",
      version: config.version ?? "1.0.0",
    };
  }

  async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.config.url}${path}`);
    url.searchParams.set("api_key", this.config.apiKey);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new JellyfinError(
        `Jellyfin API error on ${path}: ${res.status} ${res.statusText}`,
        res.status,
      );
    }
    return res.json() as Promise<T>;
  }

  async fetchRaw(path: string, init?: RequestInit): Promise<Response> {
    const url = new URL(`${this.config.url}${path}`);
    url.searchParams.set("api_key", this.config.apiKey);
    return fetch(url.toString(), init);
  }

  buildAuthHeader(token?: string): string {
    const parts = [
      `Client="${this.config.clientName}"`,
      `Device="${this.config.deviceName}"`,
      `DeviceId="${this.config.deviceId}"`,
      `Version="${this.config.version}"`,
    ];
    if (token) parts.push(`Token="${token}"`);
    return `MediaBrowser ${parts.join(", ")}`;
  }

  #playbackCacheKey(): string {
    return `${this.config.url}::${this.config.userId}::${this.config.username}`;
  }

  async getPlaybackAuth(forceRefresh = false): Promise<PlaybackAuth | null> {
    if (this.config.accessToken) {
      return {
        cacheKey: `${this.config.url}::token::${this.config.userId}`,
        token: this.config.accessToken,
      };
    }

    if (!this.config.username || !this.config.password) return null;

    const cacheKey = this.#playbackCacheKey();
    if (this.#playbackAuth?.cacheKey === cacheKey && !forceRefresh) {
      return this.#playbackAuth;
    }

    const res = await fetch(`${this.config.url}/Users/AuthenticateByName`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": this.buildAuthHeader(),
      },
      body: JSON.stringify({
        Username: this.config.username,
        Pw: this.config.password,
      }),
    });

    if (!res.ok) {
      throw new JellyfinError(`Jellyfin auth failed: ${res.status} ${res.statusText}`, res.status);
    }

    const data = (await res.json()) as JellyfinAuthResponse;
    if (!data.AccessToken) {
      throw new JellyfinError("Jellyfin auth failed: no access token returned", 401);
    }

    const sessionId = data.SessionInfo?.Id;
    this.#playbackAuth = {
      cacheKey,
      token: data.AccessToken,
      ...(sessionId !== undefined && { sessionId }),
    };

    return this.#playbackAuth;
  }

  clearPlaybackAuth(): void {
    this.#playbackAuth = null;
  }

  async playbackRequest(
    path: string,
    payload: Record<string, unknown>,
    forceRefresh = false,
  ): Promise<boolean> {
    const auth = await this.getPlaybackAuth(forceRefresh);
    if (!auth) return false;

    const res = await fetch(`${this.config.url}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Emby-Authorization": this.buildAuthHeader(auth.token),
        "X-Emby-Token": auth.token,
      },
      body: JSON.stringify(payload),
    });

    // A static access token cannot be refreshed by re-authenticating.
    if (res.status === 401 && !forceRefresh && !this.config.accessToken) {
      this.#playbackAuth = null;
      return this.playbackRequest(path, payload, true);
    }

    if (!res.ok) {
      throw new JellyfinError(`Jellyfin playback error on ${path}: ${res.status}`, res.status);
    }

    return true;
  }
}

export interface JellyfinAuthenticationResult {
  user: JellyfinUser;
  accessToken: string;
  sessionId?: string | undefined;
}

/**
 * Authenticate a user with their Jellyfin username and password via
 * `/Users/AuthenticateByName`. Unlike `getPlaybackAuth`, this returns the
 * authenticated user's identity, so callers can build login flows on top of
 * it. Throws a `JellyfinError` with the upstream status (401 for invalid
 * credentials or disabled users).
 */
export async function authenticateUserByName(
  client: JellyfinClient,
  username: string,
  password: string,
): Promise<JellyfinAuthenticationResult> {
  const res = await fetch(`${client.config.url}/Users/AuthenticateByName`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Emby-Authorization": client.buildAuthHeader(),
    },
    body: JSON.stringify({ Username: username, Pw: password }),
  });

  if (!res.ok) {
    throw new JellyfinError(
      `Jellyfin authentication failed: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  const data = (await res.json()) as JellyfinAuthResponse;
  if (!data.AccessToken || !data.User?.Id) {
    throw new JellyfinError("Jellyfin authentication failed: incomplete response", 401);
  }

  const sessionId = data.SessionInfo?.Id;
  return {
    user: data.User,
    accessToken: data.AccessToken,
    ...(sessionId !== undefined && { sessionId }),
  };
}

/**
 * Revoke a Jellyfin access token by ending its session (`/Sessions/Logout`).
 * Returns true when the session was revoked (or was already invalid).
 */
export async function logoutUserSession(
  client: JellyfinClient,
  accessToken: string,
): Promise<boolean> {
  const res = await fetch(`${client.config.url}/Sessions/Logout`, {
    method: "POST",
    headers: {
      "X-Emby-Authorization": client.buildAuthHeader(accessToken),
      "X-Emby-Token": accessToken,
    },
  });

  return res.ok || res.status === 401;
}

export class JellyfinError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "JellyfinError";
  }
}

export function createClient(config: JellyfinClientConfig): JellyfinClient {
  return new JellyfinClient(config);
}
