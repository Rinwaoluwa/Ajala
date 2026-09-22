# Feature: Settings

**FRD coverage:** §14, MOB-010, MOB-011, MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Account, notification toggles, privacy (read receipts, visibility, blocked users), subscription entry, support, about, logout, delete account.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/settings` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
settings/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               AppSettings, PrivacySettings, BlockedUser
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveSettingsUseCase, UpdatePrivacySettingsUseCase, ObserveBlockedUsersUseCase, …
└── presentation/
    ├── screens/                SettingsScreen, AccountSettingsScreen, PrivacySettingsScreen, …
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Composes other features through their public barrels only — e.g. it renders the subscription row from `@features/payment`, it does not reimplement it.
