# @get-coral/jellyfin

> A fully typed TypeScript client for the Jellyfin API — part of the [Coral](https://getcoral.dev) ecosystem.

[![npm](https://img.shields.io/npm/v/@get-coral/jellyfin?style=flat-square&color=ff6b6b)](https://www.npmjs.com/package/@get-coral/jellyfin)
[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-ElianCodes-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/ElianCodes)
[![Discord](https://img.shields.io/discord/1495441903297237043?label=Discord&logo=discord&logoColor=white&color=5865F2)](https://discord.gg/M3wzFpGbzp)
[![License: MIT](https://img.shields.io/badge/License-MIT-2dd4bf?style=flat-square)](https://opensource.org/licenses/MIT)
[![Build](https://img.shields.io/github/actions/workflow/status/Get-Coral/jellyfin/ci.yml?style=flat-square)](https://github.com/Get-Coral/jellyfin/actions)

Modern, fetch-based Jellyfin API client with full TypeScript types. No dependencies. Works in Node.js, browsers, and edge runtimes (Cloudflare Workers, Vercel Edge, etc).

---

## Install

```bash
pnpm add @get-coral/jellyfin
# or
npm install @get-coral/jellyfin
```

---

## Quick start

```ts
import { createClient, getLibraryItems, fromJellyfin } from '@get-coral/jellyfin'

const client = createClient({
  url: 'http://192.168.1.10:8096',
  apiKey: 'your-api-key',
  userId: 'your-user-id',
})

const { Items } = await getLibraryItems(client, 'Movie', {
  limit: 24,
  sortBy: 'SortName',
  watchStatus: 'unwatched',
})

const movies = Items.map(item => fromJellyfin(client, item))
```

---

## Client configuration

```ts
const client = createClient({
  url: string        // Jellyfin server URL (trailing slash stripped automatically)
  apiKey: string     // Jellyfin API key
  userId: string     // User ID (UUID)

  // Optional — for playback progress sync
  username?: string
  password?: string

  // Optional — how this client identifies itself in Jellyfin's active sessions
  clientName?: string  // default: 'Coral'
  deviceName?: string  // default: 'Coral Web'
  deviceId?: string    // default: 'coral-web'
  version?: string     // default: '1.0.0'
})
```

Set `clientName` to your app's name so it shows up correctly in Jellyfin's dashboard:

```ts
const client = createClient({
  url: process.env.JELLYFIN_URL,
  apiKey: process.env.JELLYFIN_API_KEY,
  userId: process.env.JELLYFIN_USER_ID,
  clientName: 'KAPOW!',
  deviceName: 'KAPOW! Web',
  deviceId: 'kapow-web',
})
```

---

## API reference

### Items

```ts
getItem(client, itemId)
// → JellyfinItem — single item with full metadata including cast, studios, tags

searchItems(client, query, types?)
// → JellyfinItem[] — search across media types (default: Movie, Series)

getFeaturedItem(client, type?)
// → JellyfinItem | null — random item with backdrop, useful for hero sections

getContinueWatching(client, limit?)
// → JellyfinItem[] — in-progress items

getLatestMedia(client, type?, limit?)
// → JellyfinItem[] — recently added

getFavoriteItems(client, type?, limit?)
// → JellyfinItem[] — items marked as favourite

getMostPlayed(client, type?, limit?)
// → JellyfinItem[] — sorted by play count

getLibraryItems(client, type, options?)
// → JellyfinResponse<JellyfinItem> — paginated library with full filtering

getWatchHistory(client, options?)
// → JellyfinResponse<JellyfinItem> — played items sorted by date watched

getSimilarItems(client, itemId, limit?)
// → JellyfinItem[] — similar items

setFavorite(client, itemId, isFavorite)
// → { IsFavorite: boolean }

setPlayed(client, itemId, played)
// → { Played: boolean }

deleteItem(client, id)
// → void

updateItemName(client, id, name)
// → void
```

#### `getLibraryItems` options

```ts
{
  sortBy?: string           // default: 'SortName'
  sortOrder?: 'Ascending' | 'Descending'
  limit?: number            // default: 24
  startIndex?: number       // for pagination
  genre?: string
  watchStatus?: 'watched' | 'unwatched' | 'inprogress'
  officialRatings?: string  // e.g. 'PG,PG-13'
  minCommunityRating?: number
  minPremiereDate?: string  // ISO date string
  maxPremiereDate?: string
}
```

---

### Shows

```ts
getEpisodesForSeries(client, seriesId)
// → JellyfinItem[] — all episodes sorted by season/episode number

getNextUpForSeries(client, seriesId, limit?)
// → JellyfinItem[] — next unwatched episodes
```

---

### Collections

```ts
getCollections(client)
// → JellyfinItem[] — all BoxSet collections

getCollectionItems(client, collectionId)
// → JellyfinItem[] — items in a collection

createCollection(client, name, itemIds?)
// → { Id: string }

addItemsToCollection(client, collectionId, itemIds)
removeItemsFromCollection(client, collectionId, itemIds)
```

---

### Playback

```ts
createPlaybackSession(client, itemId, options?)
// → JellyfinPlaybackSession
// Resolves the best stream URL, detects direct play vs transcode,
// and extracts subtitle tracks. Requires username + password in config.

{
  streamUrl: string
  canSyncProgress: boolean
  playMethod: 'DirectPlay' | 'Transcode'
  playSessionId?: string
  mediaSourceId?: string
  sessionId?: string
  subtitleTracks: SubtitleTrack[]
}

syncPlaybackState(client, input)
// Reports playback position back to Jellyfin (progress, pause, stop, played)
```

---

### URL builders

These return strings — useful when you need to pass URLs to an `<img>` or video player directly.

```ts
imageUrl(client, itemId, type?, width?)
// type: 'Primary' | 'Backdrop' | 'Thumb' | 'Logo' | 'Banner'
// default: 'Primary', width: 400

personImageUrl(client, personId, width?)
streamUrl(client, itemId, options?)
transcodeUrl(client, itemId, options?)
subtitleUrl(client, itemId, mediaSourceId, streamIndex)
```

---

### Mapper

Converts raw `JellyfinItem` objects into a normalised `MediaItem` shape. Useful for building UIs that don't want to deal with Jellyfin's raw API format.

```ts
fromJellyfin(client, item)
// → MediaItem — normalised shape with resolved image URLs and stream URL

fromJellyfinDetailed(client, item)
// → DetailedMediaItem — includes cast, studios, tags

isResumable(item)
// → boolean — true if item has a resume position and hasn't been fully watched
```

---

### Admin

```ts
getSystemInfo(client)       // → JellyfinSystemInfo
getItemCounts(client)       // → JellyfinItemCounts
getActiveSessions(client)   // → JellyfinActiveSession[]

getUsers(client)
getUserById(client, userId)
createUser(client, name, password)
deleteUser(client, userId)
updateUserPolicy(client, userId, policy)

getVirtualFolders(client)   // → JellyfinVirtualFolder[]
scanAllLibraries(client)
scanLibrary(client, itemId)
```

---

### Error handling

All functions throw a `JellyfinError` on non-OK responses:

```ts
import { JellyfinError } from '@get-coral/jellyfin'

try {
  const item = await getItem(client, 'bad-id')
} catch (err) {
  if (err instanceof JellyfinError) {
    console.error(err.message) // 'Jellyfin API error on /Users/.../Items/bad-id: 404 Not Found'
    console.error(err.status)  // 404
  }
}
```

---

## Types

All types are exported from the package root:

```ts
import type {
  JellyfinItem,
  JellyfinClientConfig,
  MediaItem,
  DetailedMediaItem,
  JellyfinPlaybackSession,
  // ... and more
} from '@get-coral/jellyfin'
```

---

## Part of the Coral ecosystem

This package is built and maintained as part of [Coral](https://getcoral.dev) — a reef of independent Docker modules that extend Jellyfin with modern UX.

| Module | Description |
|--------|-------------|
| [🎬 Aurora](https://github.com/Get-Coral/aurora) | High-end cinematic Jellyfin frontend |
| [🎤 KAPOW!](https://github.com/Get-Coral/KAPOW) | Karaoke queue manager for bars & events |
| [📖 Fathom](https://github.com/Get-Coral/fathom) | Modern reading app from your NAS |

---

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](https://github.com/Get-Coral/.github/blob/main/CONTRIBUTING.md) for guidelines.

## License

MIT © [ElianCodes](https://elian.codes)
