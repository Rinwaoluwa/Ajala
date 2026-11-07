# Ajala API: what the mobile app needs from the backend

Nov 6, 2026 · from the mobile team · against the contract synced on Nov 3 (`docs/api/ajala-api-users-common.md`)

The app now follows the Nov 3 contract everywhere. This list is what it still needs: answers to questions where the docs disagree or are silent, and a few small additions. Each item says what we need, why, and the shape we propose. If you'd rather do something another way, tell us the shape and we'll follow it.

Items are in priority order within each section. **Blocking** means a screen can't be finished properly without it.

---

## A. Contract questions (please answer, and fix Swagger)

### A1. Does gender gate `profileCompletedAt`? (Blocking)
- **Conflict:**
  - The `GET /me` description says first name, last name and dob are enough, and gender is "optional and never needed".
  - The `MeDto.profileCompletedAt` field description says name, dob **and gender**.
- **What the app does now:** gender is optional in Profile Setup, and the app reads `profileCompletedAt` from the server only.
- **Problem:** if the server actually needs gender, someone who skips it is stuck in onboarding forever.
- **Need:** confirm that name + dob is enough. Then fix the `profileCompletedAt` description so the two agree.

### A2. Limits on `schedule` and `itinerary`
- **Problem:** the descriptions say "up to  lines", with the number missing. There is no `maxItems` and no per-line `maxLength`.
- **What the app does now:** it uses 30 lines × 120 characters.
- **Need:** both limits, as `maxItems` and `items.maxLength` in Swagger, and a 400 `VALIDATION_FAILED` on the field when they're exceeded.

### A3. Limits on `extras.travelStyles` and `extras.favouriteCityIds`
- **Problem:** "Up to 10" appears only in the descriptions.
- **Need:** `maxItems: 10` on both in Swagger. Also tell us what happens on an 11th: a 400, or silently cut?

### A4. Which call returns `SIGNUP_REFUSED`?
- **Problem:** it's in the error enum, but no User endpoint documents it.
- **What the app does now:** it shows "We can't create an account with these details" wherever it appears.
- **Need:**
  - the endpoints that can return it (sign-up? OTP verify? Google/Apple?);
  - the status code;
  - whether `details` carries anything.

### A5. Where does `deviceCheck` go on sign-up?
- **Conflict:** the description says "send with sign-up", but `SignupEmailDto` has no `deviceCheck` field. It's on `OtpVerifyDto`.
- **Need:** confirm that OTP verify is the right place for email sign-ups, or add the field to `SignupEmailDto`. The app doesn't generate the token yet, so this isn't urgent.

### A6. `HANDLE_COOLDOWN`: when can they change it again?
- **Problem:** the old docs had `details.availableAt` on the 409. The Nov 3 docs don't mention it.
- **What the app does now:** it shows "You can change your username again on {date}" when `availableAt` is present, and a vaguer line otherwise.
- **Need:** keep `details.availableAt` (ISO date-time) and document it.

### A7. Search: how should `interestIds` be sent, and is `type=all` accepted?
- **Conflict:** §2.18 writes `interestIds=` while the §3.10 table writes `interestIds[]`.
- **What the app does now:** it repeats the key, `?interestIds=a&interestIds=b`.
- **Need:**
  - confirm the encoding (repeated key, comma-separated, or brackets);
  - whether `GET /search/posts?type=all` works, or the app must omit `type` for "all".

### A8. Does `GET /me/rsvps?state=going` include posts I host?
- **What the app does now:** it merges `GET /me/rsvps?state=going` with `GET /me/posts?status=published` for the Trips "Upcoming" tab, and removes duplicates.
- **Need:** confirm whether hosted posts appear in `/me/rsvps`. If they do, say how to tell them apart: `PostDetailDto.isHost` exists on the detail, but not on the card.

### A9. Can one PATCH clear the pin and set `cityId`?
- **Why it matters:** a host can turn a Plan with a meeting point into one with only a destination city. The spec says `cityId` is refused "while the post has a pin". It doesn't say whether this one call is accepted:
  ```
  PATCH /posts/{id}  { lat: null, lng: null, cityId }
  ```
- **What the app does now:** it sends that single call.
- **Need:** confirm it's accepted. If it isn't, say whether the app should send two PATCHes: clear the pin first, then set the city.

### A10. How does the `/chat` socket authenticate?
- **What the app does now:** it connects to the `/chat` namespace and sends the access token two ways: as `auth.token` in the handshake, and as an `Authorization: Bearer` header. It asks for a fresh token on every reconnect.
- **Need:**
  - which of the two the server reads;
  - what it sends when the token expires mid-connection: a `connect_error` with a message we can match, or a disconnect;
  - the exact socket URL. We assume `<API host>/chat` on the default socket.io path.

### A11. What does "Read" mean in a group?
- **What the app does now:** `MemberDto.lastReadMessageId` is per member. My message shows "Read" once **every** other member who shares read receipts has read it.
- **Need:** confirm that "everyone" is right, rather than "anyone".

### A12. Trips, `visiting` and verification
These three are related:
- **Trips:** `/me/trips*` was removed from Swagger, but `MeDto.visiting`, `PublicProfileDto.visiting` and the `showCurrentCity` description still talk about trips.
  - Were trips dropped, or just left out of the docs?
  - If they were dropped, should `visiting` be removed too, or does teleport fill it?
- **Verification:** the selfie endpoints were removed, and `verified` is set by an admin. Is that permanent? If the selfie flow is coming back, give us a rough date so design can plan the screen.

### A13. iOS push: an APNs token or an FCM token?
- **Conflict:** `RegisterDeviceDto.token` is documented as "FCM token", for both `platform: 'ios'` and `'android'`.
- **What the app does now:** it sends the device's native token: an **FCM** registration token on Android, and the raw **APNs** device token (hex) on iOS. The app has no Firebase SDK on iOS.
- **Need:** say how the API sends to iPhones:
  - **APNs directly** (or FCM's APNs passthrough, which takes the APNs token): nothing changes in the app. Tell us whether local development builds' sandbox tokens are accepted (the app sends `platform: 'ios'` either way), or whether we should add an `apnsEnvironment: 'sandbox' | 'production'` field.
  - **FCM for iOS too:** the app has to add Firebase Messaging on iOS to get an FCM token, and Firebase needs our APNs key. Tell us, and we'll add it.
- **Also:** for iOS, put the inbox `data` keys beside `aps` in the payload (or under one `data` object). The app reads both.


### A14. Can a Google sign-in come without a nonce in the token? (Blocking for Google sign-in)
- **What the app does now:** it sends a fresh `nonce` in the `POST /auth/oauth/google` body, as the spec asks. It uses Google's free sign-in library for React Native, which **cannot** put that nonce inside Google's ID token, so the token itself has no `nonce` claim.
- **Need:** if the API checks the token's `nonce` claim against the body, every Google sign-in fails. Tell us which way you want it:
  - **(a)** accept Google ID tokens without a `nonce` claim, and still use the body nonce to stop replays; or
  - **(b)** keep the check. The app then has to move to Google's paid "Universal Sign-In" module, which supports nonces. That's a licence cost and one file to change on our side.
- Apple is not affected: its token does carry the nonce's SHA-256.
---

## B. Small additions the app needs

### B1. Teleport state on `GET /me` (Blocking for Travel)
- **Problem:** when the app opens while the user is already teleported, it doesn't know where they teleported to or what their home city is until the feed loads. The feed's `city` is the teleport city, and `homeCity` is on `/me`, but nothing says "you are teleported to X". So the Travel screen can show "Come back home", but not "You're in Accra".
- **Proposal:** add this to `MeDto`:
  ```ts
  /** Where Travel has put me; null when not teleported. Cleared when the subscription ends. */
  teleport: { city: CityRefDto; since: string } | null;
  ```

### B2. Sender name on a chat's last message (Blocking for group chats)
- **Problem:** the Messages list shows group previews as "Chioma: See you at 6". `LastMessageDto` has only `senderId`, so the app can only show a name when it happens to have the member list cached.
- **Proposal:** add this to `LastMessageDto`:
  ```ts
  /** First name of the sender; null for my own messages ("You:" is drawn by the app). */
  senderName: string | null;
  ```

### B3. A picture for group chats
- **Problem:** `ConversationDto` has no image. Group rows need one, and the design uses the post's cover.
- **Proposal:** add this to `ConversationDto`:
  ```ts
  /** Group: the post's cover (200px thumb). Direct: null (use other.avatarUrl). */
  imageUrl: string | null;
  ```

### B4. The post behind a group chat
- **Problem:** the chat screen shows a card for the post the group belongs to. With only `postId`, opening a chat costs an extra `GET /posts/{id}` before the card can draw.
- **Proposal:** add this to `ConversationDetailDto` (not the list item):
  ```ts
  post: PostCardDto | null;
  ```

### B5. Total unread chats, for a badge
- **Problem:** there's no single number for a Messages badge. Paging `GET /conversations?tab=unread` to count them is wasteful.
- **Proposal (either works):**
  - add `unreadConversations: number` to `ConversationsPageDto`, as `InboxPageDto` has `unreadCount`; or
  - add `GET /conversations/unread-count` → `{ count: number }`.

### B6. What a chat notification carries
- **Problem:** `NotificationDto.data` documents `kind` and "usually `postId`". For `new_message`, the app needs the conversation id to open the right chat from the inbox or a push.
- **Proposal:** document the `data` shape for each category. In particular:
  ```ts
  // category 'new_message'
  data: { kind: 'new_message'; conversationId: string; messageId: string }
  ```
  Also list the `kind` values for the other seven categories, and say which carry `postId`, `commentId` or `userId`.
- **Also, in pushes:** add the inbox item's id as `notificationId` to every push's data. Then tapping a push can mark that inbox item read (`POST /me/notifications/read { ids }`). Without it, the app can only refetch the inbox, and the badge stays up until the person opens the list. The app already reads `notificationId` when it's there.

### B7. Who a notification is about
- **Problem:** the inbox design shows the other person's photo on "Ada asked to join", "Tolu commented". `NotificationDto` has no person, so the app shows a category icon instead.
- **Proposal:** add this to `NotificationDto`:
  ```ts
  /** The person who caused it (requester, commenter, sender); null for system notices. */
  actor: HostCardDto | null;
  ```

### B8. Waitlisted posts in "my lists"
- **Problem:** `/me/rsvps` takes `going` or `requested` only. A waitlisted user can't see that post anywhere in the app except by finding it again.
- **Proposal:** accept `state=waitlisted` on `GET /me/rsvps`, with the same shape. The card already has `rsvpState`, and the detail has `waitlistPosition`.

### B9. `isHost` on cards
- **Problem:** lists that mix my posts with other people's (Trips, Saved, search) can't mark "Hosting" without comparing `host.id` to my id.
- **Proposal:** add `isHost: boolean` to `PostCardDto`, as `PostDetailDto` has it. This is low priority, because the app can compare ids.

---

## C. Product decisions we need written down (backend + product)

1. **Shared cost on a Meetup.** The design offers "shared cost" in every wizard, but `costTotalCents` is a 400 on Meetups and Events. Either:
   - accept a cost split on Meetups too; or
   - confirm it's Plans and Groups only, and the app will hide it on Meetups.
2. **Price and shared cost on the same post.** A Plan or Group may carry both `price` and `costSplit`. Which one should the card show? Or should the API refuse both on one post?
3. **Feed filter chips.** The Figma chips (Activities, Trips, Events, Food) don't match the four post types. The app shows All / Meetups / Events / Plans / Groups for now.
4. **Gamification.** The level card, stamps, badges, streaks and the Events / Countries / Streak counters still have no API. The app shows them as static placeholders. Are they planned?
5. **Notification toggles.** The design has "Nearby activity" and "Recommendations" switches. Map them to existing settings, or add two fields to `UserSettingsDto`?
6. **Share my plan with a trusted contact.** `sharePlans` shares plans publicly on the profile. Is the private trusted-contact share still wanted?

---

## D. Configuration the backend must have for things the app already does

1. **Sign in with Apple:** the API must accept identity tokens whose audience is the iOS bundle id **`com.ajala.app`**, issued for Team ID **A2ZCQRWRA9**. Please confirm the team id with us before setting it.
2. **Google sign-in:** the API must accept ID tokens from our iOS and Android OAuth client ids. We'll send them once they're created in the Google Cloud project you verify against. For the Android OAuth clients:
   - package name: `com.ajala.app`
   - **upload key** (EAS, signs every EAS build):
     - SHA-1 `F3:4F:CF:95:1A:33:CA:08:7B:2C:F8:B5:1A:4B:59:89:D1:85:3B:87`
     - SHA-256 `B8:0B:B6:9A:D5:CF:9D:99:CF:FD:6E:16:6F:CF:83:A9:B1:39:5F:F2:33:F2:64:DA:7F:D2:ED:3A:E7:C4:B8:A5`
   - **debug key** (local development builds; Expo's shared debug key): SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
   - **Play app signing key:** once the app is on Google Play, Play re-signs it with its own key. Copy that SHA-1 from Play Console (App integrity) and add a third Android client, or sign-in fails for people who install from the Play Store.
3. **Universal links and app links:**
   - `/.well-known/apple-app-site-association` must list `A2ZCQRWRA9.com.ajala.app` for the post (`/posts/*`) and profile (`/users/*`) paths, and under `webcredentials` for password autofill.
   - `/.well-known/assetlinks.json` must list `com.ajala.app` with our signing SHA-256: `B8:0B:B6:9A:D5:CF:9D:99:CF:FD:6E:16:6F:CF:83:A9:B1:39:5F:F2:33:F2:64:DA:7F:D2:ED:3A:E7:C4:B8:A5` (EAS upload key). Once the app is on Google Play, also add the Play app signing key's SHA-256 from Play Console.
4. **Subscriptions (when we turn buying on):**
   - the product ids for the monthly Travel plan on both stores;
   - App Store Server Notifications v2 and Google Real-time Developer Notifications pointed at the API;
   - which environments answer 503 `SERVICE_UNAVAILABLE`, so testers know where buying works.

   The app already reads `GET /me/subscription`, opens Manage, and has the challenge/verify calls typed and ready.

---

## E. How to tell us it's done

For each item, update Swagger and reply with the item number (e.g. "B2 done on dev"). We re-sync `docs/api` from Swagger and wire each change. Items in A only need an answer and a Swagger fix.
