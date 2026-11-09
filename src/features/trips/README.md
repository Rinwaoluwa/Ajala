# Feature: Trips

**FRD coverage:** the Trips tab (API map §8)
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the Trips tab (Figma "Your trips", light and dark): the title and a line per tab,
the Upcoming / Requests / Past pills (shared `PillTabs`, Liquid Glass where available), and:

- **Upcoming** — two lists merged on the phone, soonest first, each post once:
  - posts I'm going to (`GET /me/rsvps?state=going`: live, not yet ended, soonest first), tagged
    **Going**;
  - posts I host that haven't ended (`GET /me/posts?status=published`, filtered on the phone: over
    at `endAt`, or at `startAt` when there is none), tagged **Hosting**. A taken-down post is
    hidden, a cancelled one is tagged **Cancelled**.

  The going list pages soonest first, so a hosted post later than the last going post loaded waits
  for the next going page (`mergeUpcoming`) instead of jumping around. Big photo cards: type and
  status tags, the post's city and country in caps (`localityLabel`, when it has a place), title,
  "18–20 Oct · Starts 10:00" (plus "Weekly" etc. on a repeating Group), place, how many are joining, "View trip ›" → the post page.
  Empty: "No plans yet. Where to next?" with "Explore activities" → the Explore tab.
- **Requests** — everything I'm waiting to get into, in one list: first the private posts I asked to
  join that the host hasn't answered (`GET /me/rsvps?state=requested`), tagged **Request sent**,
  then the full posts whose waitlist I'm on (`state=waitlisted`, backend answers B8), tagged
  **Waitlisted**. Requests come first because a person has to answer them. One query reads the two
  lists in turn (`makeLoadWaiting`, its cursor says which list); when the requests run out mid-page
  the waitlist's first page is added straight away. Then the "Still waiting?" note (Marigold card on
  dark). Empty: an empty state with the note. The place in line stays on the post page.
- **Past** — posts I went to (`GET /me/attended`): compact cards with type + Completed tags,
  "5 Oct · Completed" (a span when it ran over several days), place and travellers, then the
  "AJALA passport" note.

Each source (going, hosted, waiting, past) is a cached infinite query under `['trips', …]`;
only the current tab's are fetched. Lists pull to refresh and page by cursor; loading is a
skeleton, a failure says why with a retry. Post detail invalidates `['trips']` after an RSVP.

A card's tag comes from the list it was read from (`TripCard.role`), not from `rsvpState`, since a
host has no RSVP on their own post. The DTOs also carry `price` and `saved` (spec §6); the cards
don't show them yet. There is no shared cost any more (backend answers C1).

## Gaps (API map §12 — flag to product/backend)

- **No faces on the cards.** A list card carries `goingCount` but not who is going, so the avatar
  row is pale circles, not photos (fetching attendees per card would be one request per card).
- Hosted posts that have already happened are not shown anywhere (they are not "attended").
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
    ├── components/             UpcomingTripCard, PastTripCard, TravellerDots, TripsSkeleton
    ├── hooks/                  useTripList (an infinite query per source; Upcoming merges two)
    └── state/                  query keys, use-case hook
```
