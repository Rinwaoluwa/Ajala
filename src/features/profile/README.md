# Feature: Profile

**FRD coverage:** MOB-140 → MOB-146
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built: profile setup** (API map §3), the flow `GET /me` sends an incomplete profile to:
location → "Set up your profile" (photo, city, languages, an optional gender, plus name/date of birth
when the account lacks them) → travel style → destinations → interests → saving (one `PATCH /me`) →
display name (`PATCH /me { handle }`) → biometric sign-in (`app-lock`) → "You're all set!".

- **Travel style** saves `extras.travelStyles`: the 36 chips map one to one onto the API's
  `TravelStyle` values (`TRAVEL_STYLES` in `domain/rules/profileSetupRules.ts`), up to 10.
- **Cities are Google places** (spec §1.6): the API has no city endpoints any more, so the data layer
  calls `@core/places`. "Detect my city" is `cityAt(lat, lng)` with the phone's location (null, and
  the person searches, when location is off or the lookup fails). "Current city" and the destinations
  search use `searchCities`: debounced 300 ms, from two letters, cancelled by TanStack's `signal`
  when the person types on, not retried, and `endPlacesSession` when a city is picked or the screen
  closes. Any `PlacesError` reads "Place search isn't available right now". Only place ids go to the
  API: `homePlaceId` and `extras.favouriteDestinationIds`; they read back as `homePlace` and
  `favouriteDestinations` (`PlaceRefDto { placeId, label, countryCode }`). The old `homeCityId` and
  `favouriteCityIds` are never sent (`PATCH /me` rejects fields it does not list; a leftover
  `favouriteCityIds` in extras is dropped before saving).
- **Destinations** saves up to 10 cities (an 11th is a 400, so the list stops at ten). Swagger has
  no popular cities, so under the picks sits a short fixed list of well-known cities
  (`POPULAR_DESTINATION_SEARCHES` in `domain/rules/profileSetupRules.ts`). Tapping one searches for that name; the person still picks the real Google city, so
  nothing is saved from a guessed id.
- **Gender** is asked but optional: first name, last name and date of birth complete a profile; gender
  is never needed (backend answers A1). The app never works out completion itself; it reads
  `profileCompletedAt` from the server.
- **The setup `PATCH /me` always goes out.** An email sign-up already has its name and date of birth,
  but stays incomplete until its first `PATCH /me` (A1). So the save at the end of setup is sent on
  every path, Skip included, with whatever was collected (`setupAnswers`) plus the phone's time zone,
  which keeps the body from ever being empty. Only a name the API would refuse stops it.

**Built: the profile pages** (API map §9; Figma Own Profile, Other User, Saved activities,
Achievements):

- **Profile tab** (`OwnProfileScreen`) — `GET /me` (the shared `['me']` cache, also written by setup
  and Edit profile) for the handle, photo, name, pronouns, home city, tagline, bio,
  interests, languages, travel style, favourite places, social links and featured photos; settings
  and messages as glass buttons; Edit profile and Share (the links host,
  `https://go.ajalatrvl.com/users/<id>`, host from `EXPO_PUBLIC_LINKS_HOST`); Saved activities; the achievements preview; and the
  **Going / Requested** tabs (`GET /me/rsvps?state=going`; Requested reads `state=requested` and then
  `state=waitlisted`, tagged Request sent or Waitlisted, the same lists and order as Trips' Requests).
- **Another traveller** (`PublicProfileScreen`, `/(app)/user/[id]`) — `GET /users/:id` (with "Open to
  meet today", travel style and favourite places), their hosted posts, what they attended and — when
  their public plans setting (`sharePlans`) is on — their upcoming plans (`/users/:id/posts`, `/attended`, `/plans`, infinite,
  Hosting / Attending / Upcoming). **Message** goes to the chat feature's start route with the
  person's id (`chatRoutes.start`, which calls `POST /conversations { userId }`); it is not offered on
  a blocked profile. ⋯ Profile options: share, copy link (`expo-clipboard`, with the share sheet as a
  fallback), report (`POST /users/:id/report`, the API's five reasons; details required for "other")
  and block / unblock (`POST|DELETE /users/:id/block`; blocking refreshes the feed and the map, where
  they disappear). A 404 shows "not available".
- **Saved activities** (`/(app)/saved`) — `GET /me/saved?type=all|meetup|event|plan|group`, an
  infinite query per filter under `['saved', type]`. The bookmark on each card is the shared
  `useSavePost`, which refreshes every `['saved', …]` query after a save or unsave.
- **Achievements** (`/(app)/achievements`) — Badges and Stamps, **worked out on the phone** from the
  attended history (`GET /me/attended`, all pages): there is no achievements API (§12), so
  `domain/rules/achievementRules.ts` holds a small badge catalogue (Trail Seeker, Ajala Foodie, Good
  Company…) whose progress is counted from real attendance, and one passport stamp per city attended,
  with its milestone. Cards carry `localityLabel` ("Lagos, Nigeria") and `countryCode` but no city id,
  so a stamp is one `localityLabel` and Countries counts country codes. A post with no place counts
  as an event but stamps nowhere. Badge and stamp art
  is drawn in SVG (`BadgeArt`, `StampArt`).
- **Counters** — Events (attended) and Countries (distinct) from the same history. The design's Streak
  has no data anywhere and is not shown.

Not built: Follow (not in the API or the requirements); trips and `visiting` (trips are parked in the
API and `visiting` is always null, backend answers A9, so it is neither read nor shown); the photo
gallery editor (Edit profile, the settings feature).

Naming, from the backend answers:

- **`verified`** is an admin badge meaning the Ajala team reviewed the profile (A9). It is carried
  on the profile but not drawn yet; when it is, word it that way, never as an identity check.
- **`sharePlans`** is the public "Upcoming" list on someone's profile. It is not the trusted person
  ("Share my plan", C6), a separate feature, so nothing here is called "Share my plan".

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/profile` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
profile/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, from the spec's §6 types (docs/api)
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               Profile, ParticipationEntry, HostedPost
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveProfileUseCase, ObserveParticipationGridUseCase, ObserveHostedPostsUseCase, …
└── presentation/
    ├── screens/                ProfileScreen, EditProfileScreen, OtherUserProfileScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Participation posts are derived server-side and must never leak into Home, Explore or Map queries.
