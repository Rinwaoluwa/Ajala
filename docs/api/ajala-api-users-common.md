# Ajala API — User & Common endpoints (client integration spec)

> **For Claude Code.** This is the contract for the mobile app's API layer. It covers every endpoint tagged **User** and **Common** in the Ajala API OpenAPI spec (Swagger at `https://dev-api.ajalatrvl.com/api/v1/docs`, JSON at `/api/v1/docs-json`). It does not cover **Admin**.
> - Treat the types in §6 as the source of truth for request and response shapes.
> - Branch on `ErrorResponseDto.code`, never on `message`.
> - Where this file and the live Swagger disagree, Swagger wins. Flag the difference rather than guessing.
> - **Last synced with Swagger: 3 Nov 2026** (110 User/Common operations). Open questions for the backend are collected in §8.

---

## 1. Basics

| Item | Value |
|---|---|
| Base URL (dev) | `https://dev-api.ajalatrvl.com` (local: `http://localhost:3000`) |
| API prefix | `/api/v1` (deep-link files sit at the domain root under `/.well-known/`) |
| Auth | `Authorization: Bearer <accessToken>` on every endpoint marked **bearer** |
| Body format | JSON (`application/json`), except uploads and chat messages, which are `multipart/form-data` |
| Dates | Calendar dates are `YYYY-MM-DD` (`dob`, `recurrenceEndsOn`). Instants are ISO 8601 strings (`startAt`, `endAt`, `createdAt`, `accessExpiresAt`) |
| Ids | UUID strings. **Exception:** chat message ids are 64-bit numbers sent as strings; never parse them as JS numbers |
| Location header | `X-Client-Location: <lat>,<lng>`. Optional on the feed, map, post detail, search, `/me/rsvps`, `/me/saved` and profile post lists (`/users/{id}/posts`, `/attended`, `/plans`). A malformed value is ignored, not rejected |

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
- **Device check (new, optional):** every auth body that carries device fields also accepts `deviceCheck { platform: 'ios' | 'android', token }`.
  - iOS: `DCDevice.current.generateToken()` (base64). Android: a fresh Play Integrity token.
  - Used only against ban evasion. Omit it on emulators or when generating it fails; sign-in never depends on it.
- **Storage:** keep tokens in `expo-secure-store`, never AsyncStorage.

### 1.2 Error envelope (every 4xx/5xx with a body)
```ts
interface ErrorResponseDto {
  code: ErrorCode;                    // branch on this
  message: string;                    // human text; do not parse
  errors?: { field: string; message: string }[]; // with VALIDATION_FAILED
  details?: Record<string, unknown>;  // e.g. { challengeId } or { resetsAt }
  requestId: string | null;           // show/log it for support
}
```
For the full `ErrorCode` union and how to handle each code, see §5.

### 1.3 Pagination (cursor)
- **Query params:**
  - `cursor`: opaque; omit it for the first page.
  - `limit`: default 20, max 100. Exceptions: cities default 10 / max 20; search default 20 / max 50; chat messages default 30 / max 50.
- **Response:** `{ items, nextCursor }`, where `nextCursor: null` means the last page.
- **Chat messages are different:** pass `before=<oldest message id you hold>`; the page's `nextCursor` is the value to send as `before`.
- **Order is stable while paging.** Use TanStack Query `useInfiniteQuery` with `getNextPageParam: (p) => p.nextCursor ?? undefined`.

### 1.4 Uploads (avatar, gallery photos, post images, chat pictures)
- **Request:**
  - `multipart/form-data`;
  - the field is `file` for the avatar and gallery, `images` (repeated, in order) for post images and chat pictures.
- **Accepted files:**
  - JPEG, PNG or WebP, **≤ 5 MB each**;
  - the type is detected from the bytes, not the extension or mime.
- **Before upload:** resize and compress on the device (e.g. `expo-image-manipulator`), because phone photos are often over 5 MB.
- **Error codes:**
  - `400`: no file (or, for chat, nothing to send / too many pictures);
  - `413`: too large;
  - `415`: not an accepted image.
- **After upload:**
  - the server re-encodes the image and strips location metadata;
  - a new image always gets a new URL, so caching by URL is safe;
  - avatar, gallery and post image URLs are public and cacheable and need no token;
  - **chat picture URLs (`MessageImageDto`) last one hour**: refetch the thread rather than caching them long term.

### 1.5 Money
- **Price (paid posts):**
  - send `priceCents` (smallest unit: cents, kobo, yen) plus `currency` (any ISO 4217 code, capitals); omit both for a free post;
  - response `price` is `{ amountCents, currency, exponent }`, or `null` when free;
  - display amount = `amountCents / 10 ** exponent`.
  - The old `tier` field is gone.
- **Cost split (Plans and Groups, new):**
  - send `costTotalCents` + `costCurrency` + `expectedCount` together (null on all three clears it in a PATCH);
  - response `costSplit` is `{ totalCents, currency, exponent, expectedCount, perPersonCents }`, or `null`;
  - show `perPersonCents` as "about N each". The server does the split; the client no longer computes it.

---

## 2. Flows to implement (read before coding screens)

### 2.1 App bootstrap
1. `GET /api/v1/app/config` (no auth) returns `termsVersion`, the terms/privacy/FAQ URLs, `supportEmail` and `minAppVersion { ios, android }`.
2. If the installed build is older than `minAppVersion`, show a forced-update prompt.
3. Keep `termsVersion`: sign-up and `POST /me/terms/accept` need it.
4. If signed in, call `GET /me`:
   - `termsUpToDate === false`: show the updated terms, then `POST /me/terms/accept { version }`.
   - `profileCompletedAt === null`: route to onboarding (see §2.4).
   - `subscribed` / `subscribedUntil`: gate the paid (Travel) features (see §2.19).

### 2.2 Email sign-up and sign-in
- **Sign-up:**
  1. `POST /auth/signup/email` with `{ email, password, firstName, lastName, dob, termsVersion, timezone? }`. Always answers **202**, so the UI should not reveal whether the email exists. A breached password returns 400 `PASSWORD_BREACHED`; a stale `termsVersion` is a 400 on that field.
  2. `POST /auth/otp/verify` with `{ target: email, code (6 digits), password, deviceId, deviceName, deviceCheck?, timezone }`. **The password is required when the code completes a sign-up.** Without it, or with the wrong one, the answer is the same 401 as a wrong code. The 200 answer is `OtpSignInDto` (tokens + `user: MeDto` + `isNew`).
  3. Resend with `POST /auth/otp/resend { target }`. Always 202; show a cooldown timer client-side.
- **Login:** `POST /auth/login { email, password, deviceId, deviceName, deviceCheck? }` returns `TokenPairDto`. There is no `user` in it, so call `GET /me` next. Possible errors:
  - `401`: wrong credentials or a locked account.
  - `403 EMAIL_NOT_VERIFIED`: a code was re-sent. Go to the OTP screen, then verify. No password is needed here, because the account already exists.
  - `403 STEP_UP_REQUIRED`: a code was emailed. Ask for it and retry the **same** login call with `otpCode`.
- **Forgot password (changed: now a 6-digit code, not a link):**
  1. `POST /auth/password/forgot { email }`. Always 202. If the address has a password account, a 6-digit code is emailed, valid 10 minutes, at most 3 emails an hour per address. A Google/Apple-only account gets an email saying so instead.
  2. `POST /auth/password/verify { email, code }` → 200 `ResetTokenDto { token }`. A wrong, expired or used code is the same 401; the **fifth wrong code burns it**, so offer "send a new code".
  3. `POST /auth/password/reset { token, newPassword }` within 15 minutes → 204; every device is signed out, so send the user to sign in. 400 breached; 401 token expired/used.
- **Sign out:**
  - **this device:** `POST /auth/logout` (bearer, 204). Also call `POST /me/devices/unregister { token: pushToken }` **before** logging out, then clear local tokens and the query cache.
  - **everywhere:** `POST /auth/logout/all`.

### 2.3 Google and Apple sign-in, account linking and unlinking
1. Generate a random `nonce` (16–256 chars) per attempt and pass it to the provider SDK; Apple gets its SHA-256.
2. Call the matching endpoint:
   - **Google:** `POST /auth/oauth/google { idToken, nonce, deviceId, deviceName, deviceCheck?, timezone, termsVersion }`.
   - **Apple:** `POST /auth/oauth/apple { identityToken, authorizationCode, nonce, firstName?, lastName?, ... }`. Apple sends the name only on the first authorisation, so forward it when present.
3. Handle the answer:
   - **200:** `OtpSignInDto`; the user is signed in (or signed up, `isNew: true`).
   - **409 `ACCOUNT_LINK_REQUIRED`:** the email belongs to an existing account. Read `details.challengeId` (one use, 10 minutes); a code was emailed to that account. Show a code screen, then `POST /auth/oauth/link { challengeId, code, deviceId }` → 200 `OtpSignInDto`.
     - A 401 means the challenge is unknown or the code is bad, expired or used. Restart the provider sign-in.
   - **401:** the token was rejected, the nonce was replayed, or the account is suspended.
4. **Unlink (new):** `DELETE /me/identities/{provider}` (`google` | `apple`) → 204. Needs re-auth (§2.5). 404 not linked; 409 `LAST_SIGN_IN_METHOD` when it is the only way in (offer "set a password" first). Other devices stay signed in.

### 2.4 Onboarding gate
- `profileCompletedAt` is null until the profile is complete; a null value routes to onboarding.
  - **Conflict in Swagger (see §8):** the `GET /me` description says first name, last name and dob are enough and "gender is optional and never needed"; the `MeDto.profileCompletedAt` field description still says name, dob **and gender**. Read `profileCompletedAt` from the server and never compute it client-side.
  - Email sign-ups send name and dob at sign-up, so the stamp is set on the first `PATCH /me`. Google/Apple sign-ups may arrive with nothing.
- Onboarding = `PATCH /me` with the missing fields, plus optional `gender`, `handle`, `homeCityId`, `interestIds` (3–8) and `extras`. The server stamps `profileCompletedAt` itself; there is **no** "finish onboarding" call.
- **Handle:**
  - live-check with `GET /handles/availability?handle=`, which returns `{ available, reason: 'taken' | 'reserved' | 'format' | null }`;
  - 3–20 chars of letters, digits, `.` and `_`;
  - can change once every 30 days (409 `HANDLE_COOLDOWN`); 409 `CONFLICT` if taken.
- **Home city:**
  - on first launch, suggest it with `GET /cities/resolve?lat=&lng=` (returns the nearest city and `distanceKm`);
  - search with `GET /cities?q=&limit=` (`q` 1–80 chars, `limit` ≤ 20);
  - `GET /cities/popular` (new) gives up to 12 cities with the most live posts, for a "Popular" row.
- **Interests:** pick from `GET /interests`.
- **Extras (changed):** `extras.travelStyles` (up to 10 of a fixed list of 36, see `TravelStyle` in §6), `extras.favouriteCityIds` (up to 10 city ids, read back as `MeDto.favouriteCities`), `languages`, `socialLinks`, `pronouns`, `tagline`. `extras.lookingTo` no longer exists.

### 2.5 Re-authentication (sensitive actions)
- Some actions answer **403 `REAUTH_REQUIRED`**: deleting the account, setting a password, changing email, unlinking Google/Apple, and the data export.
- To open the re-auth window:
  - an account with a password: `POST /me/reauth { password }` → 204;
  - a Google/Apple-only account: `POST /me/reauth/code` (202, emails a code), then `POST /me/reauth { code }` → 204.
- After that, **retry the original request**. Build this as a reusable "confirm it's you" sheet that wraps the action.

### 2.6 Account management
| Action | Call | Notes |
|---|---|---|
| Change password | `POST /me/password { currentPassword, newPassword }` | 204; other devices signed out; 401 wrong current; 400 breached |
| Set first password (social accounts) | `POST /me/password/set { newPassword }` | 403 `REAUTH_REQUIRED` or `EMAIL_NOT_VERIFIED`; 409 already has one |
| Change email | `POST /me/email/change { newEmail }` then `POST /me/email/change/confirm { code }` | Code goes to the new address; 409 if someone else verified it meanwhile |
| Unlink Google/Apple | `DELETE /me/identities/{provider}` | Re-auth; 409 `LAST_SIGN_IN_METHOD` |
| Sessions | `GET /me/sessions`, `DELETE /me/sessions/{id}` | `current: true` marks this device; hide "sign out" for it or route it to logout |
| My reports | `GET /me/reports` | Paged; `targetType`, `reason`, `status: open \| resolved \| dismissed`. The text written is not returned |
| Delete account | `DELETE /me { reason? }` | 202 `{ purgeAt }`; 14-day grace; all devices signed out; signing in again cancels. Purge local state |
| Data export | `POST /me/export` then `GET /me/export` | One per day; link emailed; `downloadUrl` valid 24 h, null while building/expired |

### 2.7 Profile media
- **Avatar:**
  - `POST /me/avatar` (field `file`) returns `{ avatarUrl }` (a 200 px square; the server also keeps an 800 px version for the full profile);
  - `DELETE /me/avatar` → 204.
- **Gallery** (max 6 photos, separate from the avatar):
  - `POST /me/photos` (field `file`) returns 201 `ProfilePhotoDto { id, url (1280px), thumbUrl (400px), position }`;
  - a 7th photo returns 409, so show the count (n/6);
  - `PUT /me/photos/order { ids: [...] }` takes **every** photo id in the new order (400 if the set doesn't match exactly);
  - `DELETE /me/photos/{photoId}` → 204, and the gap closes.

### 2.8 Trips ("visiting") — removed from Swagger
- `GET/POST /me/trips` and `PATCH/DELETE /me/trips/{tripId}` (and `TripDto`, `CreateTripDto`, `UpdateTripDto`) are **no longer in the spec**.
- `MeDto.visiting` and `PublicProfileDto.visiting` still exist ("the city a trip of mine covers today"), but there is no client endpoint to create a trip. Treat `visiting` as read-only and possibly null. See §8.

### 2.9 Verified badge — selfie flow removed from Swagger
- `POST/GET /me/verification` and `MyVerificationDto` are **no longer in the spec**; `VERIFICATION_COOLDOWN` is gone from the error codes.
- `verified: boolean` remains on `MeDto`, `HostCardDto`, `PersonCardDto` and `PublicProfileDto` ("identity confirmed by an admin"). Show the badge; don't build a submission screen. See §8.

### 2.10 Push and devices
- After sign-in, and whenever the FCM token changes: `POST /me/devices { token, platform: 'ios' | 'android', appInstanceId?, timezone?, deviceId }` → 204. It is idempotent.
  - Send the same `deviceId` used at sign-in, so a password change or "sign out everywhere" keeps this phone's pushes.
- On sign-out: `POST /me/devices/unregister { token }` → 204.
- Push payloads match the inbox `NotificationDto.data` (`kind`, usually `postId`); route on them (see §2.17).

### 2.11 Feed, map and city resolution
- **Header:** send `X-Client-Location: lat,lng` whenever location permission is granted.
- **City choice:** (1) teleport, if the user is subscribed and teleported (§2.19), (2) the device location, (3) a network guess, (4) the home city. `citySource: 'teleport' | 'device' | 'edge' | 'home'` says which one won; for `teleport` show "Teleported to {city}".
- **404 `NO_CITY`:** no location, no network guess and no home city. Prompt the user to set a home city.
- **Endpoints:**
  - `GET /feed?type=all|meetup|event|plan|group&cursor&limit` → `FeedPageDto`.
    - Order: soonest first, a lift for the user's interests, then going count.
    - `distanceKm` is null without the header.
  - `GET /map/pins?bbox=west,south,east,north&type=&q=` → up to 500 pins.
    - The bbox must be ≤ 5° wide and not inside out (400 otherwise).
    - `q` (new, ≤ 80 chars) keeps pins whose title contains it, ignoring case.
    - Debounce it on map region change. Open a tapped pin with `GET /posts/{id}`.
  - `GET /explore/meetups` is **removed**. Use the feed with `type=meetup`, or search posts by interest chips (§2.18).

### 2.12 Posts (Meetup, Event, Plan, Group)
- **Create:** `POST /posts` (`multipart/form-data`).
  - Repeat `interestIds`, `schedule` and `itinerary` once per value.
  - Send booleans as the strings `true`/`false`.
  - `images`: up to 4, in carousel order.
- **Drafts:**
  - `status: 'draft'` (the default) needs only `type` and `title`;
  - at most 20 drafts;
  - list them with `GET /me/posts?status=draft`.
- **Publish rules** (checked on `status: 'published'` or `POST /posts/{id}/publish`; a 400 lists every failing rule in `errors[]`):
  - `startAt` in the future, a description, 2–4 images, and 1–3 interests;
  - a pin (`lat`/`lng`) for a Meetup or Event;
  - capacity: an Event needs > 100 or no limit, a Group needs 1–100, Meetups and Plans are free to choose;
  - a paid Event needs an `externalUrl` (https); a paid Meetup, Plan or Group may carry one and still RSVPs;
  - at most 3 Events per host per calendar month; the 4th returns 409 `EVENT_MONTHLY_CAP` with `details.resetsAt` (the 1st of next month);
  - a suspended account gets 403.
- **Type-specific fields (new; sent on the wrong type they are a 400 on that field):**
  - `schedule: string[]`: an Event's running order.
  - `itinerary: string[]`: a Plan's stops, in order.
  - `costTotalCents` + `costCurrency` + `expectedCount`: a Plan or Group splitting a cost (§1.5).
  - `recurrence: 'weekly' | 'biweekly' | 'monthly'` + optional `recurrenceEndsOn` (date): a Group that meets again. A monthly Group starts on the 1st–28th. The server moves `startAt`/`endAt` on after each meeting; attendees stay going.
- **All types (new):** `endAt` (optional, after `startAt`). `cityId` for a Plan or Group with no pin (from `GET /cities`); without it the host's home city. A pin always decides the city.
- **Edit:** `PATCH /posts/{id}` (JSON, only changed fields; not `type` or `status`).
  - A live post is re-checked against the publish rules.
  - Its price can't change, though its link can.
  - `lat` and `lng` must be sent together; null on both clears the pin. `cityId` is refused while the post has a pin.
  - `schedule` / `itinerary` replace the whole list; null clears. `recurrence: null` stops repeating.
  - A post that was taken down or cancelled returns 409.
- **Images:** `PUT /posts/{id}/images` replaces the whole carousel; a live post keeps 2–4.
- **Delete:** `DELETE /posts/{id}` works only for drafts and posts nobody has joined.
  - 409 `POST_HAS_ATTENDEES`: cancel it instead.
- **Cancel:** `POST /posts/{id}/cancel` is final.
  - Attendees and the waitlist get a push.
  - The post leaves the feed and map but stays readable by link with `status: 'cancelled'`.
  - 409 for a draft, an already-cancelled post, or one that has already started.
- **External link:** call `POST /posts/{id}/link-click` whenever the app opens `externalUrl` (counted once per person; the host's own clicks don't count; the host sees `linkClickCount`).
- **Save (new):** `POST /posts/{id}/save` → 204 (409 for a draft or cancelled post); `DELETE /posts/{id}/save` → always 204. `saved: boolean` is on every card. List with `GET /me/saved?type=`.
- **Plan checklist: removed.** `PUT /posts/{id}/checklist`, `PATCH /posts/{id}/checklist/{itemId}`, `checklist`, `canTickChecklist` and `ChecklistItemDto` are gone; the nearest replacement is `itinerary` (read-only lines, host-edited).
- **Report:** `POST /posts/{id}/report { reason, details? }`.
  - `reason: 'other'` needs `details`.
  - 409 if an open report already exists; 400 when reporting your own post; 403 `REPORTING_PAUSED` if a moderator paused the user's reporting (blocking still works).

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
  - An open post answers `going`, or `waitlisted` when it is full and the waitlist is on.
  - A private post answers `requested`.
  - It is idempotent.
  - 409 `POST_FULL` (full, no waitlist), `POST_STARTED`, `POST_CANCELLED`, `EXTERNAL_BOOKING`, or `CONFLICT` (own post, or the host declined the user).
- **Leave:** `DELETE /posts/{id}/rsvp` → 204, even if there was nothing to leave. A freed spot goes automatically to whoever has waited longest, who gets a push.
- **Realtime:** the socket event `rsvp.update { postId, state, goingCount }` arrives on the `/chat` namespace after any change to the user's own state.
  - Use it to settle optimistic updates.
- **Host tools:**
  - `GET /posts/{id}/attendees?state=going|requested|waitlisted`, oldest first. `going` is open to anyone who can see an open post; on a private post only the host and those going. `requested` and `waitlisted` are host-only (403 otherwise). `counts.requested`/`waitlisted` are null unless you host.
  - `POST /posts/{id}/attendees/{userId}/accept | decline | remove`. Accept on a full post with a waitlist puts the person in line. Decline and remove are final; decline sends no push, remove does.

### 2.14 Other people, blocking and reporting
- **Profiles:**
  - `GET /users/{userId}` or `GET /users/handle/{handle}` → `PublicProfileDto`;
  - `displayName` is the first name plus last initial;
  - `homeCity` is null when they hide their city (`showCurrentCity` off);
  - new: `favouriteCities`, `openToMeetToday`, `sharePlans`. The old `ageBand` is gone.
- **Their posts:**
  - `GET /users/{userId}/posts` lists the live posts they host, latest date first;
  - `GET /users/{userId}/attended` lists past posts they went to (cancelled left out);
  - `GET /users/{userId}/plans` (new) lists upcoming open posts they are going to, soonest first; empty unless `sharePlans` is on.
- **Your own posts:** see §2.16.
- **Block:**
  - `POST /users/{userId}/block` → 204 (400 for your own id);
  - `DELETE /users/{userId}/block` → 204;
  - `GET /me/blocks` → paged `PublicProfileDto[]`;
  - `blockedByMe` on a profile says whether you blocked them. Blocking also ends a direct chat both ways.
- **Report:** `POST /users/{userId}/report { reason, details? }` → 202 `{ id }`.
  - 409 if an open report on that person already exists; 403 `REPORTING_PAUSED`.

### 2.15 Settings
- **Read:** `GET /me/settings` returns `UserSettingsDto` (defaults if the user never changed anything).
- **Update:** `PATCH /me/settings` takes only the changed fields and returns the full object. Update it optimistically.
- **New fields:** `showCurrentCity` (show home city / today's trip city on my profile), `openToMeetToday` (switches itself off at the user's midnight), `sharePlans` (powers `GET /users/{id}/plans`).
- **Removed fields:** `showAge`, `marketingEmails`, `marketingEmailsChangedAt`.
- **Analytics opt-out:** `PATCH /me/analytics { enabled }`.
  - It is not part of `UpdateUserSettingsDto`.
  - Also gate the client analytics SDK on it.

### 2.16 My lists: Trips tab, saved, attended (new)
- `GET /me/rsvps?state=going` (default): live posts I'm going to that haven't ended, soonest first (the Upcoming tab).
- `GET /me/rsvps?state=requested`: private posts I asked to join that the host hasn't answered.
- `GET /me/attended`: posts I went to that have happened, latest first; cancelled left out.
- `GET /me/posts?status=draft|published`: posts I host (published includes taken down/cancelled), newest first.
- `GET /me/saved?type=all|meetup|event|plan|group`: saved posts, newest save first; cancelled posts stay, drafts and taken-down posts don't.

### 2.17 Notifications inbox (new)
- `GET /me/notifications?unread=false|true&cursor&limit` → `InboxPageDto { items, nextCursor, unreadCount }`. Covers the last 90 days, newest first, including pushes switched off in Settings. `unreadCount` drives the badge.
- `NotificationDto.category`: `join_request`, `request_accepted`, `post_reminder`, `new_comment`, `new_message`, `subscription`, `post_update`, `moderation` (pick the icon). `data.kind` and usually `data.postId` say what to open.
- `POST /me/notifications/read { ids? }` → 204. Leave `ids` out to mark everything read.

### 2.18 Comments, chat and search (new)
- **Comments** (anyone who can open the post):
  - `GET /posts/{id}/comments` pages top-level comments oldest first, with `total` for the header and `replyCount` per comment; `GET /posts/{id}/comments/{commentId}/replies` pages replies.
  - `POST /posts/{id}/comments { body (1–1000), parentId? }` → 201 `CommentDto`. Replying to a reply joins the same top-level comment. 409 `POST_CANCELLED` on a cancelled post.
  - `DELETE /posts/{id}/comments/{commentId}` → 204 (idempotent). Show the button when `canDelete`. A deleted top-level comment with replies comes back as `deleted: true` with no author/body: show "Comment deleted".
  - `POST /posts/{id}/comments/{commentId}/report { reason, details? }` → 202.
- **Chat:**
  - `GET /conversations?tab=all|unread|groups&search=` → `ConversationsPageDto`, latest activity first.
  - `POST /conversations { userId }` (direct, one per pair) or `{ postId }` (the host makes the post's group chat; host + people going, ≤ 50) → 200 `ConversationDetailDto`, existing or new. 400 neither/both; 403 they only take messages from shared-post people (`dmPermission: shared_only`); 409 self / post not live / > 50; **429 `CHAT_START_LIMIT`**: new direct chats with people you share no post with are capped per day (10 while the account is under 7 days old, 40 after).
  - `GET /conversations/{id}` → members (host first), `online`, `lastReadMessageId` (null when hidden), `onlineCount`.
  - `GET /conversations/{id}/messages?before=&limit=` → newest first.
  - `POST /conversations/{id}/messages` (multipart): `clientMsgId` (uuid the app makes; a retry sends the same one and gets the first back), `body` ≤ 2000, `taggedPostId?`, up to 4 `images`. 403 the other person can no longer be messaged.
  - `POST /conversations/{id}/read { messageId }` (never moves back); `POST /conversations/{id}/typing` at most every 3 s (shown for 5 s).
  - Group members: `POST /conversations/{id}/members { userId }` (host only, someone going); `DELETE /conversations/{id}/members/{userId}` (own id leaves; host removes others; host can't leave).
  - `POST /conversations/{id}/messages/{messageId}/report`.
  - **Socket (`/chat`):** `message.new` (full `MessageDto`), `read.update { conversationId, userId, messageId }`, `typing { conversationId, userId }`, plus `rsvp.update`. A missed event costs nothing: refetch the thread on open.
  - Render `removed: true` as "This message was removed", and `taggedPostUnavailable: true` as "no longer available".
- **Search** (runs on submit; no typeahead):
  - `GET /search/posts?q=&interestIds=&type=` → `PostSearchPageDto` in the same city the feed would pick. Send `q` (2–100 chars), `interestIds` (≤ 10 chips) or both. Best match first. 400 with neither; 404 `NO_CITY`.
  - `GET /search/people?q=` → `PeoplePageDto` of `PersonCardDto`, matched on first name and handle (leading `@` fine). Open one with `GET /users/{id}`.
  - Pages of 20 (max 50), at most 100 results per search: ask the user to narrow it after that.

### 2.19 Subscription ("Travel") and teleport (new)
- `GET /me/subscription` → `MySubscriptionDto { subscribed, platform, status, currentPeriodEnd, autoRenew, manage }`. `MeDto.subscribed`/`subscribedUntil` mirror it.
- **Buying:**
  1. `GET /me/subscription/challenge` → single-use challenge (5 minutes).
  2. **iOS:** attest the App Attest key with the challenge, buy with StoreKit 2 with `appAccountToken` = user id, then `POST /me/subscription/apple { signedTransaction, challenge, keyId, attestation }`.
  3. **Android:** Play Integrity token with the challenge as nonce, buy with `obfuscatedAccountId` = user id, then `POST /me/subscription/google { purchaseToken, challenge, integrityToken }`.
  4. **Web:** `POST /me/subscription/checkout { couponCode? }` → `{ url }`; on return, `POST /me/subscription/checkout/confirm` (safe to repeat; offer a "Refresh" button instead of polling).
  - Restore purchase = the same verify call. Manage: the OS screen for apple/google, `POST /me/subscription/portal` → `{ url }` for web.
  - 403 the challenge/device/purchase didn't check out; 409 the purchase belongs to another account; **503 subscriptions are off in this environment**.
- **Teleport:** `POST /me/teleport { cityId }` → 204; the feed, map and search then use that city (`citySource: 'teleport'`) until `DELETE /me/teleport` or the subscription ends. 402 `PAYMENT_REQUIRED` → show the paywall.

---

## 3. Endpoint reference

Auth column: **none** = public; **bearer** = needs an access token. Every bearer endpoint can also answer `401 UNAUTHORIZED`; refresh once, then sign out. 🆕 = new since the previous version of this file.

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
| POST | `/api/v1/auth/password/forgot` | none | `ForgotPasswordDto` | 202 (code emailed) | — |
| POST | `/api/v1/auth/password/verify` 🆕 | none | `VerifyResetCodeDto` | 200 `ResetTokenDto` | 401 wrong/expired/used code |
| POST | `/api/v1/auth/password/reset` | none | `ResetPasswordDto` | 204 (all devices signed out) | 400 breached; 401 token expired/used |
| POST | `/api/v1/auth/logout` | bearer | — | 204 | — |
| POST | `/api/v1/auth/logout/all` | bearer | — | 204 | — |

### 3.3 Cities and Interests
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/cities` | bearer | query `q` (required, 1–80), `limit` (default 10, max 20) | 200 `CityDto[]` (closest match first) | — |
| GET | `/api/v1/cities/popular` 🆕 | bearer | — | 200 `CityDto[]` (≤ 12, most live posts first; refreshed every 10 min) | — |
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
| DELETE | `/api/v1/me/identities/{provider}` 🆕 | bearer | path `provider` = `google` \| `apple` | 204 | 403 `REAUTH_REQUIRED`; 404 not linked; 409 `LAST_SIGN_IN_METHOD` |
| POST | `/api/v1/me/password/set` | bearer | `SetPasswordDto` | 204 | 403 `REAUTH_REQUIRED` / `EMAIL_NOT_VERIFIED`; 409 already has password |
| POST | `/api/v1/me/email/change` | bearer | `ChangeEmailDto` | 202 | 403 `REAUTH_REQUIRED` |
| POST | `/api/v1/me/email/change/confirm` | bearer | `ConfirmChangeDto` | 204 (other devices signed out) | 401 no change pending / bad code; 409 email taken meanwhile |
| POST | `/api/v1/me/password` | bearer | `ChangePasswordDto` | 204 (other devices signed out) | 400 breached; 401 current wrong |
| POST | `/api/v1/me/photos` | bearer | multipart `file` | 201 `ProfilePhotoDto` | 400; 409 gallery full (6); 413; 415 |
| PUT | `/api/v1/me/photos/order` | bearer | `ReorderPhotosDto` | 200 `ProfilePhotoDto[]` | 400 ids ≠ exactly my photos |
| DELETE | `/api/v1/me/photos/{photoId}` | bearer | path | 204 | 404 |
| GET | `/api/v1/me/reports` 🆕 | bearer | `cursor`, `limit` | 200 `MyReportsPageDto` (newest first) | — |
| POST | `/api/v1/me/export` | bearer | — | 202 `DataExportDto` | 403 `REAUTH_REQUIRED` / `EMAIL_NOT_VERIFIED`; 409 one in progress or < 1 day ago |
| GET | `/api/v1/me/export` | bearer | — | 200 `DataExportDto` (fresh link if file still exists) | 403 re-auth; 404 never requested |

Removed from Swagger: `GET/POST /me/trips`, `PATCH/DELETE /me/trips/{tripId}`, `POST/GET /me/verification`.

### 3.5 Settings, Devices and Notifications
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/settings` | bearer | — | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/settings` | bearer | `UpdateUserSettingsDto` | 200 `UserSettingsDto` | — |
| PATCH | `/api/v1/me/analytics` | bearer | `AnalyticsOptDto` | 200 `UserSettingsDto` | — |
| POST | `/api/v1/me/devices` | bearer | `RegisterDeviceDto` | 204 (register or refresh) | — |
| POST | `/api/v1/me/devices/unregister` | bearer | `UnregisterDeviceDto` | 204 | — |
| GET | `/api/v1/me/notifications` 🆕 | bearer | `unread` (bool, default false), `cursor`, `limit` | 200 `InboxPageDto` | — |
| POST | `/api/v1/me/notifications/read` 🆕 | bearer | `MarkReadDto` | 204 | — |

### 3.6 Posts
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/posts` | bearer | query `status` = `draft` \| `published` (default published; includes taken down/cancelled), `cursor`, `limit` | 200 `MyPostsPageDto` (newest first) | — |
| GET | `/api/v1/me/rsvps` 🆕 | bearer | `state` = `going` (default) \| `requested`, `cursor`, `limit`; header | 200 `HostedPostsPageDto` (soonest first) | — |
| GET | `/api/v1/me/saved` 🆕 | bearer | `type` = all\|meetup\|event\|plan\|group, `cursor`, `limit`; header | 200 `HostedPostsPageDto` (newest save first) | — |
| GET | `/api/v1/me/attended` | bearer | `cursor`, `limit` | 200 `HostedPostsPageDto` | — |
| POST | `/api/v1/posts` | bearer | multipart `CreatePostDto` (+ `images`) | 201 `PostDetailDto` | 400 field/publish rules; 403 suspended; 409 20 drafts or `EVENT_MONTHLY_CAP`; 413; 415 |
| GET | `/api/v1/posts/{postId}` | bearer | path; header `X-Client-Location` | 200 `PostDetailDto` | 404 |
| PATCH | `/api/v1/posts/{postId}` | bearer | `UpdatePostDto` | 200 `PostDetailDto` | 400; 404 not mine; 409 taken down/cancelled |
| DELETE | `/api/v1/posts/{postId}` | bearer | path | 204 | 404; 409 `POST_HAS_ATTENDEES` / taken down / cancelled |
| POST | `/api/v1/posts/{postId}/publish` | bearer | — | 200 `PostDetailDto` | 400 (one entry per failing rule); 403; 404; 409 already live / `EVENT_MONTHLY_CAP` |
| PUT | `/api/v1/posts/{postId}/images` | bearer | multipart `images` (whole carousel) | 200 `PostDetailDto` | 400 count; 404; 409; 413; 415 |
| POST | `/api/v1/posts/{postId}/cancel` | bearer | — | 200 `PostDetailDto` (`status: cancelled`) | 404; 409 draft / already cancelled / started |
| POST | `/api/v1/posts/{postId}/link-click` | bearer | — | 204 | 404; 409 no link or not live |
| POST | `/api/v1/posts/{postId}/save` 🆕 | bearer | — | 204 | 404; 409 draft / cancelled |
| DELETE | `/api/v1/posts/{postId}/save` 🆕 | bearer | — | 204 (always) | — |
| POST | `/api/v1/posts/{postId}/report` | bearer | `ReportPostDto` | 202 `ReportFiledDto` | 400 own post / "other" w/o details; 403 `REPORTING_PAUSED`; 404; 409 open report exists |

Removed from Swagger: `PUT /posts/{postId}/checklist`, `PATCH /posts/{postId}/checklist/{itemId}`.

### 3.7 RSVP and Attendees
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/posts/{postId}/rsvp` | bearer | — | 200 `RsvpStateDto` | 404; 409 `POST_FULL` / `POST_STARTED` / `POST_CANCELLED` / `EXTERNAL_BOOKING` / `CONFLICT` (own post, declined) |
| DELETE | `/api/v1/posts/{postId}/rsvp` | bearer | — | 204 | — |
| GET | `/api/v1/posts/{postId}/attendees` | bearer | query `state` = `going` (default) \| `requested` \| `waitlisted`, `cursor`, `limit` | 200 `AttendeesPageDto` | 403 list not allowed; 404 |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/accept` | bearer (host) | — | 200 `RsvpStateDto` (going or waitlisted) | 404; 409 `POST_FULL` / not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/decline` | bearer (host) | — | 200 `RsvpStateDto` (declined, final) | 404; 409 not live |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/remove` | bearer (host) | — | 200 `RsvpStateDto` (removed) | 404; 409 not live |

### 3.8 Comments 🆕
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/posts/{postId}/comments` | bearer | `cursor`, `limit` | 200 `CommentsPageDto` (top-level, oldest first) | 404 |
| POST | `/api/v1/posts/{postId}/comments` | bearer | `CreateCommentDto` | 201 `CommentDto` | 400 empty / > 1000; 404; 409 `POST_CANCELLED` |
| GET | `/api/v1/posts/{postId}/comments/{commentId}/replies` | bearer | `cursor`, `limit` | 200 `CommentsPageDto` | 404 |
| DELETE | `/api/v1/posts/{postId}/comments/{commentId}` | bearer | — | 204 (idempotent) | 404 not mine to delete |
| POST | `/api/v1/posts/{postId}/comments/{commentId}/report` | bearer | `ReportCommentDto` | 202 `ReportFiledDto` | 400; 403 `REPORTING_PAUSED`; 404; 409 |

### 3.9 Chat 🆕
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/conversations` | bearer | `tab` = all\|unread\|groups, `search` (≤ 60), `cursor`, `limit` | 200 `ConversationsPageDto` | — |
| POST | `/api/v1/conversations` | bearer | `StartConversationDto` | 200 `ConversationDetailDto` | 400; 403; 404; 409; 429 `CHAT_START_LIMIT` |
| GET | `/api/v1/conversations/{conversationId}` | bearer | — | 200 `ConversationDetailDto` | 404 |
| GET | `/api/v1/conversations/{conversationId}/messages` | bearer | `before`, `limit` (default 30, max 50) | 200 `MessagesPageDto` (newest first) | 404 |
| POST | `/api/v1/conversations/{conversationId}/messages` | bearer | multipart `clientMsgId`*, `body`, `taggedPostId`, `images` (≤ 4) | 201 `MessageDto` | 400; 403; 404; 413 |
| POST | `/api/v1/conversations/{conversationId}/read` | bearer | `ReadUpToDto` | 204 | 404 |
| POST | `/api/v1/conversations/{conversationId}/typing` | bearer | — | 204 | 404 |
| POST | `/api/v1/conversations/{conversationId}/members` | bearer (host) | `AddMemberDto` | 204 | 403; 404; 409 not going / full |
| DELETE | `/api/v1/conversations/{conversationId}/members/{userId}` | bearer | — | 204 | 403; 404; 409 host leaving |
| POST | `/api/v1/conversations/{conversationId}/messages/{messageId}/report` | bearer | `ReportMessageDto` | 202 `ReportFiledDto` | 400; 403 `REPORTING_PAUSED`; 404; 409 |

### 3.10 Feed, Map, Search
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/feed` | bearer | `type` = all\|meetup\|event\|plan\|group (default all), `cursor`, `limit`; header `X-Client-Location` | 200 `FeedPageDto` | 404 `NO_CITY` |
| GET | `/api/v1/map/pins` | bearer | `bbox` = `west,south,east,north` (required, ≤ 5° wide), `type`, `q` 🆕 (≤ 80); header | 200 `MapPinsDto` (≤ 500 pins) | 400 bad bbox; 404 `NO_CITY` |
| GET | `/api/v1/search/posts` 🆕 | bearer | `q` (2–100) and/or `interestIds[]` (≤ 10), `type`, `cursor`, `limit` (max 50); header | 200 `PostSearchPageDto` | 400; 404 `NO_CITY` |
| GET | `/api/v1/search/people` 🆕 | bearer | `q` (required, 2–100), `cursor`, `limit` (max 50) | 200 `PeoplePageDto` | 400 |

Removed from Swagger: `GET /explore/meetups`.

### 3.11 Subscription and Teleport 🆕
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/me/subscription` | bearer | — | 200 `MySubscriptionDto` | — |
| GET | `/api/v1/me/subscription/challenge` | bearer | — | 200 `ChallengeDto` | — |
| POST | `/api/v1/me/subscription/apple` | bearer | `VerifyAppleDto` | 200 `MySubscriptionDto` | 403; 409; 503 |
| POST | `/api/v1/me/subscription/google` | bearer | `VerifyGoogleDto` | 200 `MySubscriptionDto` | 403; 409; 503 |
| POST | `/api/v1/me/subscription/checkout` | bearer | `CheckoutDto` | 200 `RedirectUrlDto` | 400 bad coupon; 409 subscribed / coupon used; 503 |
| POST | `/api/v1/me/subscription/checkout/confirm` | bearer | — | 200 `MySubscriptionDto` | 403; 409; 503 |
| POST | `/api/v1/me/subscription/portal` | bearer | — | 200 `RedirectUrlDto` | 404 no web subscription |
| POST | `/api/v1/me/teleport` | bearer | `TeleportDto` | 204 | 402 `PAYMENT_REQUIRED`; 404 no such city |
| DELETE | `/api/v1/me/teleport` | bearer | — | 204 | — |

### 3.12 Profiles, Handles and Blocking
| Method | Path | Auth | Request | Success | Errors |
|---|---|---|---|---|---|
| GET | `/api/v1/users/handle/{handle}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}` | bearer | path | 200 `PublicProfileDto` | 404 |
| GET | `/api/v1/users/{userId}/posts` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/users/{userId}/attended` | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` | 404 |
| GET | `/api/v1/users/{userId}/plans` 🆕 | bearer | `cursor`, `limit`; header | 200 `HostedPostsPageDto` (empty unless `sharePlans`) | 404 |
| GET | `/api/v1/handles/availability` | bearer | query `handle` (1–40) | 200 `HandleAvailabilityDto` | — |
| POST | `/api/v1/users/{userId}/block` | bearer | path | 204 | 400 own id; 404 |
| DELETE | `/api/v1/users/{userId}/block` | bearer | path | 204 (idempotent) | 400 own id |
| GET | `/api/v1/me/blocks` | bearer | `cursor`, `limit` | 200 `BlockedUsersPageDto` | — |
| POST | `/api/v1/users/{userId}/report` | bearer | `ReportUserDto` | 202 `ReportCreatedDto` | 400; 403 `REPORTING_PAUSED`; 404; 409 open report exists |

---

## 4. Field limits (validate client-side to avoid round trips)

| DTO | Field limits |
|---|---|
| `SignupEmailDto` | `email` ≤ 320 · `password` 8–128 (at least one uppercase letter + one digit) · `firstName`/`lastName` 1–60 · `dob` YYYY-MM-DD · `termsVersion` ≤ 16 · `timezone` ≤ 64 (IANA) |
| `OtpVerifyDto` | `code` matches `^\d{6}$` · `target` ≤ 320 · `password` ≤ 128 · `deviceId` ≤ 128 · `deviceName` ≤ 120 |
| `DeviceCheckDto` | `token` ≤ 8192 |
| `LoginDto` | `email` ≤ 320 · `password` ≤ 128 · `otpCode` 6 digits |
| `GoogleSignInDto` / `AppleSignInDto` | `nonce` 16–256 · `termsVersion` ≤ 16 · Apple `firstName`/`lastName` ≤ 60 |
| `VerifyResetCodeDto` | `email` ≤ 320 · `code` matches `^\d{6}$` |
| `ResetPasswordDto` / `SetPasswordDto` / `ChangePasswordDto` | `newPassword` 8–128 (at least one uppercase letter + one digit) · `currentPassword` ≤ 128 |
| `UpdateProfileDto` | `firstName`/`lastName` 1–60 · `handle` 3–20 (letters, digits, `.` `_`; change once per 30 days) · `bio` ≤ 160 · `timezone` ≤ 64 · `interestIds` 3–8 active ids |
| `ProfileExtrasDto` | `languages` ISO 639-1 codes · `travelStyles` ≤ 10 · `favouriteCityIds` ≤ 10 · `pronouns` ≤ 20 · `tagline` ≤ 60 · `socialLinks.website` ≤ 200 |
| `DeleteAccountDto` | `reason` ≤ 500 |
| `AcceptTermsDto` | `version` ≤ 40 |
| `ChangeEmailDto` | `newEmail` ≤ 320 |
| `RegisterDeviceDto` / `UnregisterDeviceDto` | `token` ≤ 512 · `appInstanceId` ≤ 64 · `timezone` ≤ 64 · `deviceId` ≤ 128 |
| `CreatePostDto` / `UpdatePostDto` | `title` ≤ 80 · `description` ≤ 1000 · `placeName` ≤ 200 · `capacity` 1–100000 · `priceCents` 1–100000000 · `currency` exactly 3 letters · `externalUrl` ≤ 2048 (https) · images ≤ 4 · `interestIds` 1–3 · `costTotalCents` 0–1000000000 · `costCurrency` 3 letters · `expectedCount` 1–100000 · `schedule`/`itinerary` max lines not stated (§8) · defaults `visibility: open`, `showOnMap: true`, `status: draft` |
| `CreateCommentDto` | `body` 1–1000 |
| Chat message | `body` ≤ 2000 · `images` ≤ 4 · `clientMsgId` uuid (required) |
| `GET /conversations` | `search` ≤ 60 |
| Search | `q` 2–100 · `interestIds` ≤ 10 |
| `GET /map/pins` | `q` ≤ 80 |
| `ReportPostDto` / `ReportUserDto` / `ReportCommentDto` / `ReportMessageDto` | `details` ≤ 500 (required when `reason: 'other'`) |

---

## 5. Error codes: what the client should do

| `code` | Typical status | Client handling |
|---|---|---|
| `VALIDATION_FAILED` | 400 | Map `errors[].field` onto form fields |
| `BAD_REQUEST` | 400 | Show the message; log `requestId` |
| `PASSWORD_BREACHED` | 400 | Inline: "This password appeared in a data breach — choose another" |
| `UNAUTHORIZED` | 401 | Refresh once (single-flight); if refresh fails, sign out. On code screens: "wrong or expired code" |
| `PAYMENT_REQUIRED` | 402 | Show the Travel paywall (teleport) |
| `EMAIL_NOT_VERIFIED` | 403 | On login: go to the OTP screen (a code was re-sent). On set-password/export: ask the user to verify an email first |
| `STEP_UP_REQUIRED` | 403 | Ask for the emailed code; retry the login with `otpCode` |
| `REAUTH_REQUIRED` | 403 | Open the "confirm it's you" sheet (§2.5), then retry |
| `REPORTING_PAUSED` 🆕 | 403 | "Reporting is paused on your account; you can still block" |
| `TOTP_REQUIRED`, `TOTP_CODE_USED` | 403 / 401 | Admin only; surface a generic message |
| `FORBIDDEN` | 403 | Hide or disable the action (e.g. a suspended account, a chat you can't start) |
| `NOT_FOUND` | 404 | Empty or "not available" state; for posts and profiles it may mean blocked or not visible |
| `NO_CITY` | 404 | Ask for location permission or a home city |
| `ACCOUNT_LINK_REQUIRED` | 409 | Link flow with `details.challengeId` (§2.3) |
| `LAST_SIGN_IN_METHOD` 🆕 | 409 | "Set a password before removing your only sign-in method" |
| `HANDLE_COOLDOWN` | 409 | "You can change your handle again later" |
| `EVENT_MONTHLY_CAP` | 409 | Show `details.resetsAt` |
| `POST_FULL` / `POST_STARTED` / `POST_CANCELLED` / `POST_HAS_ATTENDEES` / `EXTERNAL_BOOKING` | 409 | Refresh the post and show the matching state (for `POST_HAS_ATTENDEES`, offer **Cancel** instead of **Delete**) |
| `CONFLICT` | 409 | Generic conflict: refetch and show the message |
| `GONE` | 410 | Resource no longer exists: refetch the parent list |
| `PAYLOAD_TOO_LARGE` | 413 | "Image must be 5 MB or smaller"; compress more |
| `UNSUPPORTED_MEDIA_TYPE` | 415 | "Use a JPEG, PNG or WebP image" |
| `CHAT_START_LIMIT` 🆕 | 429 | "You've started a lot of new chats today; try again tomorrow" |
| `RATE_LIMITED` | 429 | Back off; disable the button briefly |
| `SIGNUP_REFUSED` 🆕 | — | In the enum but no User endpoint documents it yet (§8); show a generic "can't create an account" message |
| `UNPROCESSABLE`, `METHOD_NOT_ALLOWED` | 422 / 405 | Bug: log with `requestId` |
| `SERVICE_UNAVAILABLE` | 503 | Subscription endpoints: "Purchases aren't available right now". Elsewhere: retry with backoff for GETs |
| `INTERNAL` | 500 | Retry with backoff for GETs; show a retry UI for mutations |

Removed from the enum: `VERIFICATION_COOLDOWN`.

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
export type CitySource = 'device' | 'edge' | 'home' | 'teleport';
export type ReportReason = 'harassment' | 'impersonation' | 'spam' | 'inappropriate_content' | 'other';
export type Recurrence = 'weekly' | 'biweekly' | 'monthly';

export type ErrorCode =
  | 'VALIDATION_FAILED' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'METHOD_NOT_ALLOWED' | 'CONFLICT' | 'GONE' | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE'
  | 'UNPROCESSABLE' | 'RATE_LIMITED' | 'PAYMENT_REQUIRED' | 'EMAIL_NOT_VERIFIED' | 'STEP_UP_REQUIRED'
  | 'REAUTH_REQUIRED' | 'PASSWORD_BREACHED' | 'ACCOUNT_LINK_REQUIRED' | 'HANDLE_COOLDOWN'
  | 'LAST_SIGN_IN_METHOD' | 'TOTP_REQUIRED' | 'TOTP_CODE_USED' | 'SIGNUP_REFUSED' | 'REPORTING_PAUSED'
  | 'CHAT_START_LIMIT' | 'EVENT_MONTHLY_CAP' | 'NO_CITY' | 'POST_FULL' | 'POST_STARTED'
  | 'POST_CANCELLED' | 'POST_HAS_ATTENDEES' | 'EXTERNAL_BOOKING'
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
export interface DeviceCheckDto {
  platform: 'ios' | 'android';
  /** iOS DCDevice token (base64) or a Play Integrity token; ≤ 8192 */ token: string;
}
interface DeviceFields {
  /** Stable per-install id; the same id replaces its previous session */
  deviceId?: string;
  deviceName?: string;
  /** Optional; anti ban-evasion only. Omit on emulators or failure */
  deviceCheck?: DeviceCheckDto;
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
export interface VerifyResetCodeDto { email: string; /** 6 digits */ code: string }
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
export type TravelStyle =
  | 'family' | 'solo' | 'shopping' | 'local_life' | 'rail_travel' | 'diving' | 'art_lover' | 'backpacker'
  | 'skiing' | 'cruise' | 'cycling' | 'eco_travel' | 'safari' | 'nightlife' | 'foodie' | 'beach'
  | 'festivals' | 'spiritual' | 'road_trip' | 'mountains' | 'culture' | 'hiking' | 'surfing' | 'sailing'
  | 'luxury' | 'photography' | 'adventurer' | 'budget' | 'staycation' | 'city_break' | 'history'
  | 'digital_nomad' | 'snow_escape' | 'glamping' | 'couples' | 'camping';
export interface ProfileExtrasDto {
  /** ISO 639-1 */ languages?: string[];
  /** up to 10; empty list or null clears */ travelStyles?: TravelStyle[] | null;
  /** up to 10 city ids; read back as favouriteCities */ favouriteCityIds?: string[];
  socialLinks?: SocialLinksDto;
  pronouns?: string | null;
  tagline?: string | null;
}
export interface ProfilePhotoDto {
  id: string; /** 1280px */ url: string; /** 400px */ thumbUrl: string; /** from 0 */ position: number;
}
export interface MeIdentityDto { provider: 'email' | 'google' | 'apple' }

export interface MeDto {
  id: string;
  status: 'active' | 'suspended' | 'pending_delete';
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  dob: string | null;
  gender: Gender | null;
  email: string | null;
  bio: string | null;
  timezone: string | null;
  avatarUrl: string | null;
  photos: ProfilePhotoDto[];
  homeCity: CityRefDto | null;
  /** The city a trip of mine covers today (no trip endpoints in Swagger now; read-only) */
  visiting: VisitingDto | null;
  /** Identity confirmed by an admin */ verified: boolean;
  /** Travel is on right now */ subscribed: boolean;
  /** Re-check after this; null without a subscription */ subscribedUntil: string | null;
  interests: InterestDto[];
  extras: ProfileExtrasDto | null;
  favouriteCities: CityRefDto[];
  /** Null until the profile is complete (see §2.4 / §8 for the gender question) */
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

export interface MyReportDto {
  id: string;
  targetType: 'user' | 'post' | 'comment' | 'message';
  targetId: string;
  reason: ReportReason;
  status: 'open' | 'resolved' | 'dismissed';
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

// ---------- settings, devices, notifications ----------
export interface UserSettingsDto {
  notifyJoinRequest: boolean;
  notifyRequestAccepted: boolean;
  notifyPostReminder: boolean;
  notifyNewComment: boolean;
  notifyNewMessage: boolean;
  /** renews or ends in two days */ notifySubscription: boolean;
  readReceipts: boolean;
  dmPermission: 'anyone' | 'shared_only';
  /** out of search & suggestions; direct link still works */ hiddenFromSearch: boolean;
  analyticsOptOut: boolean;
  /** show home city / today's trip city on my profile */ showCurrentCity: boolean;
  /** switches itself off at my midnight */ openToMeetToday: boolean;
  /** list upcoming open posts I'm going to on my profile */ sharePlans: boolean;
}
export type UpdateUserSettingsDto = Partial<Omit<UserSettingsDto, 'analyticsOptOut'>>;
export interface AnalyticsOptDto { /** false stops usage analytics */ enabled: boolean }
export interface RegisterDeviceDto {
  /** FCM token */ token: string;
  platform: 'ios' | 'android';
  appInstanceId?: string;
  timezone?: string;
  /** same id as at sign-in */ deviceId?: string;
}
export interface UnregisterDeviceDto { token: string }

export type NotificationCategory =
  | 'join_request' | 'request_accepted' | 'post_reminder' | 'new_comment'
  | 'new_message' | 'subscription' | 'post_update' | 'moderation';
export interface NotificationDto {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** what to open: kind and usually postId */ data: { kind?: string; postId?: string; [k: string]: unknown };
  readAt: string | null;
  createdAt: string;
}
export interface InboxPageDto extends Page<NotificationDto> { /** whole inbox, for the badge */ unreadCount: number }
export interface MarkReadDto { /** omit to mark everything read */ ids?: string[] }

// ---------- posts ----------
export interface PostImageDto { /** 200px */ thumbUrl: string; /** 800px */ cardUrl: string; /** 1600px */ fullUrl: string }
export interface PostPriceDto {
  amountCents: number; currency: string;
  /** amount = amountCents / 10 ** exponent */ exponent: number;
}
export interface PostCostSplitDto {
  totalCents: number; currency: string; exponent: number;
  expectedCount: number;
  /** rounded up; the "about N each" figure */ perPersonCents: number;
}
export interface PostRecurrenceDto { frequency: Recurrence; /** YYYY-MM-DD; null = until stopped */ endsOn: string | null }
export interface HostCardDto { id: string; displayName: string; avatarUrl: string | null; verified: boolean }

export interface PostCardDto {
  id: string;
  type: PostType;
  title: string;
  images: PostImageDto[];
  /** null only on a draft */ startAt: string | null;
  endAt: string | null;
  recurrence: PostRecurrenceDto | null;
  placeName: string | null;
  lat: number | null;
  lng: number | null;
  city: CityRefDto | null;
  /** null = no limit */ capacity: number | null;
  /** null = free */ price: PostPriceDto | null;
  costSplit: PostCostSplitDto | null;
  externalUrl: string | null;
  joinMode: JoinMode;
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
  type: PostType;
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  /** Plan/Group with no pin */ cityId?: string;
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
  schedule?: string[];          // Events only
  itinerary?: string[];         // Plans only
  costTotalCents?: number;      // Plans/Groups, with costCurrency + expectedCount
  costCurrency?: string;
  expectedCount?: number;
  recurrence?: Recurrence;      // Groups only
  recurrenceEndsOn?: string;    // Groups only, YYYY-MM-DD
  status?: 'draft' | 'published'; // default 'draft'
  images?: Blob[];              // ≤ 4
}
export interface UpdatePostDto {
  title?: string; description?: string; startAt?: string;
  endAt?: string | null;
  /** refused while the post has a pin; null = home city */ cityId?: string | null;
  /** send both; null on both clears the pin */ lat?: number | null; lng?: number | null;
  placeName?: string | null;
  capacity?: number | null;
  /** drafts only */ priceCents?: number | null; currency?: string | null;
  externalUrl?: string | null;
  waitlistEnabled?: boolean; visibility?: Visibility; showOnMap?: boolean;
  /** replaces the whole set */ interestIds?: string[];
  schedule?: string[] | null;
  itinerary?: string[] | null;
  /** all three, or null on all three */ costTotalCents?: number | null; costCurrency?: string | null; expectedCount?: number | null;
  recurrence?: Recurrence | null;
  recurrenceEndsOn?: string | null;
}
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

// ---------- comments ----------
export interface CommentDto {
  id: string; postId: string;
  /** top-level comment this replies to */ parentId: string | null;
  /** null on a deleted comment */ author: HostCardDto | null;
  /** null on a deleted comment */ body: string | null;
  deleted: boolean;
  /** 0 on a reply */ replyCount: number;
  createdAt: string;
  mine: boolean;
  canDelete: boolean;
}
export interface CommentsPageDto extends Page<CommentDto> { /** live comments + replies; 0 on a replies page */ total: number }
export interface CreateCommentDto { /** 1–1000 */ body: string; parentId?: string }
export interface ReportCommentDto { reason: ReportReason; details?: string }

// ---------- chat ----------
export interface LastMessageDto { id: string; senderId: string; /** first 120 chars */ preview: string | null; imageCount: number; createdAt: string }
export interface ConversationDto {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  postId: string | null;
  /** direct only */ other: HostCardDto | null;
  memberCount: number;
  lastMessage: LastMessageDto | null;
  /** capped at 99 */ unreadCount: number;
  activityAt: string;
}
export interface MemberDto {
  user: HostCardDto;
  role: 'owner' | 'member';
  /** lags a disconnect by up to 90 s */ online: boolean;
  /** null when they hide it */ lastReadMessageId: string | null;
}
export interface ConversationDetailDto extends ConversationDto { onlineCount: number; /** host first */ members: MemberDto[] }
export type ConversationsPageDto = Page<ConversationDto>;
export interface MessageImageDto { /** 320px, 1 h */ thumbUrl: string; /** 1600px, 1 h */ url: string }
export interface MessageDto {
  /** 64-bit id as a string */ id: string;
  conversationId: string;
  sender: HostCardDto;
  /** null once a moderator removed it */ body: string | null;
  images: MessageImageDto[];
  taggedPost: PostCardDto | null;
  taggedPostUnavailable: boolean;
  clientMsgId: string;
  removed: boolean;
  mine: boolean;
  createdAt: string;
}
/** nextCursor is the value to send as `before` */
export type MessagesPageDto = Page<MessageDto>;
export interface StartConversationDto { userId?: string; postId?: string } // exactly one
export interface ReadUpToDto { messageId: string }
export interface AddMemberDto { userId: string }
export interface ReportMessageDto { reason: ReportReason; details?: string }

// ---------- feed / map / search ----------
export interface FeedPageDto extends Page<PostCardDto> { city: CityRefDto; citySource: CitySource }
export interface MapPinDto { id: string; type: PostType; lat: number; lng: number; title: string; startAt: string }
export interface MapPinsDto { city: CityRefDto; citySource: CitySource; pins: MapPinDto[] }
export interface PostSearchPageDto extends Page<PostCardDto> { city: CityRefDto; citySource: CitySource }
export interface PersonCardDto {
  id: string; handle: string | null;
  /** first name + last initial */ displayName: string;
  avatarUrl: string | null; verified: boolean;
  homeCity: CityRefDto | null;
}
export type PeoplePageDto = Page<PersonCardDto>;

// ---------- subscription ----------
export interface MySubscriptionDto {
  subscribed: boolean;
  platform: 'apple' | 'google' | 'stripe' | 'comp' | null;
  /** grace = store retrying payment; still subscribed */ status: 'active' | 'grace' | 'expired' | 'refunded' | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  manage: 'apple' | 'google' | 'web' | null;
}
export interface ChallengeDto { challenge: string }
export interface VerifyAppleDto { signedTransaction: string; challenge: string; keyId: string; attestation: string }
export interface VerifyGoogleDto { purchaseToken: string; challenge: string; integrityToken: string }
export interface CheckoutDto { couponCode?: string }
export interface RedirectUrlDto { url: string }
export interface TeleportDto { cityId: string }

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
  gender: Gender | null;
  bio: string | null;
  photos: ProfilePhotoDto[];
  /** null also when they hide their city */ homeCity: CityRefDto | null;
  visiting: VisitingDto | null;
  verified: boolean;
  interests: InterestDto[];
  extras: ProfileExtrasDto | null;
  favouriteCities: CityRefDto[];
  openToMeetToday: boolean;
  /** GET /users/{id}/plans lists them */ sharePlans: boolean;
  memberSince: string;
  blockedByMe: boolean;
}
export interface HandleAvailabilityDto { available: boolean; reason?: 'taken' | 'reserved' | 'format' | null }
export type BlockedUsersPageDto = Page<PublicProfileDto>;
export interface ReportUserDto { reason: ReportReason; details?: string }
export interface ReportCreatedDto { id: string }
```

> The previous version's nullability adjustments are no longer needed: Swagger now marks `MeDto.gender`/`homeCity`/`visiting`/`extras`, `PostCardDto.city`/`price` and `PublicProfileDto.gender`/`homeCity`/`visiting`/`extras` as `nullable: true`. `PostPriceDto.tier` (and its broken enum) is gone.

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
   - `features/auth`, `features/account` (me, sessions, identities, reports, export), `features/settings`, `features/notifications`, `features/posts` (incl. save), `features/rsvp`, `features/comments`, `features/chat`, `features/feed` (feed, map), `features/search`, `features/subscription` (incl. teleport), `features/profiles`;
   - each exports typed functions plus TanStack Query hooks.
4. **Query keys** (central factory):
   - `['me']`, `['settings']`, `['subscription']`, `['notifications', unread]`, `['feed', type, cityKey]`, `['mapPins', bbox, type, q]`, `['post', id]`, `['comments', postId]`, `['replies', postId, commentId]`, `['attendees', postId, state]`, `['myRsvps', state]`, `['saved', type]`, `['myPosts', status]`, `['attended']`, `['conversations', tab, search]`, `['conversation', id]`, `['messages', id]`, `['searchPosts', q, interestIds, type]`, `['searchPeople', q]`, `['profile', id]`, `['userPosts', id]`, `['userPlans', id]`, `['blocks']`, `['myReports']`, `['cities', q]`, `['popularCities']`, `['interests']`, `['appConfig']`.
   - Invalidate `['me']` after any `/me` mutation that returns `MeDto`, or use `setQueryData` with the returned object. Invalidate `['feed']`, `['mapPins']` and `['searchPosts']` after teleporting or returning home.
5. **Optimistic RSVP and save:**
   - Update `rsvpState`/`goingCount` (or `saved`) on the card and detail caches.
   - Reconcile with the `RsvpStateDto` response and with the socket event `rsvp.update`.
   - Roll back on error.
6. **Socket:** one connection to the `/chat` namespace after sign-in; route `rsvp.update`, `message.new`, `read.update`, `typing` into the query cache. Treat it as best-effort and refetch on screen focus.
7. **Chat sending:** generate `clientMsgId` (uuid) before the first attempt and reuse it on retries; show the message optimistically keyed by it.
8. **Location header:** a small hook supplies `X-Client-Location` when permission is granted. Include a rounded location (e.g. 3 decimals) in the feed query key, so moving cities refetches without refetching on every GPS jitter.
9. **Uploads:**
   - Resize and compress before sending (target ≤ 2 MB, long edge ≤ 2048 px).
   - Build `FormData` with `{ uri, name, type }`.
   - Do **not** set the `Content-Type` header manually; let fetch add the boundary.
10. **Never trust the client for identity:** the server derives the user from the token. Don't send `userId` for `/me` routes.
11. **Analytics:** respect `analyticsOptOut`. Sanitize route params before sending events.
12. **Every screen handles loading, error (with `requestId` in a "copy details" action), empty and success states.**

---

## 8. Open questions for the backend (spec inconsistencies found on 3 Nov 2026)

1. **Profile completion and gender:** `GET /me` says only name + dob are needed ("gender is optional and never needed"); `MeDto.profileCompletedAt` says name, dob **and gender**. Which is right?
2. **Trips removed but `visiting` kept:** `/me/trips*` is gone from Swagger, yet `visiting` and `showCurrentCity` ("where my trip is today") still describe trips. Were trips dropped, moved, or left out of the docs by mistake?
3. **Verification removed but `verified` kept:** is the selfie flow gone for good (admin-only verification), or temporarily hidden?
4. **`schedule` / `itinerary` limits:** the descriptions read "up to  lines" with the number missing, and neither has `maxItems` or a per-line `maxLength`.
5. **`SIGNUP_REFUSED`:** in the error enum but no User endpoint lists it. Which call returns it (sign-up, OTP verify, OAuth)?
6. **`deviceCheck` on sign-up:** the description says "send with sign-up", but `SignupEmailDto` has no `deviceCheck`; it is on `OtpVerifyDto`. Confirm that verify is the right place.
7. **`travelStyles` / `favouriteCityIds` limits:** "up to 10" is only in the descriptions; no `maxItems`.
8. **`MeIdentityDto.verifiedAt`** was removed. Confirm the app no longer needs it.
