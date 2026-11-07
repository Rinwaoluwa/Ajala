# Demo mode

Run the whole app with realistic data and no backend — for UI testing, design review and demos.

```bash
npm run demo        # Metro with EXPO_PUBLIC_DEMO=1, then open the installed dev build
```

It needs the native dev build already on the phone or simulator (`npx expo run:ios`). The flag
is read when the bundle is built, so switch modes by restarting Metro (`npm run demo` /
`npm start`), not by reloading.

## How it works

`apiRequest` (`src/core/api/apiClient.ts`) hands every request to `src/core/demo/demoApi.ts`
instead of the network. Each feature's real repositories, mappers and caches run unchanged against
answers shaped exactly like the API's (docs/api spec §6). Nothing is sent anywhere.

State lives in memory while the app runs and starts again on restart.

## What you can do

| Try | What happens |
| --- | --- |
| Sign in with **any email and password** | Ada Obi, a finished profile in Lagos, with Travel on (see below). Login answers only the tokens; the app then reads `GET /me` |
| Sign up | Any 6-digit code verifies it; profile setup follows. The profile counts as finished once first name, last name and date of birth are set (gender is optional) |
| Forgot password | Any 6-digit code is accepted and buys a reset token; any new password is taken |
| Home feed | 12 posts in Lagos (meetups, events, plans, groups); filters by type. Cards carry `saved`, `endAt`, `costSplit`, `recurrence`, `joinMode` as the spec has them |
| Post page | Events show a running order (`schedule`), Plans their stops (`itinerary`); Tarkwa Bay Beach Day splits its boat hire (about ₦12,000 each); the Sunday ride and Sunset Yoga repeat weekly |
| "+" → any type → Publish | Validates like the API (2–4 photos, interests, future start, a pin for Meetups and Events, an Event over 100 people or unlimited, a Group of 1–100, a link for a paid Event). Fields that belong to another type (a schedule on a Meetup, a cost split on an Event, a repeat on anything but a Group) are a 400 on that field. The post then shows on the feed and the map |
| Save draft | Saved; later saves and Publish update the same post |
| Bookmark a card | Saved to the account: it shows on every card for that post, and in Saved activities (`GET /me/saved`), newest first. Jazz on the Terrace and Tarkwa Bay start saved. Drafts can't be saved |
| Trips | Upcoming (`GET /me/rsvps`): Golden Hour Photo Walk and Sunday Morning Ride. Requested: Black American Cultural Celebration. Joining anything adds it |
| Explore map | Pins across Lagos; type chips, a title filter (`q`), "Happening today", search any demo city |
| Search | Posts by words and/or interest chips in the feed's city, title matches first (`GET /search/posts`); people by first name or handle, `@` optional (`GET /search/people`) |
| Popular cities | `GET /cities/popular`: Lagos first (it has the posts), then the rest of the demo's cities |
| Teleport | Pick a city: the feed, map and search move there and say "teleport" until you come home (`DELETE /me/teleport`) |
| Tap a pin → RSVP | Coffee & Chat: going. Lagos Tech Founders: requested (private). Afrobeats After Hours: paid, opens its booking link. Sunset Yoga Circle: full → waitlisted |
| ⋯ → Report activity | Filed; reporting the same post again says it is already reported |
| Notifications | Eight, one of each category, the newest four unread; each opens a real demo post. Mark one or all read |
| Push | After sign-in the app asks once for notification permission and registers the phone (`POST /me/devices`, answered 204; sign-out unregisters first). The demo never sends a push itself: send one to the simulator yourself (see "Trying a push" below) |
| Comments | Top-level comments with "View N replies"; reply, delete your own (or any on a post you host), report others'. One deleted comment with replies shows "Comment deleted" |
| Messages | Direct and group chats from `/conversations`: All / Unread / Groups, search, photos, read marks, report a message. "Message" on a profile or a post, and a host's "Group chat", open or start one. No live socket in the demo; threads refresh when opened |
| Settings → privacy | Show current city, open to meet today, share my plans, who can message me, read receipts, usage analytics; Your reports lists past reports |
| Settings → account | Confirm it's you takes the password (any) or, for a Google/Apple-only account, an emailed code (any 6 digits). Set a password, download my data (queued, then ready a few seconds later), sign out everywhere |
| Settings → sign-in methods | Email and Google are linked: Google can be unlinked; the last one left can't (`LAST_SIGN_IN_METHOD`) |
| Apple sign-in | The real Apple sheet; the demo signs in with the name and email Apple gives |
| Google sign-in | Not in the demo — use email or Apple |

### Travel (the subscription)

The demo person **is subscribed** — a complimentary subscription (`platform: 'comp'`, nothing to
manage in a store) running 30 days from launch — so teleport and the rest of Travel can be tried
without a purchase. `GET /me` says `subscribed: true` to match.

The purchase calls still answer: `GET /me/subscription/challenge` gives a challenge; the Apple and
Google verify calls switch the subscription to that store; a web checkout is refused while
subscribed (409, as the API does), and confirming one switches it to the web, after which the
portal gives a link. Teleporting while not subscribed is the API's 402 `PAYMENT_REQUIRED`; the
tests reach it by ending the subscription (`store.endSubscription()`), which the app itself can't.

## Stakeholder builds

The `preview` profile in `eas.json` builds the demo into an installable app (Expo project
`@ajalatrvl/ajala`, in the Ajalatrvl organisation):

```bash
eas build -p android --profile preview                  # an APK, installed from the build's page or QR code
eas build -p ios --profile preview --auto-submit        # signed for the App Store, then sent to TestFlight
```

iOS needs a paid Apple Developer account: the first run asks you to sign in to Apple, then creates the
certificates and the App Store Connect app. Testers are invited in App Store Connect → TestFlight.

A demo build stands the phone in Victoria Island, Lagos (`src/core/location/deviceLocation.ts`), so it
shows the demo posts wherever it is tested.

## Location

The demo always reports Victoria Island, Lagos as the phone's location, where its posts are, so
there is no need to set the simulator's location. To look at other cities, search for them on the map.

## Trying a push (iOS simulator)

The demo answers the device calls but sends nothing, so push one to the simulator by hand. It
needs a dev build made after expo-notifications was added (`npx expo run:ios`), the app signed in,
and notifications allowed when it asked.

```bash
xcrun simctl push booted com.ajala.app docs/push/demo-comment.apns
```

[`docs/push/demo-comment.apns`](push/demo-comment.apns) is a new-comment push for Coffee & Chat:

```json
{
  "Simulator Target Bundle": "com.ajala.app",
  "aps": { "alert": { "title": "New comment", "body": "Someone commented on Coffee & Chat" }, "sound": "default" },
  "kind": "new_comment",
  "postId": "p-coffee-chat",
  "notificationId": "n-new-comment"
}
```

- **App open:** the banner shows, and the bell's badge and the inbox refresh.
- **Tap it** (app open, in the background, or closed): Coffee & Chat opens. Because the push names
  its inbox item (`notificationId`), that row is marked read and the badge drops by one.
- **Other places:** swap the keys beside `aps` for `"kind": "new_message", "conversationId":
  "c-lagos-crew"` (the Lagos Weekend Crew chat), `"kind": "subscription"` (the Travel paywall), or
  any demo `postId`.

The keys sit beside `aps` as a real APNs push would carry them; the app also reads them nested
under `data`. On Android, test with a real FCM message once `google-services.json` is in the build
(see `app.config.js`); the emulator has no equivalent of `simctl push`.

## Not covered

Real purchases: the store sheets are not opened, and the verify calls take any receipt on trust.
Re-authentication is never asked for. Photos and avatars load from public placeholder services, so
a connection is still needed for images.
