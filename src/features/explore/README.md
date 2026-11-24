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
| The map's search field | Typed in on the map; the keyboard's Search key runs the search (24 Nov): the Explore list opens with the words in its own box and what they find listed (`onSeeAll` → `openList({ words, scope })`, then `GET /search/posts?q=` from the list). The map's field is emptied as it hands over, and any card that was up is put away. One character is handed over too: the list puts it in its box, keyboard up, and asks for more (search takes 2 to 100 characters). Nothing is asked of the server while typing, as the spec has it ("runs on submit; no typeahead", §2.18) |
| Results under the map's field | **Off** (`RESULTS_HERE` in `MapSearchBar`, 24 Nov). For a day the field listed the first five activities found as someone typed (`GET /search/posts?q=` after a 350 ms pause; choosing one moved the camera to it, `showOnMap`). The code is unchanged and asks nothing while off; backend request B17 is the question it raised. Cities and people in the same card are a second switch (`SUGGESTIONS_ENABLED`, off since 23 Nov) |
| Mini card | `GET /posts/:id`; the place line is `placeName`, else `localityLabel` ("Lagos, Nigeria"); `placeId`, `formattedAddress`, `countryCode` are mapped too (same on the list's cards) |
| RSVP (· price, when there is one) / Join | `POST /posts/:id/rsvp`, optimistic, rolled back on a refusal. A private post asks its host first; its button says **Join** too (24 Nov: "Request to join" broke over two lines beside Preview) and reads Requested once sent. The card's two buttons sit side by side while both labels fit on a line each, and stack when they would not |
| … on a post with `externalUrl` | the link opens and `POST /posts/:id/link-click` counts it, then the RSVP as usual |
| "You're hosting" (never Join on your own post) | `isHost`, or `host.id` = your id from `GET /me` (backend answers B9) |
| Before you RSVP | local only: shown before the first RSVP, remembered per install (AsyncStorage) |
| Report activity | `POST /posts/:id/report` — see the reason mapping in `exploreRules.ts`. 409 already reported; 400 `VALIDATION_FAILED` is your own post, or (naming `details`) "other" with nothing written; 403 `REPORTING_PAUSED` ("you can still block") |
| Browse By Interest | `GET /interests` |
| Meetups Near You, no interest | `GET /feed?type=meetup` (infinite) — search refuses a call with neither words nor interests |
| Meetups Near You, an interest chosen | `GET /search/posts?interestIds=<id>&type=meetup` (infinite) |
| The list's search box | Pinned at the top of the full-height sheet. `GET /search/posts?q=` when a search is run (the keyboard's Search key, the "Search for …" row, or a past search; 2–100 characters, a hint under 2). Results, any type, take the page until Cancel or the box is cleared; "Show more" pages; at 100 results it asks to narrow the search. Nothing found says where search looked (within 30 km) and offers People and Clear search |
| A card in the list | With a photo: `MeetupCard`. Without one: `TextPostCard` (the Home design's text-only post, fitted to the list): the type's tag, the title, the host's words, when and where on one line, and **Join** at its end (`JoinPill`: `POST` / `DELETE /posts/:id/rsvp`, the first RSVP asking "Before you RSVP" inside the sheet). No Comment or Save row: both are on the post. The place is never cut below nine letters to keep Join beside it: on a narrow phone or at a larger text size Join goes under the line, and at the largest sizes when and where stack. The words are not in the list's data (backend request B10), so each such card reads `GET /posts/:id` (`usePostDescription`, the cache the map's card uses) and holds two lines open until they land |
| People | `GET /search/people?q=`, asked once the People tab is opened |
| Recent searches | Kept on the phone (`recentSearchStore`, AsyncStorage, per account, the latest 6): shown when the box is tapped, removable one by one or all |
| Suggestions while typing | Worked out on the phone from the recent searches and `GET /interests` (`startingWith`): the API has no typeahead, so nothing is asked per keystroke. An interest picked there is Browse By Interest |

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

## The Explore list (View List): how it is laid out, and why

One full-height sheet (`Sheet fill`), one scroll area, the search box pinned above it.

| What | Why |
| --- | --- |
| Full height, kept as the content changes | A sheet sized to its content jumps as results arrive. NN/g: a sheet that holds a whole task should be a page, with a visible way out (the × and Cancel) |
| The search box never moves; the list makes room for the keyboard | The box was inside the scrolling content of a sheet that rose with the keyboard, so the keyboard scrolled it out of sight. Apple HIG and Material both keep the field fixed at the top while searching |
| Tapping the box opens search in place, with Cancel beside it | HIG search fields; Material's search view. One obvious way back to browsing |
| Recent searches when the box is empty | HIG ("consider showing recent searches"), Baymard, Algolia: the cheapest search is one not typed again |
| Suggestions while typing come from the phone | The API searches on submit only. Local matches still save typing, and "Search for …" makes the next step plain |
| Activities and People a tap apart, under the box | Scopes belong with the field (HIG scope bar), and only once there is something to scope |
| Nothing found is never a dead end | Baymard, NN/g: say what was searched and where, offer the nearest other thing to do |
| Browse By Interest opens out in place | It opened a second sheet over the first. NN/g: don't stack sheets |
| The interest chosen is the map's own | The list and the map are two views of the same thing (as Airbnb and Google Maps keep them) |
| Meetups Near You reads down, one full-width card each | The design has a row to swipe sideways. Sideways rows hide most of their content and are skipped (Baymard, NN/g on carousels). **A departure from the Figma frame** |
| Back from a result lands on the list, search intact | Baymard: losing the list on the way back is among the most common mobile search failures. The scroll position is not restored yet |

Sources: NN/g "Bottom Sheets" · Apple HIG "Search fields", "Searching" · Material 3 "Search" ·
Baymard "Mobile UX" · Algolia "Mobile search UX" (parts one and two) · Smashing Magazine "Things
users would appreciate in mobile apps" · eBay Playbook "Bottom sheet".

## Choosing an interest on the map

A chip lights the moment it is tapped. The map follows once the chips have been left alone for
280 ms (`INTEREST_SETTLE_MS` in `ExploreScreen`): it asks for that interest's posts and, when they
arrive, eases the camera (650 ms; at once with Reduce Motion) to frame the ones in the person's
area (`regionCovering` in `@core/maps`: within about 1.5° of where the server looks, with room
around them; one post gets a neighbourhood-sized view). Tapping through several interests quickly
asks once and moves once, for the last one. It frames once per choice; after that the map is the
person's to move. An interest with no posts leaves the map where it is.

"Maximum price" in the filters is in the currency of where the person is. Changing it is a Travel
Pro feature (`canChooseCurrency`).
