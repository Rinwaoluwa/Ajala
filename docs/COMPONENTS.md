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
| Controls — `Button`, `TextField`, `PasswordField`, `SelectField`, `TextLink`, `ScreenHeader`'s back button, `DatePickerSheet`, `StatusSheet` | **Expo UI** (`@expo/ui`) | Real SwiftUI / Compose views: native press feedback, text editing, focus order and accessibility |
| Layout, text, motion — `Screen`, `Text`, `PaginationDots`, `StepProgress`, `ProgressBar`, `ProgressReveal` | **RN + NativeWind + Reanimated** | No native equivalent, and these need free composition |
| Mixed — `OtpInput`, `PasswordRules`, the field chrome (`FieldFrame`) | Expo UI input or icon inside React Native drawing | The native part does the input; React Native draws the boxes and outlines to the design |

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
| `Button` | Expo UI | Variants `primary` / `cta` / `secondary` / `neutral` / `ghost`; heights `sm` 36 / `md` 44 / `lg` 50. Pill-shaped (Figma `Corner_Radius/80`), except `neutral`, the social "Sign up with …" style, which is a 12pt-radius outline. Optional leading `icon`. Disabled is the design's muted fill and grey label, not an opacity. Label is `Label/Small` (Inter 500, 14/20). |
| `ButtonCore` | Expo UI | The native button without its Host, for use inside Expo UI content such as a sheet. Give it a `width` to fill. `tint` gives a filled button a colour that is not a variant (the status sheets). |
| `TextLink` | Expo UI | Tappable phrase. `tone` picks the colour (`link` teal/marigold, `accent` marigold, `foreground` ink) and `emphasis` the weight (`strong` for the uppercase footer links, `plain` for an inline one like "Forgot password?"). |
| `NativeIcon` + `icons` | Expo UI | One glyph per platform: an SF Symbol on iOS, a vector drawable on Android (Material Symbols from `@expo/material-symbols`, scaled to match SF sizing). Brand marks (the Google "G") are a PNG on iOS and an untinted drawable on Android. Add new glyphs to `ui/icons.ts`; an inline SF Symbol name renders nothing on Android. |
| `TextField` | Expo UI + RN chrome | Label, 38pt box (42pt with a trailing icon), 1pt outline, 6pt radius. Uncontrolled native input; primary outline while focused, destructive with an error. |
| `PasswordField` | Expo UI | `TextField` with an eye toggle. Text survives the secure/plain swap. |
| `SelectField` | Expo UI + RN chrome | Looks like a field; the box is one native button (value or placeholder, trailing icon). Used for date of birth. |
| `PasswordRules` | Expo UI icon + RN | 20pt rows, 12pt mark (grey unmet, Marigold met), Inter 12/16 muted text. Each row announces "met" / "not met". |
| `OtpInput` | Expo UI input + RN boxes | One invisible native input over six drawn 50×56 boxes, so the number pad, iOS code autofill and paste all work. 2pt `focusRing` on the next box — teal on light, Marigold on dark. |
| `StepProgress` | RN | 3pt segments, 8pt apart; only the current step is highlighted. `tone` picks the highlight; both auth flows now use Marigold (`accent`). |
| `ScreenHeader` | Expo UI back button + RN title | Back arrow and a Plus Jakarta 20/28 title. |
| `DatePickerSheet` | Expo UI | iOS: bottom sheet with a SwiftUI wheel and Done. Android: the system date dialog. Edits a draft; Done commits. |
| `StatusSheet` | Expo UI | A status sheet: drag handle, tinted badge with a mark, heading, muted message, one full-width pill. `tone` — `info` / `warning` / `error` / `success` — sets badge, mark, heading and button together (modal-8 variants). `titleTone="default"` puts the heading in the text colour ("Password reset successful"). The button is `ButtonCore`, tinted to the status colour for all but success. SwiftUI end to end. |
| `Text` | RN + NativeWind | Variant per step of the type scale, `tone` per semantic colour (`heading`, `link`, `muted`, …). Nobody picks a font size by hand. |
| `Pager` | RN + Reanimated | Controlled horizontal pager of arbitrary pages. Publishes live scroll offset (in pages) to a Reanimated shared value so indicators and reveals track it. Onboarding pages the whole screen with it. |
| `ImageCarousel` | RN + Reanimated | A `Pager` of full-bleed photos with BlurHash placeholders. |
| `PaginationDots` | RN + Reanimated | 8pt dots, 6pt gap, active dot widens to a 24pt marigold pill. Driven by the pager's `progress`. Inactive dots are `indicatorInactive` (pale grey in both schemes); over media they stay white. |
| `ProgressReveal` | RN + Reanimated | Shows or hides content in step with a live progress value (fade + 16pt rise; `rise={0}` for a fade alone). Scrubbed, not played: it reverses when the user swipes back. Touch and screen-reader focus follow settled state. |
| `ProgressBar` | RN + Reanimated | Pill-shaped bar; the caller owns the timing. Themed track and fill by default. (The launch splash has its own loader, `src/bootstrap/splash/SplashLoader.tsx`.) |
| `Logo` | expo-image | The mark and wordmark, no tagline. `tone="brand"` is teal with coral dots (white and Night); `tone="inverse"` is white with marigold dots (the splash gradient). The tagline is set as text where it appears. |
| `SwirlPattern` | expo-image | The brand swirl behind the splash and welcome screens: an alpha mask tinted per surface (`theme.pattern`, or deep teal on the splash). Decorative, fills its parent. |
| `Screen` | RN + NativeWind | Background, the measured 20pt gutter, safe-area insets via `useSafeAreaInsets()`. |

### Inside an Expo UI sheet

`BottomSheet` presents in its own view controller. Its content must be Expo UI (SwiftUI /
Compose) — a React Native view there gets no touches without `RNHostView`. That is why
`ButtonCore` exists, and why `DatePickerSheet` uses SwiftUI's `DatePicker` directly on iOS rather
than the community `DateTimePicker`, which brings its own Host.

### Running on Android

- **Build with JDK 17.** React Native's Gradle plugin targets Java 17, and a Gradle daemon on a newer JDK (Android Studio ships 25) fails the CMake configure step of `react-native-worklets` and `react-native-screens` with "A restricted method in java.lang.System has been called". In Android Studio set *Settings → Build Tools → Gradle → Gradle JDK* to 17; on the command line export `JAVA_HOME` to a JDK 17 (Gradle provisions one into `~/.gradle/jdks`).
- **The Apple mark has no Android glyph yet.** SF Symbols may only be used on Apple platforms; add Apple's own Sign in with Apple mark as a vector drawable.
- **Emulators need memory.** On an 8 GB Mac with other apps open, the emulator swaps until Android's own system process stops responding. Close heavy apps, give the AVD less RAM, or use a physical device.

### Every screen follows the theme

Every Stack uses `useStackScreenOptions()`, which paints each screen's container with the themed
background. React Navigation's default is white, which flashes during a push in dark mode.

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

- **Only the thing that changed moves.** The pager carries each slide's illustration and copy,
  and finally the welcome page's swirl, logo and tagline. The dots and the action bar (Skip /
  Next, then Sign up / Sign in) stay put over it. Chrome that survives a state change must never
  animate through it — cross-fading a button the user is about to tap makes it flicker under
  their finger, and briefly renders two of them.
- **Indicators read the same source as the thing they indicate.** `PaginationDots` takes the
  pager's live scroll offset (`progress`), so it tracks the page frame-for-frame instead of
  animating on its own clock and drifting.
- **Every row declares a height strategy.** On a slide: illustration fixed (a share of the screen
  height), copy in a `flex-1` scroll view below it that reserves the action bar's height. The
  action bar is absolute at the foot, fixed at the Sign up / Sign in stack's height. A `flex-1` child inside a parent
  that hugs its content resolves to height 0 in Yoga and vanishes silently — that is exactly how
  the onboarding copy once disappeared.

### Sign up / Sign in follow the swipe

Both button sets are always mounted in the action bar and read the pager's `progress`. In the first
half of the swipe onto the welcome page Skip and Next fade away (and the dots with them); in the
second half Sign up, then Sign in, rise in. Swipe back and it runs in reverse. Skip and Next move the
same pager, so they drive it identically.

When the welcome screen is shown on its own (a returning, signed-out visitor), the same buttons
fade in over 300ms with no movement, per the splash spec — starting when the launch splash hands
over (`useLaunchHandedOff`), not on mount, since the screen mounts unseen beneath the splash.

### Launch splash

`src/bootstrap/splash/` follows `Ajala_Splash_Animation_Spec.md`: a 3s timeline (1.5s rest, a 1s
sweep of the loader's warm head, a hold), then a 150ms cross-fade to the first screen — or later,
if startup is slower. Reduce Motion skips the sweep.

The native launch screens hand over without a visible change:

- **iOS** shows the splash without its bar, full screen (`assets/images/splash/launch-ios.png`,
  `cover`). The JS splash starts on that exact frame — it scales its logo the way `cover` scales
  the image, so the two line up on any screen shape — and the bar fades in as it takes over.
  Regenerate the image if the splash's logo or colours change.
- **Android 12+** can only draw a flat colour and a centred icon, so it is flat brand teal with the
  white wordmark at 168dp; the JS splash fades its gradient and pattern in and settles the logo
  to full size.

### Known rough edge

Tapping Next advances `state.index` immediately, so the copy swaps on the next frame while the
pager is still scrolling — the new heading is readable over the old photo for the rest of the
slide. Fixing it means driving the copy's opacity from the same `progress` value the dots use,
rather than from the settled index. Not yet done.
