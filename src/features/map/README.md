# Feature: Map

**FRD coverage:** MOB-090 → MOB-094
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Full-screen map of the active city, type-coloured pins, pin preview sheet, clustering, filter chips, recenter FAB.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/map` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
map/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               MapPin, PinCluster, MapViewport
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveMapPinsUseCase, ClusterPinsUseCase, FilterPinsByTypeUseCase, …
└── presentation/
    ├── screens/                MapScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

The Mapbox SDK is wrapped in `core/maps` — this feature talks to that wrapper, never to the SDK directly, so the provider can be swapped.
