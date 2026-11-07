# Adding a feature

Copy the shape, do not invent one. Twelve features already follow it.

## 1. Create the folders

```bash
FEATURE=my-feature
mkdir -p src/features/$FEATURE/{data/{datasources/{remote,local},dto,mappers,repositories,__tests__},domain/{entities,repositories,usecases,__tests__},presentation/{screens,components,hooks,state,navigation,__tests__}}
```

## 2. Work inward, then outward

1. **Domain first.** Write the entity and the repository interface. No imports beyond other
   domain files. If you find yourself wanting `axios` here, the code belongs in `data/`.
2. **Use cases.** One per user intent, named for the intent: `JoinPostUseCase`,
   `CancelJoinRequestUseCase`. A use case takes repository interfaces in its constructor.
3. **Data.** Implement the interface. Pick a cache policy and say why in a comment. Map DTOs
   to entities in `mappers/` — an entity never carries a wire field name.
4. **Presentation.** State type, hook (view model), screen, components. The hook owns state
   and calls use cases; the screen renders state and forwards callbacks.
5. **Register.** Wire the repository into the use cases in the feature's `<name>Module.ts`, add
   a route file under `app/`, export the screen from the feature's `index.ts`.
6. **Own it.** Add yourself to `.github/CODEOWNERS`.

## 3. Before you open the PR

```bash
npm run lint && npm run typecheck && npm run check:boundaries && npm test
```

## Needing something another feature has

Do **not** import it from there. Two options:

- **It is genuinely shared** — promote it to `src/shared/` in a separate PR, tagged for a lead.
  Shared components are dumb: props in, callbacks out, no feature-specific branching.
- **It is state another feature owns** — read it from `shared/state`. The owning feature
  publishes, you subscribe. Example: `payment` writes `subscriptionStore`; `home` reads it to
  decide whether travel opens the city picker or the paywall.

If neither fits, the boundary is probably in the wrong place. Raise it at architecture review
rather than reaching across.

## Naming

| Thing | Pattern | Example |
| --- | --- | --- |
| Folder | kebab-case | `create-post` |
| Component / screen | PascalCase, screens end in `Screen` | `HomeFeedScreen` |
| Hook | `use` + feature intent | `useHomeFeed` |
| Use case | verb + noun + `UseCase` | `ObserveCityFeedUseCase` |
| Repository interface | noun + `Repository` | `FeedRepository` |
| Implementation | interface + `Impl` | `FeedRepositoryImpl` |
| DTO | noun + `Dto` | `PostDto` |
| State | screen + `State` | `HomeFeedState` |
