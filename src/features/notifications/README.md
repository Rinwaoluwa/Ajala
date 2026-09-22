# Feature: Notifications

**FRD coverage:** MOB-180 → MOB-186
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Push categories (join request, acceptance, T-24h reminder, new DM, new comment, subscription expiring), per-category preferences, tap-to-route.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/notifications` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
notifications/
├── data/
│   ├── datasources/remote/     REST + FCM token registration
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               AppNotification, NotificationCategory, NotificationPreference
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveNotificationsUseCase, RegisterPushTokenUseCase, UpdateNotificationPreferencesUseCase, …
└── presentation/
    ├── screens/                NotificationCenterScreen, NotificationPreferencesScreen
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

FCM/APNs plumbing lives in `core/api/messaging`. A push payload is an *event*, not state: the handler triggers a repository refresh, it never writes to a store directly.
