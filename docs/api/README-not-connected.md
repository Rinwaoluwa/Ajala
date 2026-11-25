# What isn't connected

Status on 24 Nov 2026, branch `feat/design-system-onboarding` at commit `24d092b`. It replaces the 11 Nov version of this file. Brought up to date on 25 Nov for two changes made after that commit: cards no longer show the host's words, and Explore's search no longer finds people.

Two questions are answered here:

1. Which endpoints does the backend have that the app does not use?
2. Which parts of the app's interface have no endpoint behind them?

**How it was checked.** The endpoint list is section 3 of [ajala-api-users-common.md](ajala-api-users-common.md): 117 endpoints. Every call in `src/` was listed by script and matched against it, and the ones the script could not match (paths built by helper functions) were checked by hand. Nothing was called against a server today. The interface list comes from reading the screens, the on-phone stores and [backend-requests.md](backend-requests.md).

| | Count |
|---|---|
| Endpoints in the spec | 117 |
| Not meant for the app (health, app links, email assets, waitlist) | 8 |
| For the app, never called | 11 |
| Called in code that never runs | 6 |
| Called and in use | 92 |

No call was found to an endpoint that is not in the spec.

## 1. Endpoints the app does not use

### For the app, never called (11)

| Endpoint | Why | What it needs |
|---|---|---|
| `PUT /me/trusted-person` | "Share my plan" has no screens. A `TODO(trusted-person)` marks its place in `src/features/settings/presentation/screens/PrivacySafetyScreen.tsx:108` | A design for the flow, then the screens |
| `GET /me/trusted-person` | Same | Same |
| `DELETE /me/trusted-person` | Same | Same |
| `GET /me/trusted-by` | Same | Same |
| `POST /me/trusted-by/{linkId}/accept` | Same | Same |
| `DELETE /me/trusted-by/{linkId}` | Same | Same |
| `GET /me/trusted-by/{linkId}/plans` | Same | Same |
| `GET /search/people` | The People results in Explore's search were removed on 25 Nov (product: Explore finds activities only), and the code that called it went with them. It is also how a trusted person would be found | A place to search for people, if one is wanted again (git history has the Explore code) |
| `GET /users/handle/{handle}` | Profiles are opened by id everywhere, share links included | Nothing, unless `@handle` links are wanted |
| `POST /me/subscription/checkout` | Commented out in `src/features/payment/data/datasources/remote/subscriptionApi.ts:54`. People pay on a web page opened in the browser | Nothing in the app |
| `POST /me/subscription/checkout/confirm` | Same, `:58` | Same |

### Called in code that never runs (6)

| Endpoint | Why | What it needs |
|---|---|---|
| `GET /me/subscription/challenge` | Typed in `subscriptionApi.ts:34`; nothing calls it. Buying through the App Store or Google Play is not built | StoreKit 2 and Play Billing, if the app is to sell through the stores |
| `POST /me/subscription/apple` | Same, `:41` | Same |
| `POST /me/subscription/google` | Same, `:45` | Same |
| `POST /me/devices` | Written and tested, but push is switched off: `PUSH_ENABLED = false` in `app/(app)/_layout.tsx:27` | iOS push set up (backend question A13: an APNs or an FCM token?), then the flag |
| `POST /me/devices/unregister` | Same | Same |
| `POST /posts/{postId}/attendees/{userId}/remove` | Written through the data layer and the use case (`removeAttendee` in `src/features/post-detail/postDetailModule.ts:34`), but no screen calls it: a host can accept or decline a request and cannot take someone off the post | A "Remove" action on the attendee list |

### Not meant for the app (8)

`GET /health`, `GET /health/live`, the two `/.well-known/…` files, `GET /email-assets/{file}`, and the three `/waitlist…` endpoints (the landing page's).

## 2. Interface with no endpoint behind it

### Shown or usable, but only on the phone

| What the person sees | Where | What backs it today | Could the API back it? | Tracked |
|---|---|---|---|---|
| **Hide post** in a feed card's ⋯ menu, with Undo | `src/features/home/data/datasources/local/postListStores.ts`, `FeedPost.tsx` | A list kept on the phone, per account. It does not follow the person to another phone | No endpoint | B13 (open) |
| **Recent searches** in the Explore list | `src/features/explore/data/datasources/local/recentSearchStore.ts` | The last 6, kept on the phone | No endpoint | Not tracked |
| **Suggestions while typing** in the Explore list's search | `ExploreListSheet.tsx` (`Suggestions`) | Matched on the phone against recent searches and `GET /interests`. The API has no typeahead | No | B17 (not needed for now) |
| **"Before you RSVP" seen once** | `src/features/explore/data/datasources/local/rsvpNoticeStore.ts` | A flag on the phone; shown again on a new phone | No | Not tracked |
| **Chat safety banner dismissed** | `src/features/chat/data/datasources/local/safetyBannerStore.ts` | A flag on the phone | No | Not tracked |
| **The currency prices are shown in** | `src/shared/state/preferredCurrency.ts` | Chosen on the phone, per country | No | Not tracked |
| **"About ₦…" beside a price in another currency** | `src/core/fx/exchangeRates.ts:20` | Rates from a public file on a CDN (`@fawazahmed0/currency-api`), not from Ajala | No endpoint | B15 (open) |

### Worked out on the phone because the API has no value

| What the person sees | Where | How it is worked out | What the backend would add | Tracked |
|---|---|---|---|---|
| **Achievements, badges and stamps** | `src/features/profile/domain/rules/achievementRules.ts`, `useAchievements.ts` | From the person's attended history | An achievements endpoint, if they should match across phones | README only |
| **Streak, Countries and Meetups counts** on a profile | profile feature | From up to 300 past activities | A profile summary with the counts | README only |
| **Comment count on a Home card** (and, since 25 Nov, a Saved card) | `useCardCommentCount` | One `GET /posts/{id}/comments` per card | `commentCount` on `PostCardDto` | B11 (open) |
| **Faces of the people going, on a Trips card** (since 25 Nov; plain circles before) | `useTravellerFaces.ts` | One `GET /posts/{id}/attendees?state=going&limit=3` per card with someone going | `goingPreview` on `PostCardDto` | B18 (open) |
| **"Hosting" instead of Join on your own post** | `FeedPost.tsx`, `ListedPostCard.tsx` | `host.id` compared with the signed-in id | `isHost` on cards | B9 (not now) |
| **Map price filter** (Free, Paid, a maximum) | Explore | Pins carry no price; prices are read from the feed, up to 5 requests of 100, and only cover the feed's 30 km | `price` on `MapPinDto`, or price parameters on `GET /map/pins` | README only |
| **Map date filter** (Today, This weekend) | `exploreRules.ts` | From each pin's start time | Optional: date parameters on `GET /map/pins` | README only |
| **Map interest filter** | Explore | Pins come from the post search, up to 4 pages of 50 | `interestId` on `GET /map/pins` | README only |

### Built, then switched off or left unreachable

| What | Where | State | What it waits for |
|---|---|---|---|
| **Level card** on Home ("Level 2 · Local Explorer") | `src/features/home/presentation/components/LevelCard.tsx`, commented out in `HomeScreen.tsx:224`; its numbers are fixed text in `homeCopy.level` | Hidden | A levels endpoint |
| **Likes** | Removed from the app on 24 Nov | Gone | Nothing (B12 closed) |
| **Activities listed under the map's search field as you type**, and cities and people under them | `MapSearchBar.tsx` (`RESULTS_HERE`, `SUGGESTIONS_ENABLED`) | Switched off; the field searches on the Search key | A typeahead endpoint, if it returns (B17) |
| **Push notifications** | `app/(app)/_layout.tsx:27` | Switched off | See section 1 |
| **Price on the paywall** | `src/features/payment/presentation/copy.ts:32` | Reads "Weekly" with no amount | A price to show (`TODO(purchase)`) |
| **Subscribe** | `src/core/config/payments.ts` | Opens the web page in `EXPO_PUBLIC_SUBSCRIBE_URL`; with none set it says buying isn't available yet | The payment page's address for each environment |

### Drawn, but leads nowhere or does nothing yet

| What | Where | Today |
|---|---|---|
| **Notifications about a trusted person or about moderation** | `src/features/notifications/domain/rules/notificationRules.ts:68` | The row is drawn; it has no destination, because the screens do not exist |
| **"Nearby activity" and "Recommendations"** switches in notification settings | `src/features/settings/presentation/copy.ts:233` | The switches save to `PATCH /me/settings`, but the backend sends nothing for them yet. They say "coming soon" |

### In the design, not built

| What | Why |
|---|---|
| **Invite friends** in the create wizard | No friends or invites in the API |
| **Follow** on profiles | No follows in the API |
| **Not interested** and **Mute** on a post | No endpoint (B13) |
| **Who is hosting, how far away, when it was posted** on a feed card | The 24 Nov card design has no line for them. "When it was posted" is not sent either (B10) |
| **The host's words** on a card (Home and the Explore list) | Taken off on 24 Nov: a card is a quick look, and the words are on the post. The one request per card that read them is gone with them |
| **Trips ("visiting")** | Parked by the backend (A12) |

## 3. Open questions to the backend that block or bend the interface

From [backend-requests.md](backend-requests.md); only the ones still open.

| Id | Question | What it holds up |
|---|---|---|
| A9 | Can one `PATCH` clear the pin and set the city? | Changing a post's place in one request (the app sends one and hopes) |
| A10 | How does the `/chat` socket authenticate? | Live chat |
| A11 | What does "Read" mean in a group? | Read marks in group chats |
| A13 | iOS push: an APNs token or an FCM token? | Push |
| A14 | Can a Google sign-in come without a nonce? | Google sign-in |
| B10 | `description` and the time posted on a card | Nothing now: cards stopped showing the host's words on 24 Nov, and the design has no line for the time posted |
| B11 | `commentCount` on a card | One extra request per card |
| B13 | Hide, Not interested, Mute | Hide stays on the phone |
| B15 | Exchange rates | Rates come from a third party |
| B18 | Who is going, on a card | One extra request per Trips card |

## How to keep this current

When an endpoint gets a screen, or a screen gets its endpoint, change its row here in the same pull request. To list the app's calls again: search `src/` for `method: '` in the `data/datasources/remote` files and compare with section 3 of the spec.
