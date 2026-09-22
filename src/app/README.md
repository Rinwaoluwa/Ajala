# app — composition root

The only place that knows how the pieces fit together.

- `bootstrap/` — startup sequence: config, Sentry, analytics, storage, push registration,
  deep-link handling, splash retention.
- `providers/` — the provider tree wrapped around the route tree (theme, query client,
  session, safe area, error boundary).
- `di/` — the container that constructs repositories, injects them into use cases, and
  exposes use cases to presentation hooks. Constructor injection everywhere; no singletons
  in feature code beyond logging, crash reporting and analytics.
- `navigation/` — root route typing, tab configuration, guards (auth gate, onboarding gate),
  and the deep-link map.

Features are registered here and nowhere else. Adding a feature is one import in `di/`
and one route file in `app/`.
