# Feature: Create Post

**FRD coverage:** MOB-050 → MOB-067
**Owner:** _unassigned_ — put your name here when you pick this feature up.

"Create something" and the four create wizards — Meetup, Event, Plan, Group activity
(Figma, light and dark). One wizard, five steps, worded per type (`presentation/copy.ts`):

1. **Basic details** — 2–4 photos (hold and drag to reorder; the first is the cover), title (80,
   the API's limit — the design says 100), description (500, the design's; the API takes 1000),
   and a Plan's destination or a Group's location (searched in place, `GET /cities`).
2. **When and where?** — date, start time (and end time, `endAt`, for all but Meetups), the
   meeting point or venue, an Event's **schedule** or a Plan's **itinerary** (lines in order),
   and a Group's **Repeats** (weekly, every 2 weeks, monthly; optional last date).
3. **Who can join?** — capacity (Event: over 100 or no limit; Group: 1–100), open or request to
   join, show on map, waiting list.
4. **Cost** — a Plan or Group: a shared total and how many it is split between; a Meetup or
   Event: a price per person. NGN or USD, and a link to pay or book.
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
| `priceCents` + `currency` | ✓ | ✓ | | |
| `costTotalCents` + `costCurrency` + `expectedCount` (all or none; PATCH: null on all three clears) | | | ✓ | ✓ |
| `recurrence` + `recurrenceEndsOn` (PATCH: null stops it) | | | | ✓ |
| `cityId` (only without a pin) | | | ✓ | ✓ |

The pin a Meetup or Event needs comes from the typed meeting point, found by the phone's own
geocoder (`core/location` `geocodePlace`) when leaving step two. A Plan or Group uses the pin when
it is found; otherwise it sends its city as `cityId`. A pin always decides the city.

The server splits a shared cost (`costSplit.perPersonCents`); the cost and review steps show a
rounded-up "About N each" labelled as a preview. A monthly Group must start on the 1st–28th; the
wizard says so on step two before the server does.

Errors are mapped by code (`CreatePostError`): a 400 `VALIDATION_FAILED` lists each `errors[]`
message on the review step with a **Fix** link to the step holding its field (`stepOfField`);
409 `EVENT_MONTHLY_CAP` says when it resets (`details.resetsAt`); a plain 409 is the 20-draft cap
on a draft create and "can't be changed any more" elsewhere. Those, image and network errors open
"That didn't go through".

## Gaps and decisions (flag to product)

- **Interests** are required to publish but drawn in no wizard — asked for on the review step.
- **Meetup details** and a Group's **Repeat schedule** lines (drawn as free text) have no API
  field, so they are not shown. A Group's repeat is the **Repeats** choice (`recurrence`).
- **Meetup cost**: the design shows a shared cost, but the API takes a cost split only on Plans and
  Groups. A Meetup's cost step asks for a price per person instead (as before, what reached the
  server was a per-person price).
- **Schedule / itinerary limits** are not in the spec (§8.4). The wizard keeps 30 lines of 120
  characters until the backend says.
- **End time** is on the start's day; an Event or Plan running past midnight can't say so yet.
- Plans and Groups saved before the cost split carried each person's share as `priceCents`; a
  resumed one comes back as a total for one person and is re-sent as a split (the price cleared).
- **Invite friends** is not built — there is no friends or invite API (API map §12).
- The design's success sheet for a Meetup says "Sign in" and shows a handshake; it uses the same
  check-mark sheet as the other types, with "View meetup".
- The wizard opens over the tabs, without the tab bar some frames show, so it reads as one task.
- Drafts are saved to the server; there is no drafts list to resume one from yet
  (`GET /me/posts?status=draft`).

## Layout

```
create-post/
├── createPostModule.ts        composition root (use cases over the API and the geocoder)
├── data/                      postApi (multipart form), DTOs, mappers, PostRepositoryImpl, placeLocator
├── domain/                    PostDraft, CreatePostError, postDraftRules, CreatePostUseCases
└── presentation/
    ├── screens/               CreatePostScreen
    ├── components/            WizardHeader, PhotoGrid, NotesList, CapacityStepper, CostCard, …
    ├── components/steps/      BasicsStep, ScheduleStep, ParticipantsStep, CostStep, ReviewStep
    ├── hooks/                 useCreatePost (view model), useCitySearch
    └── state/                 query keys, use-case hook
```
