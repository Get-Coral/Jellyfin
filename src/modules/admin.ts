import type {
  JellyfinActiveSession,
  JellyfinItemCounts,
  JellyfinSystemInfo,
  JellyfinUser,
  JellyfinUserPolicy,
  JellyfinVirtualFolder,
} from "../types/index.js";
import type { JellyfinClient } from "./client.js";

export async function getSystemInfo(client: JellyfinClient): Promise<JellyfinSystemInfo> {
  return client.fetch<JellyfinSystemInfo>("/System/Info");
}

export async function getItemCounts(client: JellyfinClient): Promise<JellyfinItemCounts> {
  return client.fetch<JellyfinItemCounts>("/Items/Counts", {
    UserId: client.config.userId,
  });
}

export async function getActiveSessions(client: JellyfinClient): Promise<JellyfinActiveSession[]> {
  return client.fetch<JellyfinActiveSession[]>("/Sessions");
}

export async function getUsers(client: JellyfinClient): Promise<JellyfinUser[]> {
  return client.fetch<JellyfinUser[]>("/Users");
}

export async function getUserById(client: JellyfinClient, userId: string): Promise<JellyfinUser> {
  return client.fetch<JellyfinUser>(`/Users/${userId}`);
}

export async function updateUserPolicy(
  client: JellyfinClient,
  userId: string,
  policy: JellyfinUserPolicy,
): Promise<void> {
  const url = new URL(`${client.config.url}/Users/${userId}/Policy`);
  url.searchParams.set("api_key", client.config.apiKey);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(policy),
  });
  if (!res.ok) throw new Error(`Update user policy: ${res.status}`);
}

export async function deleteUser(client: JellyfinClient, userId: string): Promise<void> {
  const res = await client.fetchRaw(`/Users/${userId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete user: ${res.status}`);
}

export async function createUser(
  client: JellyfinClient,
  name: string,
  password: string,
): Promise<JellyfinUser> {
  const url = new URL(`${client.config.url}/Users/New`);
  url.searchParams.set("api_key", client.config.apiKey);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Name: name, Password: password }),
  });
  if (!res.ok) throw new Error(`Create user: ${res.status}`);
  return res.json() as Promise<JellyfinUser>;
}

export async function getVirtualFolders(client: JellyfinClient): Promise<JellyfinVirtualFolder[]> {
  return client.fetch<JellyfinVirtualFolder[]>("/Library/VirtualFolders");
}

export async function scanAllLibraries(client: JellyfinClient): Promise<void> {
  const url = new URL(`${client.config.url}/Library/Refresh`);
  url.searchParams.set("api_key", client.config.apiKey);
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Scan libraries: ${res.status}`);
}

export async function scanLibrary(client: JellyfinClient, itemId: string): Promise<void> {
  const url = new URL(`${client.config.url}/Items/${itemId}/Refresh`);
  url.searchParams.set("api_key", client.config.apiKey);
  const res = await fetch(url.toString(), { method: "POST" });
  if (!res.ok) throw new Error(`Scan library: ${res.status}`);
}
