# Feature: Explore

**FRD coverage:** MOB-080 → MOB-082
**Owner:** _unassigned_ — put your name here when you pick this feature up.

The Explore tab: a full-screen map of the feed's city with its pins, a mini card per pin, and the
Explore list (Browse By Interest, Meetups Near You). The map lives here rather than in `map/`,
because API map §7 makes it the Explore tab; `map/` is still the empty scaffold.

## What it calls (docs/api — API map §6–7, spec §2.11–2.13)

| Screen element | Call |
| --- | --- |
| Pins | `GET /map/pins?bbox&type` when the map settles; box clamped under 5° (`@core/maps`) |
| Type chips, filter sheet | the `type` query, one type or none |
| Bolt ("Happening today") | client-side, over the pins' `startAt` |
| Search city or country | `GET /cities?q=` — moves the camera; pins still come from the feed's city |
| Mini card | `GET /posts/:id` |
| RSVP · Free / Request to join | `POST /posts/:id/rsvp`, optimistic, rolled back on a refusal |
| Book (paid Event, `joinMode: external`) | `POST /posts/:id/link-click`, then the link opens |
| Before you RSVP | local only: shown before the first RSVP, remembered per install (AsyncStorage) |
| Report activity | `POST /posts/:id/report` — see the reason mapping in `exploreRules.ts` |
| Browse By Interest | `GET /interests` |
| Meetups Near You | `GET /explore/meetups?interestId` (infinite) |

Every map, post and meetup call sends `X-Client-Location`.

## Gaps in the API (flagged)

- **Pins have no photo or counts** (`MapPinDto`), so a pin shows its type's glyph, not the post's
  photo, and the design's "Full" tag is not drawn.
- **The list's search box has no endpoint**: it narrows the meetups already loaded.
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
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               MapPin, PostPreview, Interest, NearbyMeetup
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               loadPins, loadPost, join, reportPost, loadMeetups, searchPlaces, …
└── presentation/
    ├── screens/                ExploreScreen (map, mini card, dialogs, Explore list sheet)
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Curation weights come from the backend; the client never re-ranks. The map SDK (react-native-maps:
Apple Maps on iOS, Google Maps on Android with `GOOGLE_MAPS_ANDROID_API_KEY`) is wrapped in
`core/maps`; this feature never imports it directly.
