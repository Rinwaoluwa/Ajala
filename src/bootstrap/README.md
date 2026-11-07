# bootstrap — composition root

The app's start-up pieces that belong to no feature.

- `splash/` — the launch screen that takes over from the native splash while startup
  finishes (`AppSplash`, drawn over the navigator by `LaunchOverlay`; timing in
  `useSplashTimeline`, the bar in `SplashLoader`).

Each feature wires its own use cases in `src/features/<name>/<name>Module.ts` — the one place
that knows which repository implementation backs them. The provider tree and the app-lock and
force-update gates live in the root layout, `app/_layout.tsx`; `app/index.tsx` routes a cold
start by the onboarding and auth state.
