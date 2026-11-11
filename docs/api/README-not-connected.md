# What isn't connected yet

Status on 11 Nov 2026, checked against the code on `feat/design-system-onboarding` and the
API spec in this folder (`ajala-api-users-common.md`, `screen-to-api-map.md`).

There are two lists. The first covers API endpoints the app never calls. The second covers
screens and features in the app that have no endpoint behind them, or only part of one.
Each row says what is missing and who has to act.

## 1. Endpoints the app doesn't call

| Endpoint | Why it isn't used | What it needs |
| --- | --- | --- |
| `PUT /me/trusted-person` | "Share my plan" (trusted person) has no screens yet. | Design for the flow; then the app builds it. A placeholder is marked in Privacy & Safety (`TODO(trusted-person)`). |
| `GET /me/trusted-person` | Same as above. | Same. |
| `DELETE /me/trusted-person` | Same. | Same. |
| `GET /me/trusted-by` | Same. | Same. |
| `POST /me/trusted-by/{linkId}/accept` | Same. | Same. |
| `DELETE /me/trusted-by/{linkId}` | Same. | Same. |
| `GET /me/trusted-by/{linkId}/plans` | Same. | Same. |
| `GET /users/handle/{handle}` | Profiles open by user id everywhere, including share links (`/users/{id}`). | Nothing, unless we want `@handle` links. |
| `GET /me/subscription/challenge` | In-app purchase through the App Store / Google Play isn't built. The calls are typed in the payment feature but nothing uses them. | Only needed if we sell through the stores. Needs StoreKit 2 / Play Billing and App Attest / Play Integrity. |
| `POST /me/subscription/apple` | Same. | Same. |
| `POST /me/subscription/google` | Same. | Same. |
| `POST /me/subscription/checkout` | Switched off on purpose (11 Nov). Stripe checkout from inside the app is commented out; people pay on a web page opened in their default browser instead. | Nothing in the app. The web page handles payment. |
| `POST /me/subscription/checkout/confirm` | Same; switched off with checkout. | Same. |
| `POST /me/devices` and `POST /me/devices/unregister` | Coded and tested, but push is switched off (`PUSH_ENABLED = false`). | Firebase (FCM) set up for iOS, then turn push on (backend item A13). |
| Waitlist endpoints (`/waitlist…`) | They belong to the landing page, not the app. | Nothing. |

`/cities*` and `/auth/oauth/link` are no longer in the API, so they aren't listed.

## 2. Screens and features with no endpoint behind them

| Screen or feature | What happens today | What the backend would add |
| --- | --- | --- |
| **Subscribe (Travel paywall)** | Opens the payment page in the phone's default browser, at the address in `EXPO_PUBLIC_SUBSCRIBE_URL`. With no address set, it says buying isn't available yet. The price label reads "Weekly", with no amount. | The web payment page and its address for each environment. A price to show, if we want one on the button. The page must know who is paying, which needs a decision on how the app passes the person to it. |
| **Achievements, badges and stamps** | Worked out on the phone from the person's past activities (API map §12). | An achievements endpoint, if they should match across devices or be awarded by the server. |
| **Streak, Countries and Meetups counters** on profiles | Worked out on the phone from up to 300 past activities (6 pages of 50). | A profile summary with these counts. |
| **Level card** on Home | Hidden. Its numbers were a placeholder. | A levels endpoint; then the card comes back (the code is commented in `HomeScreen`). |
| **"Invite friends"** in the create wizard | Not built. | Friends or invites in the API. |
| **Follow** on profiles | Not built. | Follows in the API. |
| **Notification settings: "Nearby activity" and "Recommendations"** | The switches save, but nothing is sent for them yet ("coming soon"). | Sending those notifications. |
| **Map price filter** (Free, Paid, maximum price) | Map pins carry no price, so the app reads prices from the feed: up to 5 extra requests of 100 posts. It only covers the 30 km feed area; for a subscriber who pans further, pins out there are hidden while a price filter is on. | `price` on `MapPinDto`, or `price` / `maxPrice` parameters on `GET /map/pins`. |
| **Map date filter** (Today, This weekend) | Worked out on the phone from each pin's start time. | Optional: date parameters on `GET /map/pins`. |
| **Map interest filter** | Pins by interest come from the post search, up to 4 pages of 50. | An `interestId` parameter on `GET /map/pins`. |
| **Post descriptions on Home cards** | The feed doesn't send descriptions, so each card on screen fetches its post (`GET /posts/{id}`): one extra request per card. | `description` on `PostCardDto` (backend item B4). The extra requests then stop on their own. |

## How to keep this current

When an endpoint gets a screen, or a screen gets its endpoint, remove its row here in the
same pull request.
