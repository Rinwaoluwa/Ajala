# Feature: Create Post

**FRD coverage:** MOB-050 → MOB-067
**Owner:** _unassigned_ — put your name here when you pick this feature up.

"Create something" and the four create wizards — Meetup, Event, Plan, Group activity
(Figma, light and dark). One wizard, worded per type (`presentation/copy.ts`): five steps, or four
for a Plan, which has no price step (`stepsFor`):

1. **Basic details** — 2–4 photos (hold and drag to reorder; the first is the cover), title (80,
   the API's limit — the design says 100), description (500, the design's; the API takes 1000),
   and a Plan's destination or a Group's location (a city, searched in place with Google through
   `@core/places`: `searchCities`, then `placeDetails`).
2. **When and where?** — date, start time (and end time, `endAt`, for all but Meetups), the
   meeting point or venue (Google suggestions as you type, `searchPlaces`, nearest a Plan's or
   Group's destination first; or just typed), an Event's **schedule** or a Plan's **itinerary** (lines in order, at
   most 30 of 120 characters), and a Group's **Repeats** (weekly, every 2 weeks, monthly; optional last date).
3. **Who can join?** — capacity (Event: over 100 or no limit; Group: 1–100), open or request to
   join, show on map, waiting list.
4. **Price** (Meetups, Events and Groups only) — an optional price per person (NGN or USD) and
   an optional https link to pay or book. **Skip, no price** moves on with neither and clears
   anything typed. A paid Event needs no link. Plans never see this step.
5. **Review** — the post as it will look, its interests (1–3), anything still missing, Publish.

## API (docs/api, API map §5)

Everything stays on the phone until **Publish** (`POST /posts`, multipart, `status=published`)
or **Save draft** (`status=draft`). After a draft exists, saves and Publish update it instead:
`PATCH /posts/:id` (JSON), `PUT /posts/:id/images` (only when the photos changed), then
`POST /posts/:id/publish`.

What is sent per type (spec §2.12; the API 400s a type-only field on the wrong type, so the
wizard never sends one there, not even as null):

| Field | Meetup | Event | Plan | Group |
| --- | --- | --- | --- | --- |
| `endAt` | — (no end time drawn) | ✓ | ✓ | ✓ |
| `schedule` (one form field per line; PATCH: array, null clears) | | ✓ | | |
| `itinerary` (same) | | | ✓ | |
| `priceCents` + `currency` (optional; PATCH: null clears) | ✓ | ✓ | | ✓ |
| `externalUrl` (optional; PATCH: null clears) | ✓ | ✓ | | ✓ |
| `recurrence` + `recurrenceEndsOn` (PATCH: null stops it) | | | | ✓ |
| `placeId` **or** `lat` + `lng` (never both; required to publish) | ✓ | ✓ | ✓ | ✓ |

### The place (Swagger, 9 Nov 2026)

`cityId` and `GET /cities` are gone. Every type needs a place to publish, sent as a Google
`placeId` (the server looks up coordinates and address) or a pin as `lat` + `lng`, never both.
`placeOf` picks one, most exact first:

1. a venue picked from the meeting-point suggestions → `placeId`;
2. a meeting point only typed → the phone's geocoder (`core/location` `geocodePlace`) finds a pin
   on leaving step two → `lat` + `lng` (a Meetup or Event stops there if it can't be found);
3. a Plan's or Group's destination city → `placeId` (Swagger takes a destination's id).

`placeName` is the meeting point's words, or a Plan's or Group's city name when it has none.
Search is debounced (300 ms, from two letters), each search is a cached query whose AbortSignal
cancels an overtaken request, a pick is a cached `placeDetails` lookup, and a picker that goes
away without a pick calls `endPlacesSession`. Any places failure reads "Place search isn't
available right now" (`placesUnavailable`); a meeting point can still be typed then.

**Edits:** `PATCH` moves the place with `placeId` or `lat` + `lng`, and leaves all three out when
the draft has neither: `lat`/`lng` are not nullable and there is no way to clear a place
(spec §8 Q12). `placeName: null` still clears the label.

**Resuming a draft:** the API keeps one place (`placeId`, `placeName`, `formattedAddress`,
`localityLabel`, `lat`, `lng`). A Meetup's or Event's comes back as its venue (with a `placeId`)
or its typed place and pin. A Plan's or Group's is its destination when the label is just the
city's name; otherwise it is the meeting point, and the destination is rebuilt from
`localityLabel` without a place id — shown, never sent, so the post keeps its place.

There is no shared cost: `costTotalCents`, `costCurrency`, `expectedCount` and `costSplit` left the
API (backend answers, Nov 9 2026, C1/C2), and sending them is now a 400. Plans carry no money —
each stop can cost something different, so people talk about it in the group chat — and the API
400s `priceCents`, `currency` or `externalUrl` on a Plan, even as null, so none is ever sent on one.
A post with no price shows none (the review step leaves the row out, never "Free").

A monthly Group must start on the 1st–28th, and a schedule or itinerary holds at most 30 lines of
120 characters (A2); the wizard says so on step two before the server does, and sends lines as
typed rather than cutting them.

Errors are mapped by code (`CreatePostError`): a 400 `VALIDATION_FAILED` lists each `errors[]`
message on the review step with a **Fix** link to the step holding its field (`stepOfField`;
`placeId` goes to a Plan's or Group's destination or a Meetup's or Event's meeting point; a
field on a step this type doesn't have, like a price on a Plan, stays on the review step);
503 `SERVICE_UNAVAILABLE` (uploads busy, or the map lookup down) is "try again in a moment";
409 `EVENT_MONTHLY_CAP` says when it resets (`details.resetsAt`); a plain 409 is the 20-draft cap
on a draft create and "can't be changed any more" elsewhere. Those, image and network errors open
"That didn't go through".

## Gaps and decisions (flag to product)

- **Interests** are required to publish but drawn in no wizard — asked for on the review step.
- **Meetup details** and a Group's **Repeat schedule** lines (drawn as free text) have no API
  field, so they are not shown. A Group's repeat is the **Repeats** choice (`recurrence`).
- **Cost screens**: the design's shared-cost screens (Cost Sharing, a Plan's estimated split) are
  out of date. Meetups, Events and Groups get one skippable price screen; Plans get none.
- **End time** is on the start's day; an Event or Plan running past midnight can't say so yet.
- **Older drafts**: a shared cost saved before it left the API is simply gone when a draft is
  resumed. A Plan's old price or link is dropped and never re-sent; the server is expected to have
  cleared it, since the wizard can't send a null on a Plan.
- **Invite friends** is not built — there is no friends or invite API (API map §12).
- The design's success sheet for a Meetup says "Sign in" and shows a handshake; it uses the same
  check-mark sheet as the other types, with "View meetup".
- The wizard opens over the tabs, without the tab bar some frames show, so it reads as one task.
- Drafts are saved to the server; there is no drafts list to resume one from yet
  (`GET /me/posts?status=draft`).
- **No map to drop a pin on.** The wizard's pin comes from the typed meeting point (the phone's
  geocoder). A Plan's or Group's meeting point can't be removed from a saved draft once it has
  one (the API can't clear a place); it can only be moved.

## Layout

```
create-post/
├── createPostModule.ts        composition root (use cases over the API, Google places and the geocoder)
├── data/                      postApi (multipart form), DTOs, mappers, PostRepositoryImpl,
│                              placeFinder (@core/places), placeLocator (geocoder)
├── domain/                    PostDraft, CreatePostError, postDraftRules, CreatePostUseCases
└── presentation/
    ├── screens/               CreatePostScreen
    ├── components/            WizardHeader, PhotoGrid, PlaceField, NotesList, CapacityStepper, PriceCard, …
    ├── components/steps/      BasicsStep, ScheduleStep, ParticipantsStep, PriceStep, ReviewStep
    ├── hooks/                 useCreatePost (view model), usePlaceSearch
    └── state/                 query keys, use-case hook
```
