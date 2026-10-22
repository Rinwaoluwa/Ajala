# Ajala API — User & Common endpoints (client integration spec)

> **For Claude Code.** This is the contract for the mobile app's API layer. It covers every endpoint tagged **User** and **Common** in the Ajala API OpenAPI spec (Swagger at `https://dev-api.ajalatrvl.com/api/v1/docs`). It does not cover **Admin**.
> - Treat the types in §6 as the source of truth for request and response shapes.
> - Branch on `ErrorResponseDto.code`, never on `message`.
> - Where this file and the live Swagger disagree, Swagger wins. Flag the difference rather than guessing.

---

## 1. Basics

| Item | Value |
|---|---|
| Base URL (dev) | `https://dev-api.ajalatrvl.com` |
| API prefix | `/api/v1` (deep-link files sit at the domain root under `/.well-known/`) |
| Auth | `Authorization: Bearer <accessToken>` on every endpoint marked **bearer** |
| Body format | JSON (`application/json`), except uploads, which are `multipart/form-data` |
| Dates | Calendar dates are `YYYY-MM-DD` (`dob`, `arrivesOn`, `leavesOn`). Instants are ISO 8601 UTC strings (`startAt`, `createdAt`, `accessExpiresAt`) |
| Ids | UUID strings |
| Location header | `X-Client-Location: <lat>,<lng>`. Optional on the feed, map, explore, post detail and profile post lists. A malformed value is ignored, not rejected |

### 1.1 Tokens and sessions
- **Access token:**
  - lives 15 minutes; expiry in `accessExpiresAt`;
  - sent as the Bearer header.
- **Refresh token:**
  - single use: `POST /auth/refresh` returns a new pair and voids the old refresh token;
  - **reusing a used refresh token revokes the whole session**, so concurrent refreshes will log the user out;
  - the client must run refresh **single-flight**: one in-flight refresh promise that every caller awaits.
- **Session id:** `sessionId` identifies the device session; it matches `GET /me/sessions`.
- **Device id:**
  - send a stable per-install `deviceId` (and an optional `deviceName`) on every auth call;
  - the same `deviceId` replaces its previous session instead of piling up sessions.
- **Storage:** keep tokens in `expo-secure-store`, never AsyncStorage.

### 1.2 Error envelope (every 4xx/5xx with a body)
```ts
interface ErrorResponseDto {
  code: ErrorCode;                    // branch on this
  message: string;                    // human text; do not parse
  errors?: { field: string; message: string }[]; // with VALIDATION_FAILED
  details?: Record<string, unknown>;  // e.g. { challengeId } or { retryAfter } or { resetsAt }
  requestId: string | null;           // show/log it for support
}
```
For the full `ErrorCode` union and how to handle each code, see §5.

### 1.3 Pagination (cursor)
- **Query params:**
  - `cursor`: opaque; omit it for the first page.
  - `limit`: default 20 (cities default 10).
- **Response:** `{ items, nextCursor }`, where `nextCursor: null` means the last page.
- **Order is stable while paging.** Use TanStack Query `useInfiniteQuery` with `getNextPageParam: (p) => p.nextCursor ?? undefined`.

### 1.4 Uploads (avatar, gallery photos, verification selfie, post images)
- **Request:**
  - `multipart/form-data`;
  - the field is `file`, except for post images, which use `images` (repeated, in carousel order).
- **Accepted files:**
  - JPEG, PNG or WebP, **≤ 5 MB each**;
  - the type is detected from the bytes, not the extension or mime.
- **Before upload:** resize and compress on the device (e.g. `expo-image-manipulator`), because phone photos are often over 5 MB.
- **Error codes:**
  - `400`: no file;
  - `413`: too large;
  - `415`: not an accepted image.
- **After upload:**
  - the server re-encodes the image and strips location metadata;
  - a new image always gets a new URL, so caching by URL is safe;
  - returned URLs are public and cacheable and need no token.

### 1.5 Money
- **Request side:**
  - send `priceCents` (in the smallest unit: cents, kobo, yen) plus `currency` (ISO 4217, capital letters);
  - omit both fields for a free post.
- **Response side:**
  - `price` is `{ amountCents, currency, exponent, tier }`, or `null` when the post is free;
  - display amount = `amountCents / 10 ** exponent`;
  - `tier` is only set for NGN, USD and CAD.

---

## 2. Flows to implement (read before coding screens)

### 2.1 App bootstrap
1. `GET /api/v1/app/config` (no auth) returns `termsVersion`, the terms/privacy/FAQ URLs, `supportEmail` and `minAppVersion { ios, android }`.
2. If the installed build is older than `minAppVersion`, show a forced-update prompt.
3. Keep `termsVersion`: sign-up and `POST /me/terms/accept` need it.
4. If signed in, call `GET /me`:
   - `termsUpToDate === false`: show the updated terms, then `POST /me/terms/accept { version }`.
   - `profileCompletedAt === null`: route to onboarding (see §2.4).

### 2.2 Email sign-up and sign-in
- **Sign-up:**
  1. `POST /auth/signup/email` with `{ email, password, firstName, lastName, dob, termsVersion, timezone? }`. Always answers **202**, so the UI should not reveal whether the email exists. A breached password returns 400 `PASSWORD_BREACHED`.
  2. `POST /auth/otp/verify` with `{ target: email, code (6 digits), password, deviceId, deviceName, timezone }`. **The password is required when the code completes a sign-up.** Without it, or with the wrong one, the answer is the same 401 as a wrong code. The 200 answer is `OtpSignInDto` (tokens + `user: MeDto` + `isNew`).
  3. Resend with `POST /auth/otp/resend { target }`. Always 202; show a cooldown timer client-side.
- **Login:** `POST /auth/login { email, password, deviceId, deviceName }` returns `TokenPairDto`. There is no `user` in it, so call `GET /me` next. Possible errors:
  - `401`: wrong credentials or a locked account.
  - `403 EMAIL_NOT_VERIFIED`: a code was re-sent. Go to the OTP screen, then verify. No password is needed here, because the account already exists.
  - `403 STEP_UP_REQUIRED`: a code was emailed. Ask for it and retry the **same** login call with `otpCode`.
- **Forgot password:**
  1. `POST /auth/password/forgot { email }`. Always 202.
  2. The deep link carries a token. Call `POST /auth/password/reset { token, newPassword }`, which returns 204 and signs out every device.
- **Sign out:**
  - **this device:** `POST /auth/logout` (bearer, 204). Also call `POST /me/devices/unregister { token: pushToken }` **before** logging out, then clear local tokens and the query cache.
  - **everywhere:** `POST /auth/logout/all`.

### 2.3 Google and Apple sign-in, and account linking
1. Generate a random `nonce` (16–256 chars) per attempt and pass it to the provider SDK; Apple gets its SHA-256.
2. Call the matching endpoint:
   - **Google:** `POST /auth/oauth/google { idToken, nonce, deviceId, deviceName, timezone, termsVersion }`.
   - **Apple:** `POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, ... }`. Apple sends the name only on the first authorisation, so forward it when present.
3. Handle the answer:
   - **200:** `OtpSignInDto`; the user is signed in (or signed up).
   - **409 `ACCOUNT_LINK_REQUIRED`:** the email belongs to an existing account. Read `details.challengeId` (one use, 10 minutes); a code was emailed to that account. Show a code screen, then `POST /auth/oauth/link { challengeId, code, deviceId }` → 200 `OtpSignInDto`.
     - A 401 means the challenge is unknown or the code is bad, expired or used. Restart the provider sign-in.
   - **401:** the token was rejected, the nonce was replayed, or the account is suspended.

### 2.4 Onboarding gate
- `profileCompletedAt` stays null until `firstName`, `lastName`, `dob` and `gender` are all set.
  - Gender is never collected at sign-up, so every new user goes through onboarding.
- Onboarding = `PATCH /me` with the missing fields, plus optional `handle`, `homeCityId`, `interestIds` (3–8) and `extras`. The server stamps `profileCompletedAt` itself; there is **no** "finish onboarding" call.
- **Handle:**
  - live-check with `GET /handles/availability?handle=`, which returns `{ available, reason?: 'taken' | 'reserved' | 'format' }`;
  - 3–20 chars of letters, digits, `.` and `_`;
  - can change once every 30 days (409 `HANDLE_COOLDOWN`).
- **Home city:**
  - on first launch, suggest it with `GET /cities/resolve?lat=&lng=` (returns the nearest city and `distanceKm`);
  - search with `GET /cities?q=&limit=`.
- **Interests:** pick from `GET /interests`.

### 2.5 Re-authentication (sensitive actions)
- Some actions answer **403 `REAUTH_REQUIRED`**: deleting the account, setting a password, changing email, and the data export.
- To open the re-auth window:
  - an account with a password: `POST /me/reauth { password }` → 204;
  - a Google/Apple-only account: `POST /me/reauth/code` (202, emails a code), then `POST /me/reauth { code }` → 204.
- After that, **retry the original request**. Build this as a reusable "confirm it's you" sheet that wraps the action.

### 2.6 Account management
| Action | Call | Notes |
|---|---|---|
| Change password | `POST /me/password { currentPassword, newPassword }` | 204; other devices signed out; 401 wrong current; 400 breached |
| Set first password (social accounts) | `POST /me/password/set { newPassword }` | 403 re-auth or no verified email; 409 already has one |
| Change email | `POST /me/email/change { newEmail }` then `POST /me/email/change/confirm { code }` | Code goes to the new address; 409 if someone else verified it meanwhile |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/{id}` | `current: true` marks this device; hide "sign out" for it or route it to logout |
| Delete account | `DELETE /me { reason? }` | 202 `{ purgeAt }`; 14-day grace; all devices signed out; signing in again cancels. Purge local state |
| Data export | `POST /me/export` then `GET /me/export` | One per day; link emailed; `downloadUrl` valid 24 h, null while building/expired |

### 2.7 Profile media
- **Avatar:**
  - `POST /me/avatar` (field `file`) returns `{ avatarUrl }` (a 200 px square);
  - `DELETE /me/avatar` → 204.
- **Gallery** (max 6 photos, separate from the avatar):
  - `POST /me/photos` (field `file`) returns 201 `ProfilePhotoDto { id, url (1280px), thumbUrl (400px), position }`;
  - a 7th photo returns 409, so show the count (n/6);
  - `PUT /me/photos/order { ids: [...] }` takes **every** photo id in the new order (400 if the set doesn't match exactly);
  - `DELETE /me/photos/{photoId}` → 204, and the gap closes.

### 2.8 Trips ("visiting")
- **Rules:**
  - up to 5 not-yet-ended trips, each ≤ 90 days and starting ≤ 1 year ahead;
  - trips must not overlap, though leaving one city and arriving in the next on the same day is fine.
- **Calls:** `GET/POST /me/trips`, `PATCH/DELETE /me/trips/{tripId}`.
  - Errors: 400 for an unknown city or invalid dates; 409 for an overlap or being at the limit.
- **Visibility:** others only see the city of today's trip (`visiting`). Dates and future trips are private.

### 2.9 Verified badge
1. Requires an avatar; without one, the request returns 409.
2. `POST /me/verification` (field `file`, a selfie) returns 201 `MyVerificationDto { status: 'pending' }`.
3. Poll `GET /me/verification` (404 means never requested) or wait for the email. Status goes `pending → approved | rejected | expired`.
4. After a rejection, `canReapplyAt` says when a new selfie is accepted (24 h). Submitting sooner returns 409 `VERIFICATION_COOLDOWN` with `details.retryAfter`.
5. Only one request can be open at a time; an already-verified user also gets 409.

### 2.10 Push and devices
- After sign-in, and whenever the FCM token changes: `POST /me/devices { token, platform: 'ios' | 'android', appInstanceId?, timezone?, deviceId }` → 204. It is idempotent.
  - Send the same `deviceId` used at sign-in, so a password change or "sign out everywhere" keeps this phone's pushes.
- On sign-out: `POST /me/devices/unregister { token }` → 204.

### 2.11 Feed, map and explore (city resolution)
- **Header:** send `X-Client-Location: lat,lng` whenever location permission is granted.
- **City fallback:** the server picks the city from (1) the device location, (2) a network guess, or (3) the home city. `citySource: 'device' | 'edge' | 'home'` says which one won.
- **404 `NO_CITY`:** no location, no network guess and no home city. Prompt the user to set a home city.
- **Endpoints:**
  - `GET /feed?type=all|meetup|event|plan|group&cursor&limit` → `FeedPageDto`.
    - Order: soonest first, a lift for the user's interests, then going count.
    - `distanceKm` is null without the header.
  - `GET /map/pins?bbox=west,south,east,north&type=` → up to 500 pins.
    - The bbox must be ≤ 5° wide and not inside out (400 otherwise).
    - Debounce it on map region change.
  - `GET /explore/meetups?interestId=&cursor&limit` → Meetups only; a shared interest counts double.

### 2.12 Posts (Meetup, Event, Plan, Group)
- **Create:** `POST /posts` (`multipart/form-data`).
  - Repeat `interestIds` and `checklist` once per value.
  - Send booleans as the strings `true`/`false`.
  - `images[]`: up to 4.
- **Drafts:**
  - `status: 'draft'` (the default) needs only `type` and `title`;
  - at most 20 drafts;
  - list them with `GET /me/posts?status=draft`.
- **Publish rules** (checked on `status: 'published'` or `POST /posts/{id}/publish`; a 400 lists every failing rule in `errors[]`):
  - `startAt` in the future, a description, 2–4 images, and 1–3 interests;
  - a pin (`lat`/`lng`) for a Meetup or Event;
  - capacity: an Event needs > 100 or no limit, a Group needs 1–100, Meetups and Plans are free to choose;
  - a paid Event needs an `externalUrl` (https);
  - at most 3 Events per host per calendar month; the 4th returns 409 `EVENT_MONTHLY_CAP` with `details.resetsAt`;
  - a suspended account gets 403.
- **Edit:** `PATCH /posts/{id}` (JSON, only changed fields).
  - A live post is re-checked against the publish rules.
  - Its price can't change, though its link can.
  - `lat` and `lng` must be sent together; null on both clears the pin.
  - A post that was taken down or cancelled returns 409.
- **Images:** `PUT /posts/{id}/images` replaces the whole carousel; a live post keeps 2–4.
- **Delete:** `DELETE /posts/{id}` works only for drafts and posts nobody has joined.
  - 409 `POST_HAS_ATTENDEES`: cancel it instead.
- **Cancel:** `POST /posts/{id}/cancel` is final.
  - Attendees and the waitlist get a push.
  - The post stays readable with `status: 'cancelled'`.
  - 409 for a draft, an already-cancelled post, or one that has already started.
- **External link:** call `POST /posts/{id}/link-click` whenever the app opens `externalUrl` (counted once per person; the host sees `linkClickCount`).
- **Plan checklist:**
  - `PUT /posts/{id}/checklist { items: [{ id?, text }] }` (≤ 30 lines). Keep `id` on existing lines so ticks survive.
  - `PATCH /posts/{id}/checklist/{itemId} { checked }` can be called by the host and by attendees who are going (`canTickChecklist`).
- **Report:** `POST /posts/{id}/report { reason, details? }`.
  - `reason: 'other'` needs `details`.
  - 409 if an open report already exists; 400 when reporting your own post.

### 2.13 RSVP button state machine
`rsvpState` on every card drives the single button:

| `rsvpState` | Button |
|---|---|
| `none` | **Join** |
| `requested` | **Requested** |
| `going` | **Going** |
| `waitlisted` | **Waitlisted** (`waitlistPosition`, 1 = next) |
| `declined`, `removed` | hide the button |

- **`joinMode`:**
  - `'external'` (a paid Event): the button opens `externalUrl`, then calls `link-click`. Never RSVP; that answers 409 `EXTERNAL_BOOKING`.
  - `'rsvp'`: call `POST /posts/{id}/rsvp`, opening `externalUrl` first when one exists.
- **Join:** `POST /posts/{id}/rsvp` returns `RsvpStateDto`.
  - An open post answers `going`, or `waitlisted` when it is full.
  - A private post answers `requested`.
  - It is idempotent.
  - 409 when the post is full with no waitlist (`POST_FULL`), has started (`POST_STARTED`), is the user's own post, or the host declined the user.
- **Leave:** `DELETE /posts/{id}/rsvp` → 204, even if there was nothing to leave.
- **Realtime:** the socket event `rsvp.update { postId, state, goingCount }` arrives on the `/chat` namespace after any change to the user's own state.
  - Use it to settle optimistic updates.
- **Host tools:**
  - `GET /posts/{id}/attendees?state=going|requested|waitlisted`; `requested` and `waitlisted` are host-only (403 otherwise).
  - `POST /posts/{id}/attendees/{userId}/accept | decline | remove`. Decline and remove are final.

### 2.14 Other people, blocking and reporting
- **Profiles:**
  - `GET /users/{userId}` or `GET /users/handle/{handle}` → `PublicProfileDto`;
  - `displayName` is the first name plus last initial;
  - `ageBand` is only present when the person chose to show it.
- **Their posts:**
  - `GET /users/{userId}/posts` lists the posts they host, latest date first;
  - `GET /users/{userId}/attended` lists past posts they went to.
- **Your own posts:**
  - `GET /me/posts?status=draft|published` lists your posts;
  - `GET /me/attended` lists past posts you went to.
- **Block:**
  - `POST /users/{userId}/block` → 204 (400 for your own id);
  - `DELETE /users/{userId}/block` → 204;
  - `GET /me/blocks` → paged `PublicProfileDto[]`;
  - `blockedByMe` on a profile says whether you blocked them.
- **Report:** `POST /users/{userId}/report { reason, details? }` → 202 `{ id }`.
  - 409 if an open report on that person already exists.

### 2.15 Settings
- **Read:** `GET /me/settings` returns `UserSettingsDto` (defaults if the user never changed anything).
- **Update:** `PATCH /me/settings` takes only the changed fields and returns the full object. Update it optimistically.
- **Analytics opt-out:** `PATCH /me/analytics { enabled }`.
  - It is not part of `UpdateUserSettingsDto`.
  - Also gate the client analytics SDK on it.

---

## 3. Endpoint reference

Auth column: **none** = public; **bearer** = needs an access token. Every bearer endpoint can also answer `401 UNAUTHORIZED`; refresh once, then sign out.

### 3.1 Common — Health, App, Deep links
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/health` | none | — | 200 DB + Redis reachable | 503 dependency down (body names it) |
| GET | `/api/v1/health/live` | none | — | 200 process alive | — |
| GET | `/api/v1/app/config` | none | — | 200 `AppConfigDto` | — |
| GET | `/.well-known/apple-app-site-association` | none | — | 200 AASA JSON (universal links) | — |
| GET | `/.well-known/assetlinks.json` | none | — | 200 Android app-links JSON array | — |

The client never calls the deep-link files. They matter for configuring universal and app links (`associatedDomains` / `intentFilters` in `app.json`) for the paths they allow.

### 3.2 Auth
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/signup/email` | none | `SignupEmailDto` | 202 (no body) | 400 invalid / terms version / breached password |
| POST | `/api/v1/auth/otp/verify` | none | `OtpVerifyDto` | 200 `OtpSignInDto` | 401 wrong/expired/used code (or missing/wrong sign-up password) |
| POST | `/api/v1/auth/otp/resend` | none | `OtpTargetDto` | 202 | — |
| POST | `/api/v1/auth/login` | none | `LoginDto` | 200 `TokenPairDto` | 401 bad credentials/locked; 403 `EMAIL_NOT_VERIFIED` or `STEP_UP_REQUIRED` |
| POST | `/api/v1/auth/refresh` | none | `RefreshDto` | 200 `TokenPairDto` | 401 unknown/expired/revoked/reused (reuse revokes session) |
| POST | `/api/v1/auth/oauth/google` | none | `GoogleSignInDto` | 200 `OtpSignInDto` | 401 rejected/nonce replay/suspended; 409 `ACCOUNT_LINK_REQUIRED` |
| POST | `/api/v1/auth/oauth/apple` | none | `AppleSignInDto` | 200 `OtpSignInDto` | 401; 409 `ACCOUNT_LINK_REQUIRED` |
| POST | `/api/v1/auth/oauth/link` | none | `OAuthLinkDto` | 200 `OtpSignInDto` | 401 bad challenge/code |
| POST | `/api/v1/auth/password/forgot` | none | `ForgotPasswordDto` | 202 | — |
| POST | `/api/v1/auth/password/reset` | none | `ResetPasswordDto` | 204 (all devices signed out) | 400 breached; 401 link expired/used |
| POST | `/api/v1/auth/logout` | bearer | — | 204 | — |
| POST | `/api/v1/auth/logout/all` | bearer | — | 204 | — |

### 3.3 Cities and Interests
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/cities` | bearer | query `q` (required), `limit` (default 10) | 200 `CityDto[]` (closest match first) | — |
| GET | `/api/v1/cities/resolve` | bearer | query `lat`, `lng` (required) | 200 `CityResolveDto` | 404 city list empty |
| GET | `/api/v1/cities/{cityId}` | bearer | path `cityId` | 200 `CityDto` | 404 |
| GET | `/api/v1/interests` | bearer | — | 200 `InterestDto[]` (display order) | — |

### 3.4 Account (`/me`)
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me` | bearer | — | 200 `MeDto` | — |
| PATCH | `/api/v1/me` | bearer | `UpdateProfileDto` | 200 `MeDto` | 400 unknown city / inactive interest / bad handle; 409 handle taken or `HANDLE_COOLDOWN` |
| DELETE | `/api/v1/me` | bearer | `DeleteAccountDto` | 202 `DeletionScheduledDto` | 403 `REAUTH_REQUIRED` |
| POST | `/api/v1/me/avatar` | bearer | multipart `file` | 200 `AvatarDto` | 400, 413, 415 |
| DELETE | `/api/v1/me/avatar` | bearer | — | 204 | — |
| POST | `/api/v1/me/terms/accept` | bearer | `AcceptTermsDto` | 204 | 400 not current version |
| GET | `/api/v1/me/sessions` | bearer | — | 200 `SessionDto[]` | — |
| DELETE | `/api/v1/me/sessions/{sessionId}` | bearer | path `sessionId` | 204 | 404 |
| POST | `/api/v1/me/reauth` | bearer | `ReauthDto` (password **or** code) | 204 (re-auth window open) | 401 |
| POST | `/api/v1/me/reauth/code` | bearer | — | 202 | — |
| POST | `/api/v1/me/password/set` | bearer | `SetPasswordDto` | 204 | 403 re-auth / no verified email; 409 already has password |
| POST | `/api/v1/me/email/change` | bearer | `ChangeEmailDto` | 202 | 403 `REAUTH_REQUIRED` |
| POST | `/api/v1/me/email/change/confirm` | bearer | `ConfirmChangeDto` | 204 (other devices signed out) | 401 no change pending / bad code; 409 email taken meanwhile |
| POST | `/api/v1/me/password` | bearer | `ChangePasswordDto` | 204 (other devices signed out) | 400 breached; 401 current wrong |
| POST | `/api/v1/me/photos` | bearer | multipart `file` | 201 `ProfilePhotoDto` | 400; 409 gallery full (6); 413; 415 |
| PUT | `/api/v1/me/photos/order` | bearer | `ReorderPhotosDto` | 200 `ProfilePhotoDto[]` | 400 ids ≠ exactly my photos |
| DELETE | `/api/v1/me/photos/{photoId}` | bearer | path | 204 | 404 |
| GET | `/api/v1/me/trips` | bearer | — | 200 `TripDto[]` (not ended, earliest first) | — |
| POST | `/api/v1/me/trips` | bearer | `CreateTripDto` | 201 `TripDto` | 400 city/dates; 409 overlap or limit (5) |
| PATCH | `/api/v1/me/trips/{tripId}` | bearer | `UpdateTripDto` | 200 `TripDto` | 400; 404; 409 overlap |
| DELETE | `/api/v1/me/trips/{tripId}` | bearer | path | 204 | 404 |
| POST | `/api/v1/me/verification` | bearer | multipart `file` (selfie) | 201 `MyVerificationDto` | 400; 409 (cooldown / no avatar / pending / already verified); 413; 415 |
| GET | `/api/v1/me/verification` | bearer | — | 200 `MyVerificationDto` | 404 never requested |
| POST | `/api/v1/me/export` | bearer | — | 202 `DataExportDto` | 403 re-auth / verify email; 409 one in progress or < 1 day ago |
| GET | `/api/v1/me/export` | bearer | — | 200 `DataExportDto` (fresh link if file still exists) | 403 re-auth; 404 never requested |

### 3.5 Settings and Devices
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/settings` | bearer | — | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/settings` | bearer | `UpdateUserSettingsDto` | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/analytics` | bearer | `AnalyticsOptDto` | 200 `UserSettingsDto` | — |
| POST | `/api/v1/me/devices` | bearer | `RegisterDeviceDto` | 204 (register or refresh) | — |
| POST | `/api/v1/me/devices/unregister` | bearer | `UnregisterDeviceDto` | 204 | — |

### 3.6 Posts
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/posts` | bearer | query `status` = `draft` \| `published` (default published; includes taken down/cancelled), `cursor`, `limit` | 200 `MyPostsPageDto` (newest first) | — |
| GET | `/api/v1/me/attended` | bearer | `cursor`, `limit` | 200 `HostedPostsPageDto` | — |
| POST | `/api/v1/posts` | bearer | multipart `CreatePostDto` (+ `images[]`) | 201 `PostDetailDto` | 400 field/publish rules; 403 suspended; 409 20 drafts or `EVENT_MONTHLY_CAP`; 413; 415 |
| GET | `/api/v1/posts/{postId}` | bearer | path; header `X-Client-Location` | 200 `PostDetailDto` | 404 |
| PATCH | `/api/v1/posts/{postId}` | bearer | `UpdatePostDto` | 200 `PostDetailDto` | 400; 404 not mine; 409 taken down/cancelled |
| DELETE | `/api/v1/posts/{postId}` | bearer | path | 204 | 404; 409 has attendees / taken down / cancelled |
| POST | `/api/v1/posts/{postId}/publish` | bearer | — | 200 `PostDetailDto` | 400 (one entry per failing rule); 403; 404; 409 already live / monthly cap |
| PUT | `/api/v1/posts/{postId}/images` | bearer | multipart `images[]` (whole carousel) | 200 `PostDetailDto` | 400 count; 404; 409; 413; 415 |
| POST | `/api/v1/posts/{postId}/cancel` | bearer | — | 200 `PostDetailDto` (`status: cancelled`) | 404; 409 draft / already cancelled / started |
| POST | `/api/v1/posts/{postId}/link-click` | bearer | — | 204 | 404; 409 no link or not live |
| PUT | `/api/v1/posts/{postId}/checklist` | bearer | `ReplaceChecklistDto` | 200 `ChecklistItemDto[]` | 400 not a Plan / > 30; 404; 409 |
| PATCH | `/api/v1/posts/{postId}/checklist/{itemId}` | bearer | `SetCheckedDto` | 200 `ChecklistItemDto` | 404 |
| POST | `/api/v1/posts/{postId}/report` | bearer | `ReportPostDto` | 202 `ReportFiledDto` | 400 own post / "other" w/o details; 404; 409 open report exists |

### 3.7 RSVP and Attendees
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/posts/{postId}/rsvp` | bearer | — | 200 `RsvpStateDto` | 404; 409 `POST_FULL` / `POST_STARTED` / `EXTERNAL_BOOKING` / own post / declined |
| DELETE | `/api/v1/posts/{postId}/rsvp` | bearer | — | 204 | — |
| GET | `/api/v1/posts/{postId}/attendees` | bearer | query `state` = `going` (default) \| `requested` \| `waitlisted`, `cursor`, `limit` | 200 `AttendeesPageDto` | 403 list not allowed; 404 |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/accept` | bearer (host) | — | 200 `RsvpStateDto` (going or waitlisted) | 404; 409 full w/o waitlist / not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/decline` | bearer (host) | — | 200 `RsvpStateDto` (declined, final) | 404; 409 not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/remove` | bearer (host) | — | 200 `RsvpStateDto` (removed) | 404; 409 not live |

### 3.8 Feed, Map, Explore
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/feed` | bearer | `type` = all\|meetup\|event\|plan\|group (default all), `cursor`, `limit`; header `X-Client-Location` | 200 `FeedPageDto` | 404 `NO_CITY` |
| GET | `/api/v1/map/pins` | bearer | `bbox` = `west,south,east,north` (required, ≤ 5° wide), `type`; header | 200 `MapPinsDto` (≤ 500 pins) | 400 bad bbox; 404 `NO_CITY` |
| GET | `/api/v1/explore/meetups` | bearer | `interestId?`, `cursor`, `limit`; header | 200 `FeedPageDto` | 404 `NO_CITY` |

### 3.9 Profiles, Handles and Blocking
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/users/handle/{handle}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}/posts` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/users/{userId}/attended` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/handles/availability` | bearer | query `handle` | 200 `HandleAvailabilityDto` | — |
| POST | `/api/v1/users/{userId}/block` | bearer | path | 204 | 400 own id; 404 |
| DELETE | `/api/v1/users/{userId}/block` | bearer | path | 204 (idempotent) | 400 own id |
| GET | `/api/v1/me/blocks` | bearer | `cursor`, `limit` | 200 `BlockedUsersPageDto` | — |
| POST | `/api/v1/users/{userId}/report` | bearer | `ReportUserDto` | 202 `ReportCreatedDto` | 400; 404; 409 open report exists |

---

## 4. Field limits (validate client-side to avoid round trips)

| DTO | Field limits |
|---|---|
| `SignupEmailDto` | `email` ≤ 320 · `password` 8–128 (at least one uppercase letter + one digit) · `firstName`/`lastName` 1–60 · `dob` YYYY-MM-DD · `termsVersion` ≤ 16 · `timezone` ≤ 64 (IANA) |
| `OtpVerifyDto` | `code` matches `^\d{6}$` · `target` ≤ 320 · `password` ≤ 128 · `deviceId` ≤ 128 · `deviceName` ≤ 120 |
| `LoginDto` | `email` ≤ 320 · `password` ≤ 128 · `otpCode` 6 digits |
| `GoogleSignInDto` / `AppleSignInDto` | `nonce` 16–256 · `termsVersion` ≤ 16 · Apple `firstName`/`lastName` ≤ 60 |
| `ResetPasswordDto` / `SetPasswordDto` / `ChangePasswordDto` | `newPassword` 8–128 (at least one uppercase letter + one digit) · `currentPassword` ≤ 128 |
| `UpdateProfileDto` | `firstName`/`lastName` 1–60 · `handle` 3–20 (letters, digits, `.` `_`; change once per 30 days) · `bio` ≤ 160 · `timezone` ≤ 64 · `interestIds` 3–8 active ids |
| `ProfileExtrasDto` | `languages` ISO 639-1 codes · `lookingTo` ≤ 4 values · `pronouns` ≤ 20 · `tagline` ≤ 60 · `socialLinks.website` ≤ 200 |
| `DeleteAccountDto` | `reason` ≤ 500 |
| `AcceptTermsDto` | `version` ≤ 40 |
| `ChangeEmailDto` | `newEmail` ≤ 320 |
| `RegisterDeviceDto` | `token` ≤ 512 · `appInstanceId` ≤ 64 · `timezone` ≤ 64 · `deviceId` ≤ 128 |
| `CreatePostDto` / `UpdatePostDto` | `title` ≤ 80 · `description` ≤ 1000 · `placeName` ≤ 200 · `capacity` 1–100000 · `priceCents` 1–100000000 · `currency` exactly 3 letters · `externalUrl` ≤ 2048 (https) · images ≤ 4 · `interestIds` 1–3 · `checklist` ≤ 30 lines · defaults `visibility: open`, `showOnMap: true`, `status: draft` |
| `ChecklistItemInputDto` | `text` ≤ 120 |
| `ReportPostDto` / `ReportUserDto` | `details` ≤ 500 (required when `reason: 'other'`) |
| `CreateTripDto` | `leavesOn` ≤ `arrivesOn` + 90 days · `arrivesOn` ≤ 1 year ahead |

---

## 5. Error codes: what the client should do

| `code` | Typical status | Client handling |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Map `errors[].field` onto form fields |
| `BAD_REQUEST` | 400 | Show the message; log `requestId` |
| `PASSWORD_BREACHED` | 400 | Inline: "This password appeared in a data breach — choose another" |
| `UNAUTHORIZED` | 401 | Refresh once (single-flight); if refresh fails, sign out |
| `EMAIL_NOT_VERIFIED` | 403 | Go to the OTP screen (a code was already re-sent) |
| `STEP_UP_REQUIRED` | 403 | Ask for the emailed code; retry the login with `otpCode` |
| `REAUTH_REQUIRED` | 403 | Open the "confirm it's you" sheet (§2.5), then retry |
| `TOTP_REQUIRED` | 403 | Not used by User flows; surface a generic message |
| `FORBIDDEN` | 403 | Hide or disable the action (e.g. a suspended account) |
| `NOT_FOUND` | 404 | Empty or "not available" state; for posts and profiles it may mean blocked or not visible |
| `NO_CITY` | 404 | Ask for location permission or a home city |
| `ACCOUNT_LINK_REQUIRED` | 409 | Link flow with `details.challengeId` (§2.3) |
| `HANDLE_COOLDOWN` | 409 | "You can change your handle again later" |
| `VERIFICATION_COOLDOWN` | 409 | Show `details.retryAfter` |
| `EVENT_MONTHLY_CAP` | 409 | Show `details.resetsAt` |
| `POST_FULL` / `POST_STARTED` / `POST_CANCELLED` / `POST_HAS_ATTENDEES` / `EXTERNAL_BOOKING` | 409 | Refresh the post and show the matching state (for `POST_HAS_ATTENDEES`, offer **Cancel** instead of **Delete**) |
| `CONFLICT` | 409 | Generic conflict: refetch and show the message |
| `GONE` | 410 | Resource no longer exists: refetch the parent list |
| `PAYLOAD_TOO_LARGE` | 413 | "Image must be 5 MB or smaller"; compress more |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | "Use a JPEG, PNG or WebP image" |
| `RATE_LIMITED` | 429 | Back off; disable the button briefly |
| `PAYMENT_REQUIRED` | 402 | Not used by these endpoints yet; generic message |
| `UNPROCESSABLE`, `METHOD_NOT_ALLOWED` | 422 / 405 | Bug: log with `requestId` |
| `SERVICE_UNAVAILABLE`, `INTERNAL` | 503 / 500 | Retry with backoff for GETs; show a retry UI for mutations |

---

## 6. Types (TypeScript, from the OpenAPI schemas)

```ts
// ---------- shared ----------
export type Gender = 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say';
export type PostType = 'meetup' | 'event' | 'plan' | 'group';
export type PostStatus = 'draft' | 'published' | 'taken_down' | 'cancelled';
export type Visibility = 'open' | 'private';
export type RsvpState = 'none' | 'requested' | 'going' | 'waitlisted' | 'declined' | 'removed';
export type JoinMode = 'rsvp' | 'external';
export type CitySource = 'device' | 'edge' | 'home';
export type ReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';

export type ErrorCode =
  | 'VALIDATION_FAILED' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED' | 'CONFLICT' | 'GONE' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE' | 'RATE_LIMITED' | 'PAYMENT_REQUIRED' | 'EMAIL_NOT_VERIFIED' | 'STEP_UP_REQUIRED'
  | 'REAUTH_REQUIRED' | 'PASSWORD_BREACHED' | 'ACCOUNT_LINK_REQUIRED' | 'HANDLE_COOLDOWN'
  | 'VERIFICATION_COOLDOWN' | 'TOTP_REQUIRED' | 'EVENT_MONTHLY_CAP' | 'NO_CITY' | 'POST_FULL'
  | 'POST_STARTED' | 'POST_CANCELLED' | 'POST_HAS_ATTENDEES' | 'EXTERNAL_BOOKING'
  | 'SERVICE_UNAVAILABLE' | 'INTERNAL';

export interface FieldErrorDto { field: string; message: string }
export interface ErrorResponseDto {
  code: ErrorCode;
  message: string;
  errors?: FieldErrorDto[];
  details?: Record<string, unknown>;
  requestId: string | null;
}

export interface Page<T> { items: T[]; nextCursor: string | null }

// ---------- auth ----------
interface DeviceFields {
  /** Stable per-install id; the same id replaces its previous session */
  deviceId?: string;
  deviceName?: string;
}
export interface SignupEmailDto {
  email: string; password: string; firstName: string; lastName: string;
  /** YYYY-MM-DD */ dob: string;
  /** termsVersion from GET /app/config */ termsVersion: string;
  /** IANA */ timezone?: string;
}
export interface OtpVerifyDto extends DeviceFields {
  target: string; code: string;
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
  nonce: string; timezone?: string; termsVersion?: string; idToken: string;
}
export interface AppleSignInDto extends DeviceFields {
  nonce: string; timezone?: string; termsVersion?: string;
  identityToken: string; authorizationCode: string;
  /** Apple sends the name on first authorisation only */ firstName?: string; lastName?: string;
}
export interface OAuthLinkDto extends DeviceFields { challengeId: string; code: string }
export interface ForgotPasswordDto { email: string }
export interface ResetPasswordDto { token: string; newPassword: string }

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

// ---------- cities & interests ----------
export interface CityRefDto { id: string; name: string; countryCode: string; label: string }
export interface CityDto extends CityRefDto {
  /** State/province; '' where none */ region: string;
  countryName: string; timezone: string; lat: number; lng: number;
}
export interface CityResolveDto { city: CityDto; distanceKm: number }
export interface InterestDto { id: string; slug: string; name: string; emoji: string | null }
export interface VisitingDto { city: CityRefDto }

// ---------- account ----------
export interface SocialLinksDto { instagram?: string | null; tiktok?: string | null; website?: string | null }
export type LookingTo =
  | 'meet_locals' | 'meet_travellers' | 'find_travel_buddy'
  | 'host_events' | 'explore_food_nightlife' | 'practise_language';
export interface ProfileExtrasDto {
  /** ISO 639-1 */ languages?: string[];
  /** up to 4 */ lookingTo?: LookingTo[];
  socialLinks?: SocialLinksDto;
  pronouns?: string | null;
  tagline?: string | null;
}
export interface ProfilePhotoDto {
  id: string; /** 1280px */ url: string; /** 400px */ thumbUrl: string; /** from 0 */ position: number;
}
export interface MeIdentityDto { provider: 'email' | 'google' | 'apple'; verifiedAt: string | null }

export interface MeDto {
  id: string;
  status: 'active' | 'suspended' | 'pending_delete';
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  dob: string | null;
  gender: Gender;            // treat as possibly null before onboarding
  email: string | null;
  bio: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  photos: ProfilePhotoDto[];
  homeCity: CityRefDto;      // treat as possibly null before onboarding
  /** The city a trip of mine covers today */
  visiting: VisitingDto;     // treat as possibly null when no trip covers today
  verified: boolean;
  interests: InterestDto[];
  extras: ProfileExtrasDto;
  /** Null until firstName, lastName, dob and gender are set */
  profileCompletedAt: string | null;
  identities: MeIdentityDto[];
  termsVersion: string | null;
  /** False when terms changed and need accepting again */
  termsUpToDate: boolean;
  createdAt: string;
}

export interface UpdateProfileDto {
  firstName?: string; lastName?: string; dob?: string; gender?: Gender;
  handle?: string; bio?: string | null; timezone?: string;
  homeCityId?: string | null;
  /** 3–8 active interests */ interestIds?: string[];
  extras?: ProfileExtrasDto;
}
export interface DeleteAccountDto { reason?: string }
export interface DeletionScheduledDto { /** erase time; signing in before then cancels */ purgeAt: string | null }
export interface AvatarDto { avatarUrl: string | null }
export interface AcceptTermsDto { version: string }
export interface SessionDto {
  id: string; deviceName: string | null; ip: string | null;
  /** approximate 2-letter country */ country: string | null;
  startedAt: string; lastUsedAt: string;
  /** the session making the request */ current: boolean;
}
export interface ReauthDto { password?: string; code?: string }
export interface SetPasswordDto { newPassword: string }
export interface ChangeEmailDto { newEmail: string }
export interface ConfirmChangeDto { code: string }
export interface ChangePasswordDto { currentPassword: string; newPassword: string }
export interface ReorderPhotosDto { /** every photo id, in order */ ids: string[] }

export interface TripDto { id: string; city: CityRefDto; arrivesOn: string; leavesOn: string; createdAt: string }
export interface CreateTripDto { cityId: string; /** YYYY-MM-DD */ arrivesOn: string; /** ≤ 90 days later */ leavesOn: string }
export interface UpdateTripDto { cityId?: string; arrivesOn?: string; leavesOn?: string }

export interface MyVerificationDto {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  submittedAt: string;
  decidedAt: string | null;
  rejectionReason: 'face_not_visible' | 'does_not_match_profile_photo' | 'photo_of_a_photo' | 'not_a_selfie' | 'other'; // null unless rejected
  /** null = may submit now */ canReapplyAt: string | null;
  verified: boolean;
}

export interface DataExportDto {
  id: string;
  status: 'queued' | 'ready' | 'failed';
  requestedAt: string;
  readyAt: string | null;
  expiresAt: string | null;
  /** signed, 24 h; null while building or expired */ downloadUrl: string | null;
}

// ---------- settings & devices ----------
export interface UserSettingsDto {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewMessage: boolean;
  notifyNewComment: boolean;
  notifySubscription: boolean;
  readReceipts: boolean;
  /** out of search & suggestions; direct link still works */ hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  marketingEmails: boolean;
  dmPermission: 'anyone' | 'shared_only';
  /** show an age band, never the dob */ showAge: boolean;
  marketingEmailsChangedAt: string | null;
}
export type UpdateUserSettingsDto = Partial<Omit<UserSettingsDto, 'analyticsOptOut' | 'marketingEmailsChangedAt'>>;
export interface AnalyticsOptDto { /** false stops usage analytics */ enabled: boolean }
export interface RegisterDeviceDto {
  /** FCM token */ token: string;
  platform: 'ios' | 'android';
  appInstanceId?: string;
  timezone?: string;
  /** same id as at sign-in */ deviceId?: string;
}
export interface UnregisterDeviceDto { token: string }

// ---------- posts ----------
export interface PostImageDto { /** 200px */ thumbUrl: string; /** 800px */ cardUrl: string; /** 1600px */ fullUrl: string }
export interface PostPriceDto {
  amountCents: number; currency: string;
  /** amount = amountCents / 10 ** exponent */ exponent: number;
  /** only NGN, USD, CAD; else null. Spec enum is literally "$" | "$" | "$$"; confirm the real values with the backend */
  tier: string | null;
}
export interface HostCardDto { id: string; displayName: string; avatarUrl: string | null; verified: boolean }

export interface PostCardDto {
  id: string;
  type: PostType;
  title: string;
  images: PostImageDto[];
  /** null only on a draft */ startAt: string | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: CityRefDto;
  /** null = no limit */ capacity: number | null;
  /** null = free */ price: PostPriceDto | null;
  externalUrl: string | null;
  joinMode: JoinMode;
  /** host not counted */ goingCount: number;
  rsvpState: RsvpState;
  visibility: Visibility;
  host: HostCardDto;
  interests: InterestDto[];
  distanceKm: number | null;
}
export interface MyPostDto extends PostCardDto { status: PostStatus; publishedAt: string | null; updatedAt: string }
export interface ChecklistItemDto { id: string; text: string; position: number; checked: boolean; checkedById: string | null }
export interface PostDetailDto extends PostCardDto {
  description: string;
  showOnMap: boolean;
  waitlistEnabled: boolean;
  status: PostStatus;
  /** Plans only */ checklist: ChecklistItemDto[];
  isHost: boolean;
  canTickChecklist: boolean;
  /** 1 = next */ waitlistPosition: number | null;
  /** only on my own post */ linkClickCount: number | null;
}

/** Sent as multipart/form-data; repeat interestIds/checklist/images per value; booleans as 'true'/'false' */
export interface CreatePostDto {
  type: PostType;
  title: string;
  description?: string;
  startAt?: string;
  lat?: number;
  lng?: number;
  placeName?: string;
  capacity?: number;
  priceCents?: number;
  currency?: string;
  externalUrl?: string;
  waitlistEnabled?: boolean;
  visibility?: Visibility;      // default 'open'
  showOnMap?: boolean;          // default true
  interestIds?: string[];       // 1–3 to publish
  checklist?: string[];         // Plans only, ≤ 30
  status?: 'draft' | 'published'; // default 'draft'
  images?: Blob[];              // ≤ 4
}
export interface UpdatePostDto {
  title?: string; description?: string; startAt?: string;
  /** send both; null on both clears the pin */ lat?: number | null; lng?: number | null;
  placeName?: string | null;
  capacity?: number | null;
  /** drafts only */ priceCents?: number | null; currency?: string | null;
  externalUrl?: string | null;
  waitlistEnabled?: boolean; visibility?: Visibility; showOnMap?: boolean;
  /** replaces the whole set */ interestIds?: string[];
}
export interface ChecklistItemInputDto { /** keep for existing lines */ id?: string; text: string }
export interface ReplaceChecklistDto { items: ChecklistItemInputDto[] }
export interface SetCheckedDto { checked: boolean }
export interface ReportPostDto { reason: ReportReason; details?: string }
export interface ReportFiledDto { id: string }

export type MyPostsPageDto = Page<MyPostDto>;
export type HostedPostsPageDto = Page<PostCardDto>;

// ---------- rsvp / attendees ----------
export interface RsvpStateDto { state: RsvpState; goingCount: number; capacity: number | null; waitlistPosition: number | null }
export interface AttendeeDto {
  user: HostCardDto;
  state: 'going' | 'requested' | 'waitlisted';
  since: string;
  /** waitlist only */ position: number | null;
}
export interface AttendeeCountsDto { going: number; /** host only */ requested: number | null; /** host only */ waitlisted: number | null }
export interface AttendeesPageDto extends Page<AttendeeDto> { counts: AttendeeCountsDto }

// ---------- feed / map ----------
export interface FeedPageDto extends Page<PostCardDto> { city: CityRefDto; citySource: CitySource }
export interface MapPinDto { id: string; type: PostType; lat: number; lng: number; title: string; startAt: string }
export interface MapPinsDto { city: CityRefDto; citySource: CitySource; pins: MapPinDto[] }

// ---------- common ----------
export interface MinAppVersionDto { ios: string; android: string }
export interface AppConfigDto {
  termsVersion: string; termsUrl: string; privacyUrl: string; faqUrl: string; supportEmail: string;
  minAppVersion: MinAppVersionDto;
}

// ---------- profiles / blocking ----------
export interface PublicProfileDto {
  id: string;
  handle: string | null;
  /** first name + last initial */ displayName: string;
  avatarUrl: string | null;
  gender: Gender;
  bio: string | null;
  photos: ProfilePhotoDto[];
  homeCity: CityRefDto;          // may be null
  visiting: VisitingDto;         // may be null
  /** only when they chose to show it */ ageBand?: '18-24' | '25-34' | '35-44' | '45-54' | '55+';
  verified: boolean;
  interests: InterestDto[];
  extras: ProfileExtrasDto;
  memberSince: string;
  blockedByMe: boolean;
}
export interface HandleAvailabilityDto { available: boolean; reason?: 'taken' | 'reserved' | 'format' | null }
export type BlockedUsersPageDto = Page<PublicProfileDto>;
export interface ReportUserDto { reason: ReportReason; details?: string }
export interface ReportCreatedDto { id: string }
```

> **Where the spec under-specifies, these types are adjusted:**
> - **Fields the spec marks non-nullable but the descriptions say can be empty:** `MeDto.gender`/`homeCity`/`visiting`, `PostCardDto.price`, `MyVerificationDto.rejectionReason` and `PublicProfileDto.ageBand`.
>   - Code defensively: `?.` and fallbacks.
>   - Ask the backend to mark them `nullable: true` in the OpenAPI spec.
> - **`PostPriceDto.tier`:** the spec's enum is `"$" | "$" | "$$"`, which looks like a typo. Confirm the values before rendering.

---

## 7. Implementation guidance for the RN/Expo client

1. **One API module.**
   - `src/lib/api-client.ts` holds the base URL (from `EXPO_PUBLIC_API_URL`), JSON and multipart helpers, the auth header, and parsing of `ErrorResponseDto` into a typed `ApiError { status, code, message, errors, details, requestId }`.
   - Screens never call `fetch` directly.
2. **Token refresh:**
   - On 401 from a bearer call, run **one** shared refresh promise, then retry the original request once.
   - If refresh fails, clear secure storage, `queryClient.clear()`, and route to sign-in.
   - Refresh proactively when `accessExpiresAt` is under 60 s away.
3. **Feature folders:** one API module per area:
   - `features/auth`, `features/account` (me, sessions, trips, verification, export), `features/settings`, `features/posts`, `features/rsvp`, `features/feed`, `features/profiles`;
   - each exports typed functions plus TanStack Query hooks.
4. **Query keys** (central factory):
   - `['me']`, `['settings']`, `['trips']`, `['feed', type, cityKey]`, `['post', id]`, `['attendees', postId, state]`, `['profile', id]`, `['userPosts', id]`, `['blocks']`, `['cities', q]`, `['interests']`, `['appConfig']`.
   - Invalidate `['me']` after any `/me` mutation that returns `MeDto`, or use `setQueryData` with the returned object.
5. **Optimistic RSVP:**
   - Update `rsvpState` and `goingCount` on the card and detail caches.
   - Reconcile with the `RsvpStateDto` response and with the socket event `rsvp.update`.
   - Roll back on error.
6. **Location header:** a small hook supplies `X-Client-Location` when permission is granted. Include a rounded location (e.g. 3 decimals) in the feed query key, so moving cities refetches without refetching on every GPS jitter.
7. **Uploads:**
   - Resize and compress before sending (target ≤ 2 MB, long edge ≤ 2048 px).
   - Build `FormData` with `{ uri, name, type }`.
   - Do **not** set the `Content-Type` header manually; let fetch add the boundary.
8. **Never trust the client for identity:** the server derives the user from the token. Don't send `userId` for `/me` routes.
9. **Analytics:** respect `analyticsOptOut`. Sanitize route params before sending events.
10. **Every screen handles loading, error (with `requestId` in a "copy details" action), empty and success states.**
