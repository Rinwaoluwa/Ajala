# Feature: Profile

**FRD coverage:** MOB-140 → MOB-146
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far: profile setup** (API map §3), the flow `GET /me` sends an incomplete profile to:
location → "Set up your profile" (photo, city, languages, gender, plus name/date of birth when the
account lacks them) → travel style → destinations → interests → saving (one `PATCH /me`) → display
name (`PATCH /me { handle }`) → biometric sign-in (`app-lock`) → "You're all set!". Travel styles and
destinations have no backend field yet (§12) and are not saved, as agreed with product.

Profile header (no follower counts), participation grid, hosted-posts tab, drafts tab (own profile only), profile editing, block from profile.

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
│   ├── dto/                    wire shapes, generated from contracts/openapi
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
