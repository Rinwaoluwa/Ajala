# Feature: Home (Newsfeed)

**FRD coverage:** MOB-020 → MOB-027, consumes MOB-030 → MOB-039
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the feed (`GET /feed` with `X-Client-Location`, cursor paging, pull to refresh,
skeleton, empty and error states), the place header, post-type pills (the API's types, agreed with
product), the level card (a static placeholder — no backend), and Travel.

Swagger (9 Nov) has no cities: places are Google place ids, found on the phone with `@core/places`,
and the feed carries the point it looks around (`origin { lat, lng, label, region }`,
`originSource: 'device' | 'teleport'`) instead of a city.

## What it calls (docs/api — API map §4, spec §2.11, §2.19)

| Screen element | Call |
| --- | --- |
| Cards | `GET /feed?type&cursor&limit` → `FeedPageDto`; every `PostCardDto` field is typed, including the place fields `placeId`, `formattedAddress`, `localityLabel`, `countryCode`. The card's place line is `placeName`, else `localityLabel` ("Lagos, Nigeria") for a dropped pin. No shared cost or join mode (backend answers, Nov 9) |
| Header | The feed's `origin`: a teleport shows its short name ("Accra") and "Teleported to Accra, Ghana" (`origin.label`); the phone's own location shows `origin.region` ("Lagos"), else "Near you", and "Exploring your current city" |
| No location, no teleport | 404 `NO_LOCATION` → "See what's around you": **Turn on location** (the system prompt, or Settings once refused for good) and **Choose a place** (Travel). Not an error state; there is no home-city fallback |
| Header before the feed answers, Travel's state | `GET /me` → `MeTravelDto` (`teleport: { placeId } \| null`, `homePlace`), under Home's own key `['home', 'travelState']` (`useTravelState`). `teleport` is Swagger's `TeleportDto`, the id alone (spec §8 Q1): its name comes from the feed's `origin.label`, from the city just picked, or else one `placeDetails` lookup cached for the run (`usePlaceName`) |
| Bookmark on a card | the shared `PostCard` (`useSavePost`), starting from the card's `saved` |
| Travel: search | `@core/places` `searchCities` (cities only) once typing pauses 300 ms, from two characters; an overtaken search is cancelled through the query's `AbortSignal`; closing Travel calls `endPlacesSession` (a pick needs only the place id, so no Place Details call ends the session). A `PlacesError` reads "Place search isn't available right now" |
| Travel: Recent | local only: the last 5 cities teleported to in this run, plus the teleport in force. **Swagger has no popular-cities endpoint**, so the design's Popular grid is replaced by Recent and search |
| Travel: pick a city | `POST /me/teleport { placeId }` → 204; 402 `PAYMENT_REQUIRED` opens the paywall (`payment`); 400 (unknown place, or not a city) "pick another"; 503 (map vendor down) "try again" |
| Travel: Where you are | `DELETE /me/teleport` → 204 (back to the phone's location) |

The server holds the teleport, not the app: after either call, every query under the spec's
origin-bound prefixes — `feed`, `mapPins`, `searchPosts` (`ORIGIN_BOUND_KEYS`) — is reset, so Home,
Explore's map and list, and search all reload around the new place, and the teleport in the
travel-state cache is written at once and asked for again.

`travelMemory` only keeps what the API has no call for: the region the feed last named for the
phone ("Where you are" in Travel) and the recent teleports. Place suggestions carry no country code,
so Travel's rows show the globe, not a flag; the paywall's home flag is `MeDto.homePlace.countryCode`.

Whether someone may teleport comes from `useSubscription` (`@features/payment`, `GET
/me/subscription`); the server still has the last word with its 402.

## Not on the card

There is no shared cost anywhere (backend answers C1): a card shows the price or nothing. The
shared `PostCard` draws no price yet; the `PostCard` entity carries it (`price`) for when it does.

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
│   ├── entities/               FeedPage, FeedOrigin, PostCard, TravelCity, FeedError
│   ├── repositories/           FeedRepository (feed, city search, place names, teleport)
│   ├── rules/                  feed filters, travelChoice (stay / paywall / teleport / come home), recents
│   └── usecases/               loadFeed, searchCities, placeName, endCitySearch, teleport, returnHome
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
