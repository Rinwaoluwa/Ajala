# Feature: Profile

**FRD coverage:** MOB-140 → MOB-146
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built: profile setup** (API map §3), the flow `GET /me` sends an incomplete profile to:
location → "Set up your profile" (photo, city, languages, an optional gender, plus name/date of birth
when the account lacks them) → travel style → destinations → interests → saving (one `PATCH /me`) →
display name (`PATCH /me { handle }`) → biometric sign-in (`app-lock`) → "You're all set!".

- **Travel style** saves `extras.travelStyles`: the 36 chips map one to one onto the API's
  `TravelStyle` values (`TRAVEL_STYLES` in `domain/rules/profileSetupRules.ts`), up to 10.
- **Destinations** shows the server's popular cities (`GET /cities/popular`) as chips, searches with
  `GET /cities?q=`, and saves `extras.favouriteCityIds` (up to 10); they read back as `favouriteCities`.
- **Gender** is asked but optional: the `GET /me` description says name and date of birth complete a
  profile, while one field text still lists gender (spec §2.4, §8.1, open). The app never works out
  completion itself; it reads `profileCompletedAt` from the server.

**Built: the profile pages** (API map §9; Figma Own Profile, Other User, Saved activities,
Achievements):

- **Profile tab** (`OwnProfileScreen`) — `GET /me` (the shared `['me']` cache, also written by setup
  and Edit profile) for the handle, photo, name, pronouns, city (and `visiting`), tagline, bio,
  interests, languages, travel style, favourite places, social links and featured photos; settings
  and messages as glass buttons; Edit profile and Share (the links host,
  `https://ajalatrvl.com/users/<handle>`); Saved activities; the achievements preview; and the
  **Going / Requested** tabs (`GET /me/rsvps?state=going|requested`, the same lists as Trips).
- **Another traveller** (`PublicProfileScreen`, `/(app)/user/[id]`) — `GET /users/:id` (with "Open to
  meet today", travel style and favourite places), their hosted posts, what they attended and — when
  they share plans — their upcoming plans (`/users/:id/posts`, `/attended`, `/plans`, infinite,
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
  with its milestone. A post with no city counts as an event but stamps nowhere. Badge and stamp art
  is drawn in SVG (`BadgeArt`, `StampArt`).
- **Counters** — Events (attended) and Countries (distinct) from the same history. The design's Streak
  has no data anywhere and is not shown.

Not built: Follow (not in the API or the requirements); a screen for trips (`visiting` is read-only,
spec §2.8); the photo gallery editor (Edit profile, the settings feature).

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
