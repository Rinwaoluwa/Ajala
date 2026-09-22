# Feature: Explore

**FRD coverage:** MOB-080 → MOB-082
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Exactly two components: a curated MeetupCard list and the InterestTopicsGrid. Nothing else is surfaced here — no search bar, no Events/Plans/Groups.

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
│   ├── entities/               InterestTopic, CuratedMeetupList
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveCuratedMeetupsUseCase, ObserveInterestTopicsUseCase, FilterMeetupsByInterestUseCase, …
└── presentation/
    ├── screens/                ExploreScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Curation weights come from the backend; the client never re-ranks. Keep the surface minimal — new content types need an FRD change, not a PR.
