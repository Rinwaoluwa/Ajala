# Feature: Auth

**FRD coverage:** MOB-001 → MOB-006, MOB-010, MOB-011
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Email/phone sign-up, Google & Apple sign-in, sign-in, forgot password, logout, account deletion (14-day soft delete).

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/auth` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
auth/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               AuthSession, AuthCredentials, OtpChallenge
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               SignInWithEmailUseCase, SignUpWithEmailUseCase, SignUpWithPhoneUseCase, …
└── presentation/
    ├── screens/                SignInScreen, SignUpScreen, OtpVerificationScreen, …
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Tokens go through `core/storage/secure` only — never AsyncStorage. Logout must clear every cache (see `core/cache`).
