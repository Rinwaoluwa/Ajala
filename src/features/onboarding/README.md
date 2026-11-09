# Feature: Onboarding

**FRD coverage:** MOB-007, MOB-008, MOB-009
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Three-screen skippable tour. City detection and interests are in profile setup (`@features/profile`), which finds the city with Google places (`@core/places` `cityAt`); nothing here reads or saves a city.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/onboarding` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
onboarding/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, from the spec in docs/api
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               OnboardingProgress
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               GetOnboardingSlidesUseCase, CompleteOnboardingUseCase, …
└── presentation/
    ├── screens/                WelcomeScreen, OnboardingScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Location-permission denial must not block the flow — profile setup falls back to the Google city search.
