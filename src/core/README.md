# core — infrastructure

Framework and vendor code lives here so features never import an SDK directly. Swapping
Mapbox, the analytics vendor or the HTTP client should touch this folder and nothing else.

| Folder | Holds |
| --- | --- |
| `api` | `apiClient` — the one place the app speaks HTTP (base URL, JSON, bearer token, GET retries, `ApiError`); in demo mode it answers from `demo` instead |
| `api/websocket` | the chat socket (`chatSocket`): lifecycle and typed events |
| `push` | expo-notifications behind plain functions: permission, the native push token (FCM on Android, APNs on iOS), arriving/tapped listeners, and reading a push's `data` wherever the platform put it. The API calls live in the notifications feature. A push triggers a refresh; it never writes state |
| `session` | `beforeSignOut`: work other features need done while still signed in (push unregister), run by auth's sign-out with a time limit — a registry because those features import auth |
| `api/queryClient` | the app's TanStack Query client and its defaults (no query retries — `apiClient` retries GETs; 1 min fresh, 10 min kept; foreground = focus), plus keys shared across features (`GET /me`). Every API read is a query and every write a mutation; features keep their own keys, namespaced by feature. Sign-out clears it. |
| `storage` | `secure` (Keychain / EncryptedSharedPreferences — tokens only) |
| `config` | environment/build variants, feature flags |
| `location` | permissions, reverse geocoding, distance |
| `maps` | Mapbox wrapper — the only file that imports the Mapbox SDK |
| `media` | image picking, HEIC conversion, compression, upload with retry |

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
