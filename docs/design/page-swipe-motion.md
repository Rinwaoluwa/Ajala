# Swiping between pages: motion study

**Source:** a screen recording that was in `assets/` on 23 Nov 2026 (`ScreenRecording_11-23-2026 14-55-35_1.MP4`; it shows someone's own account in another app, so it is not committed) (12.1 s, 828 × 1792 px, 60 frames a second, 2 px per point; a 414 × 896 pt phone). Five pages of a tabbed app are swiped through, forwards and back, twelve changes in all, two of them one straight after the other.

**How it was studied:** all 638 frames were read in order. In every frame of every change the strip between the two pages was found to the pixel (the columns that are black from the top of the band to its foot), which gives where the pages are in each frame. The start and the end of a change, the corners and the tab bar were then read enlarged, frame by frame. Numbers are in points unless they say px. A frame is 16.7 ms.

This is the reference for `SwipePager` and `pageSwipe.ts` (`src/shared/components/navigation`).

## 1. What moves

- **The pages are one row, side by side.** The page being left and the page arriving are both on screen, each whole and at full size, moving together. Nothing fades, dims, shrinks or lags behind the other.
- **A strip of black between them:** 24 px in every frame of every change, so 12 points.
- **Each page is a card the shape of the screen while it moves.** Its corners are round, with the screen's own radius (about 41 on that phone), on the black. At rest the page is square and fills the screen. The rounding is there in the first frame the page has moved and gone in the frame it comes to rest; on that phone the glass hides a page's corners at rest, so nothing is seen to change.
- **The row follows the finger point for point** for as long as it is held.
- **What floats over the pages stays where it is:** the tab bar and the status bar do not move with either page.

## 2. The tab bar

- **The highlight changes when the swipe is let go,** not when it lands. In the change read most closely (frames 501 to 522) the next tab is highlighted in frame 506, with the old page still two thirds of the screen and the row moving at its fastest.
- **The bar takes the arriving page's colours gradually** (white to near black over about ten frames, going to a dark page). Ours is glass, which does that by itself.

## 3. Letting go

A change takes **0.27 to 0.42 s** from the first movement to rest, the drag included.

Once let go, the row runs on by itself and **slows all the way in: no bounce, no overshoot, and a long soft tail.** The last 20 points take about as long as the 190 before them.

One swipe (frames 421 to 433), let go 211 points from its place, moving at about 2,100 points a second:

| Since let go | Left to go |
| --- | --- |
| 0 ms | 211 |
| 17 ms | 176 |
| 33 ms | 145 |
| 50 ms | 117 |
| 67 ms | 93 |
| 83 ms | 73 |
| 100 ms | 56 |
| 117 ms | 43 |
| 133 ms | 32 |
| 150 ms | 23 |
| 167 ms | 17 |
| 183 ms | 12 |
| 200 ms | 8 |

- **The curve:** what is left to go is `distance × (1 − t ÷ duration)⁴`, a quartic ease-out. It fits that table to within 3 points all the way in, and the other fast swipes as well.
- **How long:** every run is the tail of one curve that takes **0.43 s for a whole page**. A page with a share `s` of its way left takes `0.43 × s^¼` seconds: half a page 0.36 s, a tenth of a page 0.24 s. So a page nearly home is not rushed, and one far out is not slow.
- **No break in speed as the finger leaves:** the row sets off at about the speed the finger had it (a little more: 1.12 times, measured). The slowest swipe (frames 279 to 304, let go 160 points out at about 1,440 points a second) ran on a gentler curve, a power of about 3.4 where the fast ones are 4, which is what keeping its speed unbroken gives. Two more (frames 546 to 568 and 580 to 603) were checked against the same rule and fit to within 5 points.

## 4. Where it lands

- **Thrown, it goes the way it was thrown.** Every swipe in the recording is a flick and every one goes on to the next page, one of them let go with the old page still two thirds of the screen (going by when the tab bar's highlight changes, section 2).
- **One page a swipe.** A second swipe can follow as soon as the first has landed (two do, about a second apart).
- Not in the recording, so chosen here: let go without a throw, it goes to whichever page shows most; and a drag past the first or last page does not move the row.

## 5. How Ajala does it

| In the recording | Here |
| --- | --- |
| Pages side by side, 12 between | The same (`PAGE_GAP`) |
| Round corners while moving | The same, at the phone's own radius as near as it can be told (`screenCornerRadius`); it comes in over the first 10 points of travel, since on a phone with square corners a sudden rounding would show |
| Follows the finger, then the measured curve | The same (`runToRest`, `easeOutPower`); a test holds it to the table above |
| Thrown: the next page; one page a swipe | The same (`landingPage`). A throw is 400 points a second or more: chosen here, the recording's are all several times that |
| Tab highlight on letting go | The same, and also when the next page comes to show more than this one while the finger is still down |
| The next page is there, drawn, from the first frame | The pages either side of the one in front are kept drawn and showing, out of sight. A page not yet visited is drawn ahead in a quiet moment; swiped to before that, it comes in with the loader on it |

Three things the recording has no answer for, because that app has no such pages:

- **A map.** A drag on Explore's map moves the map. There a swipe starts only from a strip down each side of the screen (32 points; 40 on Android, past the system's own back gesture) or on the tab bar (`PageSwipeZones`).
- **Rows that scroll sideways** inside a page (a post's photos, a row of pills) keep their own swipe.
- **Reduce Motion:** the row still follows the finger, but does not run on by itself; let go, the page is there.
