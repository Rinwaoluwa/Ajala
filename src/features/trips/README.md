# Feature: Trips

**FRD coverage:** the Trips tab (API map §8)
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the Trips tab (Figma "Your trips", light and dark): the title and a line per tab,
the Upcoming / Requests / Past pills (shared `PillTabs`, Liquid Glass where available), and:

- **Upcoming** — posts I host that have not started (`GET /me/posts?status=published`, filtered to
  a future `startAt` on the phone, soonest first; a taken-down post is hidden, a cancelled one is
  tagged). Big photo cards: type + Hosting tags, the city in caps, title, "18 Oct · Starts 10:00",
  place, how many are joining, "View trip ›" → the post page. Empty: "No plans yet. Where to next?"
  with "Explore activities" → the Explore tab.
- **Requests** — an empty state and the "Still waiting?" note (Marigold card on dark).
- **Past** — posts I went to (`GET /me/attended`): compact cards with type + Completed tags,
  "5 Oct · Completed", place and travellers, then the "AJALA passport" note.

Each list is a cached infinite query (keys under `['trips', …]`), pulls to refresh and pages by
cursor; loading is a skeleton, a failure says why with a retry.

## Gaps (API map §12 — flag to product/backend)

- **Posts I joined or requested cannot be listed.** There is no `GET /me/rsvps?state=`, so Upcoming
  shows only what I host and Requests is always empty. This is the "highest priority gap" in the
  API map; when it lands, add it to `TripsRepository` and both tabs fill in.
- **No faces on the cards.** A list card carries `goingCount` but not who is going, so the avatar
  row is pale circles, not photos (fetching attendees per card would be one request per card).
- **No end date.** Posts have only `startAt`, so a card says "18 Oct · Starts 10:00", not
  "18–20 Oct".
- Hosted posts that have already happened are not shown anywhere (they are not "attended").

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
├── data/                       tripsApi (GET /me/posts, /me/attended), DTOs, mappers, repository
├── domain/                     TripCard, TripsError, tripRules (upcoming filter), use cases
└── presentation/
    ├── screens/                TripsScreen
    ├── components/             UpcomingTripCard, PastTripCard, TravellerDots, TripsSkeleton
    ├── hooks/                  useTripList (one infinite query per tab)
    └── state/                  query keys, use-case hook
```

Demo mode answers both calls from `src/core/demo/routes/trips.ts` (your own posts, and four past
posts in Lagos, London and Accra that stay off the feed and map).
