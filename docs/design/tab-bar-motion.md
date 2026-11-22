# The tab bar: motion study

**Source:** a screen recording that was in `assets/` on 22 Nov 2026 (`ScreenRecording_11-21-2026 00-23-51_1.MP4`; it has since been taken out of the folder, so it is not in the repo) (25.1 s, 828 × 1792 px, 60 frames a second, 2 px per point; a 414 × 896 pt phone). A feed is scrolled down and up, the shrunken bar is pressed and held, three tabs are chosen by tap and by dragging across the bar, and a second screen is scrolled.

**How it was studied:** the bar's region of all 1,436 frames was cut out, and every change (shrink, grow, press, tab change) was read frame by frame, measuring the capsule's edges in each. Numbers are in points unless they say px. A frame is 16.7 ms.

## 1. At rest

- **One capsule**, centred, floating over the content. Three tabs make it 272 wide and 60 tall; it is 71 from each side of a 414 screen and its foot is 22 above the foot of the screen (12 inside the home indicator's safe area).
- **Each tab** is an icon (about 24) over a small label, 88 wide. The capsule has 4 of padding all round.
- **The current tab** sits on a pill: 91 × 52, fully rounded, 4 in from the capsule's edge, a soft grey a little darker than the glass. Its icon is filled and its label is bold. The other icons are outlines with regular labels.
- **Material:** frosted glass. Over white content it reads as white with a soft shadow; over a dark photo it takes the photo's colour and its icons turn white.

## 2. Shrinking (scrolling down)

Measured from 12.015 s. The whole change takes about 215 ms.

| Since start | Width | Left edge | What else |
| --- | --- | --- | --- |
| 0 ms | 272 | 71 | Whole bar |
| 33 ms | 255 | 78 | Barely moved: a slow start |
| 67 ms | 219 | 74 | The other tabs and the label blur and fade; the pill is fading |
| 100 ms | 159 | 62 | Other tabs nearly gone; pill gone |
| 133 ms | 110 | 49 | Only the current icon is left, riding inside |
| 167 ms | 74 | 40 | |
| 200 ms | 55 | 34 | Slowing |
| 217 ms | 47 | 28 | A circle; still from here on |

- **Both ends close in.** The right end travels most; the left end moves out to the screen's left margin. The middle line of the bar does not move up or down.
- **Height** goes with it, 60 to 47, so the end is a circle 47 across, 28 from the left edge.
- **The current tab's icon** travels with the shape and ends in the circle's middle. Its label fades in the first 80 ms. The other tabs fade in the first 100 ms and are cut off by the capsule's edge as it passes them.
- **Curve:** slow for two frames, fast through the middle, slowing over the last 50 ms (ease in and out, weighted to the end).
- **When:** after the page has moved a little way down, not on the first pixel.

## 3. Growing back (scrolling up, or a tap)

Measured from 1.633 s.

| Since start | Width |
| --- | --- |
| 0 ms | 47 (circle) |
| 17 ms | 53 |
| 33 ms | 82 |
| 50 ms | 120 |
| 100 ms | 250 |
| 150 ms | 267 |
| 185 ms | 272 (whole) |

- Faster than shrinking: nine tenths of the width in the first 100 ms, settled by 185 ms. It starts fast and eases out.
- The other tabs fade in over the second half; labels are sharp by 200 ms.
- **Scrolling back up** brings it back, as does reaching the top.
- **Tapping the circle** brings it back and does not change tab. Pressed and held (5.05 to 5.75 s), the circle dims, then brightens and swells by about a sixth; on release it grows into the bar in 100 ms.

## 4. Choosing a tab

Measured from 10.517 s (Inbox to You, a tap).

- **Finger down:** the whole bar swells by about 4% and the pill under the current tab swells past the capsule's top and bottom edge.
- **The pill travels** to the tapped tab in 5 frames (85 ms), still swollen and clearer than at rest, bending the icons it passes over.
- **It settles** over the next 170 ms: back to its resting size inside the capsule, back to its soft grey. The new tab's icon fills and its label turns bold at once.
- **The bar** returns to its size as the finger lifts.
- **The screen** changes with a cross-fade of about 60 ms, at the moment the pill arrives.
- **Dragging** across the bar (18.5 s) carries the pill under the finger from tab to tab, and the tab under it when the finger lifts is chosen.
- A new tab always shows the whole bar.

## 5. What does not move

No bounce or overshoot anywhere. The bar never slides off the foot of the screen: it shrinks in place. The icons do not spin, slide or jump when chosen. Nothing loops.

## How Ajala uses it

| Motion | In the app (`FloatingTabBar`) |
| --- | --- |
| Shape and size | One capsule 60 tall, its foot 12 inside the safe area (at least 8 from the screen's foot). Four tabs (Home, Explore, Trips, Profile) of up to 84 each with 4 of padding: 344 wide, or the screen less 20 a side on a narrow phone, shared equally. |
| Current tab | The pill (the tab's width × 52, a soft neutral tint), the icon filled in Marigold with a Marigold label. The others stay grey outlines. Ajala's colours, not the recording's black. |
| Material | Liquid Glass where the phone has it (frosted, as elsewhere in the app); the design's solid surface with a soft shadow elsewhere. |
| Shrinking | 240 ms, ease in and out weighted to the end (`bezier(0.4, 0, 0.2, 1)`). The capsule closes from 344 long to a circle, 60 to 48 high, its left end to the screen's 20 margin, the middle line kept. The other tabs and the current label fade over the first half; the pill over the first 40%; the current icon rides to the circle's middle. |
| Growing | 220 ms, ease out. |
| How it is drawn | Nothing changes size. The capsule is what two capsule-shaped windows of the same size both show: one stays put, the other slides left over it, and what they share is a shorter capsule with both ends round. The glass and the tabs are held still behind them; the whole is scaled to the button's height and moved to the margin. Transforms and opacity only, from one value. |
| What drives it | React Native's own `Animated` with the native driver. The first build used Reanimated and animated the capsule's real width: a layout pass and a resized glass view every frame, and Reanimated's updates waited behind React whenever the feed was drawing rows, so the bar moved one frame in three (measured from a recording). The native driver sets the views every frame. |
| Seen over anything | Frosted glass with a breath of the surface colour under it, a hairline edge and a soft shadow drawn outside the shape only. Glass alone melted into a white page or a pale map; a nearly solid base lost the frost. |
| When | A tab's main list reports its scrolling (`useMinimizeTabBarOnScroll`: Home's feed, Trips' lists, Profile). 24 pt of travel one way shrinks or grows the bar; the top of the list always shows it whole; the bounce at the end of a list is ignored. Explore is a map and never shrinks it. |
| Tapping the circle | Grows the bar; does not change tab. A light tap of haptics. |
| Choosing a tab | The pill slides in 240 ms (ease out), 6% larger for the first 90 ms and settling over 200 ms; the icon pops 92% to 100% as it fills; the bar swells 3% under the finger. A selection tick of haptics. Screens switch at once, as before (a cross-fade left tabs blank on some phones). |
| Not taken | The glass lens bending the icons, the blur on the fading tabs, and dragging the pill across the bar: they belong to the system's own bar and are not worth imitating by hand. |
| Reduce Motion | The bar never shrinks; the pill jumps; nothing scales. |

## The "+" (create)

Not in the recording. It follows X: a round teal button at the bottom right, above the bar (56 across, 20 from the right edge, 14 above the bar). When the bar shrinks to its round button the "+" slides down 72 to the same line, so the two sit level at the foot of the screen, left and right; when the bar grows back it slides up above it again. It rides the bar's own value, so the two move as one (240 ms down, 220 ms up). It dips 6% while pressed, with a medium tap of haptics. With Reduce Motion the bar never shrinks, so the "+" never moves. Explore has none: the map's own dock and controls are in that corner.
