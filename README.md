# Ajala

React Native + Expo (Expo Router, TypeScript). A location-aware social app where travellers
and city locals discover and join **Meetups, Events, Plans and Groups** — city-default feed,
premium travel to another city, and action-driven participation instead of likes.

This repository is **structure only**: every folder, its contract, and the lint rules that keep
the contract honest. No implementation yet.

## Demo mode

`npm run demo` runs the app against a built-in pretend API with realistic Lagos data — sign in with any email and password. See [docs/DEMO.md](docs/DEMO.md).

## The shape

```
Ajala/
├── app/                    Expo Router routes — thin, they just render feature screens
├── src/
│   ├── bootstrap/                composition root: bootstrap, providers, DI container, navigation
│   ├── core/               infrastructure: HTTP, sockets, push, cache, storage, maps, analytics
│   ├── shared/             the global object: shared components, global stores, shared domain
│   └── features/           one folder per feature — the unit of ownership
│       ├── auth/  onboarding/  home/  explore/  create-post/  map/
│       └── post-detail/  chat/  profile/  payment/  notifications/  settings/
├── contracts/              OpenAPI, socket events, push payloads, analytics, design tokens
├── e2e/                    Maestro flows
└── scripts/                boundary checker used in CI
```

Every feature folder has the same three layers:

```
<feature>/
├── data/           talks to the outside world: REST, sockets, cache, device
├── domain/         business logic: entities, repository contracts, use cases — pure TypeScript
├── presentation/   UI: screens, components, hooks (view models), state, navigation
└── index.ts        the feature's public API — the only file others may import
```

The dependency rule runs one way: **Presentation → Domain ← Data**. Domain imports nothing.

## Working in parallel

Two engineers in `payment` and `home` should never touch the same file. That is enforced,
not just encouraged:

1. **Features are sealed.** `index.ts` is the public API. `@features/payment/data/...` fails
   lint; `@features/payment` is fine.
2. **Features never import each other's internals.** Home does not import Payment to gate
   travel — Payment publishes `subscriptionStore` to `shared/state` and Home reads it.
3. **Shared code is promoted, never grabbed.** Code lives in a feature until a second feature
   needs it, then moves to `src/shared/` in its own PR reviewed by a lead.
4. **Ownership is in `.github/CODEOWNERS`** — one reviewer per feature, leads on `shared/`
   and `core/`.
5. **CI runs `npm run check:boundaries`** so a cross-boundary import fails the build.

Read `docs/ARCHITECTURE.md` for the layer rules, and `src/features/<name>/README.md` for
what a given feature owns and which FRD requirements it covers.

## Getting started

```bash
npm install
npx expo start
```

`npm run lint`, `npm run typecheck`, `npm run check:boundaries` and `npm test` all run in CI.
