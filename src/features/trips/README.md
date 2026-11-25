# Feature: Trips

**FRD coverage:** the Trips tab (API map §8)
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the Trips tab (Figma "Your trips", light and dark): the title and a line per tab,
the Upcoming / Requests / Past / My posts pills (shared `PillTabs`, Liquid Glass where available), and:

- **Upcoming** — two lists merged on the phone, soonest first, each post once:
  - posts I'm going to (`GET /me/rsvps?state=going`: live, not yet ended, soonest first), tagged
    **Going**;
  - posts I host that haven't ended (`GET /me/posts?status=published`, filtered on the phone: over
    at `endAt`, or at `startAt` when there is none), tagged **Hosting**. A taken-down post is
    hidden, a cancelled one is tagged **Cancelled**.

  The going list pages soonest first, so a hosted post later than the last going post loaded waits
  for the next going page (`mergeUpcoming`) instead of jumping around. Every list draws the card a post is on Home (`TripListCard` on the shared `PostListCard`,
  product 25 Nov): its photos, the type's tag, the title, the price, when and where; how I stand
  with it at the top right (the tags named here); and at its foot, where Home has Comment and the
  bookmark, who is joining ("3 joining", with faces) and "View trip ›" → the post page. A trip over
  several days writes its span ("18–20 Oct") and a repeating Group how often ("6:00 PM · Weekly").
  The pills sit over a hairline, as Home's do.
  Empty: "No plans yet. Where to next?" with "Explore activities" → the Explore tab.
- **Requests** — everything I'm waiting to get into, in one list: first the private posts I asked to
  join that the host hasn't answered (`GET /me/rsvps?state=requested`), tagged **Request sent**,
  then the full posts whose waitlist I'm on (`state=waitlisted`, backend answers B8), tagged
  **Waitlisted**. Requests come first because a person has to answer them. One query reads the two
  lists in turn (`makeLoadWaiting`, its cursor says which list); when the requests run out mid-page
  the waitlist's first page is added straight away. Then the "Still waiting?" note (Marigold card on
  dark). Empty: an empty state with the note. The place in line stays on the post page.
- **Past** — posts I went to (`GET /me/attended`), tagged **Completed**, with "9 travellers" at the
  card's foot, then the "AJALA passport" note.
- **My posts** — everything I host (`GET /me/posts`, the list Upcoming filters), newest first, past
  ones included and taken-down ones left out (`myPosts`). Tagged **Hosting**,
  **Completed** once the post is over, or **Cancelled**. It was a tab at the foot of the profile
  until 25 Nov (product) and is not in the Figma frames. Its own cache key (`['trips', 'mine']`).

Each source (going, hosted, waiting, past) is a cached infinite query under `['trips', …]`;
only the current tab's are fetched. Lists pull to refresh and page by cursor; loading is a
skeleton, a failure says why with a retry. Post detail invalidates `['trips']` after an RSVP.

A card's tag comes from the list it was read from (`TripCard.role`), not from `rsvpState`, since a
host has no RSVP on their own post. The DTOs also carry `price` and `saved` (spec §6); the cards
don't show them yet. There is no shared cost any more (backend answers C1).

## Gaps (API map §12 — flag to product/backend)

- **Faces cost a request per card.** A list card carries `goingCount` but not who is going, so each
  card with someone going asks `GET /posts/:id/attendees?state=going&limit=3` for its first three
  (`useTravellerFaces`, five minutes fresh, under `['trips', 'faces', id]`): their photo, or their
  initial when they have none. Until they arrive, and where the list may not be read (a private post
  the reader is still waiting to get into), the row keeps its pale circles. Backend request B18 asks
  for the faces on the card itself.
- Hosted posts that have already happened are listed under My posts, tagged Completed (they are not
  "attended", so they are not under Past).
- `GET /me/posts` is newest-made first, not soonest first, so a hosted post on a later page can
  still slot in above cards already shown once that page loads. Hosts rarely have more than a page.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/trips` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.

## Files

```
trips/
├── tripsModule.ts              composition root
├── data/                       tripsApi (GET /me/posts, /me/rsvps, /me/attended), DTOs, mappers, repository
├── domain/                     TripCard, TripsError, tripRules (upcoming filter, merge), use cases
└── presentation/
    ├── screens/                TripsScreen
    ├── components/             TripListCard, TravellerDots
    ├── hooks/                  useTripList (an infinite query per source; Upcoming merges two)
    └── state/                  query keys, use-case hook
```
