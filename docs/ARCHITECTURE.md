# Ajala — Architecture

Clean Architecture, feature-first, on React Native + Expo. The layering and non-negotiables
are adapted from the Linc Driver architecture plan; the feature list and requirement IDs come
from the TravelConnect Mobile App FRD.

## 1. Layers

Three layers per feature. Arrows point inward — both outer layers depend on Domain, and
Domain depends on nothing.

```
        ┌───────────────┐                    ┌───────────────┐
        │ Presentation  │                    │     Data      │
        │ screens       │                    │ datasources   │
        │ components    │                    │ dto, mappers  │
        │ hooks (VM)    │                    │ repo impls    │
        │ state         │                    │               │
        └───────┬───────┘                    └───────┬───────┘
                │                                    │
                └──────────────┐      ┌──────────────┘
                               ▼      ▼
                         ┌─────────────────┐
                         │     Domain      │
                         │ entities        │
                         │ repo contracts  │
                         │ use cases       │
                         └─────────────────┘
```

| Layer | Contains | May import |
| --- | --- | --- |
| `presentation` | screens, dumb components, hooks that act as view models, immutable state, one-shot events, feature routes | its own `domain`, `@shared`, `@core` UI helpers |
| `domain` | entities, repository **interfaces**, use cases, TTLs, validation rules | nothing — pure TypeScript, no React, Expo, HTTP or SDK imports |
| `data` | REST services, socket subscriptions, local caches, DTOs, mappers, repository **implementations** | its own `domain`, `@core`, `@shared/domain` |

`eslint.config.js` encodes each row as a `no-restricted-imports` rule, and
`scripts/check-boundaries.js` re-checks the whole tree in CI.

## 2. One request, end to end

```
 USER        SCREEN        HOOK (VM)        USE CASE        REPOSITORY        SOURCES
  │             │              │                │                │              │
  │ opens tab   │              │                │                │              │
  ├────────────▶│  useHomeFeed()                │                │              │
  │             ├─────────────▶│ observeCityFeed()               │              │
  │             │              ├───────────────▶│ .observe(city) │              │
  │             │              │                ├───────────────▶│ 1. cache hit │
  │             │              │                │◀───────────────┤   emit page  │
  │             │              │◀───────────────┤                │              │
  │             │◀─────────────┤ state.posts    │                │ 2. network   │
  │◀────────────┤ renders      │                │                ├─────────────▶│
  │             │              │                │                │◀─────────────┤
  │             │◀─────────────┤ state.posts (fresh), isStale=false            │
```

- A screen knows only its hook and the state that hook returns.
- A hook calls **one use case per intent** — never two.
- A use case works on entities; it does not know whether the data came from REST, the socket
  or the cache.
- A repository is the only thing that touches a data source.

## 3. State and events

Every screen has exactly one immutable state type and one one-shot event channel.

```ts
// presentation/state/HomeFeedState.ts
export type HomeFeedState = {
  posts: Post[];
  cursor: FeedCursor | null;
  activeFilter: FeedFilter;
  isLoading: boolean;
  isStaleCache: boolean;          // showing cache while a refresh runs
  error: UserFacingError | null;
};

// presentation/state/HomeFeedEvent.ts
export type HomeFeedEvent =
  | { type: 'navigate'; to: Route }
  | { type: 'toast'; message: string }
  | { type: 'openPaywall' };       // teleport tapped without a subscription
```

State is durable — what to render right now. Events are consumed once and discarded, which is
what stops the "navigate twice on re-render" class of bug. Updates replace the whole state
object; they never mutate it in place.

## 4. Navigation

Expo Router owns the route tree. A screen never navigates to another feature's screen by
importing it — it emits an event, and the feature's `presentation/navigation` module maps that
event to a route path.

```ts
// features/post-detail/presentation/navigation/routes.ts
export const postDetailRoutes = {
  attendees: (postId: string) => `/modals/attendees?postId=${postId}` as const,
  hostProfile: (userId: string) => `/profile/${userId}` as const,
  chatWithHost: (userId: string) => `/chat/new?userId=${userId}` as const,
};
```

**A feature's route map stays at or under 10 entries.** Past that, the feature is doing too
much — split it. This is the single most effective guard against a screen that slowly absorbs
half the app.

## 5. Dependency injection

`src/bootstrap/di` is the composition root: it builds repositories, injects them into use cases, and
exposes use cases through a typed context that presentation hooks consume. Constructor
injection, no service locators, no singletons in feature code — logging, crash reporting and
analytics are the only exceptions.

This is what makes a feature testable in isolation: a test swaps the repository for a fake from
`shared/testing/fakes` without touching the network.

## 6. Data sources

| Source | Used for | Caching |
| --- | --- | --- |
| REST (NestJS API) | all reads and writes that are not live: auth, feed, profile, create, payments | our cache layer — disk-backed, policy-driven |
| WebSocket | live channels: chat delivery, typing, read receipts, joined-count updates | in-memory last snapshot only; resubscribe on reconnect |
| FCM / APNs | push only — wake-up signals, not data | not cached; a push triggers a repository refresh |
| Device | location, photos, secure storage, store billing | per `core/` wrapper |

**A hook never subscribes to a socket or an FCM topic.** Those sit behind a repository, and the
hook sees a stream of entities and nothing more.

## 7. Caching and offline (NFR-MOB-03)

The **repository** — not the hook, not the use case — decides whether to serve cache, network,
or both. Cache logic therefore lives in exactly one place per entity.

```
observe(city)
  Step 1: read local cache  ──▶ emit immediately if present
  Step 2: fetch remote      ──▶ emit fresh data on success
  Step 3: write fresh data back to the local cache

  On network failure:
    • cache present  → emit cached data with isStale = true (UI shows a banner)
    • cache missing  → emit DomainError.network
```

Policies, picked per call site: `cacheFirst` (feed, profile, explore), `networkFirst` (price,
subscription status, capacity), `cacheOnly` (FAQ, terms, receipts), `realtime` (chat, live counts).

TTLs are declared once, next to the entity — driver of truth for staleness, not scattered
across repositories.

| Entity | TTL |
| --- | --- |
| Profile | 1 hour |
| Feed page | 5 minutes |
| Explore curation | 10 minutes |
| Price / capacity | 30 seconds |
| Static content (FAQ, terms) | 24 hours |
| Chat messages | realtime, no TTL |

**Offline writes** are queued in `core/offline/queue` with a stable client-side UUID per write
for backend idempotency, and drained when connectivity returns.

## 8. Errors

Every repository method returns `Result<T, DomainError>`:

```ts
type DomainError =
  | { kind: 'network' } | { kind: 'timeout' }
  | { kind: 'unauthorized' } | { kind: 'notFound' } | { kind: 'conflict' }
  | { kind: 'quotaExceeded'; resetsAt: Date }   // e.g. 4th Event this month (MOB-063)
  | { kind: 'paymentRequired' }                 // teleport without subscription (MOB-022)
  | { kind: 'server'; message: string }
  | { kind: 'unknown'; cause: unknown };
```

The hook maps `DomainError` to a `UserFacingError`. A screen never sees a raw HTTP or SQLite error.

## 9. Testing

| Layer | Test type | Target |
| --- | --- | --- |
| `domain` | pure unit tests with fake repositories | 95% |
| `data` | integration against a mock server + cache scenarios | 80% |
| `presentation/hooks` | unit tests with fake use cases | 80% |
| `presentation/screens` | snapshot tests | every primary state |
| end to end | Maestro flows in `e2e/` | happy paths + paywall + RSVP |

Every repository ships the same six cache tests: cache hit, cache miss, stale served with flag,
network success updates cache, 401 clears cache, offline queue drains.

## 10. Non-negotiables

- Domain has **no framework imports**. Pure TypeScript only.
- A hook never imports a repository. It calls use cases.
- A screen never imports a use case. It calls its hook.
- A feature imports another feature only through `@features/<name>`, never deeper.
- No singletons in feature code. Inject.
- A feature folder is self-contained — moving it out should only break imports of its public API.
- A feature's route map is ≤ 10 entries. Past that, split the feature.
- Every repository read has cache-fallback behaviour, or a comment saying why it does not.
- Money and safety mutations never queue silently offline — they prompt.
- No two ways to do the same thing. A migration either ships or is reverted.

Architecture review at the end of weeks 2, 4 and 9, to catch pattern drift before it sets.

## 11. The API layer (as built)

The contract lives at `contracts/openapi/ajala-api.json` — the server's own OpenAPI document.
Treat it as the source of truth for wire shapes; when it and this file disagree, the spec wins.

```
core/api/apiConfig.ts   base URL + timeout
core/api/apiClient.ts   the ONLY place that calls fetch()
core/api/ApiError.ts    every documented error code, as a union
```

`apiRequest<T>()` is the single HTTP entry point. It attaches the bearer token, aborts on a
15s timeout, tolerates the 202/204 empty-body responses the auth endpoints return, and converts
every failure — including a dropped connection — into an `ApiError` carrying the server's
`code`, `fieldErrors` and `requestId`.

**Branch on `code`, never on `message`.** The server says so in its own spec, and the messages
are not stable.

### Base URL

`EXPO_PUBLIC_API_URL`, defaulting to `https://dev-api.ajalatrvl.com`. Point it at
`http://localhost:3000` to run against a local server. It is read at module load, so changing it
needs a reload, not just a refresh.

### Where the wire meets the domain

`ApiError` stops at the repository. `AuthRepositoryImpl` maps `ApiErrorCode → AuthErrorCode` and
nothing above the data layer knows an HTTP status exists.

The mapping is per endpoint, because **the same code means different things depending on where
it came from**. A `UNAUTHORIZED` from `/auth/login` is a wrong password; from `/auth/otp/verify`
it is a wrong code; from `/auth/password/reset` it is an expired link. Those overrides are
declared at each call site in `AuthRepositoryImpl`, next to the request they qualify.

### Swapping in fixtures

`authModule.ts` is the seam. It wires `createAuthRepository()` (real HTTP) today;
`FixtureAuthRepository` implements the same port for offline work and demos. Swap the one line —
no screen, hook or use case changes.

### Sessions

Tokens live in the Keychain / Keystore via `core/storage/secure`, as one JSON blob under
`ajala.auth.session.v1`. Every secure-store call is best-effort: a locked or unavailable keychain
reads as "not signed in" rather than throwing, so the app always boots to a usable state.

`AuthProvider` sits at the **root** layout, not inside `(auth)`, because `app/index.tsx` has to
know whether a session exists before it can route a cold start. It waits for both the onboarding
gate and the keychain read; until both land it renders nothing and the splash overlay stays up.

### Divergence from §8

Auth predates the `Result<T, DomainError>` convention above and **throws** `AuthError` instead.
The boundary still holds — no HTTP detail escapes the data layer — but new features should
follow §8 rather than copy auth.

### Sign-in has two different 403s

`/auth/login` answers 403 for two unrelated reasons, and telling them apart matters:

| code | means | answered by |
| --- | --- | --- |
| `EMAIL_NOT_VERIFIED` | the address was never confirmed; a code has been re-sent | `/auth/otp/verify` — a different endpoint, on the verification screen |
| `STEP_UP_REQUIRED` | the credentials were **right**; the server wants a second factor | **retrying `/auth/login`** with `otpCode` attached |

They map to `emailNotVerified` and `stepUpRequired` respectively. Collapsing them sends a
step-up into the sign-up verification screen, which calls the wrong endpoint.

Step-up is handled in place on the sign-in screen rather than on a route of its own: the retry
needs the same email and password, and keeping them in the hook avoids carrying a password
through navigation params. Editing either field clears a pending code, since the code was
issued against the pair that was submitted.

### Password reset is link-based, not code-based

`POST /auth/password/forgot` emails a link; there is **no endpoint to verify a 6-digit reset
code**, so the designed "enter the code" step could not be built. The flow is:

```
forgot-password/index      ask for the email  → 202 (always, even for an unknown address)
  ↓  user leaves the app and opens their email
ajala://forgot-password/new-password?token=…  deep link back in
forgot-password/new-password                  → 204, then back to sign in
```

The 202 is deliberate on the server's side: answering identically for a known and an unknown
address is what stops the endpoint being used to discover who has an account. The screen says
"if that address is registered" for the same reason — do not "improve" it into a confirmation.

**This needs the backend to emit a link the app can open.** A plain `https://` link opens the
browser instead, and the reset dead-ends. Either the email uses the `ajala://` scheme, or the
`https://` host is configured as a universal link (iOS `associatedDomains` + AASA, Android
App Links + assetlinks.json) — neither is set up yet.

Until then the screen can be reached manually for testing:

```
xcrun simctl openurl booted "ajala://forgot-password/new-password?token=TEST"
```
