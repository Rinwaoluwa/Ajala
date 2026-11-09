# Backend answers, Nov 9 2026

The backend team's answers to [backend-requests.md](backend-requests.md). Everything here is built and
on dev, and Swagger and Postman are updated. Item numbers match backend-requests.md.

The client spec ([ajala-api-users-common.md](ajala-api-users-common.md)) still needs re-syncing from
Swagger. Until then, this file is the reference for what changed.

---

## Changes that break what the app did

| Area | Change | What the app does |
|---|---|---|
| Shared cost | Gone from every post: `costSplit`, `costTotalCents`, `costCurrency` and `expectedCount` are removed. | Remove it everywhere: the wizard, cards, the post page and the demo. |
| Plans | Plans carry no money. `priceCents`, `currency` and `externalUrl` on a Plan answer 400. | Hide the price screen in the Plan wizard. |
| Joining | Every post joins by RSVP. `joinMode` and the `EXTERNAL_BOOKING` error are removed. | If a post has `externalUrl`: open it, call `POST /posts/{id}/link-click`, then join as usual. |
| Price and link | Optional on Meetups, Events and Groups, including paid Events. | The price screen gets a Skip button. |
| Group chats | Automatic. One is made when a post goes live, and everyone going joins it, up to 100 people. `POST /conversations { postId }` now only finds the chat for someone already in it. | Remove any "start group chat" button. |
| Group chat over 100 | Further people going wait in line for the next open place. Until they get one, `POST /conversations { postId }` answers 409 `GROUP_CHAT_FULL`. No separate push when they get in: the chat appears in their list, and the next message pushes as normal. Someone who left or was removed gets 404. | Show a message for `GROUP_CHAT_FULL`, not an error. |
| Cancelled or deleted post | Its chat is removed for everyone, and every route on it answers 404. | Drop the chat from local state on a 404. |
| Chat in the inbox | `new_message` is push only and never appears in `GET /me/notifications`. | Use B5 for the Messages badge. |

## A. Contract questions

- **A1.** First name, last name and date of birth are enough. Gender is never needed. An email sign-up stays incomplete until its first `PATCH /me`, so Profile Setup must always send that call.
- **A2.** `schedule` and `itinerary`: 30 lines of 120 characters. Going over is a 400 on the field. Now in Swagger.
- **A3.** An 11th travel style or favourite city is a 400, never silently cut. Now in Swagger.
- **A4.** `SIGNUP_REFUSED` is a 403 from `POST /auth/oauth/google` and `/apple` only, with no details. Email sign-up deliberately answers its normal 202.
- **A5.** Send `deviceCheck` on `POST /auth/otp/verify` for email sign-ups. On the sign-up call it is a 400. A malformed token is also a 400, so leave it out if generating one fails.
- **A6.** `details.availableAt` stays on `HANDLE_COOLDOWN`, and is now documented.
- **A7.** The repeated key is right: `?interestIds=a&interestIds=b`. `type=all` used to be a 400 on search and now works.
- **A8.** Hosted posts are never in `/me/rsvps`, so the Trips merge is right and can't produce duplicates.
- **A9.** Trips are parked: the routes exist but stay out of the docs until there's a screen. `visiting` will be null, so don't build on it, and teleport doesn't fill it. Selfie verification is gone for good. `verified` is an admin badge meaning **our team reviewed the profile**; don't word it as an identity check.
- **A10–A14:** not answered in this round. A14 (Google nonce) is still open.

## B. Additions

- **B1.** Done, without `since`: `MeDto.teleport` is `{ city: CityRefDto }` or null, and is null once the subscription ends.
- **B2.** Done: `LastMessageDto.senderName` is the sender's first name. It is null for my own messages, and "Deleted user" for a wiped account.
- **B3.** Done: `ConversationDto.imageUrl` is the post's cover at 200 px. It is null in a direct chat, and when the reader can't see the post, so keep a fallback icon.
- **B4.** Done: `ConversationDetailDto.post` is a `PostCardDto` with the reader's own `rsvpState` and `saved`. It is null if they can't see the post, and its `distanceKm` is always null.
- **B5.** Done: `GET /conversations/unread-count` returns `{ count }`. It counts conversations, not messages.
- **B6.** Documented on `NotificationDto.data`. A chat push carries `{ kind: 'chat.message', conversationId }`, with no `messageId`, because one push can cover several messages.
- **B7.** Not now. Keep the category icons until after launch.
- **B8.** Done: `GET /me/rsvps?state=waitlisted` works. The place in line stays on the post screen.
- **B9.** Not built. Compare `host.id` with my id on every card: my own post shows `rsvpState: 'none'`, and tapping Join on it answers 409.

## C. Product decisions

- **C1 and C2.** No shared cost anywhere. Meetups, Events and Groups get one price screen the host can skip. Plans have none, because each stop can cost something different; people talk about it in the group chat. A card shows the price or nothing.
- **C3.** Keep All / Meetups / Events / Plans / Groups. Figma will be updated to match.
- **C4.** Gamification comes in a later round. Keep the static placeholders.
- **C5.** Show both switches: `notifyNearbyActivity` (default on) and `notifyRecommendations` (default off) on `UserSettingsDto`. They are only saved for now; no such notifications are sent yet.
- **C6.** The "Share my plan" row is the **trusted person**: another Ajala member who must accept first, then hears automatically when plans change. It's built; design screens are still to come. The public `sharePlans` setting stays too, so it needs a clearly different name in the app.

### Trusted person endpoints

| Method | Path | Notes |
|---|---|---|
| PUT | `/me/trusted-person { userId }` | Needs a recent `POST /me/reauth`, otherwise 403. |
| GET | `/me/trusted-person` | The link, or an empty body if there's nobody. |
| DELETE | `/me/trusted-person` | The other person isn't told. |
| GET | `/me/trusted-by` | Requests, and people who chose me. |
| POST | `/me/trusted-by/{linkId}/accept` | |
| DELETE | `/me/trusted-by/{linkId}` | Decline, or stop. |
| GET | `/me/trusted-by/{linkId}/plans` | What they have coming up. |

- Find the person with `GET /search/people`.
- Every refusal is the same 404, on purpose.
- Too many requests in a day is a 429 `TRUSTED_REQUEST_LIMIT`.
- If a plan has `unavailable: true`, the rest of it is null: show "A plan you can't see".
- The exact response shapes are in Swagger.

## Also new

When a host changes a post's time or place, everyone going gets one push ten minutes later: category `post_update`, kind `post.details_changed`, with `postId`. Tapping it opens the post.

## D. Configuration

- **D1.** The API accepts `com.ajala.app` as the Apple audience. Team ID `A2ZCQRWRA9` is being confirmed against the company's Apple account, so it isn't final yet.
- **D3.** Share links live on **go.ajalatrvl.com**. The app builds `https://go.ajalatrvl.com/posts/{id}` and `/users/{id}` itself. Figma's `ajala.app/p/...` is out of date.
  - Test builds: dev is `dev-go.ajalatrvl.com`, staging is `staging-go.ajalatrvl.com`.
  - The Apple file now includes `webcredentials`.
  - Without the app, a browser gets a generic "Get the app" page, so link previews won't show the post.
- **D4.** The Travel plan is **weekly**, not monthly. Figma's "$10/month" is out of date, so the store products should be weekly.
  - Store notifications go to `POST /api/v1/webhooks/apple` and `/google`.
  - Buying answers 503 wherever subscriptions are off or that store's keys aren't set, which is every environment today.
  - A store that fails or times out can answer 500. Treat both as "try again".

## App configuration from the team

These are stored as EAS environment variables (development, preview and production), not in the repo.

| Item | Value or variable |
|---|---|
| Google web client id | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |
| Google iOS client id | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` |
| Google iOS URL scheme | `GOOGLE_IOS_URL_SCHEME` |
| Google Maps, iOS | `GOOGLE_MAPS_IOS_API_KEY` |
| Google Maps, Android | `GOOGLE_MAPS_ANDROID_API_KEY` |
| Apple bundle id | `com.ajala.app` |
| Apple Services ID | `com.ajala.app.signin` (web and Android sign-in, used by the backend) |
| Apple return URL | `https://ajalatrvl.com/auth/apple/callback` |
| Apple Team ID | `A2ZCQRWRA9` (pending confirmation, D1) |
