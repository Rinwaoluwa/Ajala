# Ajala API: what the mobile app needs from the backend

Nov 6, 2026 · from the mobile team · against the contract synced on Nov 3 (`docs/api/ajala-api-users-common.md`)

The app now follows the Nov 3 contract everywhere. This list is what it still needs: answers to questions where the docs disagree or are silent, and a few small additions. Each item says what we need, why, and the shape we propose. If you'd rather do something another way, tell us the shape and we'll follow it.

Items are in priority order within each section. **Blocking** means a screen can't be finished properly without it.

**Status, Nov 9, 2026:** the backend answered most items in [backend-answers-2026-11-09.md](backend-answers-2026-11-09.md). Each item below has a status line: **Answered**, **Done** (built on dev), **Not now**, or **Open**.

**Still open:**

- **A9:** one PATCH that clears the pin and sets `cityId`.
- **A10:** how the `/chat` socket authenticates.
- **A11:** whether "Read" in a group means everyone.
- **A13:** APNs or FCM token on iOS.
- **A14:** Google ID tokens without a `nonce` claim (blocks Google sign-in).
- **B6 (part):** `notificationId` in every push.
- **C6:** the trusted person's response shapes (in Swagger, not yet in our spec).
- **D1:** Team ID `A2ZCQRWRA9` confirmation.
- **D2:** the API accepting our Google client ids, including the Play signing client.
- **D4:** the weekly plan's store product ids.

---

## A. Contract questions (please answer, and fix Swagger)

### A1. Does gender gate `profileCompletedAt`? (Blocking)
**Status: Answered.** Name and date of birth are enough; gender is never needed. An email sign-up stays incomplete until its first `PATCH /me`. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Conflict:**
  - The `GET /me` description says first name, last name and dob are enough, and gender is "optional and never needed".
  - The `MeDto.profileCompletedAt` field description says name, dob **and gender**.
- **What the app does now:** gender is optional in Profile Setup, and the app reads `profileCompletedAt` from the server only.
- **Problem:** if the server actually needs gender, someone who skips it is stuck in onboarding forever.
- **Need:** confirm that name + dob is enough. Then fix the `profileCompletedAt` description so the two agree.

### A2. Limits on `schedule` and `itinerary`
**Status: Answered.** 30 lines of 120 characters; over is a 400 on the field. Now in Swagger. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Problem:** the descriptions say "up to  lines", with the number missing. There is no `maxItems` and no per-line `maxLength`.
- **What the app does now:** it uses 30 lines × 120 characters.
- **Need:** both limits, as `maxItems` and `items.maxLength` in Swagger, and a 400 `VALIDATION_FAILED` on the field when they're exceeded.

### A3. Limits on `extras.travelStyles` and `extras.favouriteCityIds`
**Status: Answered.** An 11th is a 400, never silently cut. Now in Swagger. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Problem:** "Up to 10" appears only in the descriptions.
- **Need:** `maxItems: 10` on both in Swagger. Also tell us what happens on an 11th: a 400, or silently cut?

### A4. Which call returns `SIGNUP_REFUSED`?
**Status: Answered.** A 403 from `POST /auth/oauth/google` and `/apple` only, with no details. Email sign-up answers its normal 202. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Problem:** it's in the error enum, but no User endpoint documents it.
- **What the app does now:** it shows "We can't create an account with these details" wherever it appears.
- **Need:**
  - the endpoints that can return it (sign-up? OTP verify? Google/Apple?);
  - the status code;
  - whether `details` carries anything.

### A5. Where does `deviceCheck` go on sign-up?
**Status: Answered.** On `POST /auth/otp/verify`; a 400 on the sign-up call, and a malformed token is a 400 too. The app doesn't send it yet. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Conflict:** the description says "send with sign-up", but `SignupEmailDto` has no `deviceCheck` field. It's on `OtpVerifyDto`.
- **Need:** confirm that OTP verify is the right place for email sign-ups, or add the field to `SignupEmailDto`. The app doesn't generate the token yet, so this isn't urgent.

### A6. `HANDLE_COOLDOWN`: when can they change it again?
**Status: Answered.** `details.availableAt` stays and is now documented. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Problem:** the old docs had `details.availableAt` on the 409. The Nov 3 docs don't mention it.
- **What the app does now:** it shows "You can change your username again on {date}" when `availableAt` is present, and a vaguer line otherwise.
- **Need:** keep `details.availableAt` (ISO date-time) and document it.

### A7. Search: how should `interestIds` be sent, and is `type=all` accepted?
**Status: Answered.** The repeated key is right, and `type=all` now works. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Conflict:** §2.18 writes `interestIds=` while the §3.10 table writes `interestIds[]`.
- **What the app does now:** it repeats the key, `?interestIds=a&interestIds=b`.
- **Need:**
  - confirm the encoding (repeated key, comma-separated, or brackets);
  - whether `GET /search/posts?type=all` works, or the app must omit `type` for "all".

### A8. Does `GET /me/rsvps?state=going` include posts I host?
**Status: Answered.** Hosted posts are never in `/me/rsvps`, so the merge can't make duplicates. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **What the app does now:** it merges `GET /me/rsvps?state=going` with `GET /me/posts?status=published` for the Trips "Upcoming" tab, and removes duplicates.
- **Need:** confirm whether hosted posts appear in `/me/rsvps`. If they do, say how to tell them apart: `PostDetailDto.isHost` exists on the detail, but not on the card.

### A9. Can one PATCH clear the pin and set `cityId`?
**Status: Open.** Not answered this round. (The answers file's "A9" is about trips; that is A12 here.) The app still sends one PATCH. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Why it matters:** a host can turn a Plan with a meeting point into one with only a destination city. The spec says `cityId` is refused "while the post has a pin". It doesn't say whether this one call is accepted:
  ```
  PATCH /posts/{id}  { lat: null, lng: null, cityId }
  ```
- **What the app does now:** it sends that single call.
- **Need:** confirm it's accepted. If it isn't, say whether the app should send two PATCHes: clear the pin first, then set the city.

### A10. How does the `/chat` socket authenticate?
**Status: Open.** Not answered this round. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **What the app does now:** it connects to the `/chat` namespace and sends the access token two ways: as `auth.token` in the handshake, and as an `Authorization: Bearer` header. It asks for a fresh token on every reconnect.
- **Need:**
  - which of the two the server reads;
  - what it sends when the token expires mid-connection: a `connect_error` with a message we can match, or a disconnect;
  - the exact socket URL. We assume `<API host>/chat` on the default socket.io path.

### A11. What does "Read" mean in a group?
**Status: Open.** Not answered this round. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **What the app does now:** `MemberDto.lastReadMessageId` is per member. My message shows "Read" once **every** other member who shares read receipts has read it.
- **Need:** confirm that "everyone" is right, rather than "anyone".

### A12. Trips, `visiting` and verification
**Status: Answered** (as "A9" in the answers file). Trips are parked and `visiting` stays null (teleport doesn't fill it). Selfie verification is gone; `verified` means our team reviewed the profile. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

These three are related:
- **Trips:** `/me/trips*` was removed from Swagger, but `MeDto.visiting`, `PublicProfileDto.visiting` and the `showCurrentCity` description still talk about trips.
  - Were trips dropped, or just left out of the docs?
  - If they were dropped, should `visiting` be removed too, or does teleport fill it?
- **Verification:** the selfie endpoints were removed, and `verified` is set by an admin. Is that permanent? If the selfie flow is coming back, give us a rough date so design can plan the screen.

### A13. iOS push: an APNs token or an FCM token?
**Status: Open.** Not answered this round. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **Conflict:** `RegisterDeviceDto.token` is documented as "FCM token", for both `platform: 'ios'` and `'android'`.
- **What the app does now:** it sends the device's native token: an **FCM** registration token on Android, and the raw **APNs** device token (hex) on iOS. The app has no Firebase SDK on iOS.
- **Need:** say how the API sends to iPhones:
  - **APNs directly** (or FCM's APNs passthrough, which takes the APNs token): nothing changes in the app. Tell us whether local development builds' sandbox tokens are accepted (the app sends `platform: 'ios'` either way), or whether we should add an `apnsEnvironment: 'sandbox' | 'production'` field.
  - **FCM for iOS too:** the app has to add Firebase Messaging on iOS to get an FCM token, and Firebase needs our APNs key. Tell us, and we'll add it.
- **Also:** for iOS, put the inbox `data` keys beside `aps` in the payload (or under one `data` object). The app reads both.

### A14. Can a Google sign-in come without a nonce in the token? (Blocking for Google sign-in)
**Status: Open.** Not answered this round; Google sign-in still depends on it. ([answers](backend-answers-2026-11-09.md#a-contract-questions))

- **What the app does now:** it sends a fresh `nonce` in the `POST /auth/oauth/google` body, as the spec asks. It uses Google's free sign-in library for React Native, which **cannot** put that nonce inside Google's ID token, so the token itself has no `nonce` claim.
- **Need:** if the API checks the token's `nonce` claim against the body, every Google sign-in fails. Tell us which way you want it:
  - **(a)** accept Google ID tokens without a `nonce` claim, and still use the body nonce to stop replays; or
  - **(b)** keep the check. The app then has to move to Google's paid "Universal Sign-In" module, which supports nonces. That's a licence cost and one file to change on our side.
- Apple is not affected: its token does carry the nonce's SHA-256.

---

## B. Small additions the app needs

### B1. Teleport state on `GET /me` (Blocking for Travel)
**Status: Done** (without `since`). `MeDto.teleport` is `{ city }` or null, and null once the subscription ends. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** when the app opens while the user is already teleported, it doesn't know where they teleported to or what their home city is until the feed loads. The feed's `city` is the teleport city, and `homeCity` is on `/me`, but nothing says "you are teleported to X". So the Travel screen can show "Come back home", but not "You're in Accra".
- **Proposal:** add this to `MeDto`:
  ```ts
  /** Where Travel has put me; null when not teleported. Cleared when the subscription ends. */
  teleport: { city: CityRefDto; since: string } | null;
  ```

### B2. Sender name on a chat's last message (Blocking for group chats)
**Status: Done.** `LastMessageDto.senderName`: first name, null for my own, "Deleted user" for a wiped account. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** the Messages list shows group previews as "Chioma: See you at 6". `LastMessageDto` has only `senderId`, so the app can only show a name when it happens to have the member list cached.
- **Proposal:** add this to `LastMessageDto`:
  ```ts
  /** First name of the sender; null for my own messages ("You:" is drawn by the app). */
  senderName: string | null;
  ```

### B3. A picture for group chats
**Status: Done.** `ConversationDto.imageUrl`: the post's cover at 200 px; null in a direct chat or when I can't see the post. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** `ConversationDto` has no image. Group rows need one, and the design uses the post's cover.
- **Proposal:** add this to `ConversationDto`:
  ```ts
  /** Group: the post's cover (200px thumb). Direct: null (use other.avatarUrl). */
  imageUrl: string | null;
  ```

### B4. The post behind a group chat
**Status: Done.** `ConversationDetailDto.post` is a `PostCardDto` with my own `rsvpState` and `saved`; `distanceKm` is always null. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** the chat screen shows a card for the post the group belongs to. With only `postId`, opening a chat costs an extra `GET /posts/{id}` before the card can draw.
- **Proposal:** add this to `ConversationDetailDto` (not the list item):
  ```ts
  post: PostCardDto | null;
  ```

### B5. Total unread chats, for a badge
**Status: Done.** `GET /conversations/unread-count` → `{ count }`, counting conversations. The app's badge uses it. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** there's no single number for a Messages badge. Paging `GET /conversations?tab=unread` to count them is wasteful.
- **Proposal (either works):**
  - add `unreadConversations: number` to `ConversationsPageDto`, as `InboxPageDto` has `unreadCount`; or
  - add `GET /conversations/unread-count` → `{ count: number }`.

### B6. What a chat notification carries
**Status: Answered.** A chat push carries `{ kind: 'chat.message', conversationId }`, no `messageId`; `new_message` never appears in the inbox. `notificationId` in pushes was not answered: still open. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** `NotificationDto.data` documents `kind` and "usually `postId`". For `new_message`, the app needs the conversation id to open the right chat from the inbox or a push.
- **Proposal:** document the `data` shape for each category. In particular:
  ```ts
  // category 'new_message'
  data: { kind: 'new_message'; conversationId: string; messageId: string }
  ```
  Also list the `kind` values for the other seven categories, and say which carry `postId`, `commentId` or `userId`.
- **Also, in pushes:** add the inbox item's id as `notificationId` to every push's data. Then tapping a push can mark that inbox item read (`POST /me/notifications/read { ids }`). Without it, the app can only refetch the inbox, and the badge stays up until the person opens the list. The app already reads `notificationId` when it's there.

### B7. Who a notification is about
**Status: Not now.** Keep the category icons until after launch. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** the inbox design shows the other person's photo on "Ada asked to join", "Tolu commented". `NotificationDto` has no person, so the app shows a category icon instead.
- **Proposal:** add this to `NotificationDto`:
  ```ts
  /** The person who caused it (requester, commenter, sender); null for system notices. */
  actor: HostCardDto | null;
  ```

### B8. Waitlisted posts in "my lists"
**Status: Done.** `GET /me/rsvps?state=waitlisted` works; the place in line stays on the post screen. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** `/me/rsvps` takes `going` or `requested` only. A waitlisted user can't see that post anywhere in the app except by finding it again.
- **Proposal:** accept `state=waitlisted` on `GET /me/rsvps`, with the same shape. The card already has `rsvpState`, and the detail has `waitlistPosition`.

### B9. `isHost` on cards
**Status: Not now.** Not built; compare `host.id` with my id. My own post shows `rsvpState: 'none'`, and joining it is a 409. ([answers](backend-answers-2026-11-09.md#b-additions))

- **Problem:** lists that mix my posts with other people's (Trips, Saved, search) can't mark "Hosting" without comparing `host.id` to my id.
- **Proposal:** add `isHost: boolean` to `PostCardDto`, as `PostDetailDto` has it. This is low priority, because the app can compare ids.

### B10. What a feed post needs on its card (22 Nov, the new Home design)
**Status: Open.**

- **Problem:** the new Home feed draws each post as a social post: the host, when it was posted, the host's words, the photos, then a Join banner and a row of actions. `PostCardDto` has none of the first three, so the app asks `GET /posts/:id` once per card for the words (20 extra calls a page) and shows the distance where the time should be.
- **Proposal:** add to `PostCardDto`:
  ```ts
  /** The host's words; the feed shows the first two lines. */
  description: string;
  /** When it went live. */
  publishedAt: string;
  ```

### B11. Comment count on cards
**Status: Open.**

- **Problem:** the design shows the number of comments beside the comment button. The count exists only as `total` on `GET /posts/:id/comments`.
- **Today:** the app asks `GET /posts/:id/comments?limit=1` once per post on screen and reads `total` (kept for five minutes), a second extra call per card on top of B10's.
- **Proposal:** add `commentCount: number` to `PostCardDto`.

### B12. Likes
**Status: Not needed (24 Nov). Product took liking out of the app: there is no heart on a post any more, and nothing is kept on the phone. The rest is how it stood, for if likes come back.**

- **Problem:** the design has a heart and a like count on every post. The spec says there are none (§2.11 "No likes, no engagement ranking"; comments: "no likes"), and `POST /posts/:id/like` is a 404 (checked again on staging and dev, 22 Nov).
- **Today:** the heart is drawn and remembered on the phone only, per account. The host is not told and the like does not follow the person to another phone. The count beside it is only the reader's own like (1 or nothing), because the phone knows of no others.
- **Need:** are likes coming? If so: `POST` / `DELETE /posts/:id/like` (204), and `likeCount: number` and `liked: boolean` on `PostCardDto` and `PostDetailDto`.

### B13. Hide, Not interested and Mute
**Status: Open.**

- **Problem:** the design's post menu has "Hide post", "Not interested" (see fewer posts like this) and "Mute this person" (stop seeing their posts). None has an endpoint (`/posts/:id/hide`, `/posts/:id/not-interested` and `/users/:id/mute` are 404).
- **Today:** "Hide post" is done on the phone (the post is remembered there and left out of the feed), so it does not follow the person to another phone. The other two are left out: "see fewer like this" needs the server's ranking, and a mute nobody can see or undo would be a trap.
- **Proposal:** `POST` / `DELETE /posts/:id/hide`; `POST` / `DELETE /users/:id/mute` with `GET /me/mutes` for a settings list, both leaving the feed, map and search; and a decision on what "Not interested" should change.

### B14. Posts without photos
**Status: Done on staging (checked 23 Nov, 10:20 WAT): a Meetup, a Group and an Event each published with no `images`. The carousel question below is still open. Dev not checked: no working dev test login.**

- **Problem:** the new Home design has posts that are words alone, and product says photos are now optional. The app no longer asks for them (none, or up to four) and sends the publish with no `images`. Staging still answers 400 `VALIDATION_FAILED` `{ field: "images", message: "Add 2 to 4 images" }`:
  - from the app, 22 Nov 19:33 WAT, request `cfc34b5f-5493-4ad6-af6f-9fb27da8bfdd`;
  - from curl with no app involved (a Meetup, every other publish rule met), 19:36 WAT, request `1cf6db31-edf4-42c3-ab9d-6177f6184590`.
- **Today:** the review step shows the server's own "Add 2 to 4 images" with a link back to the photos. A post cannot go live on staging without two photos until the server changes.
- **Also needed:** a way to empty a carousel when someone removes every photo from a post that had some. `PUT /posts/:id/images` answers 400 on the count, so the app does not call it with none and the old photos stay.
- **Proposal:** publish with 0 to 4 images, for every type; `PUT /posts/:id/images` with no files clears the carousel (or `DELETE /posts/:id/images`); cards and detail then come with `images: []`.

### B15. Exchange rates
**Status: Open.**

- **Problem:** the app now works in the currency of where the person is (naira in Lagos, euros in Paris) and shows a price in another currency with its rough equivalent ("₦15,000 · ≈ €8.50"). Explore's "Maximum price" compares posts priced in other currencies the same way. The API has no rates.
- **Today:** the app reads a public, key-less daily table (the open `currency-api` dataset, from jsDelivr with a mirror; `src/core/fx/exchangeRates.ts`). Nothing about the person is sent. If it does not answer, no estimate is shown. It is a third-party source with no guarantee, and each phone reads it for itself.
- **Proposal:** `GET /fx/rates` (no auth) → `{ base: "USD", date, rates: { NGN: 1353.02, … } }`, cached for a day, so the app and the server agree and the source is ours to choose. With it, `GET /map/pins` and `GET /search/posts` could also take `maxPrice` + `currency` and filter on the server.

### B16. Capacity: is "no limit" allowed on every type?
**Status: Answered by staging (23 Nov, 10:20 WAT). The app no longer has a size by type (product, 23 Nov): any type takes 1 to 100,000 people, or no limit. Staging published an Event of 50, a Group of 500 and a Meetup of 5,000, so the per-type rule in §2.12 is not enforced there. Please keep it that way on every server, and correct the spec.**

- **What we see:** the spec says a Group needs 1–100 (§2.12). On staging (22 Nov) a publish with no `capacity` fails only on `images` for a Meetup, a Group and an Event alike; no capacity rule is listed.
- **Today:** clearing the capacity field means "No limit" on every type, and the post is sent with no `capacity`.
- **Need:** confirm that no capacity is valid on a Group (and a Plan). If a Group must have 1–100, say so and the app will ask for one again.

### B17. Search as the person types
**Status: Not needed for now (24 Nov). The app is back to searching on submit, as the spec says. Kept for if it returns.**

- **What the spec says:** search "runs on submit; no typeahead" (§2.18).
- **What happened:** for a day (23 to 24 Nov) the field on the Explore map listed the activities found under it as someone typed, asking `GET /search/posts?q=` once typing had paused for 350 ms, for 2 characters or more.
- **Now:** the map's field searches on submit (product, 24 Nov). Someone types there and presses the keyboard's Search key; the Explore list then opens with those words and asks `GET /search/posts?q=` once. The list's own box asks the same way (its Search key, the "Search for …" row, a past search). Nothing is asked while typing. The listing under the field is still in the code, switched off (`RESULTS_HERE` in `MapSearchBar`).
- **Only if it comes back:**
  - confirm asking after a pause is all right for `GET /search/posts`, and say if there is a rate limit on it (the only one in the spec, 30 a minute, is on signing in);
  - if it is not, say what is: a longer pause, a minimum of 3 characters, or a lighter endpoint for suggestions (titles and ids only), which the app would switch to.

---

## C. Product decisions we need written down (backend + product)

1. **Shared cost on a Meetup.** The design offers "shared cost" in every wizard, but `costTotalCents` is a 400 on Meetups and Events. Either:
   - accept a cost split on Meetups too; or
   - confirm it's Plans and Groups only, and the app will hide it on Meetups.

   **Status: Answered.** No shared cost anywhere. Meetups, Events and Groups get one price screen the host can skip; Plans get none. ([answers](backend-answers-2026-11-09.md#c-product-decisions))

2. **Price and shared cost on the same post.** A Plan or Group may carry both `price` and `costSplit`. Which one should the card show? Or should the API refuse both on one post?

   **Status: Answered.** No shared cost, so a card shows the price or nothing. ([answers](backend-answers-2026-11-09.md#c-product-decisions))

3. **Feed filter chips.** The Figma chips (Activities, Trips, Events, Food) don't match the four post types. The app shows All / Meetups / Events / Plans / Groups for now.

   **Status: Answered.** Keep All / Meetups / Events / Plans / Groups; Figma will match. ([answers](backend-answers-2026-11-09.md#c-product-decisions))

4. **Gamification.** The level card, stamps, badges, streaks and the Events / Countries / Streak counters still have no API. The app shows them as static placeholders. Are they planned?

   **Status: Not now.** Gamification comes in a later round; keep the static placeholders. ([answers](backend-answers-2026-11-09.md#c-product-decisions))

5. **Notification toggles.** The design has "Nearby activity" and "Recommendations" switches. Map them to existing settings, or add two fields to `UserSettingsDto`?

   **Status: Done.** `notifyNearbyActivity` (default on) and `notifyRecommendations` (default off) on `UserSettingsDto`; only saved for now. ([answers](backend-answers-2026-11-09.md#c-product-decisions))

6. **Share my plan with a trusted contact.** `sharePlans` shares plans publicly on the profile. Is the private trusted-contact share still wanted?

   **Status: Answered.** "Share my plan" is the trusted person, built on the backend. The app knows the endpoints but hasn't built it: waiting for Swagger shapes and design. `sharePlans` stays, with a different name. ([answers](backend-answers-2026-11-09.md#trusted-person-endpoints))

---

## D. Configuration the backend must have for things the app already does

1. **Sign in with Apple:** the API must accept identity tokens whose audience is the iOS bundle id **`com.ajala.app`**, issued for Team ID **A2ZCQRWRA9**. Please confirm the team id with us before setting it.

   **Status: Answered, Team ID open.** The API accepts `com.ajala.app`; Team ID `A2ZCQRWRA9` is still being confirmed. ([answers](backend-answers-2026-11-09.md#d-configuration))

2. **Google sign-in:** the API must accept ID tokens from our iOS and Android OAuth client ids. We'll send them once they're created in the Google Cloud project you verify against. For the Android OAuth clients:
   - package name: `com.ajala.app`
   - **upload key** (EAS, signs every EAS build):
     - SHA-1 `F3:4F:CF:95:1A:33:CA:08:7B:2C:F8:B5:1A:4B:59:89:D1:85:3B:87`
     - SHA-256 `B8:0B:B6:9A:D5:CF:9D:99:CF:FD:6E:16:6F:CF:83:A9:B1:39:5F:F2:33:F2:64:DA:7F:D2:ED:3A:E7:C4:B8:A5`
   - **debug key** (local development builds; Expo's shared debug key): SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **Play app signing key:** once the app is on Google Play, Play re-signs it with its own key. Copy that SHA-1 from Play Console (App integrity) and add a third Android client, or sign-in fails for people who install from the Play Store.

   **Status: Open.** Not answered directly. The Google client ids now exist as EAS environment variables; confirm the API accepts them, including the Play signing client. ([answers](backend-answers-2026-11-09.md#app-configuration-from-the-team))

3. **Universal links and app links:**
   - `/.well-known/apple-app-site-association` must list `A2ZCQRWRA9.com.ajala.app` for the post (`/posts/*`) and profile (`/users/*`) paths, and under `webcredentials` for password autofill.
   - `/.well-known/assetlinks.json` must list `com.ajala.app` with our signing SHA-256: `B8:0B:B6:9A:D5:CF:9D:99:CF:FD:6E:16:6F:CF:83:A9:B1:39:5F:F2:33:F2:64:DA:7F:D2:ED:3A:E7:C4:B8:A5` (EAS upload key). Once the app is on Google Play, also add the Play app signing key's SHA-256 from Play Console.

   **Status: Done.** Links live on `go.ajalatrvl.com` (`dev-go`, `staging-go` for test builds), and the Apple file includes `webcredentials`. A browser without the app gets a generic "Get the app" page. ([answers](backend-answers-2026-11-09.md#d-configuration))

4. **Subscriptions (when we turn buying on):**
   - the product ids for the monthly Travel plan on both stores;
   - App Store Server Notifications v2 and Google Real-time Developer Notifications pointed at the API;
   - which environments answer 503 `SERVICE_UNAVAILABLE`, so testers know where buying works.

   The app already reads `GET /me/subscription`, opens Manage, and has the challenge/verify calls typed and ready.

   **Status: Answered, product ids open.** The plan is **weekly**, not monthly. Store notifications go to `POST /api/v1/webhooks/apple` and `/google`. Buying answers 503 in every environment today; a 500 means try again. Product ids not given yet. ([answers](backend-answers-2026-11-09.md#d-configuration))

---

## E. How to tell us it's done

For each item, update Swagger and reply with the item number (e.g. "B2 done on dev"). We re-sync `docs/api` from Swagger and wire each change. Items in A only need an answer and a Swagger fix.
