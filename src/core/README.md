# core — infrastructure

Framework and vendor code lives here so features never import an SDK directly. Swapping
Mapbox, the analytics vendor or the HTTP client should touch this folder and nothing else.

| Folder | Holds |
| --- | --- |
| `api/rest` | HTTP client, auth/refresh interceptors, certificate pinning, endpoint map (NestJS API) |
| `api/websocket` | socket lifecycle, channels, typed events — chat and live counts |
| `api/messaging` | FCM/APNs registration and push handlers (a push triggers a repository refresh, it never writes state) |
| `api/queryClient` | the app's TanStack Query client and its defaults (no query retries — `apiClient` retries GETs; 1 min fresh, 10 min kept; foreground = focus), plus keys shared across features (`GET /me`). Every API read is a query and every write a mutation; features keep their own keys, namespaced by feature. Sign-out clears it. |
| `cache` | cache policies (`cacheFirst`, `networkFirst`, `cacheOnly`, `realtime`) and per-entity TTLs |
| `storage` | `secure` (Keychain / EncryptedSharedPreferences — tokens only), `kv` (MMKV), `db` (SQLite + migrations) |
| `offline` | the pending-write queue and connectivity watcher (NFR-MOB-03) |
| `errors` | `DomainError` union and the mapping to `UserFacingError` |
| `config` | environment/build variants, feature flags |
| `analytics` | Mixpanel wrapper with the event schema from `contracts/analytics` (NFR-MOB-08) |
| `monitoring` | Sentry wrapper (NFR-MOB-02) |
| `location` | permissions, reverse geocoding, distance |
| `maps` | Mapbox wrapper — the only file that imports the Mapbox SDK |
| `media` | image picking, HEIC conversion, compression, upload with retry |
| `permissions` | one API for location, notifications, photos |
| `deeplinks` | universal/app-link parsing and routing (NFR-MOB-07) |
| `i18n` | string catalogue, English only in MVP but extraction-ready (NFR-MOB-05) |
| `logging` | leveled logger |

## Cache policies

Chosen per call site by the repository, never by a hook or a screen:

| Policy | Use for |
| --- | --- |
| `cacheFirst` | instant-render screens — feed, profile, explore |
| `networkFirst` | staleness matters — price, subscription status, capacity |
| `cacheOnly` | offline-only content — FAQ, terms, saved receipts |
| `realtime` | live streams — chat, joined counts |

TTLs are declared once per entity, next to the entity, and read by the repository.
They are not scattered across call sites.
