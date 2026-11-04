# shared — the global object

Everything here is owned by the whole team and reviewed by the leads. It is the only
place a feature may import from besides `@core`.

| Folder | Holds | Example |
| --- | --- | --- |
| `components/ui` | design-system primitives | Button, Text, Chip, Avatar, Sheet, Skeleton |
| `components/layout` | screen scaffolding | Screen, AppHeader, TabBar, SafeArea |
| `components/feedback` | states and messaging | EmptyState, ErrorState, Toast, StaleDataBanner |
| `components/media` | images and upload | ImageCarousel, Lightbox, ImagePickerGrid |
| `components/post` | the post card every surface renders | PostCard, PrimaryActionButton, JoinedCountChip, PostTypeBadge, CapacityIndicator, PriceTag |
| `components/form` | inputs and validation display | TextField, DateTimeField, LocationField, CharCounter |
| `hooks` | cross-feature React hooks | useDebounce, useAppState, useConnectivity |
| `state` | **global data** — one store per concern | session, activeCity (travel), subscription, connectivity, feature flags |
| `domain` | entities and use cases used by 2+ features | Post, User, City, Interest, RsvpState, Money, ObserveRsvpUseCase |
| `data` | repositories backing those shared entities | PostRepositoryImpl, UserRepositoryImpl, RsvpRepositoryImpl |
| `theme` | design tokens from `contracts/design-tokens` | colors, spacing, typography, radii |
| `utils` / `constants` / `types` | pure helpers, no feature knowledge | formatRelativeDate, distanceKm |
| `testing` | fixtures and fakes every feature's tests reuse | aPost(), FakePostRepository |

## The promotion rule

Code starts **inside a feature**. It moves here the moment a second feature needs it —
in its own PR, reviewed by a lead, never as a drive-by change inside a product PR.
Nothing is placed here speculatively.

## The global data stores

`shared/state` is the "global object" the app reads everywhere:

- `sessionStore` — signed-in user, tokens' presence (never the tokens themselves).
- `activeCityStore` — the city every surface is scoped to, plus whether it is a travel (MOB-020 → MOB-023).
- `subscriptionStore` — weekly subscription status, published by `@features/payment` and
  read by Home so travel can be gated without Home importing Payment.
- `connectivityStore` — online/offline, drives the offline banner and the write queue.

A store is written by exactly one owner and read by anyone. If two features both write
the same store, that state belongs in a repository instead.
