# Feature: Explore

**FRD coverage:** MOB-080 → MOB-082
**Owner:** _unassigned_ — put your name here when you pick this feature up.

The Explore tab: a full-screen map around where the feed looks, with its pins, a mini card per pin, and the
Explore list (Browse By Interest, Meetups Near You). The map lives here rather than in `map/`,
because API map §7 makes it the Explore tab; `map/` is still the empty scaffold.

## What it calls (docs/api — API map §6–7, spec §2.11–2.13)

| Screen element | Call |
| --- | --- |
| Pins | `GET /map/pins?bbox&type&q` when the map settles; box clamped under 5°, under 20° for a Travel subscriber (`maxBboxSpan`). `q` (a title filter) is plumbed through `useMapPins` but the map has no field for it yet, so it is not sent |
| Where the map looks | `MapPinsDto.origin` + `originSource`: when the origin moves (a teleport, coming home, or a map that opened without the phone's position) the camera follows it |
| Reach | `MapPinsDto.reach`: `radius` (free) only returns pins within 30 km of the origin, so a box past that (`outsideReach`) shows "Activities show within 30 km of you" + **Teleport** (Home's Travel, through the route) instead of "No activities here yet"; `box` (subscribers) returns every pin in the box |
| No location, no teleport | 404 `NO_LOCATION` on the map, the list and search → "Turn on location, or choose a place" (+ **Choose a place** on the map) |
| Type chips, filter sheet | the `type` query, one type or none |
| Bolt ("Happening today") | client-side, over the pins' `startAt` |
| Search city or country | `@core/places` `searchCities` (debounced, cancelled through `AbortSignal`), then `placeDetails` for where the chosen city is — moves the camera; `endPlacesSession` when the search goes away without a choice. `GET /cities` is gone. A `PlacesError` reads "Place search isn't available right now". Pins still come from where the server looks (a free reader then sees the reach note and Teleport) |
| Mini card | `GET /posts/:id`; the place line is `placeName`, else `localityLabel` ("Lagos, Nigeria"); `placeId`, `formattedAddress`, `countryCode` are mapped too (same on the list's cards) |
| RSVP (· price, when there is one) / Request to join | `POST /posts/:id/rsvp`, optimistic, rolled back on a refusal |
| … on a post with `externalUrl` | the link opens and `POST /posts/:id/link-click` counts it, then the RSVP as usual |
| "You're hosting" (never Join on your own post) | `isHost`, or `host.id` = your id from `GET /me` (backend answers B9) |
| Before you RSVP | local only: shown before the first RSVP, remembered per install (AsyncStorage) |
| Report activity | `POST /posts/:id/report` — see the reason mapping in `exploreRules.ts`. 409 already reported; 400 `VALIDATION_FAILED` is your own post, or (naming `details`) "other" with nothing written; 403 `REPORTING_PAUSED` ("you can still block") |
| Browse By Interest | `GET /interests` |
| Meetups Near You, no interest | `GET /feed?type=meetup` (infinite) — search refuses a call with neither words nor interests |
| Meetups Near You, an interest chosen | `GET /search/posts?interestIds=<id>&type=meetup` (infinite) |
| The list's search box | `GET /search/posts?q=` on submit (2–100 characters; a hint under 2). Results, any type, replace the list until the box is cleared; "Show more" pages; at 100 results it asks to narrow the search |

Every map, post, feed and search call sends `X-Client-Location`. `GET /explore/meetups` was
removed from the API.

A plain 409 outside a report (an RSVP on a post that stopped being live, or on your own post) reads
as `conflict`: the card says it changed and re-reads the post.

Since the backend answers of Nov 9 2026: every post joins by RSVP (`joinMode` and
`EXTERNAL_BOOKING` are gone), shared cost is gone, and a card shows the price or nothing — "RSVP",
not "RSVP · Free", because no price is not the same as free. A Plan never has a price.

Explore search and Meetups Near You are unchanged by the Swagger sync apart from the page shape
(`origin`/`originSource` instead of `city`) and `NO_LOCATION`.

## Query keys and teleport

Answers that depend on where the server looks are keyed under the spec's prefixes (§7.4), not
under `explore`: pins under `mapPins`, searches (by words or interest) under `searchPosts`, and the
feed's meetups under `feed`. Home's Travel resets those three prefixes after a teleport or coming
home, which is how the map and the list follow a teleport without either feature importing the
other.

## Gaps in the API (flagged)

- **Pins have no photo or counts** (`MapPinDto`), so a pin shows its type's glyph, not the post's
  photo, and the design's "Full" tag is not drawn.
- **Report reasons**: the design lists nine, the API takes five. Spam and Inappropriate go as
  themselves, the rest as `other`; every ticked reason is written at the head of `details`.
- **The filter button** opens the same two filters as the chips and the bolt, in words.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/explore` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
explore/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, from the spec in docs/api
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               MapPin, PostPreview, Interest, ListedPost
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               loadPins, loadPost, join, reportPost, loadMeetups, searchPosts, searchPlaces, placeLocation, …
└── presentation/
    ├── screens/                ExploreScreen (map, mini card, dialogs, Explore list sheet)
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Curation weights come from the backend; the client never re-ranks. The map SDK (react-native-maps:
Google Maps on both platforms, with `GOOGLE_MAPS_IOS_API_KEY` and `GOOGLE_MAPS_ANDROID_API_KEY` from EAS
environment variables; an iOS build without its key falls back to Apple Maps) is wrapped in
`core/maps`; this feature never imports it directly.
