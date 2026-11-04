# Feature: Home (Newsfeed)

**FRD coverage:** MOB-020 → MOB-027, consumes MOB-030 → MOB-039
**Owner:** _unassigned_ — put your name here when you pick this feature up.

**Built so far:** the feed (`GET /feed` with `X-Client-Location`, cursor paging, pull to refresh,
skeleton, empty and error states), the city header, post-type pills (the API's types, agreed with
product), the level card (a static placeholder — no backend), and the Travel city picker (`GET
/cities`). Travel cannot switch the feed's city yet; other cities open the paywall in `payment`.

City-default feed, city selector header, travel banner, feed ordering, cursor pagination, empty state, post-type filter pills.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/home` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
home/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               FeedPage, FeedCursor, FeedFilter
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveCityFeedUseCase, LoadMoreFeedPageUseCase, RefreshFeedUseCase, …
└── presentation/
    ├── screens/                HomeFeedScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

The post card itself lives in `shared/components/post` — Home, Explore, Map, Profile and Chat all render the same card. Travel only *reads* subscription state from `shared/state`; the paywall belongs to `payment`.
