# Feature: Create Post

**FRD coverage:** MOB-050 → MOB-067
**Owner:** _unassigned_ — put your name here when you pick this feature up.

"Create something" and the four create wizards — Meetup, Event, Plan, Group activity
(Figma, light and dark). One wizard, five steps, worded per type (`presentation/copy.ts`):

1. **Basic details** — 2–4 photos (hold and drag to reorder; the first is the cover), title (80,
   the API's limit — the design says 100), description (500), and a Plan's destination or a
   Group's location (searched in place, `GET /cities`).
2. **When and where?** — date, start time (and end time for all but Meetups), the meeting point or
   venue, and the list of details / schedule / itinerary / repeat schedule.
3. **Who can join?** — capacity (Event: over 100 or no limit; Group: 1–100), open or request to
   join, show on map, waiting list.
4. **Cost** — a shared total split between expected travellers (Meetup, Plan, Group) or a price
   per person (Event), NGN or USD, and a link to pay or book.
5. **Review** — the post as it will look, its interests (1–3), anything still missing, Publish.

## API (docs/api, API map §5)

Everything stays on the phone until **Publish** (`POST /posts`, multipart, `status=published`)
or **Save draft** (`status=draft`). After a draft exists, saves and Publish update it instead:
`PATCH /posts/:id`, `PUT /posts/:id/images` (only when the photos changed), a Plan's
`PUT /posts/:id/checklist`, then `POST /posts/:id/publish`. Errors are mapped by code
(`CreatePostError`): validation failures are listed on the review step; the monthly Event cap,
draft limit, image and network errors open "That didn't go through".

The pin a Meetup or Event needs comes from the typed meeting point, found by the phone's own
geocoder (`core/location` `geocodePlace`) when leaving step two. Plans and Groups fall back to
their city's pin.

## Gaps and decisions (flag to product)

- **Interests** are required to publish but drawn in no wizard — asked for on the review step.
- **End time** is collected but the API has no field for it; it is not sent.
- **Details / Event schedule / Repeat schedule** lines have no API field; only a **Plan's
  itinerary** is sent (as its checklist). The others stay on the phone.
- **Shared cost**: the per-person share (total ÷ expected travellers, rounded up) is sent as the
  price. API map §12 asks product to confirm that.
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
