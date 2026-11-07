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
  status tags, the city in caps (when the post has one), title, "18–20 Oct · Starts 10:00" (plus
  "Weekly" etc. on a repeating Group), place, how many are joining, "View trip ›" → the post page.
  Empty: "No plans yet. Where to next?" with "Explore activities" → the Explore tab.
- **Requests** — private posts I asked to join that the host hasn't answered
  (`GET /me/rsvps?state=requested`), the same cards tagged **Request sent**, then the "Still
  waiting?" note (Marigold card on dark). Empty: an empty state with the note.
- **Past** — posts I went to (`GET /me/attended`): compact cards with type + Completed tags,
  "5 Oct · Completed" (a span when it ran over several days), place and travellers, then the
  "AJALA passport" note.

Each source (going, hosted, requested, past) is a cached infinite query under `['trips', …]`;
only the current tab's are fetched. Lists pull to refresh and page by cursor; loading is a
skeleton, a failure says why with a retry. Post detail invalidates `['trips']` after an RSVP.

A card's tag comes from the list it was read from (`TripCard.role`), not from `rsvpState`, since a
host has no RSVP on their own post. The DTOs also carry `price`, `costSplit` and `saved` (spec §6);
the cards don't show them yet.

## Gaps (API map §12 — flag to product/backend)

- **Waitlisted posts are not listed.** `GET /me/rsvps` takes `going` or `requested` only, so a post
  I'm waitlisted on shows in neither tab (API map §8 and the §12 question "add state=waitlisted?").
  No other endpoint lists them; the post page still shows "Waitlisted" when opened.
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

Demo mode answers `/me/posts` and `/me/attended` from `src/core/demo/routes/trips.ts` (your own
posts, and four past posts in Lagos, London and Accra that stay off the feed and map), and
`/me/rsvps` from the shared store (going to two posts, waiting on one; joining anything adds it).
