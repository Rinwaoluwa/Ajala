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
| `successSoft` | `#E1F2EF` | `#173A2B` (derived) | Badge behind the success check |

**The light background is now white (`#FFFFFF`).** Every light screen in the file — onboarding,
splash, sign-up — sits on pure white. The brief's Paper `#FAF8F5` is kept as `paper` for warm
surfaces. Confirm with design.

New type steps: `bodyXs` (Inter 400 12/16, password rules) and `code` (Inter 400 24/32, OTP digits).

Recorded but **rejected** under `color.kitLeftovers`: `Text/Normal [500]` `#666D80`,
`Accent/Aqua`, `Secondary/Purple`. They exist in the file and are not part of the brand
system; they are listed so they are recognised in review rather than copied into code.

## Known gaps

- **Three of five logo files are missing.** `assets/icons/ajala-logo.svg` (lockup) and
  `assets/icons/ajala-app-icon.svg` (mark) exist. The app icon PNGs in
  `assets/images/app-icon/` are rendered from the mark: light, dark and tinted for iOS, adaptive
  foreground and monochrome for Android. The light/dark logo variants and the wordmark are still
  to come; the dark splash design uses the standard lockup on Night.
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
