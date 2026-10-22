# Design tokens

Extracted from Figma **AJALA** (`j2V2WSfXYkgW9dcPg4anIi`), Mobile page, node `1-3`
("IOS SCREENS", light and dark sets), on 2026-09-24.

## How values were obtained

Figma's **Properties panel works on a view-only seat**. Selecting a node gives its exact
hex, exact type metrics and exact layout numbers — including the underlying **variable
names** (`Primary/Teal/100`, `Corner_Radius/80`, `Light Mode/Text`, `Form/Button/Stroke`).
So these are measured values, not colours read off a screenshot.

Dev Mode is still unavailable on this account (a request is pending in the file comments),
which only costs us bulk export — the per-node values are exact.

## The font question, settled

The brand brief and the Design Assets `Typography` frame disagreed. The real screens
decide it: **Plus Jakarta Sans for headings, Inter for body.** The brand brief was right.

Measured directly from the Create Account screen:

| Figma style | Font | Weight | Size / LH | Colour variable |
| --- | --- | --- | --- | --- |
| `Heading/XXL_SemiBold` | Plus Jakarta Sans | 600 SemiBold | 32 / 40 | `Primary/Teal/100` → `#0E6F69` |
| `Body/Medium` | Inter | 400 Regular | 16 / 24 | `Light Mode/Text` → `#1B2624` |
| `Label/Small` | Inter | 500 Medium | 14 / 20 | `Text/White` |
| `Label/XSmall` | **DM Sans** | 500 Medium | 12 / 16 | `Text/Normal [500]` → **`#666D80`** |

**One real inconsistency:** the `Label/*` family is not internally consistent —
`Label/Small` is Inter, `Label/XSmall` is DM Sans with a kit grey (`#666D80`) instead of
the brand's secondary text (`#5B6B68`). That is drift in the Figma file, not a deliberate
choice, so `labelXs` is **normalised to Inter + brand grey** in the contract and flagged
there as `measured-normalised`. If the designer intended DM Sans for small labels, change
it in the contract and re-run `npm run tokens:css`.

Steps not present in the design are marked `"source": "derived"` in the contract. Of
twelve type steps, four are measured, one is normalised, seven are derived.

## Single source of truth

```
contracts/design-tokens/design-tokens.json      ← the only place values are written
  ├── tailwind.config.js        requires it  → Tailwind scales + semantic colours
  ├── scripts/generate-theme-css.js           → global.css (CSS vars, light + dark)
  └── src/shared/theme/tokens/*.ts imports it → typed values for non-class contexts
```

Change a value in the contract, run `npm run tokens:css`, and all three follow. Nothing
re-types a hex or a pixel value.

## Using the tokens

**Default to NativeWind classes.** Semantic colour roles resolve per scheme through CSS
variables, so one class is correct in both themes:

```
bg-background  bg-surface  text-foreground  text-muted  border-border
bg-primary text-primary-foreground      // teal → #2BB3A3 in dark
bg-cta     text-cta-foreground          // coral → #FF7A5C in dark
bg-accent  text-accent-foreground       // marigold, same in both
text-destructive  text-success
font-heading text-headingXxl   font-body text-bodyMd   font-body-medium text-labelSm
```

There is deliberately **no `bg-teal`**. A component hard-coding the brand hex is wrong in
dark mode, where the primary is `#2BB3A3`.

`src/shared/theme` is the escape hatch for places a class cannot reach — chart geometry,
map pin fills, status-bar style, native module options.

## Measured layout

From the Figma `Button` component on Onboarding Screen_Variant 2 (node 167-7636) and the Create
Account screen (iPhone 14 & 15 Pro, 393pt):

| Token | Value |
| --- | --- |
| Screen gutter | 20pt (353pt content width) |
| Button heights | `sm` 36 / `md` 44 / `lg` 50. The Figma component's Size=Large is **44**. |
| Button radius | **`Corner_Radius/80` = 80pt** — on a 44pt control this is a full pill |
| Button padding / gap / border | 6×20, gap 6, border 1px |
| Button label | `Label/Small` — Inter 500, 14/20, `Text/White` |
| Input | height 56 (hug), label gap 4 |
| Field group gap | 10pt |
| Carousel dots | 8pt dots, 6pt gap, 16pt from the left edge |

**Correction:** an earlier pass recorded the button radius as 8pt. The Properties panel truncates
the variable name to `Corner_Radius/8…`; hovering it shows the real value, **80px**. Every button in
the design is a pill, not a rounded rectangle.

## Colour system

The Figma variables are built on the brand brief exactly: `Primary/Teal/100` resolves to
`#0E6F69`. Full palette, contrast ratios and usage rules live in the contract. Dark mode is
not the light palette dimmed — teal, coral, error and success each have distinct dark hexes
because the light values lose contrast on Night (`#0D1715`).

### Roles added from the sign-up screens

Measured on the Sign up, Create account, Verification and "Email verified!" designs, light and
dark. The screenshots are colour-shifted (brand teal renders as `#326D69`), so these were read
as relationships to known brand colours rather than trusted as raw pixels.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `heading` | `#0E6F69` | `#0E6F69` | Screen headings. The dark design keeps brand teal: 3.0:1 on Night, fine for 32pt headings, weak for 20pt. Teal Light `#2BB3A3` is the accessible alternative if design agrees. |
| `link` | `#0E6F69` | `#F5B83D` | Inline links. Marigold on dark. |
| `controlBorder` | `#DBDDE3` | `#C5C7CC` | Field and social-button outlines |
| `surfaceMuted` | `#ECEFF3` | `#1F2B28` (derived) | Disabled button fill, OTP boxes |
| `track` | `#D2D5DA` | `#34443F` (derived) | Inactive steps, unmet rule marks, OTP outlines |
| `placeholder` | `#A5ACB8` | `#6E7C79` (derived) | Field placeholder text |
| `successSoft` | `#E1F2EF` | `#E1F2EF` | Badge behind the success check. The dark sheet keeps the light tint. |

**The light background is now white (`#FFFFFF`).** Every light screen in the file — onboarding,
splash, sign-up — sits on pure white. The brief's Paper `#FAF8F5` is kept as `paper` for warm
surfaces. Confirm with design.

New type steps: `bodyXs` (Inter 400 12/16, password rules) and `code` (Inter 400 24/32, OTP digits).

### Roles added from the status sheets and Verification frames

Read off the modal-8 variants ("Connection interrupted", "Check your details", "That didn't go
through", "All set!", "Email verified!", "Email verification failed") and the light and dark
Verification frames. These are screenshot readings, not Properties-panel values, so confirm the
hexes in Figma. They are JS-only roles (`useTheme()`), because `StatusSheet` and `OtpInput` draw
native views; `global.css` does not carry them.

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| `successTitle` | `#0E6F69` | `#EEF3F2` | Success sheet heading. Teal on light, Mist on dark. |
| `info` / `infoSoft` | `#5C5CF6` / `#EBEAFD` | same (derived) | Info sheet heading, mark, button / badge |
| `warningSoft` | `#FCF6E8` | same (derived) | Warning badge. The warning colour is `accent` (Marigold). |
| `danger` / `dangerSoft` | `#CD3546` / `#F5DCE1` | same | Error sheet heading, mark, button / badge |
| `focusRing` | `#0E6F69` | `#F5B83D` | Ring on the OTP box the next digit goes into |

Three of these need a design decision:

- **`info` is the kit's indigo**, which the contract otherwise lists under `kitLeftovers`.
- **`danger` is not the brand error.** It is brighter than `#A61B29`, the same in both schemes, and
  fills a button — which the usage rule "never use Crimson for buttons" forbids. `destructive`
  stays the colour for inline errors.
- **The warning button's label is white in the design.** White on Marigold is about 1.8:1, so the
  sheet uses Marigold's own ink label instead. The Marigold heading is drawn as designed and has
  the same contrast problem.

### The sign-in and password-reset screens fork the system

Measured on the Sign In, Forgot Password, Verification and Create New Password
frames. They use different colours from the sign-up flow for the same roles:

| Role | Sign-up flow | Sign-in / password reset |
| --- | --- | --- |
| Screen heading | brand Teal | ink on light, brand Teal on dark (`AuthIntro tone="inkOnLight"`) |
| Lead paragraph | text colour | muted on light, Mist on dark |
| Step indicator, active | Marigold | Marigold |
| Footer link | Teal on light | sentence case in the text colour ("Remember your password? Sign in") |
| Success sheet heading | `successTitle` (Teal on light, Mist on dark) | ink / Mist (`titleTone="default"`) |

The current Create account frames moved the active step to Marigold, so the step indicator no
longer forks. The dark password-reset frames set their headings in Teal, so that fork is now
light-only. The Sign In form's dark frame is not drawn; it keeps an ink heading in both schemes.

The two "options" screens ("Sign up" and "Welcome back") keep the teal heading and
the teal link, so the fork is only in the stepped flows and the Sign In form.

Both variants are built, chosen per screen by a `tone` prop on `AuthIntro`,
`StepProgress`, `TextLink` and `StatusSheet`, so unifying later is a prop change
rather than a rewrite. **Ask design which is intended** — two heading colours and
two step colours in one auth stack reads as a mistake to a user.

**Marigold links fail contrast on light.** (The reset flow's footer no longer uses one — the
current frames set it in the text colour — but `TextLink tone="accent"` remains.) `#F5B83D` on white is about **1.8:1**;
WCAG asks 4.5:1 for text this size, and the brand brief itself says Marigold is
"Never body text". On Night it is fine (8.8:1), so this is a light-mode problem
only. Switching those links to `tone="link"` (Teal, 6:1) is a one-line change per
screen.

These screens also draw their greys from the UI kit's blue-tinted ramp
(`#666D80`, `#6C7280`) rather than the brand's green-tinted neutrals. As with the
sign-up screens, the implementation normalises them to the brand tokens.

Recorded but **rejected** under `color.kitLeftovers`: `Text/Normal [500]` `#666D80`,
`Accent/Aqua`, `Secondary/Purple`. They exist in the file and are not part of the brand
system; they are listed so they are recognised in review rather than copied into code.

## Known gaps

- **Logo files.** `assets/icons/ajala-wordmark.svg` (teal, coral dots) and
  `ajala-wordmark-inverse.svg` (white, marigold dots) are derived from the lockup
  `ajala-logo.svg` by dropping its tagline path and recolouring; the tagline is now set as text
  ("Meet fellow travellers nearby."). The native splash PNGs in `assets/images/splash/` are
  rasterised from the inverse wordmark. `ajala-app-icon.svg` (mark) and the app icon PNGs are
  unchanged. Official wordmark exports from design should replace the derived files.
- **Swirl pattern.** `assets/images/pattern/swirl*.png` is an alpha mask derived from the 393pt
  Figma export (`assets/images/splash/background-image.png`); @2x/@3x are upscaled. A 3x export
  would be sharper.
- **Splash colours.** `tealDark` (#094B47) is a Figma gradient stop. The loader head uses the brand
  marigold and coral (the spec's #F2B531 / #D9532F were screenshot estimates); its track is
  #D9D9D9, measured from the frame.
- **The Google "G"** in `assets/icons/brands/` is drawn from the standard four-colour mark. Replace
  it with the file from Google's official Sign-In branding kit before release.
- **Dark-mode border** is derived (`#2A3A35`), not specified. Confirm with design.
- **Icons.** `Icons_1` / `Icons_2` are large generic libraries (several hundred glyphs,
  including country flags). Use an icon package; export only genuinely custom marks. Flags
  belong in a data-driven component, not hundreds of committed SVGs.
- **The Design Assets page mobile screens are e-commerce placeholders** (Nike Jumpman,
  "Add to Cart"). The real screens are on the Mobile page. Do not build from the former.
- **The dark-mode screen frame has not been inspected.** `Frame 1171287784` ("IOS SCREENS (Dark
  Mode)") exists on the Mobile page but its per-node colours were never read; the dark palette
  still comes from the brand brief. Measure it before trusting dark mode against the design.
