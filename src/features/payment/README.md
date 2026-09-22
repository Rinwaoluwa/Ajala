# Feature: Payment & Subscription

**FRD coverage:** MOB-160 → MOB-167, MOB-058, MOB-062, MOB-108
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Weekly-only subscription tier, teleport paywall, StoreKit / Play Billing purchase, restore purchase, receipt validation, renewal state, paid-post checkout and coupon redemption, manage/cancel deep link.

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/payment` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
payment/
├── data/
│   ├── datasources/remote/     REST + StoreKit / Play Billing wrappers
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               Subscription, SubscriptionStatus, Purchase, Receipt, PaymentIntent, Price
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               ObserveSubscriptionStatusUseCase, StartWeeklySubscriptionUseCase, RestorePurchaseUseCase, …
└── presentation/
    ├── screens/                PaywallSheet, ManageSubscriptionScreen, CheckoutScreen, …
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Money mutations never queue silently offline — they prompt (see architecture non-negotiables). Store SDKs are wrapped in `data/datasources/remote`; the domain layer knows nothing about StoreKit or Play Billing. Publishes subscription state to `shared/state` so Home can gate teleport without importing this feature.
