# App vs Swagger: mismatches, 9 Nov 2026

What the app's API layer still does differently from the live Swagger (`https://dev-api.ajalatrvl.com/api/v1/docs-json`, 117 User/Common operations), as of the working tree on `feat/design-system-onboarding`. Nothing here is fixed yet. The contract itself is [ajala-api-users-common.md](ajala-api-users-common.md) (re-synced the same day).

Grouped by feature, most user-visible first. **Breaks** = fails against the dev API today; **Wrong** = works but shows or does the wrong thing; **Gap** = Swagger offers it, the app doesn't use it. "(known)" marks the items already on the list before this pass.

The root cause of most rows: **Swagger replaced cities with Google place ids and the feed's city with an origin point.** `GET /cities`, `/cities/popular`, `/cities/resolve` and `/cities/{id}` are gone; `homeCity`/`homeCityId` → `homePlace`/`homePlaceId`; `favouriteCities`/`extras.favouriteCityIds` → `favouriteDestinations`/`extras.favouriteDestinationIds`; `PostCardDto.city` → `placeId`, `formattedAddress`, `localityLabel`, `countryCode`; `FeedPageDto`/`MapPinsDto`/`PostSearchPageDto` `city`/`citySource` → `origin`/`originSource`; `TeleportDto.cityId` → `placeId`; 404 `NO_CITY` → 404 `NO_LOCATION`. The API rejects properties it does not list, so every request still sending a city field is a 400.

---

## 1. Home feed and Travel (teleport)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Feed page | Reads `dto.city` and `dto.citySource` (`src/features/home/data/mappers/feedMappers.ts:42-43`, type at `src/features/home/data/dto/feedDtos.ts:95-100`). `toFeedCity(undefined)` reads `.id` of undefined, so **every feed load throws** | `FeedPageDto { origin: FeedOriginDto { lat, lng, label, region }, originSource: 'device' \| 'teleport', items, nextCursor }` | Map `origin`/`originSource`; header from `origin.label` (teleport) or `origin.region` |
| **Breaks** No-location error | Maps `NO_CITY` → `noCity` ("set a home city") (`feedMappers.ts:68`) | 404 `NO_LOCATION`: no `X-Client-Location` and no teleport. No home-city fallback. `NO_LOCATION` is not in the app's code list, so it arrives as plain `NOT_FOUND` → `unknown` | Add `NO_LOCATION`; show "turn on location" (or Teleport for subscribers), not "set a home city" |
| **Breaks** City picker | `GET /cities?q=` and `GET /cities/popular` (`src/features/home/data/datasources/remote/feedApi.ts:38-41`) | Both endpoints removed (404) | Google Places SDK on the phone, restricted to cities; drop the Popular row or ask for a source |
| **Breaks** Teleport body | `POST /me/teleport { cityId }` (`src/features/home/data/repositories/FeedRepositoryImpl.ts:33`, `feedDtos.ts:102-104`) | `TeleportDto { placeId }`, a Google place id for a city; `cityId` is rejected | Send `{ placeId }` from the Places picker |
| **Wrong** Teleport errors | 404 → `cityNotFound` (`feedMappers.ts:70`) | 400 unknown place / not a city (venue, address); 402 `PAYMENT_REQUIRED`; 503 map vendor down | Map 400 → "pick a city"; 503 → "try again" |
| **Wrong** Travel state | Reads `MeDto.homeCity` and `MeDto.teleport.city` (`feedDtos.ts:112-115`, `feedMappers.ts:50-51`) | `MeDto.homePlace: PlaceRefDto \| null`; `MeDto.teleport: TeleportDto { placeId } \| null` (no `city`, no label). The app always sees "not teleported" and no home | Read `teleport != null` for state; name it from the feed's `origin.label` (see spec §8 Q1) |
| **Wrong** Origin source enum | `'device' \| 'edge' \| 'home' \| 'teleport'` (`feedDtos.ts:14`, `src/features/home/domain/entities/Feed.ts:13`) | `'device' \| 'teleport'` only | Narrow the type; drop the edge/home branches |
| **Wrong** Card place | `PostCardDto.city` (`feedDtos.ts:78`) | No `city`; `placeId`, `formattedAddress`, `localityLabel`, `countryCode` | Show `localityLabel` |

## 2. Onboarding / Profile Setup (profile feature)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Detect my city | `GET /cities/resolve?lat=&lng=` (`src/features/profile/data/datasources/remote/profileApi.ts:53-57`, used at `src/features/profile/data/repositories/ProfileRepositoryImpl.ts:99`) | Removed | Places SDK / on-device geocoding to a city place id (spec §8 Q3) |
| **Breaks** City search and Popular chips | `GET /cities`, `GET /cities/popular` (`profileApi.ts:59-66`) | Removed | Places SDK autocomplete (cities) |
| **Breaks** Save home city | `PATCH /me { homeCityId }` (`src/features/profile/data/dto/profileDtos.ts:133`, `ProfileRepositoryImpl.ts:61`) | `UpdateProfileDto.homePlaceId` (Google place id of a city; venue/address is 400). `homeCityId` is rejected, so the whole setup PATCH fails | Send `homePlaceId` |
| **Breaks** Favourite locations | `extras.favouriteCityIds` (`profileDtos.ts:82-83`, `ProfileRepositoryImpl.ts:68`; seeded from `favouriteCities` at `ProfileRepositoryImpl.ts:32-34`) | `extras.favouriteDestinationIds` (≤ 10 Google place ids of cities; 11th is 400) | Rename and send place ids |
| **Wrong** Read back | `MeDto.homeCity`, `MeDto.favouriteCities` (`profileDtos.ts:109,114`; `src/features/profile/data/mappers/profileMappers.ts:42,46`) | `homePlace: PlaceRefDto \| null`, `favouriteDestinations: PlaceRefDto[]` (`{ placeId, label, countryCode }`) | Map the new fields; key chips by `placeId` |

## 3. Sign-in (auth)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** (known) Google/Apple on an existing email | Expects 409 `ACCOUNT_LINK_REQUIRED` + `details.challengeId` and a code screen (`src/features/auth/data/datasources/remote/authApi.ts:115,131`; `src/features/auth/data/mappers/authErrorMapper.ts:19,55`; `src/features/auth/presentation/hooks/useAccountLink.ts`, `LinkAccountScreen.tsx`) | 409 `EMAIL_ALREADY_REGISTERED` with `details.signInMethods: ('password'\|'google'\|'apple')[]`; accounts are never joined. The unknown code falls back to `CONFLICT` → `unknown` ("something went wrong") | Map `EMAIL_ALREADY_REGISTERED` to a "Sign in with X instead" message; delete the link flow |
| **Breaks** (known) Link call | `POST /auth/oauth/link` (`authApi.ts:147-154`, `src/features/auth/data/dto/authDtos.ts:85-89`, `src/features/auth/data/repositories/AuthRepositoryImpl.ts:141-143`) | Endpoint removed | Remove |
| **Wrong** `SIGNUP_REFUSED` note | Comment says no endpoint documents it (`authErrorMapper.ts:21-23`) | 403 `SIGNUP_REFUSED` from `/auth/oauth/google` and `/apple` (banned email, no details). Mapping already works | Comment only |

## 4. Chat and the live socket

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Socket host | `${apiConfig.baseUrl}/chat` = `https://dev-api.ajalatrvl.com/chat` (`src/core/api/websocket/chatSocket.ts:142-146`; no separate setting in `src/core/api/apiConfig.ts`) | `https://dev-ws.ajalatrvl.com/chat`; a wrong host is refused with `connect_error` `FORBIDDEN` ("do not retry") | Add a socket-host setting (e.g. `EXPO_PUBLIC_WS_URL`) per environment |
| **Breaks** Token expiry on a live socket | No `session.expiring` handling; every event just goes to listeners (`chatSocket.ts:105-109`) | `session.expiring { inMs }`: refresh, set `socket.auth.token`, `disconnect().connect()` before `inMs`; the server cuts the socket 60 s after the token expires, and the client does **not** reconnect after a server cut (`io server disconnect`) | Handle `session.expiring`; on `disconnect` with `io server disconnect`, reconnect with a fresh token (or drop if signed out) |
| **Breaks** Refused connections | No `connect_error` listener (`chatSocket.ts:95-110`) | Act on `error.data.code`: `UNAUTHENTICATED` (refresh, `connect()`), `SESSION_SOCKET_LIMIT`, `RATE_LIMITED` (wait a minute), `SERVICE_UNAVAILABLE` (retry), `FORBIDDEN` (stop). Middleware refusals are not auto-retried | Add the handler |
| **Wrong** Server restart | `server.restart` ignored | `server.restart { reconnectInMs }`: reconnect after that wait | Handle it |
| **Wrong** Own messages flip sides | `toMessage` sets `mine: !!dto.mine` (`src/features/chat/data/mappers/chatMappers.ts:88`); the socket copy replaces the sent one by `clientMsgId` (`src/features/chat/domain/rules/chatRules.ts:123-127`); "my id" is derived from `mine` (`chatRules.ts:79-80`) | `message.new` is the saved message **without `mine`**; every member, the sender too, hears it: "compare `sender.id` with your own" | Set `mine` from `sender.id === myId` (from `GET /me`) for socket messages |
| **Wrong** Auth header | Also sends `extraHeaders: { Authorization: Bearer <first token> }`, fixed at creation (`chatSocket.ts:103`) | Only `auth: { token }` | Drop the header (it goes stale after 15 minutes) |
| **Gap** `rsvp.update` | Declared but no feature subscribes (`chatSocket.ts:32`; `src/features/chat/data/datasources/realtime/chatLive.ts:20`) | RSVP docs: `rsvp.update { postId, state, goingCount }` on `/chat` after any change to my own state (not in the socket's own table; spec §8 Q5) | Settle RSVP caches from it |

## 5. Create a post

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Plan/Group destination | Sends `cityId` when there is no pin (`src/features/create-post/domain/rules/postDraftRules.ts:354`; `src/features/create-post/data/mappers/postMappers.ts:22,61`; `src/features/create-post/data/dto/postDtos.ts:18,50`) | `cityId` removed; send `placeId` (Google place id: venue or destination) **or** `lat`+`lng`, never both | Places picker → `placeId` |
| **Breaks** Publish rule for Plans/Groups | Plans/Groups need a city, only Meetups/Events need a pin (`postDraftRules.ts:78-80,223,232`) | Every type needs `placeId` or `lat`/`lng` to publish ("Every post happens somewhere") | Require a place on all four wizards |
| **Breaks** City search in the wizard | `GET /cities` (`src/features/create-post/data/datasources/remote/postApi.ts:72-73`) | Removed | Places SDK |
| **Breaks** Editing a post without a pin | PATCH sends `lat: null, lng: null` when there is no pin (`postMappers.ts:58-59`) | `UpdatePostDto.lat`/`lng` are not nullable ("a live post always keeps a place") | Omit `lat`/`lng` unless moving the pin; use `placeId` to move to a place |
| **Wrong** Resuming a draft | Reads `SavedPostDto.city` (`postDtos.ts:88`, `postMappers.ts:145`, `postDraftRules.ts:405`) | No `city`; `placeId`, `placeName`, `formattedAddress`, `localityLabel` | Rebuild the draft's place from those |
| **Wrong** Venue picked as a pin only | Meetup/Event send `lat`/`lng` + `placeName` | `placeId` lets the server fetch coordinates and `formattedAddress`; `placeName` defaults to the place's city | Prefer `placeId` when the host picked a venue |
| **Wrong** 503 on create | Not mapped specially | 503 when uploads are busy or the map vendor is down: retry | Map to "try again in a moment" |

## 6. Explore (map and search)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Wrong** Map header and reach | `MapPinsDto { city, citySource, pins }` (`src/features/explore/data/dto/exploreDtos.ts:34-38`); `cityName` always `''` (`src/features/explore/data/mappers/exploreMappers.ts:23`) | `MapPinsDto { origin, originSource, reach: 'radius' \| 'box', pins }`. Free readers only get pins within 30 km of the origin, so a panned-away map is empty | Use `origin`; when `reach: 'radius'` and the box is away from the origin, offer Teleport |
| **Breaks** No-location error | `NO_CITY` → `noCity` (`exploreMappers.ts:109`; comment at `src/features/explore/data/datasources/remote/exploreApi.ts:91`) | 404 `NO_LOCATION` (arrives as `NOT_FOUND` → "not found") | Map `NO_LOCATION` → ask for location |
| **Breaks** "Search city or country" | `GET /cities` to move the camera (`exploreApi.ts:105-106`) | Removed | Places SDK |
| **Wrong** Feed/search page types | `FeedPageDto`/`PostSearchPageDto` with `city`/`citySource`; card `city` (`exploreDtos.ts:76,110-123`); source enum with `edge`/`home` (`exploreDtos.ts:9`) | `origin`/`originSource`; card has `localityLabel` etc. | Update types |
| **Wrong** "That's your own post" on report | Expects 400 `BAD_REQUEST` (`exploreMappers.ts:103`) | 400 `VALIDATION_FAILED` (same code as "other" without details) | Branch on `VALIDATION_FAILED` and `errors[]` |
| **Gap** Subscriber box | Box clamped under 5° for everyone (`src/core/maps/geo.ts:22`, `MAX_BBOX_SPAN = 4.99`) | 5° wide for free readers, 20° for subscribers | Optional: widen for subscribers |

## 7. Post detail

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Wrong** Place line | `PostDetailDto.city` → `cityLabel` always null (`src/features/post-detail/data/dto/postDetailDtos.ts:54`; `src/features/post-detail/data/mappers/postDetailMappers.ts:43`) | `localityLabel`, `formattedAddress`, `placeId`, `countryCode` | Show `formattedAddress` / `localityLabel`; open `placeId` in Maps |
| **Gap** Remove someone | Host tools call only `accept` and `decline` (`src/features/post-detail/data/datasources/remote/postDetailApi.ts:52-56`) | `POST /posts/{id}/attendees/{userId}/remove` (going or waitlisted, final, pushed) | Add when the host UI needs it |

## 8. Trips

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Wrong** Card place | `PostCardDto.city` → `cityLabel` always `''` (`src/features/trips/data/dto/tripsDtos.ts:51`; `src/features/trips/data/mappers/tripsMappers.ts:18`) | `localityLabel` | Map `localityLabel` |

## 9. Profile pages (other people, own grids)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Wrong** Their city and favourites | `PublicProfileDto.homeCity`, `favouriteCities` (`src/features/profile/data/dto/profileViewDtos.ts:20,26`; `src/features/profile/data/mappers/profileViewMappers.ts:12,24`): always empty | `homePlace: PlaceRefDto \| null`, `favouriteDestinations: PlaceRefDto[]` | Map the new fields |
| **Wrong** Activity cards | `ActivityCardDto.city` (`profileViewDtos.ts:54`; `profileViewMappers.ts:40`) | `localityLabel` | Map `localityLabel` |
| **Gap** Handle links | Not called | `GET /users/handle/{handle}` | Use for `/users/<handle>` deep links |
| **Gap** People search | Not called | `GET /search/people?q=` (also how a trusted person is found) | Build with the trusted person |

## 10. Settings

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Edit current city | `GET /cities`, `/cities/popular` (`src/features/settings/data/datasources/remote/settingsApi.ts:57-59`); `PATCH /me { homeCityId }` (`src/features/settings/data/dto/settingsDtos.ts:53`; `src/features/settings/domain/rules/settingsRules.ts:86-87`; `SettingsRepositoryImpl.ts:44`) | Cities removed; `homePlaceId` | Places SDK + `homePlaceId` |
| **Breaks** Edit favourite destinations | `extras.favouriteCityIds` (`settingsDtos.ts:39`; `settingsRules.ts:94-98`) | `extras.favouriteDestinationIds` | Rename; place ids |
| **Wrong** Read back | `MeDto.homeCity`, `favouriteCities` (`settingsDtos.ts:33,43`; `src/features/settings/data/mappers/settingsMappers.ts:38,47`) | `homePlace`, `favouriteDestinations` | Map the new fields |
| **Gap** Share my plan (trusted person) | Placeholder only (`src/features/settings/presentation/screens/PrivacySafetyScreen.tsx:109`) | 7 endpoints: `PUT/GET/DELETE /me/trusted-person`, `GET /me/trusted-by`, `POST /me/trusted-by/{linkId}/accept`, `DELETE /me/trusted-by/{linkId}`, `GET /me/trusted-by/{linkId}/plans`; 429 `TRUSTED_REQUEST_LIMIT` | Build when designs land |
| **Gap** Gallery | Not called | `POST /me/photos`, `PUT /me/photos/order`, `DELETE /me/photos/{photoId}` (≤ 6) | Build when designs land |

## 11. Notifications and push

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** (known) iOS push token | `getDevicePushTokenAsync()` gives the APNs token on iOS (`src/core/push/pushNotifications.ts:148`), sent to `POST /me/devices` | `RegisterDeviceDto.token`: "the push token from Firebase" on both platforms; `appInstanceId` is Firebase's install id | Add Firebase Messaging on iOS and send the FCM token |
| **Wrong** Trusted-person notifications | Categories lack `trusted_person` (`src/features/notifications/data/dto/notificationsDtos.ts:7-14`; `src/features/notifications/domain/rules/pushRules.ts:56-64`); unknown reads as `post_update` with no `postId`, so tapping does nothing | Category `trusted_person`, kinds `trusted.request`, `trusted.plans`, `trusted.accepted`, `trusted.ended`, `trusted.reminder`, with `linkId` (not on `ended`) | Add the category and route by `linkId` |
| **Wrong** Push kinds | Aliases cover only `post.details_changed` and demo spellings (`pushRules.ts:70-75`); everything else falls back to `post_update` | Kinds: `rsvp.requested`, `rsvp.accepted`, `rsvp.promoted`, `rsvp.removed`, `post.cancelled`, `post.taken_down`, `post.details_changed`, `post.reminder`, `comment.new` (+`commentId`), `subscription.ending`, `moderation.warning`, `trusted.*` | Map each kind to its category (e.g. `rsvp.requested` → host's requests list) |

## 12. Core API

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| **Breaks** Error code list | `API_ERROR_CODES` still has `ACCOUNT_LINK_REQUIRED`, `NO_CITY` and lacks `EMAIL_ALREADY_REGISTERED`, `NO_LOCATION`, `SIGN_IN_AGAIN`, `CAPTCHA_FAILED`, `WAITLIST_LINK_INVALID` (`src/core/api/ApiError.ts:18-57`; comment at `:74`). Unknown codes collapse to the status default, so the two new ones the app needs read as `CONFLICT` and `NOT_FOUND` | 38 codes (spec §6 `ErrorCode`) | Sync the list |

## 13. Demo mode (fakes a shape Swagger no longer has)

| Area | App does now (file:line) | Swagger says | Fix |
|---|---|---|---|
| Feed, map, search pages | Return `{ city, citySource }` (`src/core/demo/demoStore.ts:1075,1100,1135`); map has no `reach` | `{ origin, originSource }`; map adds `reach` | Match Swagger |
| Feed fallback | Falls back to home city, then Lagos (`demoStore.ts:344-354`) | 404 `NO_LOCATION` without location or teleport | Answer `NO_LOCATION` |
| Cities | Still serves `/cities/resolve`, `/cities/popular`, `/cities`, `/cities/{id}` (`demoStore.ts:1018-1062`) | Removed | Remove; fake a place picker instead |
| OAuth link | Serves `POST /auth/oauth/link` (`demoStore.ts:873-882`); never answers `EMAIL_ALREADY_REGISTERED` | Link removed; 409 `EMAIL_ALREADY_REGISTERED` + `signInMethods` | Remove the route; add a 409 case |
| Teleport | Takes `{ cityId }`, 404 for unknown (`demoStore.ts:1398-1407`) | `{ placeId }`, 400 for unknown / not a city | Match Swagger |
| Post card | `city: ref(c)`, no `placeId`/`formattedAddress`/`localityLabel`/`countryCode` (`demoStore.ts:374-389`) | The new place fields | Match Swagger |
| `MeDto` | `homeCity`, `favouriteCities`, `teleport: { city }` (`demoStore.ts:449-452,472-481`) | `homePlace`, `favouriteDestinations`, `teleport: { placeId }` | Match Swagger |
| `PATCH /me` | Accepts `homeCityId`, `extras.favouriteCityIds` (`demoStore.ts:900-936`) | `homePlaceId`, `extras.favouriteDestinationIds`; rejects the old names | Match Swagger (and reject unknown fields) |
| Posts | Take `cityId`; a Plan/Group publishes with no place (`demoStore.ts:637-649,1175`) | `placeId` or `lat`/`lng`, required for every type | Match Swagger |
| Profiles | `homeCity`, `favouriteCities` (`src/core/demo/routes/profiles.ts:202-212`) | `homePlace`, `favouriteDestinations` | Match Swagger |
| Notification kinds | `join_request`, `comment`, `request_accepted`, `post_reminder`, `report_resolved`… (`src/core/demo/routes/notifications.ts:50-99`); no `trusted_person` | `rsvp.requested`, `comment.new`, `rsvp.accepted`, `post.reminder`, `moderation.warning`; `trusted_person` exists | Use Swagger's kinds |
| Map errors | Bad bbox is 400 `BAD_REQUEST`; 5° for subscribers too (`demoStore.ts:1083-1087`) | 400 `VALIDATION_FAILED`; 20° for subscribers | Minor |

---

## Not mismatches (checked and matching)

Auth bodies (sign-up, OTP verify/resend, login with step-up, refresh, forgot/verify/reset, logout), `/me/terms/accept`, sessions, re-auth, unlink, set/change password, email change, export, reports, settings (incl. `notifyNearbyActivity`/`notifyRecommendations`), analytics, notifications inbox and read, `RegisterDeviceDto` fields, saved/rsvps (`waitlisted`)/attended/my posts, RSVP join/leave/accept/decline, attendees, comments, chat REST (list, `unread-count`, start, `GROUP_CHAT_FULL`, detail incl. `imageUrl`/`post`, messages, send, read, typing, members, report), subscription DTOs, block/unblock/report, handle availability, app config.
