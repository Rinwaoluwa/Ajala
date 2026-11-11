# Endpoint test, 10 November 2026: dev and staging

Every endpoint the app calls, plus the rest of Swagger, was run against both servers with
real accounts, in the order a person would hit them. The full per-call results are in the
table at the end. This page says what works, what does not, where dev and staging differ,
and which parts of the app have no backend behind them.

- **Dev:** `https://dev-api.ajalatrvl.com`, socket `https://dev-ws.ajalatrvl.com`
- **Staging:** `https://staging-api.ajalatrvl.com`, socket `https://staging-ws.ajalatrvl.com`
  (what development and preview builds use)

## 1. The short version

**Everything the app calls works on both servers**, with these exceptions:

| | Dev | Staging | What it means |
| --- | --- | --- | --- |
| Post images on the media host | **403** (S3 AccessDenied on `dev-media.ajalatrvl.com`) | 200 | Post photos do not load in the app against dev. Avatars load on both. **Backend.** |
| Group chat after the post is cancelled | 200 (still there) | 404 one run, 200 the run before | The chat is removed late or inconsistently. The app shows a chat for a cancelled post until it refreshes. **Backend.** |
| `PUT /me/trusted-person` with a valid user | **404 "User not found"** | 200, and the whole flow works | Dev refuses a brand-new account as a trusted person; staging accepts the same setup. **Backend to check.** The app has no screens for this yet anyway. |
| `POST /waitlist` with a bogus captcha | 400 `CAPTCHA_FAILED` | **202** | The captcha is off on staging. Marketing site only; the app does not call it. |

Nothing new was found on the app side in this run. The two earlier app bugs (photo uploads,
the final onboarding save) are fixed and committed.

Staging had two problems on 9 November that are **gone today**: `PATCH /me` with a place
answered 503 "Places are not set up here", and `GET /interests` was empty. Both work now
(4 interests on each server), so onboarding saves the home city and the interests step is
no longer blank.

## 2. How it was run

- Two accounts per server, **A** (the main account) and **B** (another person who joins A's
  post, chats, gets blocked, is chosen as trusted person), plus a **throwaway account C**
  created during the run for the calls that break an account: change email, change
  password, sign out everywhere, delete the account.
- 186 calls per server in the main run, 25 more in a second run for the group-chat flow in
  the right order, and a socket.io connection to `/chat` with a real token and with a bad
  one.
- Each call sent what the app sends (the same bodies, `X-Client-Location` for Lagos where
  the app adds it, multipart uploads with real PNGs).
- Both servers sit behind Cloudflare, which **refuses Python's default User-Agent with a
  403** (Cloudflare error 1010). The scripts send `Ajala-QA/1.0`. The app is not affected
  (React Native's fetch has its own agent).

Test accounts (QA only, on the dev and staging databases):

| Server | A | B |
| --- | --- | --- |
| Dev | `ajala.qa.wox5aq@yopmail.com` | `ftffjbxw@guerrillamailblock.com` |
| Staging | `griqtuwj@guerrillamailblock.com` | `demo+2345@yopmail.com` |

Each run leaves one cancelled post titled "QA … (test, please ignore)" and a few QA
comments and reports on each server.

## 3. What works (both servers)

- **Sign-up and sign-in.** Email sign-up (202 for new and existing addresses alike), the
  6-digit code (401 for a wrong one), resend, password sign-in (401 for a wrong password),
  forgot / verify / reset, refresh (single use: the old refresh token answers 401
  afterwards, and the old access token stops working too), sign out of one device, sign out
  everywhere.
- **Account.** `GET /me`, every `PATCH /me` field the app sends (bio, time zone, languages,
  home place by Google id, favourite destinations, interests, gender, handle check), terms
  acceptance (`{ version }`), settings, analytics opt-in, sessions (list, sign one out, 404
  for an unknown one), blocks, reports, data export (202, then 409 within a day), re-auth by
  password and by emailed code, password set (409 when one exists), unlink a provider (404
  when not linked), change email (202), change password (204), delete account (202; the
  token stops working at once).
- **Photos.** Avatar upload (200 with a URL that loads), avatar delete, the profile gallery
  (`POST /me/photos` 201 twice, reorder 200, delete 204 each).
- **Feed, map, search.** No location header → 404 `NO_LOCATION`. With Lagos: 200 with
  `origin { lat, lng, label: null, region: "Lagos" }` and `originSource: "device"`, each
  post type, map pins (400 for a box wider than 20°), post search by text and by interest,
  people search (400 for one letter), profile by handle (404 for an unknown one), teleport
  (402 without a subscription), come home (204).
- **Posts.** Draft with a title only (201), publish with nothing (400 naming every missing
  field), edit by pin and by Google place id, two images, publish, my posts by status
  (`draft` / `published`; `past` is not a value), the host joining their own post (409),
  link-click on a post with no link (409), save / saved list / unsave, join (`going`,
  count, capacity), attendees by state, my RSVPs by state, remove an attendee (200, and they
  cannot rejoin: 409 "You were removed"), accept / decline on someone already going (404
  "Request not found": they are for requests only), attended list, cancel (200), delete a
  draft (204), a cancelled post still readable.
- **Comments.** Comment, reply (`parentId`), list, replies, report a comment (202, 409 the
  second time), delete own reply, host deletes someone else's comment (204), report a post
  (202; 400 for your own), my reports.
- **Chat.** Direct chat (200), list by tab and search, unread count, detail, messages, send
  text (201) and a picture (201) and a tagged post (201), read marker, typing, report a
  message (202). **Group chat:** the host and a person going both find it with
  `POST /conversations { postId }`, it is listed under `tab=groups`, leave (204), the host
  brings someone back (204), a non-host adding someone (403), the host leaving (409),
  someone who leaves the post loses the chat (404).
- **Profiles.** Another person, their posts / attended / plans, own id, unknown id (404),
  block (204; the blocked person then gets 404 opening you), blocks list, unblock, report
  a profile (202; 400 for yourself; 409 when already reported).
- **Notifications and devices.** Inbox (B received `rsvp.removed`), mark one and mark all
  read, register a device (204), unregister a token that was never registered (204).
- **Subscription.** `GET /me/subscription` and `/challenge` (200), portal (404 when there
  is no web subscription), checkout (503 "Subscriptions are not set up here" on both
  servers), Apple / Google receipts with bogus bodies (400 naming the fields the API wants:
  `signedTransaction` + `challenge`, `purchaseToken` + `challenge`; the app's DTOs match).
  `POST /me/subscription/checkout/confirm` answers **200 with nothing pending**, which looks
  wrong but is harmless.
- **Trusted person (staging):** choose (200), the other person sees the request, accepts
  (204), reads the plans (200), ends it (204), the chooser ends it (204).
- **Socket:** `/chat` on both hosts connects with a real token and answers
  `connect_error UNAUTHENTICATED` with a bad one. (On 9 November staging's socket did not
  answer; it does now.)
- **Public:** `GET /app/config`, `/health`, `/health/live`, `/.well-known/*`,
  `/email-assets/{file}`. `GET /interests` needs a token (401 without one; the app always
  has one).

Validation comes before authentication on the auth endpoints: a too-short token or code
answers 400 `VALIDATION_FAILED` with the length rule, not 401. The app treats both as
"invalid", so nothing changes for the person.

## 4. Seen once, not reproduced

In the first group-chat run on dev, the host's `POST /conversations { postId }` straight
after publishing answered 409 "Already exists", and the person who had just joined got 409
`GROUP_CHAT_FULL` on a post with capacity 4 and one person going. The rerun a minute later
answered 200 for both. Worth a look on the backend: it reads like a race just after
publish.

## 5. What in the app is not connected to a backend

| Area | What the app does today | Why |
| --- | --- | --- |
| **Level card on Home** ("Level 2 · Local Explorer, 7/10") | A fixed placeholder, agreed with product. | There is no levels API. |
| **Achievements, badges, the Events and Countries counters** | Worked out on the phone from the attended history. The design's Streak is not shown. | No achievements API; no streak data anywhere. |
| **Travel subscription: Subscribe** | Shows a notice that this build cannot buy. Manage → web billing portal works for a web subscription. | No StoreKit / Play Billing module in the app. The API's Apple / Google / checkout endpoints exist and the app's DTOs match them, but nothing calls them; checkout answers 503 on both servers anyway. |
| **Push notifications** | Switched off (`PUSH_ENABLED = false`). | Needs Firebase so iOS also gets an FCM token (backend answer A13). `POST /me/devices` itself works. |
| **Google sign-in** | Fails with "Invalid sign-in token". | The free SDK cannot pass the app's nonce; the server insists on it (A14). Either the backend accepts tokens without a nonce, or the paid library goes in. |
| **Trusted person ("Share my plan")** | No screens yet (a TODO in Privacy & safety). | The API is there and works on staging; design has not drawn it. |
| **Profile photo gallery** (`/me/photos`) | No UI. | API works; not in the designs built so far. |
| **People search, profile by handle** | No people search in the app; profiles open by id. | API works; nothing uses it yet. |
| **Follow, Invite friends** | Not built. | Not in the API. |
| **Popular cities** (quick searches under favourite destinations; Travel) | A short fixed list in the app; Travel's "Recent" is kept on the phone. | Swagger has no popular-cities list any more. |
| **"Visiting" on profiles, trips** | Not shown. | The API always sends null while trips are parked. |
| **Place search** (cities, venues, "detect my city") | Google Places, called from the phone. | The API takes Google place ids and has no place search. |
| **Maps** | Google Maps SDK on the phone. | Not an API concern. |
| **Over-the-air updates** | EAS Update. | Not the Ajala backend. |
| **Waitlist** | Not in the app. | The marketing site's endpoints. |

Connected and working, for the record: chat live updates (the socket), saving posts
(`useSavePost` in shared code), reports, blocks, data export, account deletion, sessions.

## 6. Swagger operations the app never calls

`GET /.well-known/apple-app-site-association`, `GET /.well-known/assetlinks.json` (served
for the OS, not called by the app), `GET /email-assets/{file}`, `GET /health`,
`GET /health/live`, the three `/me/photos` operations, the seven trusted-person operations,
`GET /search/people`, `GET /users/handle/{handle}`, the three `/waitlist` operations.

Everything else in Swagger (117 operations) has a caller in the app, and every app call has
an operation in Swagger.

## 7. For the backend team

1. **Dev media:** `dev-media.ajalatrvl.com` answers 403 for post images (avatars load).
2. **Cancelled post's group chat:** still 200 after cancel on dev; on staging 200 in one run
   and 404 in the next. The spec says 404.
3. **`PUT /me/trusted-person`:** 404 "User not found" on dev for a valid user that staging
   accepts.
4. **`POST /me/subscription/checkout/confirm`:** 200 with nothing pending.
5. **Possible race after publish:** section 4.
6. **Staging captcha:** `POST /waitlist` accepts a bogus token (202).
7. Still open from 9 November: A14 (Google nonce), A11.

## 8. Rerunning

The run is two Python scripts (`run_all.py` for the main run, `group_chat.py` for the
group-chat order) that take a base URL and two saved sign-in responses. They live outside
the repo; the table below is their output. Any client that reruns them must send its own
`User-Agent` (Cloudflare refuses Python's default).

## 9. Every call

Status, then the API's error code where there was one. `–` means the call was not reached
on that server (the row above it failed, or there was nothing to act on). "A" is the main
account, "B" the other person, "C" the throwaway, "-" no account.

#### public

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/.well-known/apple-app-site-association` | on the API host (served by the links host too) | 200 | 200 |
| GET | `/.well-known/assetlinks.json` |  | 200 | 200 |
| GET | `/api/v1/app/config` |  | 200 | 200 |
| GET | `/api/v1/email-assets/{file}` | guessed file name | 200 | 200 |
| GET | `/api/v1/health` |  | 200 | 200 |
| GET | `/api/v1/health/live` |  | 200 | 200 |
| GET | `/api/v1/interests` |  | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| GET | `/api/v1/interests` | as a signed-in user | 200 | 200 |

#### auth

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | wrong password (expect 401) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| POST | `/api/v1/auth/oauth/apple` | bogus token (expect 401) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| POST | `/api/v1/auth/oauth/google` | bogus token (expect 401) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| POST | `/api/v1/auth/otp/resend` | expect 202 | 202 | 202 |
| POST | `/api/v1/auth/otp/verify` | wrong code (expect 401) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| POST | `/api/v1/auth/password/forgot` | expect 202 (emails a code) | 202 | 202 |
| POST | `/api/v1/auth/password/reset` | bogus token (expect 401) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| POST | `/api/v1/auth/password/verify` | wrong code (expect 401) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| POST | `/api/v1/auth/signup/email` | existing email (expect 202, nothing revealed) | 202 | 202 |

#### account

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/handles/availability` | free handle | 200 | 200 |
| GET | `/api/v1/handles/availability` | reserved word | 200 | 200 |
| GET | `/api/v1/me` | before anything | 200 | 200 |
| GET | `/api/v1/me` | other person | 200 | 200 |
| GET | `/api/v1/me` | after profile edits | 200 | 200 |
| PATCH | `/api/v1/me` |  | 200 | 200 |
| PATCH | `/api/v1/me` | completes B (an email sign-up needs one PATCH) | 200 | 200 |
| PATCH | `/api/v1/me` | home place = Lagos (Google id) | 200 | 200 |
| PATCH | `/api/v1/me` | favourite destination = Accra | 200 | 200 |
| PATCH | `/api/v1/me` | 3 interests | 200 | 200 |
| PATCH | `/api/v1/me/analytics` |  | 200 | 200 |
| GET | `/api/v1/me/blocks` |  | 200 | 200 |
| GET | `/api/v1/me/reports` |  | 200 | 200 |
| GET | `/api/v1/me/sessions` |  | 200 | 200 |
| GET | `/api/v1/me/settings` |  | 200 | 200 |
| PATCH | `/api/v1/me/settings` |  | 200 | 200 |
| POST | `/api/v1/me/terms/accept` |  | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |

#### avatar & photos

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| DELETE | `/api/v1/me/avatar` |  | 204 | 204 |
| POST | `/api/v1/me/avatar` |  | 200 | 200 |
| POST | `/api/v1/me/photos` |  | 201 | 201 |
| POST | `/api/v1/me/photos` | second photo | 201 | 201 |
| PUT | `/api/v1/me/photos/order` | reversed | 200 | 200 |
| DELETE | `/api/v1/me/photos/{photoId}` |  | 204 | 204 |
| GET | `<avatarUrl from media host>` | the image itself | 200 | 200 |

#### security

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/export` |  | 200 | 200 |
| POST | `/api/v1/me/export` | expect 202, or 409 if asked within a day | 409 CONFLICT | 202 |
| DELETE | `/api/v1/me/identities/{provider}` | not linked (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |
| POST | `/api/v1/me/password/set` | already has one (expect 409) | 409 CONFLICT | 409 CONFLICT |
| POST | `/api/v1/me/reauth` | with the password | 204 | 204 |
| POST | `/api/v1/me/reauth/code` | expect 202 (emails a code) | 202 | 202 |
| GET | `/api/v1/me/trusted-by` | B sees the request | 200 | 200 |
| DELETE | `/api/v1/me/trusted-by/{linkId}` |  | – | 204 |
| POST | `/api/v1/me/trusted-by/{linkId}/accept` |  | – | 204 |
| GET | `/api/v1/me/trusted-by/{linkId}/plans` |  | – | 200 |
| DELETE | `/api/v1/me/trusted-person` |  | 204 | 204 |
| GET | `/api/v1/me/trusted-person` | nobody yet | 200 | 200 |
| GET | `/api/v1/me/trusted-person` | after choosing | 200 | 200 |
| PUT | `/api/v1/me/trusted-person` | choose B | 404 NOT_FOUND | 200 |

#### subscription

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/subscription` |  | 200 | 200 |
| POST | `/api/v1/me/subscription/apple` | bogus receipt | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| GET | `/api/v1/me/subscription/challenge` |  | 200 | 200 |
| POST | `/api/v1/me/subscription/checkout` |  | 503 SERVICE_UNAVAILABLE | 503 SERVICE_UNAVAILABLE |
| POST | `/api/v1/me/subscription/checkout/confirm` |  | 200 | 200 |
| POST | `/api/v1/me/subscription/google` | bogus purchase | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| POST | `/api/v1/me/subscription/portal` |  | 404 NOT_FOUND | 404 NOT_FOUND |

#### feed & search

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/feed` | no location header (expect 404 NO_LOCATION) | 404 NO_LOCATION | 404 NO_LOCATION |
| GET | `/api/v1/feed` | Lagos | 200 | 200 |
| GET | `/api/v1/feed` | type=meetup | 200 | 200 |
| GET | `/api/v1/feed` | type=event | 200 | 200 |
| GET | `/api/v1/feed` | type=plan | 200 | 200 |
| GET | `/api/v1/feed` | type=group | 200 | 200 |
| GET | `/api/v1/map/pins` |  | 200 | 200 |
| GET | `/api/v1/map/pins` | too big a box (expect 400) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| DELETE | `/api/v1/me/teleport` | come home | 204 | 204 |
| POST | `/api/v1/me/teleport` | not subscribed (expect 402) | 402 PAYMENT_REQUIRED | 402 PAYMENT_REQUIRED |
| GET | `/api/v1/search/people` | B's first name | 200 | 200 |
| GET | `/api/v1/search/people` | one letter (expect 400) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| GET | `/api/v1/search/posts` |  | 200 | 200 |
| GET | `/api/v1/search/posts` | by interest | 200 | 200 |
| GET | `/api/v1/users/handle/{handle}` |  | 200 | 200 |
| GET | `/api/v1/users/handle/{handle}` | unknown (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |

#### posts

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/attended` |  | 200 | 200 |
| GET | `/api/v1/me/posts` | status=published | 200 | 200 |
| GET | `/api/v1/me/posts` | status=draft | 200 | 200 |
| GET | `/api/v1/me/posts` | status=past | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| GET | `/api/v1/me/rsvps` | state=going | 200 | 200 |
| GET | `/api/v1/me/rsvps` | state=requested | 200 | 200 |
| GET | `/api/v1/me/rsvps` | state=waitlisted | 200 | 200 |
| GET | `/api/v1/me/saved` |  | 200 | 200 |
| POST | `/api/v1/posts` | draft, title only | 201 | 201 |
| POST | `/api/v1/posts` | publish with nothing (expect 400 naming the fields) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |
| POST | `/api/v1/posts` | second draft | 201 | 201 |
| DELETE | `/api/v1/posts/{postId}` | delete the draft | 204 | 204 |
| GET | `/api/v1/posts/{postId}` | own draft | 200 | 200 |
| GET | `/api/v1/posts/{postId}` | B opens it | 200 | 200 |
| GET | `/api/v1/posts/{postId}` | cancelled post | 200 | 200 |
| GET | `/api/v1/posts/{postId}` | as the host, after cancel | 200 | 200 |
| PATCH | `/api/v1/posts/{postId}` |  | 200 | 200 |
| PATCH | `/api/v1/posts/{postId}` | by Google place id | 200 | 200 |
| GET | `/api/v1/posts/{postId}/attendees` | state=going | 200 | 200 |
| GET | `/api/v1/posts/{postId}/attendees` | state=requested | 200 | 200 |
| GET | `/api/v1/posts/{postId}/attendees` | state=waitlisted | 200 | 200 |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/accept` |  | 404 NOT_FOUND | 404 NOT_FOUND |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/decline` |  | 404 NOT_FOUND | 404 NOT_FOUND |
| POST | `/api/v1/posts/{postId}/attendees/{userId}/remove` |  | 200 | 200 |
| POST | `/api/v1/posts/{postId}/cancel` |  | 200 | 200 |
| PUT | `/api/v1/posts/{postId}/images` |  | 200 | 200 |
| POST | `/api/v1/posts/{postId}/link-click` | no link on it (expect 409) | 409 CONFLICT | 409 CONFLICT |
| POST | `/api/v1/posts/{postId}/publish` |  | 200 | 200 |
| DELETE | `/api/v1/posts/{postId}/rsvp` | B leaves | 204 | 204 |
| POST | `/api/v1/posts/{postId}/rsvp` | host joins own post (expect 400/409) | 409 CONFLICT | 409 CONFLICT |
| POST | `/api/v1/posts/{postId}/rsvp` | B joins | 200 | 200 |
| POST | `/api/v1/posts/{postId}/rsvp` | B joins again | 409 CONFLICT | 409 CONFLICT |
| DELETE | `/api/v1/posts/{postId}/save` |  | 204 | 204 |
| POST | `/api/v1/posts/{postId}/save` |  | 204 | 204 |
| GET | `<post image on media host>` | the image itself | 403 | 200 |

#### comments

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/reports` | B sees the report | 200 | 200 |
| GET | `/api/v1/posts/{postId}/comments` |  | 200 | 200 |
| POST | `/api/v1/posts/{postId}/comments` |  | 201 | 201 |
| POST | `/api/v1/posts/{postId}/comments` | a reply | 201 | 201 |
| DELETE | `/api/v1/posts/{postId}/comments/{commentId}` | own reply | 204 | 204 |
| DELETE | `/api/v1/posts/{postId}/comments/{commentId}` | host deletes B's comment | 204 | 204 |
| GET | `/api/v1/posts/{postId}/comments/{commentId}/replies` |  | 200 | 200 |
| POST | `/api/v1/posts/{postId}/comments/{commentId}/report` | A reports B's comment | 202 | 202 |
| POST | `/api/v1/posts/{postId}/comments/{commentId}/report` | again (expect 409) | 409 CONFLICT | 409 CONFLICT |
| POST | `/api/v1/posts/{postId}/report` | B reports A's post | 202 | 202 |
| POST | `/api/v1/posts/{postId}/report` | own post (expect 400) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |

#### chat

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/conversations` |  | 200 | 200 |
| GET | `/api/v1/conversations` | tab=groups | 200 | 200 |
| GET | `/api/v1/conversations` | search | 200 | 200 |
| POST | `/api/v1/conversations` | B finds the group chat | 404 NOT_FOUND | 404 NOT_FOUND |
| POST | `/api/v1/conversations` | A starts a direct chat with B | 200 | 200 |
| GET | `/api/v1/conversations/unread-count` |  | 200 | 200 |
| GET | `/api/v1/conversations/{conversationId}` | direct | 200 | 200 |
| GET | `/api/v1/conversations/{conversationId}/messages` | direct | 200 | 200 |
| POST | `/api/v1/conversations/{conversationId}/messages` | direct, text | 201 | 201 |
| POST | `/api/v1/conversations/{conversationId}/messages` | direct, picture | 201 | 201 |
| POST | `/api/v1/conversations/{conversationId}/messages/{messageId}/report` | direct | 202 | 202 |
| POST | `/api/v1/conversations/{conversationId}/read` | direct | 204 | 204 |
| POST | `/api/v1/conversations/{conversationId}/typing` | direct | 204 | 204 |

#### group chat

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/conversations` | B lists groups before asking | 200 | 200 |
| GET | `/api/v1/conversations` | tab=groups lists it | 200 | 200 |
| GET | `/api/v1/conversations` | still listed after cancel? | 200 | 200 |
| POST | `/api/v1/conversations` | host opens the group chat | 200 | 200 |
| POST | `/api/v1/conversations` | B, now going, finds the group chat | 200 | 200 |
| GET | `/api/v1/conversations/{conversationId}` |  | 200 | 200 |
| GET | `/api/v1/conversations/{conversationId}` | after leaving the post (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |
| GET | `/api/v1/conversations/{conversationId}` | group chat after cancel (expect 404) | 200 | 404 NOT_FOUND |
| POST | `/api/v1/conversations/{conversationId}/members` | host brings B back | 204 | 204 |
| POST | `/api/v1/conversations/{conversationId}/members` | non-host adds (expect 403) | 403 FORBIDDEN | 403 FORBIDDEN |
| DELETE | `/api/v1/conversations/{conversationId}/members/{userId}` | B leaves the chat | 204 | 204 |
| DELETE | `/api/v1/conversations/{conversationId}/members/{userId}` | host leaving (expect 409) | 409 CONFLICT | 409 CONFLICT |
| GET | `/api/v1/conversations/{conversationId}/messages` |  | 200 | 200 |
| POST | `/api/v1/conversations/{conversationId}/messages` |  | 201 | 201 |
| POST | `/api/v1/conversations/{conversationId}/messages` | with a tagged post | 201 | 201 |
| POST | `/api/v1/conversations/{conversationId}/read` |  | 204 | 204 |
| GET | `/api/v1/me` |  | 200 | 200 |
| GET | `/api/v1/me/posts` | leftover drafts | 200 | 200 |
| POST | `/api/v1/posts` |  | 201 | 201 |
| GET | `/api/v1/posts/{postId}` | B reads the post (conversationId on it?) | 200 | 200 |
| DELETE | `/api/v1/posts/{postId}/rsvp` | B leaves the post | 204 | 204 |

#### profiles

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| GET | `/api/v1/me/blocks` | B listed | 200 | 200 |
| GET | `/api/v1/users/{userId}` |  | 200 | 200 |
| GET | `/api/v1/users/{userId}` | own id | 200 | 200 |
| GET | `/api/v1/users/{userId}` | unknown (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |
| GET | `/api/v1/users/{userId}` | blocked person opens A (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |
| GET | `/api/v1/users/{userId}/attended` |  | 200 | 200 |
| DELETE | `/api/v1/users/{userId}/block` |  | 204 | 204 |
| POST | `/api/v1/users/{userId}/block` |  | 204 | 204 |
| GET | `/api/v1/users/{userId}/plans` |  | 200 | 200 |
| GET | `/api/v1/users/{userId}/posts` |  | 200 | 200 |
| POST | `/api/v1/users/{userId}/report` |  | 409 CONFLICT | 202 |
| POST | `/api/v1/users/{userId}/report` | own profile (expect 400) | 400 VALIDATION_FAILED | 400 VALIDATION_FAILED |

#### notifications

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/me/devices` |  | 204 | 204 |
| POST | `/api/v1/me/devices/unregister` |  | 204 | 204 |
| GET | `/api/v1/me/notifications` |  | 200 | 200 |
| GET | `/api/v1/me/notifications` | B's unread (joins, chat, trusted) | 200 | 200 |
| POST | `/api/v1/me/notifications/read` | one | 204 | 204 |
| POST | `/api/v1/me/notifications/read` | all | 204 | 204 |

#### waitlist

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/waitlist` | bogus captcha (expect 400 CAPTCHA_FAILED) | 400 CAPTCHA_FAILED | 202 |
| POST | `/api/v1/waitlist/confirm` | expect 400 WAITLIST_LINK_INVALID | 400 WAITLIST_LINK_INVALID | 400 WAITLIST_LINK_INVALID |
| POST | `/api/v1/waitlist/remove` | expect 400 WAITLIST_LINK_INVALID | 400 WAITLIST_LINK_INVALID | 400 WAITLIST_LINK_INVALID |

#### sessions

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | a second device | 200 | 200 |
| POST | `/api/v1/auth/login` | a third device | 200 | 200 |
| POST | `/api/v1/auth/logout` | the third device signs out | 204 | 204 |
| POST | `/api/v1/auth/refresh` | A refreshes | 200 | 200 |
| POST | `/api/v1/auth/refresh` | old refresh token again (expect 401, single use) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| GET | `/api/v1/me` | its token afterwards (expect 401) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| GET | `/api/v1/me` | with the new access token | 200 | 200 |
| GET | `/api/v1/me/sessions` | three listed? | 200 | 200 |
| DELETE | `/api/v1/me/sessions/{sessionId}` | sign the second device out | 204 | 204 |
| DELETE | `/api/v1/me/sessions/{sessionId}` | unknown (expect 404) | 404 NOT_FOUND | 404 NOT_FOUND |

#### destructive (throwaway)

| Method | Path | Case | Dev | Staging |
| --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | back in with the new password | 200 | 200 |
| POST | `/api/v1/auth/logout/all` |  | 204 | 204 |
| POST | `/api/v1/auth/otp/verify` | C's code | 200 | 200 |
| POST | `/api/v1/auth/signup/email` | sign C up | 202 | 202 |
| DELETE | `/api/v1/me` | schedule deletion | 202 | 202 |
| GET | `/api/v1/me` | after scheduling deletion | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| POST | `/api/v1/me/email/change` | expect 202 (never confirmed) | 202 | 202 |
| POST | `/api/v1/me/email/change/confirm` | wrong code (expect 401) | 401 UNAUTHORIZED | 401 UNAUTHORIZED |
| POST | `/api/v1/me/password` |  | 204 | 204 |
| POST | `/api/v1/me/reauth` |  | 204 | 204 |
