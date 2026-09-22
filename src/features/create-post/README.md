# Feature: Create Post

**FRD coverage:** MOB-050 → MOB-067
**Owner:** _unassigned_ — put your name here when you pick this feature up.

Unified create sheet branching into Meetup / Event / Plan / Group, shared fields, drafts, validation, type-specific rules (coupon codes, monthly event cap, checklists, recurrence).

## Boundary rules

- Everything in this folder is private **except** what `index.ts` exports. Other features import
  `@features/create-post` and nothing deeper.
- `presentation/` may import `domain/`. `data/` may import `domain/`. **`domain/` imports nothing**
  from either side, and no React/Expo/network packages at all.
- A screen talks to a hook (the view model). A hook calls use cases. Only a repository implementation
  touches the network, the cache or the device.
- Anything two features both need gets promoted to `src/shared/` in its own PR — never imported
  sideways from another feature folder.

## Expected files

```
create-post/
├── data/
│   ├── datasources/remote/     REST services over core/api
│   ├── datasources/local/      cache + draft/offline persistence
│   ├── dto/                    wire shapes, generated from contracts/openapi
│   ├── mappers/                DTO ↔ entity
│   └── repositories/           implementations of the domain contracts
├── domain/
│   ├── entities/               PostDraft, CreatePostForm, CouponCode, PlanChecklist, RecurrenceRule
│   ├── repositories/           contracts (interfaces) the data layer implements
│   └── usecases/               CreatePostUseCase, SaveDraftUseCase, ResumeDraftUseCase, …
└── presentation/
    ├── screens/                TypeSelectorSheet, CreateMeetupScreen, CreateEventScreen, …
    ├── components/             dumb UI, props in / callbacks out
    ├── hooks/                  view models: own state, call use cases, emit events
    ├── state/                  one state type per screen + one-shot event channel
    └── navigation/             this feature's route list and params
```

## Notes

Drafts persist across app kills — they live in `data/datasources/local`. Image upload retries 3× before surfacing an error. Paid-post pricing UI belongs here; the actual charge belongs to `payment`.
