# Shared components

## Build components before screens

Every new screen or flow starts by adding what it needs to `src/shared/components`, then
assembling the screen from those pieces. Screens are composition; they do not inline one-off UI
and wait for someone to extract it later.

This deliberately overrides the usual "extract on the third repetition" rule. Twelve features are
built in parallel here, so if shared UI does not exist before feature work starts, each feature
grows its own near-duplicate of it and the design drifts within a sprint.

## Two styling systems, one set of values

| Layer | Built with | Why |
| --- | --- | --- |
| Controls whose look is the system's — `Switch`, `Picker`, `DateTimePicker`, `BottomSheet` | **Expo UI** (`@expo/ui`) | Real SwiftUI / Compose views: native press feedback, haptics, focus order and accessibility |
| Controls — `Button`, `Switch`, `Picker`, `DateTimePicker`, `BottomSheet` | **Expo UI** (`@expo/ui`) | Real SwiftUI / Compose views: native press feedback, haptics, focus order and accessibility |

| Layout, text, motion — `Screen`, `Text`, `PaginationDots`, `Crossfade` | **RN + NativeWind + Reanimated** | No native equivalent, and these need free composition |

Both read `contracts/design-tokens/design-tokens.json`, so there is still exactly one source of
truth for values. NativeWind consumes it through `tailwind.config.js`; Expo UI consumes it through
`src/shared/theme` plus `useTheme()`, because native views take concrete colour values rather than
class names.

### Why the line sits there

Expo UI components must live inside a `<Host>`, which is a native view boundary — React Native
views cannot be freely interleaved inside one. So a screen is either Expo UI end to end, or it is
React Native with Expo UI controls embedded as small self-sizing Hosts. Onboarding needs `FlatList`
paging and `expo-image`, neither of which Expo UI provides, so it is a React Native screen.

### Styling an Expo UI button to the brand

`variant="filled"` maps to SwiftUI `borderedProminent`, which paints its own capsule in the
**platform tint** and ignores a supplied `backgroundColor` — the original cause of "the button is
the wrong colour". `Button` uses `variant="text"` → `buttonStyle(.plain)` instead, so SwiftUI draws
no chrome and the background, radius and border from `style` are what you see. The label is passed
as a **child**, not via the `label` prop, because a child can carry `fontFamily`, size and colour.

Two sizing rules came out of shipping this wrong:

- **A `Host` needs an explicit width as well as an explicit height** whenever the content cannot
  size itself. Given only a height, a full-width button rendered unbounded, spilled past the right
  edge, and left its label jammed against the left. The width is also what centres the label, since
  a SwiftUI Button centres its label within its frame.
- **Full width is measured, never a percentage.** `UniversalStyle` has no percentage support and
  `matchContents` sizes the host to its content, which by definition cannot stretch — so the
  wrapper measures its container and passes concrete pixels.

And one token rule: **the radius is capped at half the control height.** CSS clamps an oversized
radius to a pill, which is what the designer relied on with `Corner_Radius/80`; SwiftUI and Compose
do not clamp, so forwarding 80 to a 44pt control gives a misshapen rounded rectangle.

Any new Expo UI control that needs brand colours should follow the same shape: neutral variant,
styling through `style`, content as children, explicit dimensions on the Host, and `modifiers` from
`@expo/ui/swift-ui/modifiers` as the escape hatch.

### Consequences worth knowing

- **Expo UI needs a development build.** It will not run in Expo Go. Use `npx expo run:ios` /
  `run:android`, and rebuild natively when Expo UI itself is upgraded.
- **`@expo/ui` is still moving.** Its version is pinned to the SDK. Re-read the API after an SDK
  bump rather than assuming props are stable.
- **The scheme switch is not perfectly atomic.** NativeWind resolves colours through CSS variables
  while `useTheme()` resolves them in JS. On a light/dark flip the two can land a frame apart.
  Only `PaginationDots` reads JS colours today, so the exposure is small.

## Current components

| Component | Built on | Notes |
| --- | --- | --- |
| `Button` | Expo UI | Variants `primary` / `cta` / `secondary` / `ghost`; heights `sm` 36 / `md` 44 / `lg` 50. **Fully pill-shaped** — the Figma radius variable is `Corner_Radius/80`, which on a 44pt control rounds completely. Label is `Label/Small` (Inter 500, 14/20). |
| `Text` | RN + NativeWind | Variant per step of the type scale, `tone` per semantic colour. Nobody picks a font size by hand. |
| `ImageCarousel` | RN + NativeWind | Controlled horizontal pager. Publishes live scroll position to a Reanimated shared value so indicators can track it. |
| `PaginationDots` | RN + Reanimated | 8pt dots, 6pt gap, active dot widens to a 24pt marigold pill. Driven by the carousel's `progress`, so it moves *with* the image rather than animating after it settles. Dots over media stay white in both themes. |
| `ImageCarousel` | RN + Reanimated | Controlled horizontal pager. Publishes live scroll offset so indicators track it. |
| `Screen` | RN + NativeWind | Background, the measured 20pt gutter, safe-area insets via `useSafeAreaInsets()`. |

## A trap that already cost us

**Never create `src/app/`.** Expo Router resolves its route directory as `src/app` *first* and falls
back to `app` only if that does not exist. An earlier scaffold used `src/app/` for the composition
root, which silently took over routing: the app bundled with zero routes and no fonts, and still
exited successfully. It is now `src/bootstrap/`, and `expo.extra.router.root` is pinned to `"app"`
in `app.json` so the convention cannot flip again.

Verify a real bundle when routing changes:

```bash
npx expo export --platform ios --no-bytecode --no-minify --clear --output-dir /tmp/verify
```

Then grep the output for a string you know is in your screens. An export that "succeeds" proves
nothing on its own.

## Motion

**The onboarding transition is a horizontal pager. Swipe is a first-class affordance.**

A previous version replaced it with a 300ms cross-dissolve, because Figma's prototype played a
dissolve when Next was tapped. That was a mistake worth recording: **300ms / Ease Out / Dissolve are
Figma's defaults** for a frame-to-frame transition when Smart Animate is not configured. They
describe the prototyping tool, not a designed motion spec. Read a prototype for content and
ORDER; do not read timing, easing or transition type out of an unconfigured one.

Rules that came out of that regression:

- **Only the thing that changed moves.** The photo strip translates. The background, the white
  content area and the Skip/Next row stay put. Chrome that survives a state change must never
  animate through it — cross-fading a button the user is about to tap makes it flicker under their
  finger, and briefly renders two of them.
- **Indicators read the same source as the thing they indicate.** `PaginationDots` takes the
  pager's live scroll offset (`progress`), so it tracks the photo frame-for-frame instead of
  animating on its own clock and drifting.
- **Every row declares a height strategy.** In `OnboardingScreen`: photo row fixed, copy row
  `flex-1`, action row hugs. A `flex-1` child inside a parent that hugs its content resolves to
  height 0 in Yoga and vanishes silently — that is exactly how the onboarding copy disappeared.

### Known rough edge

Tapping Next advances `state.index` immediately, so the copy swaps on the next frame while the
pager is still scrolling — the new heading is readable over the old photo for the rest of the
slide. Fixing it means driving the copy's opacity from the same `progress` value the dots use,
rather than from the settled index. Not yet done.
