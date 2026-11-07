# Feature: Home (Newsfeed)

**FRD coverage:** MOB-020 → MOB-027, consumes MOB-030 → MOB-039
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the feed (`GET /feed` with `X-Client-Location`, cursor paging, pull to refresh,
skeleton, empty and error states), the city header ("Teleported to {city}" when `citySource` is
`teleport`), post-type pills (the API's types, agreed with product), the level card (a static
placeholder — no backend), and Travel.

## What it calls (docs/api — API map §4, spec §2.11, §2.19)

| Screen element | Call |
| --- | --- |
| Cards | `GET /feed?type&cursor&limit` → `FeedPageDto`; every `PostCardDto` field is typed, and `saved`, `endAt`, `recurrence`, `costSplit`, `rsvpState`, `joinMode` reach the `PostCard` entity |
| Bookmark on a card | the shared `PostCard` (`useSavePost`), starting from the card's `saved` |
| Travel: Popular | `GET /cities/popular` (≤ 12, busiest first; cached 10 minutes, as the server refreshes it) |
| Travel: search | `GET /cities?q=` once typing pauses, from two characters |
| Travel: pick a city | `POST /me/teleport { cityId }` → 204; 402 `PAYMENT_REQUIRED` opens the paywall (`payment`) |
| Travel: your own city | `DELETE /me/teleport` → 204 |

The server holds the teleport, not the app: after either call, every query under the spec's
city-bound prefixes — `feed`, `mapPins`, `searchPosts` (`CITY_BOUND_KEYS`) — is reset, so Home,
Explore's map and list, and search all reload in the new city. `travelMemory` only remembers what
the API has no call for: the person's own city (the last feed city that was not a teleport) and the
last few teleports ("Recent"), for this run of the app. Opened while already teleported and before
the feed has seen home, Travel offers "Come back home" without a name.

Whether someone may teleport comes from `useSubscription` (`@features/payment`, `GET
/me/subscription`); the server still has the last word with its 402.

## Not on the card

The shared `PostCard` draws no price, so the cost split's "about N each" is not on Home's cards;
the `PostCard` entity carries it (`costShare`) for when the shared card shows prices.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/home` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
home/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── dto/                    wire shapes, from the spec in docs/api
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               FeedPage, PostCard, FeedFilter, CatalogCity, FeedError
│   ├── repositories/           FeedRepository (feed, cities, popular cities, teleport)
│   ├── rules/                  feed filters, travelChoice (stay / paywall / teleport / come home)
│   └── usecases/               loadFeed, searchCities, popularCities, teleport, returnHome
└── presentation/
    ├── screens/                HomeFeedScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

The post card itself lives in `shared/components/post` — Home, Explore, Profile and Chat all render
the same card. Travel only *reads* the subscription (`@features/payment`); the paywall belongs to
`payment`.
