# Ajala API — User & Common endpoints (client integration spec)

> **Last synced with Swagger: 9 Nov 2026** (117 User/Common operations; every operation not tagged Admin).
>
> **For Claude Code.** This is the contract for the mobile app's API layer. It covers every endpoint tagged **User** and **Common** in the Ajala API OpenAPI spec (Swagger at `https://dev-api.ajalatrvl.com/api/v1/docs`, JSON at `/api/v1/docs-json`). It does not cover **Admin**.
> - Treat the types in §6 as the source of truth for request and response shapes.
> - Branch on `ErrorResponseDto.code`, never on `message`.
> - Where this file and the live Swagger disagree, Swagger wins. Flag the difference rather than guessing.
> - Open questions for the backend are collected in §8. What the app still does differently is in [swagger-diff-2026-11-09.md](swagger-diff-2026-11-09.md).
>
> **Biggest changes since the 3 Nov sync:**
> - **Cities are gone; places are Google place ids.** `GET /cities*` no longer exist. Home place, favourite destinations, a post's place and teleport all take a Google place id from the Places SDK on the phone (`homePlaceId`, `extras.favouriteDestinationIds`, `placeId`). Responses carry `PlaceRefDto { placeId, label, countryCode }`.
> - **The feed is centred on a point, not a city.** `FeedPageDto`/`MapPinsDto`/`PostSearchPageDto` carry `origin` + `originSource: 'device' | 'teleport'`. With no location header and no teleport the answer is **404 `NO_LOCATION`** (no home-city fallback any more).
> - **Google/Apple sign-in never links accounts:** an email that already has an account is **409 `EMAIL_ALREADY_REGISTERED`** with `details.signInMethods`. `POST /auth/oauth/link` and `ACCOUNT_LINK_REQUIRED` are gone.
> - **New:** trusted person (`/me/trusted-person`, `/me/trusted-by`), `GET /conversations/unread-count`, the launch waitlist (Common), email assets (Common), `GET /me/rsvps?state=waitlisted`, the live socket on its own host.
> - **Removed:** shared cost and `joinMode`/`EXTERNAL_BOOKING`; Plans carry no price or link.

---

## 1. Basics

| Item | Value |
|---|---|
| Base URL (dev) | `https://dev-api.ajalatrvl.com` (local: `http://localhost:3000`) |
| API prefix | `/api/v1` (deep-link files sit at the domain root under `/.well-known/`) |
| Live socket (dev) | `https://dev-ws.ajalatrvl.com/chat`, socket.io v4, WebSocket transport only (§2.20) |
| Auth | `Authorization: Bearer <accessToken>` on every endpoint marked **bearer** |
| Body format | JSON (`application/json`), except uploads, post creation and chat messages, which are `multipart/form-data` |
| Dates | Calendar dates are `YYYY-MM-DD` (`dob`, `recurrenceEndsOn`, `endsOn`). Instants are ISO 8601 strings (`startAt`, `endAt`, `createdAt`, `accessExpiresAt`) |
| Ids | UUID strings. **Exceptions:** chat message ids are 64-bit numbers sent as strings (never parse them as JS numbers); places are Google place ids (`ChIJ…`) |
| Location header | `X-Client-Location: <lat>,<lng>`. Optional on `GET /feed`, `GET /map/pins`, `GET /search/posts`, `GET /posts/{postId}`, `GET /me/rsvps`, `GET /me/saved` and `GET /users/{userId}/posts`, `/attended`, `/plans`. The feed, map and search **need** it unless a teleport is set (404 `NO_LOCATION`); elsewhere it only fills `distanceKm` |

### 1.1 Tokens and sessions
- **Access token:**
  - lives 15 minutes; expiry in `accessExpiresAt`;
  - sent as the Bearer header.
- **Refresh token:**
  - single use: `POST /auth/refresh` returns a new pair and voids the old refresh token;
  - **reusing a used refresh token is treated as theft and signs the whole session out**;
  - run refresh **single-flight** (one in-flight refresh that every caller awaits), save the new pair before anything else, and **never retry a refresh with the same token** after a timeout or dropped connection: sign in again instead.
- **Session id:** `sessionId` identifies the device session; it matches `GET /me/sessions`.
- **Device id:**
  - send a stable per-install `deviceId` (≤ 128) and an optional `deviceName` (≤ 120) on every auth call;
  - the same `deviceId` replaces its previous session instead of piling up sessions.
- **Device check (optional):** every auth body that carries device fields also accepts `deviceCheck { platform: 'ios' | 'android', token }`.
  - iOS: `DCDevice.current.generateToken()` (base64). Android: a Play Integrity token from a fresh integrity request.
  - Send it on every sign-in when the phone can make one. An email sign-up sends it on `POST /auth/otp/verify`, **not** on `POST /auth/signup/email`.
  - Used only against ban evasion. Omit it on emulators and when generating it fails; sign-in never depends on it, but **a malformed one is a 400**.
- **Storage:** keep tokens in `expo-secure-store`, never AsyncStorage.

### 1.2 Error envelope (every 4xx/5xx with a body)
```ts
interface ErrorResponseDto {
  code: ErrorCode;                    // branch on this, never on the message
  message: string;                    // human text; do not parse
  errors?: { field: string; message: string }[]; // with VALIDATION_FAILED
  details?: Record<string, unknown>;  // e.g. { signInMethods }, { resetsAt }, { availableAt }
  requestId: string | null;           // quote it when reporting a problem
}
```
For the full `ErrorCode` union and how to handle each code, see §5.

### 1.3 Pagination (cursor)
- **Query params:**
  - `cursor`: opaque; omit it for the first page.
  - `limit`: default 20, max 100. Exceptions: search (`/search/posts`, `/search/people`) default 20 / max 50; chat messages default 30 / max 50.
- **Response:** `{ items, nextCursor }`, where `nextCursor: null` means the last page.
- **Chat messages are different:** pass `before=<oldest message id you hold>`; the page's `nextCursor` is the value to send as `before`.
- **`GET /me/trusted-by/{linkId}/plans` is not paged:** `{ items }`, at most 100.
- **Order is stable while paging** (the feed: "paging with `cursor` never repeats a card"). Use TanStack Query `useInfiniteQuery` with `getNextPageParam: (p) => p.nextCursor ?? undefined`.

### 1.4 Uploads (avatar, gallery photos, post images, chat pictures)
- **Request:**
  - `multipart/form-data`;
  - the field is `file` for the avatar and gallery, `images` (repeated, in order) for post images and chat pictures.
- **Accepted files:**
  - JPEG, PNG or WebP, **≤ 5 MB each**;
  - the type is decided by reading the file, not by the extension or mime the request claims.
- **Before upload:** resize and compress on the device (e.g. `expo-image-manipulator`); a phone camera easily produces 10 MB.
- **Error codes:**
  - `400`: no file (avatar, gallery); too many or too few images (post images); nothing to send, too many pictures, or one that is not an image (chat);
  - `413 PAYLOAD_TOO_LARGE`: over 5 MB;
  - `415 UNSUPPORTED_MEDIA_TYPE`: not a JPEG, PNG or WebP (avatar, gallery, post images; chat answers 400 instead);
  - `503 SERVICE_UNAVAILABLE`: the server is handling too many uploads; retry in a moment.
- **After upload:**
  - the server re-encodes the image and drops location metadata;
  - a new image always gets a new URL, so caching by URL is safe;
  - avatar, gallery and post image URLs are public and cacheable and need no token;
  - **chat picture URLs (`MessageImageDto`) last one hour**: refetch the thread rather than caching them long term.

### 1.5 Money
- **Price (paid Meetups, Events, Groups):**
  - send `priceCents` (smallest unit: cents, kobo, yen; 1–100000000) plus `currency` (any ISO 4217 code, capitals); omit both for a free post;
  - the host may skip the price; it is paid outside the app, and `externalUrl` (https, optional, paid posts only) is where;
  - **a Plan has no price or link:** `priceCents`, `currency` or `externalUrl` on a Plan is a 400;
  - response `price` is `{ amountCents, currency, exponent }`, or `null` when free; display amount = `amountCents / 10 ** exponent` (0 for JPY, 2 for USD, 3 for KWD).
- **Shared cost: removed.** `costTotalCents`, `costCurrency`, `expectedCount` and `costSplit` are no longer in the spec.

### 1.6 Places (new: replaces cities)
- There is **no place search, resolve or list endpoint** in the API. The app picks places with the **Google Places SDK** and sends the Google place id:
  - `PATCH /me { homePlaceId }`: a **city**; a venue or a street address is a 400; `null` clears it.
  - `PATCH /me { extras: { favouriteDestinationIds } }`: Google place ids of cities, up to 10 (an 11th is a 400).
  - `POST /posts { placeId }` / `PATCH /posts/{id} { placeId }`: the venue of a Meetup or Event, or the destination of a Plan or Group. The server fetches coordinates and address with its own key. Or send `lat` + `lng` for a pin dropped on the map. **Never both.** A post needs one of them to publish.
  - `POST /me/teleport { placeId }`: a city; a venue or address is a 400.
- **Responses** carry `PlaceRefDto { placeId, label, countryCode }` (`homePlace`, `favouriteDestinations`, `visiting.place`, `PersonCardDto.homePlace`), and post cards carry `placeId`, `placeName`, `formattedAddress`, `localityLabel` ("Lagos, Nigeria"), `countryCode`, `lat`, `lng`.
- `503 SERVICE_UNAVAILABLE` on post create, teleport: the map vendor is off here or could not answer.

---

## 2. Flows to implement (read before coding screens)

### 2.1 App bootstrap
1. `GET /api/v1/app/config` (no auth) returns `termsVersion`, the terms/privacy/FAQ URLs, `supportEmail` and `minAppVersion { ios, android }`.
2. If the installed build is older than `minAppVersion`, show a forced-update prompt.
3. Keep `termsVersion`: sign-up, Google/Apple sign-up and `POST /me/terms/accept` need it.
4. If signed in, call `GET /me`:
   - `termsUpToDate === false`: show the updated terms, then `POST /me/terms/accept { version }`.
   - `profileCompletedAt === null`: route to onboarding (see §2.4).
   - `subscribed` / `subscribedUntil`: gate the paid (Travel) features (see §2.19). `teleport` is non-null while teleported.

### 2.2 Email sign-up and sign-in
- **Sign-up:**
  1. `POST /auth/signup/email` with `{ email, password, firstName, lastName, dob, termsVersion, timezone? }`. Always **202**, whether the address is new or not, so the UI must not reveal whether the email exists. 400 `PASSWORD_BREACHED` for a password seen in a known breach; 400 `VALIDATION_FAILED` on `termsVersion` unless it is the version in force. Do **not** send `deviceCheck` here.
  2. `POST /auth/otp/verify` with `{ target: email, code (6 digits), password, deviceId, deviceName, deviceCheck?, timezone }`. **The password is required when the code completes a sign-up.** Without it, or with the wrong one, the answer is the same 401 as a wrong code. The 200 answer is `OtpSignInDto` (tokens + `user: MeDto` + `isNew`).
  3. Resend with `POST /auth/otp/resend { target }`. Always 202 ("whether a code went out is not revealed"); show a cooldown timer client-side.
- **Login:** `POST /auth/login { email, password, deviceId, deviceName, deviceCheck? }` returns `TokenPairDto`. There is no `user` in it, so call `GET /me` next. Possible errors:
  - `401 UNAUTHORIZED`: wrong email or password, or a locked account.
  - `403 EMAIL_NOT_VERIFIED`: a code was re-sent. Go to the OTP screen, then verify. No password is needed here, because the account already exists.
  - `403 STEP_UP_REQUIRED`: a code was emailed. Ask for it and retry the **same** login call with `otpCode`.
- **Forgot password:**
  1. `POST /auth/password/forgot { email }`. Always 202. If the address has an account with a password, a six-digit code is emailed ("Reset your password"), valid 10 minutes, at most three emails an hour per address. An account that signs in with Google or Apple only gets an email saying so instead.
  2. `POST /auth/password/verify { email, code }` → 200 `ResetTokenDto { token }`. A wrong, expired or used code is the same 401; the **fifth wrong code burns it**, so offer "send a new code".
  3. `POST /auth/password/reset { token, newPassword }` within 15 minutes → 204; every device is signed out, so send the user to sign in. 400 `PASSWORD_BREACHED`; 401 token expired/used.
- **Sign out:**
  - **this device:** `POST /me/devices/unregister { token: pushToken }` **before** `POST /auth/logout` (bearer, 204), then clear local tokens and the query cache.
  - **everywhere:** `POST /auth/logout/all` (204).

### 2.3 Google and Apple sign-in, and unlinking
1. Generate a random `nonce` (16–256 chars) per attempt and pass it to the provider SDK; Apple receives its SHA-256.
2. Call the matching endpoint:
   - **Google:** `POST /auth/oauth/google { idToken, nonce, deviceId, deviceName, deviceCheck?, timezone, termsVersion }`.
   - **Apple:** `POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, deviceId, deviceName, deviceCheck?, timezone, termsVersion }`. Apple hands over the name on the first authorisation only, so forward it when present. `authorizationCode` is exchanged once so deletion can revoke the sign-in.
3. Handle the answer:
   - **200:** `OtpSignInDto`; the user is signed in, or signed up when the email was new (`isNew: true`). A new email signs up here and returns tokens straight away. A Hide My Email address never matches an existing account, so it makes a new one.
   - **409 `EMAIL_ALREADY_REGISTERED` (new):** the provider's email matches an existing verified account. **The two are never joined** and no email is sent. `details.signInMethods` lists the ways into that account, each `'password' | 'google' | 'apple'`: tell the person how to sign in ("Sign in with Google instead", "Sign in with your password"). An empty list means show the message as it is.
     ```json
     { "code": "EMAIL_ALREADY_REGISTERED", "details": { "signInMethods": ["google"] } }
     ```
   - **403 `SIGNUP_REFUSED`:** a new account with an email that was banned; no `details`. Show the message.
   - **401 `UNAUTHORIZED`:** the token was rejected, the nonce was replayed, or the account is suspended.
   - `POST /auth/oauth/link` and the code-screen link flow **no longer exist**.
4. **Unlink:** `DELETE /me/identities/{provider}` (`google` | `apple`) → 204. Removes that sign-in method while another remains (a password, or the other provider). Needs re-auth (§2.5). 404 not linked; 409 `LAST_SIGN_IN_METHOD` when it is the only way in (offer "set a password" first). The address on the account gets a notice; other devices stay signed in.

### 2.4 Onboarding gate
- `profileCompletedAt` stays null until **first name, last name and date of birth** are all present. **Gender is optional and never needed.** A null value routes to onboarding. Read it from the server; never compute it client-side.
  - Email sign-ups send name and dob at sign-up, but the stamp is set only on the first `PATCH /me` that follows, so Profile Setup must always send one. Google/Apple sign-ups may arrive with nothing.
  - `isNew: true` on the sign-in answer says it is the first sign-in.
- Onboarding = `PATCH /me` with the missing fields, plus optional `gender`, `handle`, `bio`, `homePlaceId`, `interestIds` (3–8) and `extras`. `PATCH /me` stamps `profileCompletedAt` itself the moment all three are filled in; there is **no** "finish onboarding" call.
- **Handle:**
  - live-check with `GET /handles/availability?handle=` (query 1–40 chars), which returns `{ available, reason: 'taken' | 'reserved' | 'format' | null }`;
  - handles are 3–20 chars of letters, digits, `.` and `_`;
  - can change once every 30 days: 409 `HANDLE_COOLDOWN` with `details.availableAt`; 409 `CONFLICT` if taken.
- **Home place (changed):** pick a **city** with the Google Places SDK and send `PATCH /me { homePlaceId }`. A venue or a street address is a 400. Read back as `MeDto.homePlace` (`PlaceRefDto`). The old `GET /cities`, `/cities/resolve`, `/cities/popular` and `homeCityId` are gone.
- **Interests:** pick from `GET /interests` (active interests in display order).
- **Extras:** `extras.travelStyles` (up to 10 of a fixed list of 36, see `TravelStyle` in §6; an 11th is a 400; an empty list or null clears), `extras.favouriteDestinationIds` (**changed**: up to 10 Google place ids of cities; read back as `MeDto.favouriteDestinations`), `languages` (ISO 639-1), `socialLinks`, `pronouns`, `tagline`.

### 2.5 Re-authentication (sensitive actions)
- Some actions answer **403 `REAUTH_REQUIRED`**: deleting the account, setting a password, changing email, unlinking Google/Apple, the data export, and choosing a trusted person.
- To open the re-auth window:
  - an account with a password: `POST /me/reauth { password }` → 204;
  - a Google/Apple-only account: `POST /me/reauth/code` (202, emails a code to the verified email), then `POST /me/reauth { code }` → 204.
  - 401 wrong password, or a wrong, expired or used code.
- After that, **retry the original request**. Build this as a reusable "confirm it's you" sheet that wraps the action.

### 2.6 Account management
| Action | Call | Notes |
|---|---|---|
| Change password | `POST /me/password { currentPassword, newPassword }` | 204; other devices signed out; 401 wrong current; 400 `PASSWORD_BREACHED` |
| Set first password (social accounts) | `POST /me/password/set { newPassword }` | 403 `REAUTH_REQUIRED` or `EMAIL_NOT_VERIFIED`; 409 `CONFLICT` already has one |
| Change email | `POST /me/email/change { newEmail }` (202) then `POST /me/email/change/confirm { code }` (204) | Code goes to the new address, a notice to the old; 401 no change pending / bad code; 409 if another account verified it meanwhile; other devices signed out on confirm |
| Unlink Google/Apple | `DELETE /me/identities/{provider}` | Re-auth; 409 `LAST_SIGN_IN_METHOD` |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/{sessionId}` | `current: true` marks this device; hide "sign out" for it or route it to logout; 404 not one of mine |
| My reports | `GET /me/reports` | Paged, newest first; `targetType`, `reason`, `status: open \| resolved \| dismissed`. The text written is not returned |
| Delete account | `DELETE /me { reason? }` | 202 `{ purgeAt }`; 14-day grace; all devices signed out; signing in again cancels. 403 `REAUTH_REQUIRED`. Purge local state |
| Data export | `POST /me/export` then `GET /me/export` | 202; link emailed; 403 `REAUTH_REQUIRED` / `EMAIL_NOT_VERIFIED`; 409 one on its way or asked within the last day; `downloadUrl` valid 24 h, null while building/expired; `GET` 404 never asked |

### 2.7 Profile media
- **Avatar:**
  - `POST /me/avatar` (field `file`) returns `{ avatarUrl }` (a 200 px square; the server also keeps an 800 px version for the full profile). No upload ticket, nothing to poll;
  - `DELETE /me/avatar` → 204.
- **Gallery** (max 6 photos, separate from the avatar):
  - `POST /me/photos` (field `file`) returns 201 `ProfilePhotoDto { id, url (1280 px), thumbUrl (400 px), position }`;
  - a 7th photo returns 409 `CONFLICT`, so show the count (n/6);
  - `PUT /me/photos/order { ids: [...] }` takes **every** photo id in the new order (400 if the list is not exactly my photos);
  - `DELETE /me/photos/{photoId}` → 204, and the gap closes; 404 not one of mine.

### 2.8 Trips ("visiting") — parked
- There are no trip endpoints in Swagger. `MeDto.visiting` and `PublicProfileDto.visiting` remain, now `{ place: PlaceRefDto }` or null. Treat `visiting` as read-only and expect null; don't build on it.

### 2.9 Verified badge
- No submission flow in Swagger. `verified: boolean` on `MeDto`, `HostCardDto`, `PersonCardDto` and `PublicProfileDto` means **"Verified host: our team reviewed this profile. It is not a check of who the person is."** Show the badge; don't word it as an identity check.

### 2.10 Push and devices
- After sign-in, and whenever the push token changes: `POST /me/devices { token, platform: 'ios' | 'android', appInstanceId?, timezone?, deviceId? }` → 204 (registered, or refreshed if already known).
  - `token` is **the push token from Firebase** (≤ 512) on both platforms; `appInstanceId` is Firebase's id for this install (≤ 64).
  - Send the same `deviceId` used at sign-in, so a password change or "sign out everywhere" keeps this phone's pushes.
- On sign-out: `POST /me/devices/unregister { token }` → 204, whether or not it was registered.
- Push payloads for inbox items match `NotificationDto.data` (`kind`, plus the ids listed in §2.17); route on them.

### 2.11 Feed and map (changed)
- **Where:** nobody is asked. Send `X-Client-Location: <lat>,<lng>` on every call; a subscriber who teleported looks around that place instead. Nothing is guessed: with no header (or one that can't be read) and no teleport, the answer is **404 `NO_LOCATION`**: ask for location permission.
- **Origin:** `origin { lat, lng, label, region }` is the point the posts are around; `originSource: 'device' | 'teleport'` says how it was picked. For `teleport` show "Teleported to {origin.label}". `label` is null for the device's own location. `region` is the state/region the origin is in ("everything there within 150 km is in the feed too"), null when nobody can say.
- **Endpoints:**
  - `GET /feed?type=all|meetup|event|plan|group&cursor&limit` → `FeedPageDto`: every live, upcoming post within 30 km, twenty at a time.
    - Order: soonest first, then a lift for posts tagged with an interest the user picked, then how many are going. No likes, no engagement ranking. Fixed while paging.
    - `distanceKm` on every card with the header; `null` without it.
  - `GET /map/pins?bbox=west,south,east,north&type=&q=` → `MapPinsDto` (the Explore tab), same origin rule and header.
    - **Free readers** (`reach: 'radius'`): only pins within 30 km of the origin, so panning away shows an empty map: offer Teleport. **Subscribers** (`reach: 'box'`): every pin in the box, wherever they pan.
    - The box must be four numbers, not inside out, and at most **5° wide (20° for a subscriber)**; 400 otherwise.
    - At most 500 pins, the soonest to start first. `q` (≤ 80) keeps pins whose title contains it, ignoring case.
    - Debounce on map region change. Open a tapped pin with `GET /posts/{id}`.
  - `GET /explore/meetups` stays removed.

### 2.12 Posts (Meetup, Event, Plan, Group)
- **Create:** `POST /posts` (`multipart/form-data`).
  - Repeat `interestIds`, `schedule` and `itinerary` once per value.
  - Send booleans as the strings `true`/`false`.
  - `images`: up to 4, in carousel order.
- **Drafts:**
  - `status: 'draft'` (the default) needs only `type` and `title` and keeps whatever else was sent;
  - at most 20 drafts (409 `CONFLICT` on the 21st);
  - list them with `GET /me/posts?status=draft`.
- **Publish rules** (checked on `status: 'published'` or `POST /posts/{id}/publish`; a 400 lists every failing rule in `errors[]`):
  - `startAt` in the future, a description, 2–4 images, 1–3 interests;
  - **a place for every type (changed):** `placeId` or `lat` + `lng`;
  - capacity: an Event needs more than 100 or no limit, a Group needs 1–100, Meetups and Plans choose freely;
  - at most 3 Events per host per calendar month; the 4th returns 409 `EVENT_MONTHLY_CAP` with `details.resetsAt` (the 1st of next month);
  - a suspended account gets 403 `FORBIDDEN`.
- **Place (changed):** send `placeId` (a Google place id from the Places SDK; ≤ 255) and the server fetches its coordinates and address, or `lat` + `lng` for a pin dropped on the map, which the server names where it can. **Never both.** `placeName` (≤ 200) is the label under the card; the place's city name when left out. `cityId` is gone. 503 when the map vendor is off or down.
- **Price:** see §1.5. A Meetup, Event or Group may show a price and an `externalUrl`; a Plan answers 400 to either.
- **Type-specific fields (sent on the wrong type they are a 400 on that field):**
  - `schedule: string[]`: an Event's running order, up to 30 lines of 120 characters.
  - `itinerary: string[]`: a Plan's stops, up to 30 lines of 120 characters.
  - `recurrence: 'weekly' | 'biweekly' | 'monthly'` + optional `recurrenceEndsOn` (date): a Group that meets again. A monthly Group starts on the 1st–28th. The worker moves `startAt`/`endAt` on once each meeting is over; people going stay going.
- **All types:** `endAt` (optional, after `startAt`).
- **Group chat:** made automatically when a post goes live (§2.18).
- **Edit:** `PATCH /posts/{id}` (JSON, only what changed; not `type` or `status`).
  - A live post is re-checked against the publish rules (capacity by type).
  - The price can't change on a live post (`priceCents`/`currency` are drafts only; null on both makes a draft free); the link can (`externalUrl: null` removes it).
  - Move it with `placeId`, or with `lat` **and** `lng` (not nullable: a live post always keeps a place). Never `placeId` with `lat`/`lng`.
  - `endAt`, `placeName`, `capacity` accept null to clear. `schedule` / `itinerary` replace the whole list; null clears. `recurrence: null` stops repeating; `recurrenceEndsOn: null` repeats until stopped.
  - When the host changes the time or place of a live post, people going get one push ten minutes later (`post.details_changed`), however many edits followed.
  - 404 not mine; 409 taken down or cancelled.
- **Images:** `PUT /posts/{id}/images` replaces the whole carousel; a live post keeps 2–4.
- **Delete:** `DELETE /posts/{id}` only for drafts and posts nobody has joined; the pictures are deleted a moment later.
  - 409 `POST_HAS_ATTENDEES`: cancel it instead. 409 `CONFLICT`: taken down or cancelled.
- **Cancel:** `POST /posts/{id}/cancel` is final.
  - Everyone going or on the waitlist gets a push.
  - The post leaves the feed, the map and Explore but stays readable by link with `status: 'cancelled'`.
  - Its group chat is taken away for everyone (every chat route answers 404).
  - 409 for a draft, an already-cancelled post, or one that has already started.
- **External link:** call `POST /posts/{id}/link-click` whenever the app opens `externalUrl` (counted once per person; a repeat answers 204 and changes nothing; the host's own clicks don't count; the host sees `linkClickCount`). 409 no link or not live.
- **Save:** `POST /posts/{id}/save` → 204 (409 for a draft or cancelled post; saving twice changes nothing); `DELETE /posts/{id}/save` → always 204. `saved: boolean` is on every card. List with `GET /me/saved?type=`.
- **Report:** `POST /posts/{id}/report { reason, details? }` → 202 `{ id }`.
  - `reason: 'other'` needs `details`.
  - 400 `VALIDATION_FAILED` when reporting your own post or "other" with nothing written; 409 `CONFLICT` if an open report already exists; 403 `REPORTING_PAUSED` if a moderator paused the user's reporting (blocking still works).

### 2.13 RSVP button state machine
`rsvpState` on every card drives the single button:

| `rsvpState` | Button |
|---|---|
| `none` | **Join** |
| `requested` | **Requested** |
| `going` | **Going** |
| `waitlisted` | **Waitlisted** (`waitlistPosition`, 1 = next) |
| `declined`, `removed` | hide the button |

- **Every post joins by RSVP.** `joinMode` and `EXTERNAL_BOOKING` no longer exist. When the card has `externalUrl`: open it, call `POST /posts/{id}/link-click`, and join as usual. Join is what puts someone in the group chat.
- **Join:** `POST /posts/{id}/rsvp` → 200 `RsvpStateDto`.
  - An open post answers `going`; when full, `waitlisted` with `waitlistPosition`, or 409 `POST_FULL` when the host turned the waitlist off.
  - A private post answers `requested`; the host is told.
  - Tapping twice is safe: a repeat answers with the state I already have.
  - 409 `POST_STARTED`, `POST_CANCELLED`, or `CONFLICT` (my own post, or the host said no). The host cannot join their own post: compare `host.id` with my id.
- **Leave:** `DELETE /posts/{id}/rsvp` → 204, even if there was nothing to leave. Leaves, takes a request back, or gives up a place in line. A freed spot goes automatically to whoever has waited longest, who gets a push.
- **Realtime:** after any change to the user's own state, `rsvp.update { postId, state, goingCount }` arrives on the `/chat` socket (per the RSVP description; not listed in the socket's own event table, see §8). Use it to settle optimistic updates.
- **Host tools:**
  - `GET /posts/{id}/attendees?state=going|requested|waitlisted`, oldest first (on the waitlist, the order people get in). `going` is open to anyone who can see an open post; on a private post only the host and those going. `requested` and `waitlisted` are host-only (403 otherwise). `counts.going` always; `counts.requested`/`waitlisted` are null unless you host. Waitlisted rows carry `position`.
  - `POST /posts/{id}/attendees/{userId}/accept`: the person gets a spot and a push; on a full post with a waitlist they join the line instead. 409 `POST_FULL` (full, no waitlist) or `CONFLICT` (not live).
  - `.../decline`: final; the person cannot ask again and is not pushed.
  - `.../remove`: takes someone going, or in line, off the post for good; they are told, cannot join again, and a spot they held goes to the next person waiting.

### 2.14 Other people, blocking and reporting
- **Profiles:**
  - `GET /users/{userId}` or `GET /users/handle/{handle}` → `PublicProfileDto`;
  - `displayName` is the first name plus last initial;
  - `homePlace` (**changed** from `homeCity`) is null when unset or when they hide it (`showCurrentCity` off);
  - `favouriteDestinations` (**changed** from `favouriteCities`), `openToMeetToday`, `sharePlans`, `memberSince`, `blockedByMe`.
- **Their posts:**
  - `GET /users/{userId}/posts`: their live posts, latest date first, so upcoming ones come before past ones;
  - `GET /users/{userId}/attended`: posts they were going to that have happened, latest first; cancelled left out;
  - `GET /users/{userId}/plans`: upcoming open posts they are going to, soonest first; empty unless `sharePlans` is on; private posts never show.
- **Your own posts:** see §2.16.
- **Block:**
  - `POST /users/{userId}/block` → 204 (the same when nobody is there by that id; 400 for your own id);
  - `DELETE /users/{userId}/block` → 204 whether or not they were blocked (400 own id);
  - `GET /me/blocks` → paged `PublicProfileDto[]`, most recent first; someone who has blocked you is left out;
  - `blockedByMe` on a profile says whether you blocked them. Blocking ends a direct chat both ways; in a group, two people with a block between them never see each other's messages, typing, read position or online dot.
- **Report:** `POST /users/{userId}/report { reason, details? }` → 202 `{ id }`.
  - 400 own id or "other" with nothing written; 409 if an open report on that person already exists; 403 `REPORTING_PAUSED`; 404 nobody by that id.

### 2.15 Settings
- **Read:** `GET /me/settings` returns `UserSettingsDto` (defaults if the user never changed anything).
- **Update:** `PATCH /me/settings` takes only the changed fields and returns the full object. Update it optimistically.
- **Fields:** `notifyJoinRequest`, `notifyRequestAccepted`, `notifyPostReminder`, `notifyNewComment`, `notifyNewMessage`, `notifySubscription`, **`notifyNearbyActivity`** (new; default on) and **`notifyRecommendations`** (new; default off) (both "saved only: nothing is sent yet"), `readReceipts`, `dmPermission`, `hiddenFromSearch`, `showCurrentCity` (show my city, home or where my trip is today, on my profile), `openToMeetToday` (switches itself off at the user's midnight), `sharePlans` (powers `GET /users/{id}/plans`; public, not the trusted person).
- **Analytics opt-out:** `PATCH /me/analytics { enabled }` → 200 `UserSettingsDto`.
  - It is not part of `UpdateUserSettingsDto`.
  - Also gate the client analytics SDK on it.

### 2.16 My lists: Trips tab, saved, attended
- `GET /me/rsvps?state=going` (default): live posts I'm going to that haven't ended, soonest first; a post stays listed while it is on (the Upcoming tab).
- `GET /me/rsvps?state=requested`: private posts I asked to join that the host hasn't answered.
- `GET /me/rsvps?state=waitlisted` (**new**): posts I am in line for; my place is on the post screen (`waitlistPosition`).
- Posts I host are never in `/me/rsvps`; they are `GET /me/posts`. Past posts are `GET /me/attended`.
- `GET /me/attended`: posts I went to that have happened, latest first; cancelled left out.
- `GET /me/posts?status=draft|published` (default published): posts I host (published includes taken down/cancelled), newest first.
- `GET /me/saved?type=all|meetup|event|plan|group`: saved posts, newest save first; cancelled posts stay, drafts and taken-down posts don't.

### 2.17 Notifications inbox
- `GET /me/notifications?unread=false|true&cursor&limit` → `InboxPageDto { items, nextCursor, unreadCount }`. Everything pushed in the last 90 days **except chat messages** (which have their own list and badge, §2.18), newest first, including pushes switched off in Settings. `unread=true` is the Unread tab; `unreadCount` drives the badge.
- `NotificationDto.category` picks the icon: `join_request`, `request_accepted`, `post_reminder`, `new_comment`, `subscription`, `post_update`, **`trusted_person`** (new), `moderation`. `new_message` is no longer a category.
- `NotificationDto.data` (string values; `kind` is always there) says what to open:

| `category` | `data.kind` | Other keys |
|---|---|---|
| `join_request` | `rsvp.requested` | `postId` |
| `request_accepted` | `rsvp.accepted` | `postId` |
| `post_update` | `rsvp.promoted`, `rsvp.removed`, `post.cancelled`, `post.taken_down`, `post.details_changed` | `postId` |
| `post_reminder` | `post.reminder` | `postId` |
| `new_comment` | `comment.new` | `postId`, `commentId` |
| `subscription` | `subscription.ending` | — |
| `moderation` | `moderation.warning` | — |
| `trusted_person` | `trusted.request`, `trusted.plans`, `trusted.accepted`, `trusted.ended`, `trusted.reminder` | `linkId` (except on `trusted.ended`) |

- `POST /me/notifications/read { ids? }` → 204. Leave `ids` out to mark every unread one read.

### 2.18 Comments, chat and search
- **Comments** (anyone who can open the post reads and writes; one level of replies, oldest first, no editing, no likes):
  - `GET /posts/{id}/comments` pages top-level comments oldest first, with `total` (live comments and replies) for the header and `replyCount` per comment; `GET /posts/{id}/comments/{commentId}/replies` pages replies (`total` is 0 there).
  - `POST /posts/{id}/comments { body (1–1000), parentId? }` → 201 `CommentDto`. Replying to a reply joins the same top-level comment, so a Reply button can sit on every row. 409 `POST_CANCELLED` on a cancelled post (still readable).
  - `DELETE /posts/{id}/comments/{commentId}` → 204 (again when already gone). Show the button when `canDelete` (my own, or any on a post I host). A deleted top-level comment with replies comes back as `deleted: true` with no author/body: show "Comment deleted". A wiped account reads "Deleted user".
  - `POST /posts/{id}/comments/{commentId}/report { reason, details? }` → 202, the same reasons as a post.
  - The host gets a push for the first comment by someone else in any five minutes, unless `notifyNewComment` is off.
- **Chat:**
  - `GET /conversations?tab=all|unread|groups&search=` → `ConversationsPageDto`, latest activity first, with `lastMessage` (120-char `preview`, `senderName`) and `unreadCount` (≤ 99). `search` (≤ 60) matches the other person's name or a group's title.
  - **`GET /conversations/unread-count` (new)** → `{ count }`: conversations with something unread, for the Messages badge (not a count of messages).
  - **Starting:** `POST /conversations { userId }` → 200 `ConversationDetailDto`, the direct chat (one per pair; asking again returns it). **Group chats are automatic:** one is made when a post goes live and everyone going joins by themselves, at most 100. `POST /conversations { postId }` only **finds** it for a member. Past 100, people going wait in line for the next open place and get 409 `GROUP_CHAT_FULL` until then.
    - Errors: 400 neither or both of `userId`/`postId`; 403 they only take messages from people they share a post with (`dmPermission: shared_only`); 404 no such person or post, or one I may not reach; 409 `CONFLICT` myself or my own post that is not live, 409 `GROUP_CHAT_FULL`; **429 `CHAT_START_LIMIT`**: new direct chats with people you share no post with are capped per day (10 while the account is under 7 days old, 40 after); chats with people you share a post with are never capped.
  - A post's group chat is for its host and the people going: someone the host removes from the post, or who gives up their spot, leaves the chat. While a post is taken down its chat can be read but sending answers 403. A cancelled or deleted post takes its chat away for everyone and every route on it answers 404.
  - `ConversationDto.imageUrl` (new): a group's picture (its post's cover, 200 px); null in a direct chat (use `other.avatarUrl`) and when the post can't be shown. `ConversationDetailDto.post` (new): the group's post as a `PostCardDto` with my own `rsvpState`/`saved`; null in a direct chat or when it can't be shown; `distanceKm` always null.
  - `GET /conversations/{id}` → members (host first), `online` (lags a disconnect by up to 90 s), `lastReadMessageId` (null when hidden), `onlineCount`.
  - `GET /conversations/{id}/messages?before=&limit=` → newest first.
  - `POST /conversations/{id}/messages` (multipart): `clientMsgId` (required uuid the app makes; a retry sends the same one and gets the first back), `body` ≤ 2000, `taggedPostId?` (uuid, at most one), up to 4 `images` → 201 `MessageDto`. 403 the other person can no longer be messaged, or the group's post is taken down; 404 a tagged post I may not see.
  - `POST /conversations/{id}/read { messageId }` (the newest on screen; never moves back; the others are told unless I turned read receipts off); `POST /conversations/{id}/typing` at most every 3 s (shown for 5 s; nothing stored).
  - Group members: `POST /conversations/{id}/members { userId }` (host only, someone going; brings back someone who left; may pass people in line; 409 not going or the group is full / `GROUP_CHAT_FULL`); `DELETE /conversations/{id}/members/{userId}` (own id leaves; host removes others; 409 the host can't leave; 403 not the host or a direct chat).
  - `POST /conversations/{id}/messages/{messageId}/report { reason, details? }` → 202.
  - Render `removed: true` as "This message was removed", and `taggedPostUnavailable: true` as "no longer available".
- **Search** (runs on submit; no typeahead):
  - `GET /search/posts?q=&interestIds=&type=` → `PostSearchPageDto`, **within 30 km of where the feed looks**, picked the same way (teleport, then `X-Client-Location`; **404 `NO_LOCATION`** without either; the app cannot name another place). Live posts that have not ended, matched on title/description words, a title close to what was typed, and interests the words name. Send `q` (2–100 chars), `interestIds` (≤ 10 chips, repeat the key: `interestIds=a&interestIds=b`) or both; `type=all` or nothing means every type. Best match first, then the soonest. 400 no text and no chips, text outside 2–100, or a bad cursor.
  - `GET /search/people?q=` → `PeoplePageDto` of `PersonCardDto`, matched on first name and handle (leading `@` fine), never the family name or email; closest first. People who hid themselves, anyone blocked either way and suspended accounts never appear. Open one with `GET /users/{id}`.
  - Pages of 20 (max 50), at most 100 results per search: ask the user to narrow it after that.

### 2.19 Subscription ("Travel") and teleport
- `GET /me/subscription` → `MySubscriptionDto { subscribed, platform, status, currentPeriodEnd, autoRenew, manage }`. `MeDto.subscribed`/`subscribedUntil` mirror it.
- **Buying:**
  1. `GET /me/subscription/challenge` → single-use challenge (five minutes).
  2. **iOS:** attest the App Attest key with the challenge, buy with StoreKit 2 with `appAccountToken` = user id, then `POST /me/subscription/apple { signedTransaction, challenge, keyId, attestation }`.
  3. **Android:** Play Integrity token with the challenge as nonce, buy with `obfuscatedAccountId` = user id, then `POST /me/subscription/google { purchaseToken, challenge, integrityToken }`.
  4. **Web:** `POST /me/subscription/checkout { couponCode? }` → `{ url }` (Stripe Checkout; a coupon takes one use, given back if the payment is not finished); when the person comes back, `POST /me/subscription/checkout/confirm` (no body; the server remembers the session for 24 hours; safe to repeat; `subscribed: false` → offer a "Refresh" button instead of polling).
  - Restore purchase = the same verify call. Manage: the OS screen for apple/google, `POST /me/subscription/portal` → `{ url }` for web (404 no web subscription).
  - Errors: 403 the challenge/device/purchase didn't check out (confirm: the session paid for something other than Travel); 409 the purchase belongs to another account (checkout: already subscribed, coupon used up or already used by me); 400 unknown/disabled coupon; **429 `RATE_LIMITED`** too many device checks today (Google); **500 `INTERNAL`** the store/Stripe answered with an error or timed out: try again; **503** subscriptions are off here, or the store could not be reached.
- **Teleport (changed):** `POST /me/teleport { placeId }` (a Google place id for a **city**) → 204; the feed, map, Explore and search then look around it (`originSource: 'teleport'`, name in `origin.label`) until `DELETE /me/teleport` (204, "back to where I am") or the subscription ends. Errors: 400 the place id is unknown or not a city (a venue or street address); **402 `PAYMENT_REQUIRED`** → show the paywall; 503 the map vendor is off or could not answer. `MeDto.teleport` is non-null while teleported (see §8 about its shape).

### 2.20 The live socket (new detail)
The socket only listens: everything the person does is an HTTP call; the server takes no events from the app. Connect with `socket.io-client` v4 while the app is open and signed in:

```js
const socket = io('https://dev-ws.ajalatrvl.com/chat', {
  transports: ['websocket'],
  auth: { token: accessToken },
});
```

- That address is the **dev** server, on its own host (not the API host). WebSocket is the only transport, and the `/chat` path is required: the bare address refuses every connection.
- **What the server sends:**

| Event | Payload | What to do |
|---|---|---|
| `message.new` | The saved message as the send call answers it, **without `mine`** | Add it to the thread. Every member hears it, the sender too, so match on `id` and compare `sender.id` with your own |
| `read.update` | `{ conversationId, userId, messageId }` | Move that person's read marker |
| `typing` | `{ conversationId, userId }` | Show it for five seconds |
| `session.expiring` | `{ inMs }` | Refresh the token, set `socket.auth.token`, then `socket.disconnect().connect()` before `inMs` passes. The server cuts the socket 60 seconds after the token expires |
| `server.restart` | `{ reconnectInMs }` | Reconnect after that wait |

- **When a connection is refused** the client gets `connect_error`; act on `error.data.code`:

| Code | What to do |
|---|---|
| `UNAUTHENTICATED` | Refresh the token, set `socket.auth.token`, then `socket.connect()` |
| `SESSION_SOCKET_LIMIT` | Close another socket of this sign-in first; each sign-in may hold three |
| `RATE_LIMITED` | Wait a minute; one address may try 30 times a minute |
| `SERVICE_UNAVAILABLE` | Wait a few seconds and retry with the same tokens |
| `FORBIDDEN` | Wrong host; do not retry |

- **When the connection drops:** after any reconnect, read the open thread and the list again to catch up. The client reconnects by itself after a lost signal, but **not** after the server cuts it (`io server disconnect`: signed out, token expired, or a restart). The app decides what to do next: sign in again, or reconnect.

### 2.21 Trusted person ("Share my plan", new)
The settings row "Share my plan". Someone I trust is told when my plans change, and can read them. Not the same as the public `sharePlans` setting.
1. **Choosing.** Find the person with `GET /search/people`, then `PUT /me/trusted-person { userId }` with a recent re-auth → 200 `TrustedPersonDto` (the request, or the link I already have with them). They get a push; nothing is shared until they accept. Choosing someone else replaces them.
   - 403 `REAUTH_REQUIRED`, or 403 `FORBIDDEN` "my messages are restricted"; 404 cannot be chosen (the reason is never said); 429 `TRUSTED_REQUEST_LIMIT`: three new requests a day, one while the account is under 7 days old.
2. `GET /me/trusted-person` → `TrustedPersonDto` (`status: 'pending' | 'accepted'`); **the body is empty when I have nobody**.
3. **Being chosen.** `GET /me/trusted-by` → `TrustedByPageDto`: requests waiting for me and people whose plans I receive, newest first. `POST /me/trusted-by/{linkId}/accept` → 204 (also when already accepted; they are told). `DELETE /me/trusted-by/{linkId}` → 204 declines or stops at any time (they see only that their plans are no longer shared). 404 no such request/link.
4. **Updates are automatic**, at most one push per 10 minutes: "Ada L. updated their plans", never a post or a place (`trusted_person` / `trusted.plans`). It opens `GET /me/trusted-by/{linkId}/plans` → `TrustedPlansDto` (soonest first, at most 100; never past plans, a map pin or who else is going). A row with `unavailable: true` has every other field null: show "A plan you can't see". 404 no such link or not accepted.
5. **Ending.** `DELETE /me/trusted-person` → 204 is silent to them and needs no re-auth. Someone who stops or declines is not named: I only see "Your plans are no longer being shared".

### 2.22 Launch waitlist (Common; landing page, not the app)
1. Render Google reCAPTCHA Enterprise's "I'm not a robot" checkbox (site key from the backend team). Keep "Join waitlist" off until the consent box and the reCAPTCHA box are both ticked.
2. `POST /waitlist { email, city, countryCode, consent: true, captchaToken, website: "" }` → 202 for every address, new or not, so show the same "check your inbox" message. `website` is a honeypot: an input hidden off screen (`aria-hidden`, `tabindex=-1`, `autocomplete=off`) left empty. 400 `CAPTCHA_FAILED`: reset the widget and ask again (a token works once, for two minutes). 503: reCAPTCHA could not be checked; try again shortly.
3. The email links to `<page>/confirm?token=…`, which posts `POST /waitlist/confirm { token }` → 204 (also on a second click); 400 `WAITLIST_LINK_INVALID` for an unknown link or one over 7 days old.
4. Every email links to `<page>/remove?token=…`, which posts `POST /waitlist/remove { token }` → 204 (also when already gone); 400 `WAITLIST_LINK_INVALID` for a link we did not issue.
- Serve the confirm and remove pages with `Referrer-Policy: no-referrer`.

---

## 3. Endpoint reference

Auth column: **none** = public; **bearer** = needs an access token. Every bearer endpoint can also answer `401 UNAUTHORIZED`; refresh once, then sign out. 🆕 = new since the 3 Nov version of this file.

### 3.1 Common — Health, App, Deep links, Email assets
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/health` | none | — | 200 Postgres and Redis reachable | 503 a dependency is down (body names it) |
| GET | `/api/v1/health/live` | none | — | 200 process alive (checks no dependency) | — |
| GET | `/api/v1/app/config` | none | — | 200 `AppConfigDto` | — |
| GET | `/.well-known/apple-app-site-association` | none | — | 200 AASA JSON (which app id may open which paths, and use saved passwords) | — |
| GET | `/.well-known/assetlinks.json` | none | — | 200 Android app-links JSON array | — |
| GET | `/api/v1/email-assets/{file}` 🆕 | none | path `file` = `logo.png` \| `logo-teal.png` \| `background-sqiggle.png` \| `social-x.png` \| `social-instagram.png` \| `social-facebook.png` \| `social-tiktok.png` | 200 `image/png` | 404 |

The client never calls the deep-link files or the email assets. The deep-link files matter for configuring universal and app links (`associatedDomains` / `intentFilters`).

### 3.2 Auth
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/signup/email` | none | `SignupEmailDto` | 202 (no body; same answer for a known address) | 400 `VALIDATION_FAILED` (incl. terms version) / `PASSWORD_BREACHED` |
| POST | `/api/v1/auth/otp/verify` | none | `OtpVerifyDto` | 200 `OtpSignInDto` | 401 wrong/expired/used code (or missing/wrong sign-up password) |
| POST | `/api/v1/auth/otp/resend` | none | `OtpTargetDto` | 202 | — |
| POST | `/api/v1/auth/login` | none | `LoginDto` | 200 `TokenPairDto` | 401 bad credentials/locked; 403 `EMAIL_NOT_VERIFIED` or `STEP_UP_REQUIRED` |
| POST | `/api/v1/auth/refresh` | none | `RefreshDto` | 200 `TokenPairDto` | 401 unknown/expired/revoked/already used (reuse revokes the session) |
| POST | `/api/v1/auth/oauth/google` | none | `GoogleSignInDto` | 200 `OtpSignInDto` | 401 rejected/nonce replayed/suspended; 403 `SIGNUP_REFUSED` 🆕; 409 `EMAIL_ALREADY_REGISTERED` 🆕 |
| POST | `/api/v1/auth/oauth/apple` | none | `AppleSignInDto` | 200 `OtpSignInDto` | 401; 403 `SIGNUP_REFUSED` 🆕; 409 `EMAIL_ALREADY_REGISTERED` 🆕 |
| POST | `/api/v1/auth/password/forgot` | none | `ForgotPasswordDto` | 202 | — |
| POST | `/api/v1/auth/password/verify` | none | `VerifyResetCodeDto` | 200 `ResetTokenDto` | 401 wrong/expired/used code |
| POST | `/api/v1/auth/password/reset` | none | `ResetPasswordDto` | 204 (every device signed out) | 400 `PASSWORD_BREACHED`; 401 token expired/used |
| POST | `/api/v1/auth/logout` | bearer | — | 204 | — |
| POST | `/api/v1/auth/logout/all` | bearer | — | 204 | — |

Removed from Swagger: `POST /auth/oauth/link`.

### 3.3 Interests
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/interests` | bearer | — | 200 `InterestDto[]` (active, display order) | — |

Removed from Swagger: `GET /cities`, `GET /cities/popular`, `GET /cities/resolve`, `GET /cities/{cityId}` (use the Google Places SDK, §1.6).

### 3.4 Account (`/me`)
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me` | bearer | — | 200 `MeDto` | — |
| PATCH | `/api/v1/me` | bearer | `UpdateProfileDto` | 200 `MeDto` | 400 unknown place / not a city / gone interest / bad handle; 409 `CONFLICT` handle taken or `HANDLE_COOLDOWN` (`details.availableAt`) |
| DELETE | `/api/v1/me` | bearer | `DeleteAccountDto` | 202 `DeletionScheduledDto` | 403 `REAUTH_REQUIRED` |
| POST | `/api/v1/me/avatar` | bearer | multipart `file` | 200 `AvatarDto` | 400, 413, 415, 503 |
| DELETE | `/api/v1/me/avatar` | bearer | — | 204 | — |
| POST | `/api/v1/me/terms/accept` | bearer | `AcceptTermsDto` | 204 | 400 not the version in force |
| GET | `/api/v1/me/sessions` | bearer | — | 200 `SessionDto[]` | — |
| DELETE | `/api/v1/me/sessions/{sessionId}` | bearer | path `sessionId` | 204 | 404 |
| POST | `/api/v1/me/reauth` | bearer | `ReauthDto` (password **or** code) | 204 (re-auth window open) | 401 |
| POST | `/api/v1/me/reauth/code` | bearer | — | 202 | — |
| DELETE | `/api/v1/me/identities/{provider}` | bearer | path `provider` = `google` \| `apple` | 204 | 403 `REAUTH_REQUIRED`; 404 not linked; 409 `LAST_SIGN_IN_METHOD` |
| POST | `/api/v1/me/password/set` | bearer | `SetPasswordDto` | 204 | 403 `REAUTH_REQUIRED` / `EMAIL_NOT_VERIFIED`; 409 `CONFLICT` already has one |
| POST | `/api/v1/me/email/change` | bearer | `ChangeEmailDto` | 202 | 403 `REAUTH_REQUIRED` |
| POST | `/api/v1/me/email/change/confirm` | bearer | `ConfirmChangeDto` | 204 (other devices signed out) | 401 no change pending / bad code; 409 `CONFLICT` email taken meanwhile |
| POST | `/api/v1/me/password` | bearer | `ChangePasswordDto` | 204 (other devices signed out) | 400 `PASSWORD_BREACHED`; 401 current wrong |
| POST | `/api/v1/me/photos` | bearer | multipart `file` | 201 `ProfilePhotoDto` | 400; 409 `CONFLICT` gallery full (6); 413; 415; 503 |
| PUT | `/api/v1/me/photos/order` | bearer | `ReorderPhotosDto` | 200 `ProfilePhotoDto[]` | 400 ids ≠ exactly my photos |
| DELETE | `/api/v1/me/photos/{photoId}` | bearer | path | 204 | 404 |
| GET | `/api/v1/me/reports` | bearer | `cursor`, `limit` | 200 `MyReportsPageDto` (newest first) | — |
| POST | `/api/v1/me/export` | bearer | — | 202 `DataExportDto` | 403 `REAUTH_REQUIRED` / `EMAIL_NOT_VERIFIED`; 409 `CONFLICT` one on its way or < 1 day ago |
| GET | `/api/v1/me/export` | bearer | — | 200 `DataExportDto` (fresh link if the file is still there) | 403 `REAUTH_REQUIRED`; 404 never requested |

### 3.5 Trusted person 🆕
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| PUT | `/api/v1/me/trusted-person` | bearer | `ChooseTrustedPersonDto` | 200 `TrustedPersonDto` | 403 `REAUTH_REQUIRED` / `FORBIDDEN`; 404 cannot be chosen; 429 `TRUSTED_REQUEST_LIMIT` |
| GET | `/api/v1/me/trusted-person` | bearer | — | 200 `TrustedPersonDto`, or an empty body when nobody | — |
| DELETE | `/api/v1/me/trusted-person` | bearer | — | 204 (also when there was nobody) | — |
| GET | `/api/v1/me/trusted-by` | bearer | `cursor`, `limit` | 200 `TrustedByPageDto` (newest first) | — |
| POST | `/api/v1/me/trusted-by/{linkId}/accept` | bearer | path `linkId` | 204 (also when already accepted) | 404 |
| DELETE | `/api/v1/me/trusted-by/{linkId}` | bearer | path `linkId` | 204 | 404 |
| GET | `/api/v1/me/trusted-by/{linkId}/plans` | bearer | path `linkId` | 200 `TrustedPlansDto` | 404 no such link, or not accepted |

### 3.6 Settings, Devices and Notifications
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/settings` | bearer | — | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/settings` | bearer | `UpdateUserSettingsDto` | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/analytics` | bearer | `AnalyticsOptDto` | 200 `UserSettingsDto` | — |
| POST | `/api/v1/me/devices` | bearer | `RegisterDeviceDto` | 204 (register or refresh) | — |
| POST | `/api/v1/me/devices/unregister` | bearer | `UnregisterDeviceDto` | 204 | — |
| GET | `/api/v1/me/notifications` | bearer | `unread` (bool, default false), `cursor`, `limit` | 200 `InboxPageDto` | — |
| POST | `/api/v1/me/notifications/read` | bearer | `MarkReadDto` | 204 | — |

### 3.7 Posts
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/posts` | bearer | `status` = `draft` \| `published` (default published; includes taken down/cancelled), `cursor`, `limit` | 200 `MyPostsPageDto` (newest first) | — |
| GET | `/api/v1/me/rsvps` | bearer | `state` = `going` (default) \| `requested` \| `waitlisted` 🆕, `cursor`, `limit`; header | 200 `HostedPostsPageDto` (soonest first) | — |
| GET | `/api/v1/me/saved` | bearer | `type` = all\|meetup\|event\|plan\|group (default all), `cursor`, `limit`; header | 200 `HostedPostsPageDto` (newest save first) | — |
| GET | `/api/v1/me/attended` | bearer | `cursor`, `limit` | 200 `HostedPostsPageDto` (latest first) | — |
| POST | `/api/v1/posts` | bearer | multipart `CreatePostDto` (+ `images`) | 201 `PostDetailDto` | 400 field/publish rules; 403 suspended; 409 20 drafts (`CONFLICT`) or `EVENT_MONTHLY_CAP`; 413; 415; 503 uploads busy or map vendor down |
| GET | `/api/v1/posts/{postId}` | bearer | path; header | 200 `PostDetailDto` | 404 |
| PATCH | `/api/v1/posts/{postId}` | bearer | `UpdatePostDto` | 200 `PostDetailDto` | 400; 404 not mine; 409 taken down/cancelled |
| DELETE | `/api/v1/posts/{postId}` | bearer | path | 204 | 404; 409 `POST_HAS_ATTENDEES` / `CONFLICT` taken down or cancelled |
| POST | `/api/v1/posts/{postId}/publish` | bearer | — | 200 `PostDetailDto` | 400 (one entry per failing rule); 403; 404; 409 already live (`CONFLICT`) / `EVENT_MONTHLY_CAP` |
| PUT | `/api/v1/posts/{postId}/images` | bearer | multipart `images` (whole carousel) | 200 `PostDetailDto` | 400 count; 404; 409; 413; 415; 503 |
| POST | `/api/v1/posts/{postId}/cancel` | bearer | — | 200 `PostDetailDto` (`status: cancelled`) | 404; 409 draft / already cancelled / started |
| POST | `/api/v1/posts/{postId}/link-click` | bearer | — | 204 | 404; 409 no link or not live |
| POST | `/api/v1/posts/{postId}/save` | bearer | — | 204 | 404; 409 draft / cancelled |
| DELETE | `/api/v1/posts/{postId}/save` | bearer | — | 204 (always) | — |
| POST | `/api/v1/posts/{postId}/report` | bearer | `ReportPostDto` | 202 `ReportFiledDto` | 400 own post / "other" w/o details; 403 `REPORTING_PAUSED`; 404; 409 open report exists |

### 3.8 RSVP and Attendees
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/posts/{postId}/rsvp` | bearer | — | 200 `RsvpStateDto` (going, requested or waitlisted) | 404; 409 `POST_FULL` / `POST_STARTED` / `POST_CANCELLED` / `CONFLICT` (own post, declined) |
| DELETE | `/api/v1/posts/{postId}/rsvp` | bearer | — | 204 | — |
| GET | `/api/v1/posts/{postId}/attendees` | bearer | `state` = `going` (default) \| `requested` \| `waitlisted`, `cursor`, `limit` | 200 `AttendeesPageDto` | 403 list not allowed; 404 |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/accept` | bearer (host) | — | 200 `RsvpStateDto` (going, or waitlisted with place) | 404; 409 `POST_FULL` / `CONFLICT` not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/decline` | bearer (host) | — | 200 `RsvpStateDto` (declined, final) | 404; 409 not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/remove` | bearer (host) | — | 200 `RsvpStateDto` (removed, and the count after) | 404; 409 not live |

### 3.9 Comments
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/posts/{postId}/comments` | bearer | `cursor`, `limit` | 200 `CommentsPageDto` (top-level, oldest first) | 404 |
| POST | `/api/v1/posts/{postId}/comments` | bearer | `CreateCommentDto` | 201 `CommentDto` | 400 empty / > 1000; 404; 409 `POST_CANCELLED` |
| GET | `/api/v1/posts/{postId}/comments/{commentId}/replies` | bearer | `cursor`, `limit` | 200 `CommentsPageDto` (oldest first) | 404 |
| DELETE | `/api/v1/posts/{postId}/comments/{commentId}` | bearer | — | 204 (again when gone) | 404 not mine to delete |
| POST | `/api/v1/posts/{postId}/comments/{commentId}/report` | bearer | `ReportCommentDto` | 202 `ReportFiledDto` | 400 own / "other" w/o details; 403 `REPORTING_PAUSED`; 404; 409 |

### 3.10 Chat
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/conversations` | bearer | `tab` = all\|unread\|groups (default all), `search` (≤ 60), `cursor`, `limit` | 200 `ConversationsPageDto` | — |
| POST | `/api/v1/conversations` | bearer | `StartConversationDto` | 200 `ConversationDetailDto` | 400; 403; 404; 409 `CONFLICT` / `GROUP_CHAT_FULL` 🆕; 429 `CHAT_START_LIMIT` |
| GET | `/api/v1/conversations/unread-count` 🆕 | bearer | — | 200 `UnreadConversationsDto` | — |
| GET | `/api/v1/conversations/{conversationId}` | bearer | — | 200 `ConversationDetailDto` | 404 |
| GET | `/api/v1/conversations/{conversationId}/messages` | bearer | `before`, `limit` (default 30, max 50) | 200 `MessagesPageDto` (newest first) | 404 |
| POST | `/api/v1/conversations/{conversationId}/messages` | bearer | multipart `clientMsgId`*, `body`, `taggedPostId`, `images` (≤ 4) | 201 `MessageDto` | 400; 403; 404; 413; 503 |
| POST | `/api/v1/conversations/{conversationId}/read` | bearer | `ReadUpToDto` | 204 | 404 |
| POST | `/api/v1/conversations/{conversationId}/typing` | bearer | — | 204 | 404 |
| POST | `/api/v1/conversations/{conversationId}/members` | bearer (host) | `AddMemberDto` | 204 (added, or already in) | 403; 404; 409 `CONFLICT` not going / `GROUP_CHAT_FULL` |
| DELETE | `/api/v1/conversations/{conversationId}/members/{userId}` | bearer | — | 204 | 403; 404; 409 host leaving |
| POST | `/api/v1/conversations/{conversationId}/messages/{messageId}/report` | bearer | `ReportMessageDto` | 202 `ReportFiledDto` | 400; 403 `REPORTING_PAUSED`; 404; 409 |

### 3.11 Feed, Map, Search
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/feed` | bearer | `type` = all\|meetup\|event\|plan\|group (default all), `cursor`, `limit`; header `X-Client-Location` | 200 `FeedPageDto` | 404 `NO_LOCATION` |
| GET | `/api/v1/map/pins` | bearer | `bbox` = `west,south,east,north` (required; ≤ 5° wide, ≤ 20° for a subscriber), `type` (default all), `q` (≤ 80); header | 200 `MapPinsDto` (≤ 500 pins) | 400 bad bbox; 404 `NO_LOCATION` |
| GET | `/api/v1/search/posts` | bearer | `q` (2–100) and/or `interestIds` (≤ 10, repeated key), `type` (default all), `cursor`, `limit` (default 20, max 50); header | 200 `PostSearchPageDto` | 400; 404 `NO_LOCATION` |
| GET | `/api/v1/search/people` | bearer | `q` (required, 2–100), `cursor`, `limit` (default 20, max 50) | 200 `PeoplePageDto` | 400 |

### 3.12 Subscription and Teleport
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/subscription` | bearer | — | 200 `MySubscriptionDto` | — |
| GET | `/api/v1/me/subscription/challenge` | bearer | — | 200 `ChallengeDto` | — |
| POST | `/api/v1/me/subscription/apple` | bearer | `VerifyAppleDto` | 200 `MySubscriptionDto` | 403; 409; 500; 503 |
| POST | `/api/v1/me/subscription/google` | bearer | `VerifyGoogleDto` | 200 `MySubscriptionDto` | 403; 409; 429 `RATE_LIMITED`; 500; 503 |
| POST | `/api/v1/me/subscription/checkout` | bearer | `CheckoutDto` | 200 `RedirectUrlDto` | 400 bad coupon; 409 subscribed / coupon used; 503 |
| POST | `/api/v1/me/subscription/checkout/confirm` | bearer | — | 200 `MySubscriptionDto` | 403; 409; 500; 503 |
| POST | `/api/v1/me/subscription/portal` | bearer | — | 200 `RedirectUrlDto` | 404 no web subscription |
| POST | `/api/v1/me/teleport` | bearer | `TeleportDto` (`placeId`) | 204 | 400 unknown place / not a city; 402 `PAYMENT_REQUIRED`; 503 map vendor |
| DELETE | `/api/v1/me/teleport` | bearer | — | 204 | — |

### 3.13 Profiles, Handles and Blocking
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/users/handle/{handle}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}/posts` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/users/{userId}/attended` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/users/{userId}/plans` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` (empty unless `sharePlans`) | 404 |
| GET | `/api/v1/handles/availability` | bearer | query `handle` (1–40) | 200 `HandleAvailabilityDto` | — |
| POST | `/api/v1/users/{userId}/block` | bearer | path | 204 (also when nobody has that id) | 400 own id |
| DELETE | `/api/v1/users/{userId}/block` | bearer | path | 204 (idempotent) | 400 own id |
| GET | `/api/v1/me/blocks` | bearer | `cursor`, `limit` | 200 `BlockedUsersPageDto` | — |
| POST | `/api/v1/users/{userId}/report` | bearer | `ReportUserDto` | 202 `ReportCreatedDto` | 400 own id / "other" w/o details; 403 `REPORTING_PAUSED`; 404; 409 open report exists |

### 3.14 Waitlist (Common) 🆕
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/waitlist` | none | `JoinWaitlistDto` | 202 (same for every address) | 400 `VALIDATION_FAILED` / `CAPTCHA_FAILED`; 503 reCAPTCHA unreachable |
| POST | `/api/v1/waitlist/confirm` | none | `WaitlistTokenDto` | 204 (also on a second click) | 400 `WAITLIST_LINK_INVALID` |
| POST | `/api/v1/waitlist/remove` | none | `WaitlistTokenDto` | 204 (also when gone) | 400 `WAITLIST_LINK_INVALID` |

---

## 4. Field limits (validate client-side to avoid round trips)

| DTO | Field limits |
|---|---|
| `SignupEmailDto` | `email` ≤ 320 · `password` 8–128 (an uppercase letter + a digit) · `firstName`/`lastName` 1–60 · `dob` YYYY-MM-DD · `termsVersion` ≤ 16 · `timezone` ≤ 64 (IANA) |
| `OtpVerifyDto` | `code` matches `^\d{6}$` · `target` ≤ 320 · `password` ≤ 128 · `timezone` ≤ 64 · `deviceId` ≤ 128 · `deviceName` ≤ 120 |
| `OtpTargetDto` | `target` ≤ 320 |
| `DeviceCheckDto` | `token` ≤ 8192 |
| `LoginDto` | `email` ≤ 320 · `password` ≤ 128 · `otpCode` (no pattern in Swagger; the emailed 6 digits) |
| `GoogleSignInDto` / `AppleSignInDto` | `nonce` 16–256 · `termsVersion` ≤ 16 · `timezone` ≤ 64 · Apple `firstName`/`lastName` ≤ 60 |
| `ForgotPasswordDto` / `VerifyResetCodeDto` | `email` ≤ 320 · `code` matches `^\d{6}$` |
| `ResetPasswordDto` / `SetPasswordDto` / `ChangePasswordDto` | `newPassword` 8–128 (an uppercase letter + a digit) · `currentPassword` ≤ 128 |
| `ReauthDto` | `password` ≤ 128 |
| `UpdateProfileDto` | `firstName`/`lastName` 1–60 · `handle` 3–20 (letters, digits, `.` `_`; change once per 30 days) · `bio` ≤ 160 · `timezone` ≤ 64 · `homePlaceId` a city place id · `interestIds` 3–8 active ids |
| `ProfileExtrasDto` | `languages` ISO 639-1 codes · `travelStyles` ≤ 10 · `favouriteDestinationIds` ≤ 10 · `pronouns` ≤ 20 · `tagline` ≤ 60 · `socialLinks.website` ≤ 200 |
| `GET /handles/availability` | `handle` 1–40 |
| `DeleteAccountDto` | `reason` ≤ 500 |
| `AcceptTermsDto` | `version` ≤ 40 |
| `ChangeEmailDto` | `newEmail` ≤ 320 |
| `RegisterDeviceDto` / `UnregisterDeviceDto` | `token` ≤ 512 · `appInstanceId` ≤ 64 · `timezone` ≤ 64 · `deviceId` ≤ 128 |
| `CreatePostDto` / `UpdatePostDto` | `title` ≤ 80 · `description` ≤ 1000 · `placeId` ≤ 255 · `placeName` ≤ 200 · `capacity` 1–100000 · `priceCents` 1–100000000 · `currency` exactly 3 letters · `externalUrl` ≤ 2048 (https) · images ≤ 4 · `interestIds` 1–3 to publish · `schedule`/`itinerary` ≤ 30 lines of ≤ 120 chars · defaults `visibility: open`, `showOnMap: true`, `status: draft` |
| `CreateCommentDto` | `body` 1–1000 |
| Chat message | `body` ≤ 2000 · `images` ≤ 4 · `clientMsgId` uuid (required) · `taggedPostId` uuid |
| `GET /conversations` | `search` ≤ 60 |
| Search | `q` 2–100 · `interestIds` ≤ 10 · `limit` ≤ 50 |
| `GET /map/pins` | `q` ≤ 80 · `bbox` ≤ 5° wide (20° for a subscriber) |
| `ReportPostDto` / `ReportUserDto` / `ReportCommentDto` / `ReportMessageDto` | `details` ≤ 500 (required when `reason: 'other'`) |
| `JoinWaitlistDto` | `email` ≤ 254 · `city` 1–80 · `countryCode` ISO 3166-1 alpha-2 · `consent` must be true · `captchaToken` ≤ 4096 · `website` ≤ 200 (send empty) |
| `WaitlistTokenDto` | `token` ≤ 200 |

---

## 5. Error codes: what the client should do

| `code` | Typical status | Client handling |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Map `errors[].field` onto form fields. Also the code for "own post/person/comment" on reports and "own id" on block |
| `BAD_REQUEST` | 400 | Show the message; log `requestId` |
| `PASSWORD_BREACHED` | 400 | Inline: "This password appeared in a data breach — choose another" |
| `CAPTCHA_FAILED` 🆕 | 400 | Waitlist only: reset the reCAPTCHA widget and ask again |
| `WAITLIST_LINK_INVALID` 🆕 | 400 | Waitlist only: "This link has expired; join again for a new one" |
| `UNAUTHORIZED` | 401 | Refresh once (single-flight); if refresh fails, sign out. On code screens: "wrong or expired code" |
| `SIGN_IN_AGAIN` 🆕 | 401 | Admin TOTP flow only; surface a generic message |
| `PAYMENT_REQUIRED` | 402 | Show the Travel paywall (teleport) |
| `EMAIL_NOT_VERIFIED` | 403 | On login: go to the OTP screen (a code was re-sent). On set-password/export: ask the user to verify an email first |
| `STEP_UP_REQUIRED` | 403 | Ask for the emailed code; retry the login with `otpCode` |
| `REAUTH_REQUIRED` | 403 | Open the "confirm it's you" sheet (§2.5), then retry |
| `REPORTING_PAUSED` | 403 | "Reporting is paused on your account; you can still block" |
| `SIGNUP_REFUSED` | 403 | Google/Apple sign-up with a banned email; no `details`. Show the message ("contact support") |
| `TOTP_REQUIRED`, `TOTP_CODE_USED` | 403 / 401 | Admin only; surface a generic message |
| `FORBIDDEN` | 403 | Hide or disable the action (a suspended account, a chat you can't start or send in, a list you can't open) |
| `NOT_FOUND` | 404 | Empty or "not available" state; for posts, profiles and chats it may mean blocked, removed or not visible |
| `NO_LOCATION` 🆕 | 404 | Feed, map, search: no `X-Client-Location` and no teleport. Ask for location permission (replaces `NO_CITY`) |
| `EMAIL_ALREADY_REGISTERED` 🆕 | 409 | Google/Apple: "Sign in with {details.signInMethods} instead" (§2.3); replaces `ACCOUNT_LINK_REQUIRED` |
| `LAST_SIGN_IN_METHOD` | 409 | "Set a password before removing your only sign-in method" |
| `HANDLE_COOLDOWN` | 409 | "You can change your handle again on {details.availableAt}" |
| `EVENT_MONTHLY_CAP` | 409 | Show `details.resetsAt` |
| `GROUP_CHAT_FULL` 🆕 | 409 | "The group chat is full; you'll get in when a place opens". A message, not an error |
| `POST_FULL` / `POST_STARTED` / `POST_CANCELLED` / `POST_HAS_ATTENDEES` | 409 | Refresh the post and show the matching state (for `POST_HAS_ATTENDEES`, offer **Cancel** instead of **Delete**) |
| `CONFLICT` | 409 | Generic conflict: refetch and show the message |
| `GONE` | 410 | Resource no longer exists: refetch the parent list |
| `PAYLOAD_TOO_LARGE` | 413 | "Image must be 5 MB or smaller"; compress more |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | "Use a JPEG, PNG or WebP image" |
| `CHAT_START_LIMIT` | 429 | "You've started a lot of new chats today; try again tomorrow" |
| `TRUSTED_REQUEST_LIMIT` 🆕 | 429 | "You've asked a few people today. Try again tomorrow." |
| `RATE_LIMITED` | 429 | Back off; disable the button briefly |
| `UNPROCESSABLE`, `METHOD_NOT_ALLOWED` | 422 / 405 | Bug: log with `requestId` |
| `INTERNAL` | 500 | Retry with backoff for GETs; show a retry UI for mutations. Store/Stripe verification can answer 500: "try again" |
| `SERVICE_UNAVAILABLE` | 503 | Subscriptions: "Purchases aren't available right now". Uploads: "busy, retry in a moment". Place lookups/teleport: map vendor down. Elsewhere: retry with backoff for GETs |

Removed from the enum since 3 Nov: `ACCOUNT_LINK_REQUIRED`, `NO_CITY`, `EXTERNAL_BOOKING`.

Socket `connect_error` codes (`UNAUTHENTICATED`, `SESSION_SOCKET_LIMIT`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `FORBIDDEN`) are in `error.data.code`, not `ErrorResponseDto` (§2.20).

---

## 6. Types (TypeScript, from the OpenAPI schemas)

Every schema referenced by a User/Common operation. `?` = not in the schema's `required` list.

```ts
// ---------- shared ----------
export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';
export type PostType = 'meetup' | 'event' | 'plan' | 'group';
export type PostStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';
export type Visibility = 'open' | 'private';
export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type OriginSource = 'device' | 'teleport';
export type ReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

export type ErrorCode =
  | 'VALIDATION_FAILED' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED' | 'CONFLICT' | 'GONE' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE' | 'RATE_LIMITED' | 'PAYMENT_REQUIRED' | 'EMAIL_NOT_VERIFIED' | 'STEP_UP_REQUIRED'
  | 'REAUTH_REQUIRED' | 'PASSWORD_BREACHED' | 'EMAIL_ALREADY_REGISTERED' | 'HANDLE_COOLDOWN'
  | 'LAST_SIGN_IN_METHOD' | 'TOTP_REQUIRED' | 'TOTP_CODE_USED' | 'SIGN_IN_AGAIN' | 'SIGNUP_REFUSED'
  | 'TRUSTED_REQUEST_LIMIT' | 'REPORTING_PAUSED' | 'CHAT_START_LIMIT' | 'EVENT_MONTHLY_CAP'
  | 'NO_LOCATION' | 'POST_FULL' | 'GROUP_CHAT_FULL' | 'POST_STARTED' | 'POST_CANCELLED'
  | 'POST_HAS_ATTENDEES' | 'CAPTCHA_FAILED' | 'WAITLIST_LINK_INVALID'
  | 'SERVICE_UNAVAILABLE' | 'INTERNAL';

export interface FieldErrorDto { field: string; message: string }
export interface ErrorResponseDto {
  code: ErrorCode;
  message: string;
  errors?: FieldErrorDto[];
  /** e.g. { signInMethods } with EMAIL_ALREADY_REGISTERED, { resetsAt } with EVENT_MONTHLY_CAP, { availableAt } with HANDLE_COOLDOWN */
  details?: Record<string, unknown>;
  requestId: string | null;
}
/** details of a 409 EMAIL_ALREADY_REGISTERED; an empty list means show the message as it is */
export interface EmailAlreadyRegisteredDetails { signInMethods: ('password' | 'google' | 'apple')[] }

export interface Page<T> { items: T[]; nextCursor: string | null }

// ---------- places ----------
export interface PlaceRefDto {
  /** Google place id the app can open in the Places SDK */ placeId: string;
  /** e.g. "Lagos, Nigeria" */ label: string;
  countryCode: string | null;
}
export interface VisitingDto { place: PlaceRefDto }

// ---------- auth ----------
export interface DeviceCheckDto {
  platform: 'ios' | 'android';
  /** iOS DCDevice token (base64) or a Play Integrity token; ≤ 8192 */ token: string;
}
interface DeviceFields {
  /** Stable per-install id; the same id replaces its previous session. ≤ 128 */ deviceId?: string;
  /** ≤ 120 */ deviceName?: string;
  /** Not on SignupEmailDto. Omit on emulators/failure; a malformed one is a 400 */ deviceCheck?: DeviceCheckDto;
}
export interface SignupEmailDto {
  email: string;
  /** 8–128, an uppercase letter and a digit */ password: string;
  firstName: string; lastName: string;
  /** YYYY-MM-DD */ dob: string;
  /** termsVersion from GET /app/config; 400 unless it is the version in force */ termsVersion: string;
  /** IANA */ timezone?: string;
}
export interface OtpVerifyDto extends DeviceFields {
  /** the email the code was sent to */ target: string;
  /** ^\d{6}$ */ code: string;
  /** Required when the code completes a sign-up */ password?: string;
  timezone?: string;
}
export interface OtpTargetDto extends DeviceFields { target: string }
export interface LoginDto extends DeviceFields {
  email: string; password: string;
  /** After STEP_UP_REQUIRED */ otpCode?: string;
}
export interface RefreshDto extends DeviceFields { refreshToken: string }
export interface GoogleSignInDto extends DeviceFields {
  /** 16–256; raw nonce */ nonce: string;
  timezone?: string;
  /** sent when signing up */ termsVersion?: string;
  idToken: string;
}
export interface AppleSignInDto extends DeviceFields {
  /** 16–256; Apple receives its SHA-256 */ nonce: string;
  timezone?: string;
  termsVersion?: string;
  identityToken: string;
  /** exchanged once so deletion can revoke the sign-in */ authorizationCode: string;
  /** Apple hands over the name on first authorisation only */ firstName?: string; lastName?: string;
}
export interface ForgotPasswordDto { email: string }
export interface VerifyResetCodeDto { email: string; /** ^\d{6}$ */ code: string }
export interface ResetTokenDto { /** single use, 15 minutes */ token: string }
export interface ResetPasswordDto { /** from POST /auth/password/verify */ token: string; newPassword: string }

export interface TokenPairDto {
  /** 15 minutes */ accessToken: string;
  /** single use */ refreshToken: string;
  /** ISO date-time */ accessExpiresAt: string;
  sessionId: string;
}
export interface OtpSignInDto extends TokenPairDto {
  /** True when this completed a sign-up */ isNew: boolean;
  user: MeDto;
}

// ---------- interests ----------
export interface InterestDto { id: string; slug: string; name: string; emoji: string | null }

// ---------- account ----------
export interface SocialLinksDto {
  /** handle, with or without @ */ instagram?: string | null;
  /** handle, with or without @ */ tiktok?: string | null;
  /** ≤ 200 */ website?: string | null;
}
export type TravelStyle =
  | 'family' | 'solo' | 'shopping' | 'local_life' | 'rail_travel' | 'diving' | 'art_lover' | 'backpacker'
  | 'skiing' | 'cruise' | 'cycling' | 'eco_travel' | 'safari' | 'nightlife' | 'foodie' | 'beach'
  | 'festivals' | 'spiritual' | 'road_trip' | 'mountains' | 'culture' | 'hiking' | 'surfing' | 'sailing'
  | 'luxury' | 'photography' | 'adventurer' | 'budget' | 'staycation' | 'city_break' | 'history'
  | 'digital_nomad' | 'snow_escape' | 'glamping' | 'couples' | 'camping';
export interface ProfileExtrasDto {
  /** ISO 639-1 */ languages?: string[];
  /** up to 10 (more is a 400); empty list or null clears */ travelStyles?: TravelStyle[] | null;
  /** Google place ids of cities, up to 10 (more is a 400); read back as favouriteDestinations */
  favouriteDestinationIds?: string[];
  socialLinks?: SocialLinksDto;
  /** ≤ 20 */ pronouns?: string | null;
  /** ≤ 60 */ tagline?: string | null;
}
export interface ProfilePhotoDto {
  id: string; /** 1280 px */ url: string; /** 400 px */ thumbUrl: string; /** from 0 */ position: number;
}
export interface MeIdentityDto { provider: 'email' | 'google' | 'apple' }

export interface MeDto {
  id: string;
  status: 'active' | 'suspended' | 'pending_delete' | 'pending';
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  dob: string | null;
  gender: Gender | null;
  email: string | null;
  bio: string | null;
  /** IANA */ timezone: string | null;
  avatarUrl: string | null;
  /** the gallery, in my order */ photos: ProfilePhotoDto[];
  homePlace: PlaceRefDto | null;
  /** The place a trip of mine covers today (trips are parked; expect null) */ visiting: VisitingDto | null;
  /** Where Travel has put me; null when not teleported and once the subscription ends (shape: §8) */
  teleport: TeleportDto | null;
  /** Verified host: our team reviewed this profile. Not an identity check */ verified: boolean;
  /** Travel is on right now */ subscribed: boolean;
  /** When Travel runs out unless it renews; null without a subscription */ subscribedUntil: string | null;
  interests: InterestDto[];
  extras: ProfileExtrasDto | null;
  /** from extras.favouriteDestinationIds */ favouriteDestinations: PlaceRefDto[];
  /** Null until first name, last name and dob are all set. Gender is not needed */
  profileCompletedAt: string | null;
  identities: MeIdentityDto[];
  termsVersion: string | null;
  /** False when terms changed and need accepting again */ termsUpToDate: boolean;
  createdAt: string;
}

export interface UpdateProfileDto {
  firstName?: string; lastName?: string;
  /** YYYY-MM-DD */ dob?: string;
  gender?: Gender;
  /** 3–20; letters, digits, dots, underscores; once every 30 days */ handle?: string;
  bio?: string | null;
  timezone?: string;
  /** Google place id for a city; null clears; a venue or street address is a 400 */ homePlaceId?: string | null;
  /** 3–8 active interests */ interestIds?: string[];
  extras?: ProfileExtrasDto;
}
export interface DeleteAccountDto { reason?: string }
export interface DeletionScheduledDto { /** erase time; signing in before then cancels */ purgeAt: string | null }
export interface AvatarDto { avatarUrl: string | null }
export interface AcceptTermsDto { /** termsVersion from GET /app/config */ version: string }
export interface SessionDto {
  id: string; deviceName: string | null; ip: string | null;
  /** approximate 2-letter country */ country: string | null;
  startedAt: string; lastUsedAt: string;
  /** the session making the request */ current: boolean;
}
export interface ReauthDto { password?: string; code?: string }
export interface SetPasswordDto { newPassword: string }
export interface ChangeEmailDto { newEmail: string }
export interface ConfirmChangeDto { /** the code sent to the new address */ code: string }
export interface ChangePasswordDto { currentPassword: string; newPassword: string }
export interface ReorderPhotosDto { /** every photo id, in order */ ids: string[] }

export interface MyReportDto {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  reason: ReportReason;
  /** open while a moderator has not closed it */ status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
  resolvedAt: string | null;
}
export type MyReportsPageDto = Page<MyReportDto>;

export interface DataExportDto {
  id: string;
  status: 'queued' | 'ready' | 'failed';
  requestedAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  /** signed, 24 h; null while building or expired */ downloadUrl: string | null;
}

// ---------- trusted person ----------
export interface ChooseTrustedPersonDto { /** from GET /search/people */ userId: string }
export interface TrustedPersonDto {
  id: string;
  person: HostCardDto;
  /** pending: they have not answered; nothing shared yet */ status: 'pending' | 'accepted';
  /** when they accepted, or when I asked */ since: string;
}
export interface TrustedByDto {
  /** the linkId */ id: string;
  person: HostCardDto;
  /** pending: waiting for me to accept */ status: 'pending' | 'accepted';
  since: string;
}
export type TrustedByPageDto = Page<TrustedByDto>;
export interface TrustedPlanDto {
  /** null when unavailable */ postId: string | null;
  type: PostType | null;
  title: string | null;
  startAt: string | null;
  endAt: string | null;
  placeName: string | null;
  localityLabel: string | null;
  hostName: string | null;
  /** what they are doing there */ role: 'going' | 'hosting' | null;
  /** a plan I may not see; everything else on the row is null */ unavailable: boolean;
}
export interface TrustedPlansDto { /** soonest first, at most 100 */ items: TrustedPlanDto[] }

// ---------- settings, devices, notifications ----------
export interface UserSettingsDto {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewComment: boolean;
  /** while the app is in the background */ notifyNewMessage: boolean;
  /** renews or ends in two days */ notifySubscription: boolean;
  /** saved only: nothing is sent yet (default true) */ notifyNearbyActivity: boolean;
  /** saved only: nothing is sent yet (default false) */ notifyRecommendations: boolean;
  readReceipts: boolean;
  /** shared_only: only people I share a post with can start a chat */ dmPermission: 'anyone' | 'shared_only';
  /** out of search & suggestions; direct link still works */ hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  /** show my city (home, or where my trip is today) on my profile */ showCurrentCity: boolean;
  /** switches itself off at my midnight */ openToMeetToday: boolean;
  /** list upcoming open posts I'm going to on my profile */ sharePlans: boolean;
}
export type UpdateUserSettingsDto = Partial<Omit<UserSettingsDto, 'analyticsOptOut'>>;
export interface AnalyticsOptDto { /** false stops usage analytics */ enabled: boolean }
export interface RegisterDeviceDto {
  /** the push token from Firebase */ token: string;
  platform: 'ios' | 'android';
  /** Firebase's id for this install */ appInstanceId?: string;
  /** IANA */ timezone?: string;
  /** same id as at sign-in */ deviceId?: string;
}
export interface UnregisterDeviceDto { token: string }

export type NotificationCategory =
  | 'join_request' | 'request_accepted' | 'post_reminder' | 'new_comment'
  | 'subscription' | 'post_update' | 'trusted_person' | 'moderation';
export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** string values; kind always present, plus postId / commentId / linkId (§2.17) */
  data: { kind: string; [k: string]: string };
  readAt: string | null;
  createdAt: string;
}
export interface InboxPageDto extends Page<NotificationDto> { /** whole inbox, for the badge */ unreadCount: number }
export interface MarkReadDto { /** omit to mark everything read */ ids?: string[] }

// ---------- posts ----------
export interface PostImageDto { /** 200 px */ thumbUrl: string; /** 800 px */ cardUrl: string; /** 1600 px */ fullUrl: string }
export interface PostPriceDto {
  amountCents: number; currency: string;
  /** amount = amountCents / 10 ** exponent */ exponent: number;
}
export interface PostRecurrenceDto { frequency: Recurrence; /** YYYY-MM-DD; null = until stopped */ endsOn: string | null }
export interface HostCardDto {
  id: string; displayName: string; avatarUrl: string | null;
  /** our team reviewed this profile */ verified: boolean;
}

export interface PostCardDto {
  id: string;
  type: PostType;
  title: string;
  /** carousel order */ images: PostImageDto[];
  /** null only on a draft */ startAt: string | null;
  endAt: string | null;
  /** a Group that meets again */ recurrence: PostRecurrenceDto | null;
  /** the label under the card */ placeName: string | null;
  /** the Google place the host picked; null for a dropped pin */ placeId: string | null;
  formattedAddress: string | null;
  /** the city and country, e.g. "Lagos, Nigeria" */ localityLabel: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  /** null = no limit */ capacity: number | null;
  /** null = free */ price: PostPriceDto | null;
  /** where a paid post is paid; Join opens it and also joins */ externalUrl: string | null;
  /** host not counted */ goingCount: number;
  rsvpState: RsvpState;
  saved: boolean;
  visibility: Visibility;
  host: HostCardDto;
  interests: InterestDto[];
  distanceKm: number | null;
}
export interface MyPostDto extends PostCardDto { status: PostStatus; publishedAt: string | null; updatedAt: string }
export interface PostDetailDto extends PostCardDto {
  description: string;
  showOnMap: boolean;
  waitlistEnabled: boolean;
  status: PostStatus;
  /** Events only; [] otherwise */ schedule: string[];
  /** Plans only; [] otherwise */ itinerary: string[];
  isHost: boolean;
  /** 1 = next */ waitlistPosition: number | null;
  /** only on my own post */ linkClickCount: number | null;
}

/** Sent as multipart/form-data; repeat interestIds/schedule/itinerary/images per value; booleans as 'true'/'false' */
export interface CreatePostDto {
  /** fixed once created */ type: PostType;
  title: string;
  description?: string;
  startAt?: string;
  /** after startAt */ endAt?: string;
  /** Google place id (venue, or a Plan/Group destination); not with lat/lng */ placeId?: string;
  /** a dropped pin, with lng; not with placeId */ lat?: number;
  lng?: number;
  /** defaults to the place's city name */ placeName?: string;
  /** omit for no limit */ capacity?: number;
  /** Meetup/Event/Group only, with currency */ priceCents?: number;
  currency?: string;
  /** https, paid posts only; never on a Plan */ externalUrl?: string;
  waitlistEnabled?: boolean;
  visibility?: Visibility;      // default 'open'
  showOnMap?: boolean;          // default true
  interestIds?: string[];       // 1–3 to publish
  schedule?: string[];          // Events only; ≤ 30 × ≤ 120
  itinerary?: string[];         // Plans only; ≤ 30 × ≤ 120
  recurrence?: Recurrence;      // Groups only
  recurrenceEndsOn?: string;    // Groups only, YYYY-MM-DD
  status?: 'draft' | 'published'; // default 'draft'
  images?: Blob[];              // ≤ 4
}
export interface UpdatePostDto {
  title?: string; description?: string; startAt?: string;
  /** null clears */ endAt?: string | null;
  /** move to a Google place; not with lat/lng */ placeId?: string;
  /** move the pin: send both; not nullable (a live post always keeps a place) */ lat?: number; lng?: number;
  placeName?: string | null;
  /** null removes the limit */ capacity?: number | null;
  /** drafts only; null on both makes it free */ priceCents?: number | null; currency?: string | null;
  /** may change on a live post; null removes it */ externalUrl?: string | null;
  waitlistEnabled?: boolean; visibility?: Visibility; showOnMap?: boolean;
  /** replaces the whole set */ interestIds?: string[];
  /** Events only; replaces; null clears */ schedule?: string[] | null;
  /** Plans only; replaces; null clears */ itinerary?: string[] | null;
  /** Groups only; null stops the repeat */ recurrence?: Recurrence | null;
  recurrenceEndsOn?: string | null;
}
export interface ReportPostDto { reason: ReportReason; details?: string }
export interface ReportFiledDto { id: string }

export type MyPostsPageDto = Page<MyPostDto>;
export type HostedPostsPageDto = Page<PostCardDto>;

// ---------- rsvp / attendees ----------
export interface RsvpStateDto {
  /** none after leaving */ state: RsvpState;
  goingCount: number;
  capacity: number | null;
  waitlistPosition: number | null;
}
export interface AttendeeDto {
  user: HostCardDto;
  state: 'going' | 'requested' | 'waitlisted';
  /** when they joined or asked */ since: string;
  /** waitlist only */ position: number | null;
}
export interface AttendeeCountsDto { going: number; /** host only */ requested: number | null; /** host only */ waitlisted: number | null }
export interface AttendeesPageDto extends Page<AttendeeDto> { counts: AttendeeCountsDto }

// ---------- comments ----------
export interface CommentDto {
  id: string; postId: string;
  /** the top-level comment this replies to */ parentId: string | null;
  /** null on a deleted comment; a wiped account reads "Deleted user" */ author: HostCardDto | null;
  /** null on a deleted comment */ body: string | null;
  deleted: boolean;
  /** live replies; 0 on a reply */ replyCount: number;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
}
export interface CommentsPageDto extends Page<CommentDto> { /** live comments + replies; 0 on a replies page */ total: number }
export interface CreateCommentDto { /** 1–1000, line breaks kept */ body: string; parentId?: string }
export interface ReportCommentDto { reason: ReportReason; details?: string }

// ---------- chat ----------
export interface LastMessageDto {
  id: string; senderId: string;
  /** sender's first name; null for my own; "Deleted user" for a wiped account */ senderName: string | null;
  /** first 120 chars */ preview: string | null;
  imageCount: number;
  createdAt: string;
}
export interface ConversationDto {
  id: string;
  kind: 'direct' | 'group';
  /** a group's title, from its post */ title: string | null;
  postId: string | null;
  /** a group's cover, 200 px; null in a direct chat and when the post can't be shown */ imageUrl: string | null;
  /** direct only */ other: HostCardDto | null;
  memberCount: number;
  lastMessage: LastMessageDto | null;
  /** up to 99 */ unreadCount: number;
  activityAt: string;
}
export interface MemberDto {
  user: HostCardDto;
  role: 'owner' | 'member';
  /** lags a disconnect by up to 90 s */ online: boolean;
  /** null when they hide it */ lastReadMessageId: string | null;
}
export interface ConversationDetailDto extends ConversationDto {
  /** other members online now */ onlineCount: number;
  /** host first */ members: MemberDto[];
  /** a group's post as I may see it; null in a direct chat or when hidden; distanceKm always null */
  post: PostCardDto | null;
}
export type ConversationsPageDto = Page<ConversationDto>;
export interface UnreadConversationsDto { /** conversations, not messages */ count: number }
export interface MessageImageDto { /** 320 px, 1 h */ thumbUrl: string; /** 1600 px, 1 h */ url: string }
export interface MessageDto {
  /** 64-bit id as a string, time-ordered */ id: string;
  conversationId: string;
  /** a wiped account reads "Deleted user" */ sender: HostCardDto;
  /** null once a moderator removed it */ body: string | null;
  images: MessageImageDto[];
  taggedPost: PostCardDto | null;
  taggedPostUnavailable: boolean;
  clientMsgId: string;
  removed: boolean;
  /** NOT present on the socket's message.new: compare sender.id with your own */ mine: boolean;
  createdAt: string;
}
/** nextCursor is the value to send as `before` */
export type MessagesPageDto = Page<MessageDto>;
export interface StartConversationDto { userId?: string; postId?: string } // exactly one
export interface ReadUpToDto { /** the newest message on screen */ messageId: string }
export interface AddMemberDto { /** someone going to the post */ userId: string }
export interface ReportMessageDto { reason: ReportReason; details?: string }
/** multipart body of POST /conversations/{id}/messages */
export interface SendMessageForm { clientMsgId: string; body?: string; taggedPostId?: string; images?: Blob[] }

// socket payloads (§2.20)
export interface ReadUpdateEvent { conversationId: string; userId: string; messageId: string }
export interface TypingEvent { conversationId: string; userId: string }
export interface SessionExpiringEvent { inMs: number }
export interface ServerRestartEvent { reconnectInMs: number }
export interface RsvpUpdateEvent { postId: string; state: RsvpState; goingCount: number }
export type SocketConnectErrorCode =
  | 'UNAUTHENTICATED' | 'SESSION_SOCKET_LIMIT' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'FORBIDDEN';

// ---------- feed / map / search ----------
export interface FeedOriginDto {
  lat: number; lng: number;
  /** the teleport place, for "Teleported to {place}"; null for your own location */ label: string | null;
  /** the state/region of the origin; everything there within 150 km is in the feed too */ region: string | null;
}
export interface FeedPageDto extends Page<PostCardDto> { origin: FeedOriginDto; originSource: OriginSource }
export interface MapPinDto { id: string; type: PostType; lat: number; lng: number; title: string; startAt: string }
export interface MapPinsDto {
  origin: FeedOriginDto;
  originSource: OriginSource;
  /** radius: only pins within 30 km of the origin; box: every pin in the box (subscribers) */ reach: 'radius' | 'box';
  /** ≤ 500, soonest first */ pins: MapPinDto[];
}
export interface PostSearchPageDto extends Page<PostCardDto> { origin: FeedOriginDto; originSource: OriginSource }
export interface PersonCardDto {
  id: string; handle: string | null;
  /** first name + last initial */ displayName: string;
  avatarUrl: string | null; verified: boolean;
  /** their home place, when set and shown */ homePlace: PlaceRefDto | null;
}
export type PeoplePageDto = Page<PersonCardDto>;

// ---------- subscription / teleport ----------
export interface MySubscriptionDto {
  subscribed: boolean;
  platform: 'apple' | 'google' | 'stripe' | 'comp' | null;
  /** grace = store retrying payment; still subscribed */ status: 'active' | 'grace' | 'expired' | 'refunded' | null;
  currentPeriodEnd: string | null;
  /** false once cancelled: it ends at currentPeriodEnd */ autoRenew: boolean;
  manage: 'apple' | 'google' | 'web' | null;
}
export interface ChallengeDto { /** single use, 5 minutes */ challenge: string }
export interface VerifyAppleDto { /** StoreKit 2 JWS */ signedTransaction: string; challenge: string; /** base64 */ keyId: string; /** base64 */ attestation: string }
export interface VerifyGoogleDto { purchaseToken: string; challenge: string; integrityToken: string }
export interface CheckoutDto { couponCode?: string }
export interface RedirectUrlDto { url: string }
export interface TeleportDto { /** Google place id for a city */ placeId: string }

// ---------- common ----------
export interface MinAppVersionDto { ios: string; android: string }
export interface AppConfigDto {
  termsVersion: string; termsUrl: string; privacyUrl: string; faqUrl: string; supportEmail: string;
  /** older builds should prompt to update */ minAppVersion: MinAppVersionDto;
}
export interface JoinWaitlistDto {
  /** ≤ 254 */ email: string;
  /** as typed, 1–80 */ city: string;
  /** ISO 3166-1 alpha-2 */ countryCode: string;
  /** must be true */ consent: boolean;
  /** grecaptcha.enterprise.getResponse(); once, 2 minutes; ≤ 4096 */ captchaToken: string;
  /** honeypot: send empty; ≤ 200 */ website?: string;
}
export interface WaitlistTokenDto { /** ≤ 200 */ token: string }

// ---------- profiles / blocking ----------
export interface PublicProfileDto {
  id: string;
  handle: string | null;
  /** first name + last initial */ displayName: string;
  avatarUrl: string | null;
  gender: Gender | null;
  bio: string | null;
  photos: ProfilePhotoDto[];
  /** null also when they hide their place */ homePlace: PlaceRefDto | null;
  /** where they are today, when a trip covers it */ visiting: VisitingDto | null;
  verified: boolean;
  interests: InterestDto[];
  extras: ProfileExtrasDto | null;
  /** in their order */ favouriteDestinations: PlaceRefDto[];
  openToMeetToday: boolean;
  /** GET /users/{id}/plans lists them */ sharePlans: boolean;
  memberSince: string;
  blockedByMe: boolean;
}
export interface HandleAvailabilityDto { available: boolean; /** null when available */ reason?: 'taken' | 'reserved' | 'format' | null }
/** most recent first; someone who blocked you is left out */
export type BlockedUsersPageDto = Page<PublicProfileDto>;
export interface ReportUserDto { reason: ReportReason; details?: string }
export interface ReportCreatedDto { id: string }
```

> Removed from the schemas since 3 Nov: `CityRefDto`, `CityDto`, `CityResolveDto`, `OAuthLinkDto`, `PostCostSplitDto`, `JoinMode`, `CitySource`. Renamed: `homeCity` → `homePlace`, `favouriteCities` → `favouriteDestinations`, `extras.favouriteCityIds` → `extras.favouriteDestinationIds`, `homeCityId` → `homePlaceId`, `TeleportDto.cityId` → `placeId`, feed/map/search `city`/`citySource` → `origin`/`originSource`, `VisitingDto.city` → `place`. `PostCardDto.city` is gone; use `localityLabel`.

---

## 7. Implementation guidance for the RN/Expo client

1. **One API module.**
   - One HTTP client holds the base URL (from `EXPO_PUBLIC_API_URL`), JSON and multipart helpers, the auth header, and parsing of `ErrorResponseDto` into a typed `ApiError { status, code, message, errors, details, requestId }`.
   - Keep the `ErrorCode` list in step with §6; an unknown code falls back by status.
   - Screens never call `fetch` directly.
2. **Token refresh:**
   - On 401 from a bearer call, run **one** shared refresh promise, then retry the original request once.
   - Never retry a refresh with the same refresh token after a timeout: sign in again.
   - If refresh fails, clear secure storage, `queryClient.clear()`, and route to sign-in.
   - Refresh proactively when `accessExpiresAt` is under 60 s away.
3. **Feature folders:** one API module per area, each exporting typed functions plus TanStack Query hooks: auth, account (me, sessions, identities, reports, export, photos), trusted person, settings, notifications, posts (incl. save), rsvp, comments, chat, feed (feed, map), search, subscription (incl. teleport), profiles.
4. **Places:** one place-picker built on the Google Places SDK, returning `{ placeId, label }`, used by onboarding (home place, favourite destinations), the create wizard (venue/destination) and teleport. Restrict home place, favourite destinations and teleport to cities.
5. **Query keys** (central factory):
   - `['me']`, `['settings']`, `['subscription']`, `['notifications', unread]`, `['feed', type, originKey]`, `['mapPins', bbox, type, q]`, `['post', id]`, `['comments', postId]`, `['replies', postId, commentId]`, `['attendees', postId, state]`, `['myRsvps', state]`, `['saved', type]`, `['myPosts', status]`, `['attended']`, `['conversations', tab, search]`, `['conversationsUnread']`, `['conversation', id]`, `['messages', id]`, `['searchPosts', q, interestIds, type]`, `['searchPeople', q]`, `['profile', id]`, `['userPosts', id]`, `['userPlans', id]`, `['blocks']`, `['myReports']`, `['trustedPerson']`, `['trustedBy']`, `['trustedPlans', linkId]`, `['interests']`, `['appConfig']`.
   - Invalidate `['me']` after any `/me` mutation that returns `MeDto`, or use `setQueryData` with the returned object. Invalidate `['feed']`, `['mapPins']` and `['searchPosts']` after teleporting or returning home.
6. **Optimistic RSVP and save:**
   - Update `rsvpState`/`goingCount` (or `saved`) on the card and detail caches.
   - Reconcile with the `RsvpStateDto` response and with the socket event `rsvp.update`.
   - Roll back on error.
7. **Socket (§2.20):** one connection to `https://<ws host>/chat` (dev: `dev-ws.ajalatrvl.com`; make the host its own setting, not derived from the API URL) with `transports: ['websocket']` and `auth: { token }`. Handle `session.expiring` (refresh, set `socket.auth.token`, reconnect), `server.restart`, `connect_error` by `error.data.code`, and `io server disconnect` (no auto-reconnect). Route `message.new`, `read.update`, `typing`, `rsvp.update` into the query cache. `message.new` has no `mine`: compare `sender.id` with the signed-in user's id. Refetch the open thread and the list after any reconnect.
8. **Chat sending:** generate `clientMsgId` (uuid) before the first attempt and reuse it on retries; show the message optimistically keyed by it.
9. **Location header:** a small hook supplies `X-Client-Location` when permission is granted. Without permission and without a teleport, the feed, map and search answer 404 `NO_LOCATION`: show a "turn on location" state, not an error. Include a rounded location (e.g. 3 decimals) in the feed query key.
10. **Uploads:**
    - Resize and compress before sending (target ≤ 2 MB, long edge ≤ 2048 px).
    - Build `FormData` with `{ uri, name, type }`.
    - Do **not** set the `Content-Type` header manually; let fetch add the boundary.
    - Treat 503 as "busy, retry in a moment".
11. **Push:** register the **Firebase** token (FCM on both platforms) with `POST /me/devices`; route taps by `data.kind` (§2.17) and chat pushes to the conversation.
12. **Never trust the client for identity:** the server derives the user from the token. Don't send `userId` for `/me` routes.
13. **Analytics:** respect `analyticsOptOut`. Sanitize route params before sending events.
14. **Every screen handles loading, error (with `requestId` in a "copy details" action), empty and success states.**

---

## 8. Open questions for the backend (what Swagger still leaves unclear, 9 Nov 2026)

1. **`MeDto.teleport` shape:** Swagger types it as `TeleportDto`, which is the request body `{ placeId }`, so it has no label. The backend answers (B1) said `{ city }`. Is it `{ placeId }` only (the app then needs the Places SDK or the feed's `origin.label` to name it), or a `PlaceRefDto`?
2. **Places on the client:** there is no place search, resolve or details endpoint. Confirm the app must use the Google Places SDK with its own key for home place, favourite destinations, the post place and teleport. Is a non-city in `favouriteDestinationIds` a 400 like `homePlaceId` and teleport?
3. **Current location → home place:** onboarding used `GET /cities/resolve`. What should "detect my city" use now (Places/Geocoding on the phone)?
4. **No home-place fallback:** the feed, map and search answer 404 `NO_LOCATION` without a header or teleport, so `homePlace` no longer centres anything. Is that intended for people who deny location (they see nothing until they teleport, which needs Travel)?
5. **`rsvp.update` on the socket:** the RSVP description still promises it on `/chat`, but the socket's "What the server sends" table lists only `message.new`, `read.update`, `typing`, `session.expiring`, `server.restart`. Is it still sent?
6. **Socket host per environment:** only the dev socket (`dev-ws.ajalatrvl.com`) is named. What are the staging and production hosts?
7. **Chat push payload:** `NotificationDto` no longer has `new_message`, and Swagger does not document what a chat push carries. Confirm `{ kind: 'chat.message', conversationId }` (backend answers B6) is still the payload.
8. **`MeDto.status: 'pending'`:** new enum value with no description. When is an account `pending`, and what should the app do?
9. **`GET /me/trusted-person` with nobody:** "the body is empty" on a 200. Is that a zero-length body, `null`, or `{}`? (A 204 would be clearer.)
10. **`PUT /me/trusted-person` 403 `FORBIDDEN`:** "my messages are restricted". Does that mean `dmPermission: shared_only` on my side, a moderation restriction, or something else?
11. **Reports and blocks on yourself:** the examples show 400 `VALIDATION_FAILED` for both "my own post/person/comment" and "'other' with nothing written". Is there a field in `errors[]` to tell them apart, or a distinct code?
12. **Clearing a draft's place:** `UpdatePostDto.lat`/`lng` are no longer nullable and `placeId` cannot be null. Can a draft drop its place, or only move it?
13. **Pins and the bbox for subscribers:** 20° for a subscriber; is the width check on longitude only ("5 degrees wide"), or on both sides?
14. **`X-Client-Location` on `GET /me/attended`:** not listed (it is on `/me/rsvps`, `/me/saved` and the `/users/{id}` lists), so `distanceKm` there is always null. Intended?
15. **Push token on iOS:** `RegisterDeviceDto.token` is "the push token from Firebase". Is a raw APNs token rejected or silently undeliverable? (The app needs the Firebase Messaging SDK on iOS either way.)
16. **`LoginDto.otpCode` and `ReauthDto.code` / `ConfirmChangeDto.code`** have no pattern in Swagger (OTP verify and password verify do: `^\d{6}$`). Are they also exactly six digits?
