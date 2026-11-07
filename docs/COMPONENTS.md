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
| Layout, text, motion — `Screen`, `Text`, `PaginationDots`, `StepProgress`, `ProgressReveal` | **RN + NativeWind + Reanimated** | No native equivalent, and these need free composition |
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
| `TextField` | Expo UI + RN chrome | Label, 38pt box (42pt with a trailing icon), 1pt outline, 6pt radius. Uncontrolled native input; primary outline while focused, destructive with an error, or a muted `helper` line ("0/100") without one. `leading` (a glyph before the text), `prefix` ("@"), `filled` (the pale search/city box, pale in both schemes with chip ink), `labelHidden` (search boxes their placeholder names), `bare` (no outline or fill: the field sits on a glass surface), `trailing` (a status glyph) or `trailing` + `trailingAction` (a 44/48pt button). |
| `PasswordField` | Expo UI | `TextField` with an eye toggle. Text survives the secure/plain swap. The eye is a 16pt glyph in a `layout.touchTarget` tap area (44pt iOS, 48dp Android) via `TextField`'s `trailingAction`; a tap dims it and settles it back (200ms, scale dropped under Reduce Motion). Defaults to `autoComplete="new-password"`; pass `current-password` on sign-in and pair it with an `autoComplete="username"` email field so password managers suggest, fill and save. |
| `SelectField` | Expo UI + RN chrome | Looks like a field; the box is one native button (value or placeholder, trailing icon). Used for date of birth. |
| `PasswordRules` | Expo UI icon + RN | 20pt rows, 12pt mark (grey unmet, Marigold met), Inter 12/16 muted text. Each row announces "met" / "not met". |
| `OtpInput` | Expo UI input + RN boxes | One invisible native input over six drawn 50×56 boxes, so the number pad, iOS code autofill and paste all work. 2pt `focusRing` on the next box — teal on light, Marigold on dark. |
| `StepProgress` | RN | 3pt segments, 8pt apart; only the current step is highlighted. `tone` picks the highlight; both auth flows now use Marigold (`accent`). |
| `ScreenHeader` | Expo UI back button + RN title | Back arrow and a Plus Jakarta 20/28 title. |
| `DatePickerSheet` | Expo UI | iOS: bottom sheet with a SwiftUI wheel and Done. Android: the system dialog. `mode="time"` picks a time of day instead of a date. Edits a draft; Done commits. |
| `StatusSheet` | Expo UI | A status sheet: drag handle, tinted badge with a mark, heading, muted message, one full-width pill. `tone` — `info` / `warning` / `error` / `success` — sets badge, mark, heading and button together (modal-8 variants). `titleTone="default"` puts the heading in the text colour ("Password reset successful"). The button is `ButtonCore`, tinted to the status colour for all but success. SwiftUI end to end. |
| `CelebrationSheet` | RN + Reanimated + Lottie | The end-of-flow sheet ("You're all set!"): a pale teal wash, a sheet that rises with an illustration, heading, message and one pill. RN, not Expo UI's BottomSheet, because it hosts an SVG and a Lottie burst (played once after the sheet settles; skipped under Reduce Motion). No swipe-to-dismiss: there is one way forward. |
| `Text` | RN + NativeWind | Variant per step of the type scale, `tone` per semantic colour (`heading`, `link`, `muted`, …). Nobody picks a font size by hand. |
| `Pager` | RN + Reanimated | Controlled horizontal pager of arbitrary pages. Publishes live scroll offset (in pages) to a Reanimated shared value so indicators and reveals track it. Onboarding pages the whole screen with it. |
| `ImageCarousel` | RN + Reanimated | A `Pager` of full-bleed photos with BlurHash placeholders. |
| `PaginationDots` | RN + Reanimated | 8pt dots, 6pt gap, active dot widens to a 24pt marigold pill. Driven by the pager's `progress`. Inactive dots are `indicatorInactive` (pale grey in both schemes); over media they stay white. |
| `ProgressReveal` | RN + Reanimated | Shows or hides content in step with a live progress value (fade + 16pt rise; `rise={0}` for a fade alone). Scrubbed, not played: it reverses when the user swipes back. Touch and screen-reader focus follow settled state. |
| `Chip` / `ChipGroup` | RN + Reanimated | The pick-several pill of profile setup (languages, styles, destinations, interests). Pale with ink text in both schemes; selected, it fills teal, Marigold (ink label — white on it is 1.8:1, flagged) or coral, chosen per option so it never changes with its neighbours. 180ms colour cross-fade, a 96% press dip (dropped under Reduce Motion). `leading` makes the taller interests pill; `role="radio"` for one-of lists; `disabled` dims the rest of a full list. Height is padding around the label, so it grows with text size. `ChipGroup` wraps rows. |
| `LoadingRing` | RN + Reanimated + expo-image | The full-screen loader's gradient ring: `assets/images/loader/ring.svg` (72 arcs along a pale-to-teal ramp, since SVG has no sweep gradient), one turn a second, a third of that under Reduce Motion. Reads on white and Night. |
| `enterRise(delay)` | Reanimated layout animation | The standard entrance: 300ms fade with an 8pt rise. Stagger a column 40–80ms apart. Skipped under Reduce Motion. |
| `FloatingTabBar` | RN + Reanimated + react-native-svg | The app's tab bar: two rounded halves floating over content around a raised teal "+" (Home, Explore / Trips, Profile). The current tab's icon is filled Marigold with a Marigold label; the others are grey outlines (`VectorIcon`). Icons pop 92%→100% as they fill; "+" dips on press (scales dropped under Reduce Motion). Labels cap at 1.3× text size. |
| `Sheet` | RN + Reanimated, in a `Modal` | A bottom sheet with a handle, a title and a round ×, for React Native content ("Create something"). Scrim fades in 220ms as the sheet rises 300ms; closing reverses in 200ms before unmounting. Scrim, × and the back gesture close it. |
| `SkeletonPulse` / `SkeletonBlock` | RN + Reanimated | Loading placeholders: blocks in the skeleton colours (grey on light, deep teal on dark) that breathe together, 0.55↔1 over 1.1s; still under Reduce Motion. One "Loading" for screen readers. |
| `SvgIcon` | expo-image | Multi-colour art from `assets/icons` by name (create-sheet illustrations, the PRO coin, the green check), optionally tinted. SVGs that use filters or masks do not render — ship those as PNG (the level badge). |
| `VectorIcon` | react-native-svg + Reanimated | A design icon drawn as vectors with an outlined and a filled state — the tabs (filled Marigold when current, grey outline otherwise), the heart (teal outline → coral fill), header bell/chat/pin. Filled = the icon's silhouette painted in the colour with its own strokes drawn over it a shade darker (the design's two-tone house), so the active icon keeps every stroke of the inactive one. Path data comes from the SVGs via `npm run icons` (`scripts/generate-icons.js`); the house is two-tone art already and is outlined by stroking. States cross-fade in 160ms. |
| `RoundFlag` | react-native-svg | A country's flag as a disc: the flag art cropped round (square set from `country-flag-icons`, MIT) with a soft shadow, no backing. Falls back to the emoji flag. |
| `Illustration` | react-native-svg + Reanimated | Multi-colour art with a chosen and an unchosen look ("Create something" cards): colour when `active`, grey otherwise, cross-fading in 180ms. Both versions are generated by `npm run icons` — art supplied in colour gets a grey copy, art supplied grey gets a colour copy on the brand's teal ramp. |
| `PostCard` | RN + Reanimated + expo-image | The post card every feature shares: square cover photo with a dark foot fade, type tag, a bookmark (saves to the account via `useSavePost`, optimistically on every card showing the post — map the DTO's `saved` onto `PostCardModel.saved`; glass circle where available), host, distance (glass pill), title, date/time and place. Features map their post onto `PostCardModel`. Dips to 98% on press; the heart pops. |
| `Logo` | expo-image | The mark and wordmark, no tagline. `tone="brand"` is teal with coral dots (white and Night); `tone="inverse"` is white with marigold dots (the splash gradient). The tagline is set as text where it appears. |
| `SwirlPattern` | expo-image | The brand swirl behind the splash and welcome screens: an alpha mask tinted per surface (`theme.pattern`, or deep teal on the splash). Decorative, fills its parent. |
| `Screen` | RN + NativeWind | Background, the measured 20pt gutter, safe-area insets via `useSafeAreaInsets()`. |
| `Toggle` | Expo UI | An on/off switch: SwiftUI `Toggle` (label hidden, tinted teal) on iOS, Compose `Switch` (teal on, pale mint off) on Android. Draws no words; the row around it does and passes them as `accessibilityLabel`. |
| `TextArea` | Expo UI + RN chrome | A labelled box of several lines (a post's description, a report's details): multi-line native input in the field chrome, `lines` tall (grows with text size), `helper` or error below, `filled` for the pale box. |
| `CheckboxRow` | RN + Reanimated | A ticked-or-not line in a list of reasons: 20pt box (teal fill and white check when ticked, 150ms cross-fade), label beside it; the whole row is a 44pt+ target. |
| `SortableGrid` | RN + Gesture Handler + Reanimated | Items that can be reordered by dragging — a post's photos (3 columns) and its itinerary lines (1 column). Hold 250ms, drag; the others slide 200ms out of the way and `onMove(from, to)` reports the move. Cells are placed by index, not wrapped, so computed widths cannot spill onto a new row; row height is `cellHeight(width)` or measured. "Move earlier/later" actions for screen readers. Reduce Motion drops the lift and slides. Needs the `GestureHandlerRootView` at the app root. |
| `ScrollRow` | RN | A row that is plain while its items fit and scrolls sideways only once they overflow (pills, map chips) — glass inside a horizontal scroll view is unreliable. |
| `PillTabs` | RN + Reanimated + `GlassSurface` | One-of pills in a `ScrollRow`: the home feed's All / Meetups / Events…, Trips' Upcoming / Requests / Past, the Saved, Drafts, Notifications and Achievements filters. Frosted glass where available (chosen pill tinted teal, white label); otherwise solid teal-and-pale (`look="filled"`) or white with a hairline (`look="outline"`). 180ms cross-fade. |
| `UnderlineTabs` / `SegmentedControl` | RN + Reanimated | Switch between views of a screen: labels with a sliding underline (Hosting / Attending), or a pale track with a sliding fill (Badges / Stamps — teal on light, Marigold on dark). 220ms slide, instant under Reduce Motion; segments share the measured width. |
| `CenteredHeader` | RN + `GlassSurface` | Title centred with a 40pt round back button (mint, or glass) — Saved activities, Notifications, Achievements. Optional trailing control; the title wraps rather than collides. |
| `ListGroup` / `ListRow` | RN + Expo UI icons + `Toggle` | Settings-style lists: optional caps heading, a rounded outlined card of rows split by hairlines. A row has a title, optional muted line, and at the right a chevron, a value, a tick or a switch; `destructive` reds the title. Grows with text size; the whole row is the target. |
| `Avatar` / `AvatarStack` | RN + expo-image | A person's round photo, or their initial on a tint picked from the name. The stack overlaps faces with a white ring ("3 joining"). |
| `EmptyState` | RN + Reanimated | Art, heading, line and an optional action ("No plans yet. Where to next?"); rises in with `enterRise`. |
| `NoteCard` | RN | A quiet note with a teal title on a pale card ("Safety tip", "Good to know"); `tone="accent"` is the Marigold card of the dark Trips frame. |
| `Tag` | RN | Small labels on cards: `outline` (post type), `success` (Hosting, Completed, Earned), `pending` (Request sent), `neutral`. Pale in both schemes. |
| `GlassSurface` | expo-glass-effect, RN fallback | A surface floating over content in Liquid Glass where the phone has it, and the design's solid colour (`fallbackColor`, soft shadow) where it does not — see "Liquid Glass" below. `tint` colours it, `interactive` gives controls the system's touch response (drop your own press dip then). Glass materialises on appear (~300ms; instant under Reduce Motion). |
| `Dialog` | RN + Reanimated, in a `Modal` | A centred card over a scrim ("Report activity", "Before you RSVP"): at most 420pt wide, scrolls when tall, stays above the keyboard. Scrim fades 200ms while the card settles from 96%; closing 160ms. Scrim and back dismiss it. |
| `MenuButton` | Expo UI `Menu` (iOS) / `Alert` (Android) | A button that offers a few choices (a post's ⋯: report, cancel, delete). iOS opens the native pull-down menu from the button (SF Symbol icons, red for `destructive`); an invisible SwiftUI `Menu` covers the caller's face, so the button keeps its look. A choice runs ~350ms later, once the menu has closed — iOS drops a screen presented during its dismissal. Android shows the system dialog with a Close. |

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

## Liquid Glass

Ajala uses Apple's Liquid Glass (iOS 26, built with Xcode 26) for the chrome that floats over
content, and the Figma design's solid surfaces everywhere else.

- **Glass:** the tab bar's two halves and its "+" (tinted teal), the home header's bell and chat, the filter pills (`PillTabs`), the save button and distance pill on a post card, round back buttons, and the Explore map's controls —
  the search field, filter and map buttons, type chips (the chosen one tinted its type's colour),
  View List and the status pill.
- **Solid, on purpose:** content — cards, the map's mini card, sheets, dialogs, lists, forms.
  Glass is for controls and navigation layered over content, not for content itself; text on it
  would shift with whatever is behind.
- **System controls** built with Expo UI (switches, pickers, date wheels) take the new look from
  iOS by themselves.

`useLiquidGlass()` decides, live: iOS 26+, the glass API present (`isGlassEffectAPIAvailable`, as
some iOS 26 betas lacked it), and Reduce Transparency off. Otherwise — Android, iOS 25 and
earlier, Reduce Transparency on, or a development build without the native module — every
`GlassSurface` draws its `fallbackColor` with the soft shadow the design has. No blur is used as
a fallback: the solid design is what was drawn, reads in every light, and costs nothing.

How it is drawn, and the rules that came out of getting it wrong:

- **SwiftUI, not the UIKit glass view.** `GlassSurface` puts its content on a SwiftUI shape with
  `.glassEffect` (`GlassBackdrop.ios.tsx`, in an Expo UI `Host`). `expo-glass-effect`'s
  `GlassView` silently failed to draw inside lists and scroll views on screens opened after
  launch, and when installed during a fade — feed cards and tab pills lost their glass.
- **Frosted by default.** `variant="regular"` (frosted) is used for buttons, pills and bars: its
  backing keeps labels easy to read, the look the product owner chose after trying both.
  `variant="clear"` (see-through, no backing) is there for art that must show through.
- **Rows that fit don't scroll.** Use `ScrollRow` for pill and chip rows: a plain row while the
  items fit, a horizontal scroll view only once they overflow.
- **Press feedback is the caller's.** The glass takes no touches; keep your dip or fade.

## A trap that already cost us## A trap that already cost us

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
