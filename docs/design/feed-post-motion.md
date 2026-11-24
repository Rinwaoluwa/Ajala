# Feed posts with photos: motion study

**Source:** `assets/ScreenRecording_11-15-2026 22-12-59_1.mp4` (25.3 s, 828 × 634 px, 60 frames a second, 2 px per point). A post with two photos is swiped back and forth, the feed is scrolled, a photo is opened full screen, and the photos are swiped there.

**How it was studied:** every one of the 1,324 frames was measured (the photos' edges and the indicator's pills, to the pixel), and the fast moments were read frame by frame. Numbers below are in points unless they say px.

This was the reference for the feed's photo strip and its pills (`MediaCarousel`, `CarouselIndicator`) and is still the reference for the photo viewer's opening (`src/shared/components/media`).

> **24 Nov: the feed's posts are cards now (Home design, 24 Nov).** A post's photos are a banner at the head of its card, one at a time, with dots and a count (`CardPhotos`), not the strip described in sections 1 to 4. The strip and its pills are out of the app (last in commit `7738bfb`). What still holds: the count's roll (5), a photo opening from its place (6), paging full screen (7), and what does not move (8). The table at the end says what the app does today.

## 1. At rest

| What | Measured |
| --- | --- |
| Photo | 277.5 wide × 235 tall (1.18 : 1), on a 414-wide screen: two thirds of the width |
| Corners | about 6 |
| Gap between photos | 4 |
| First photo | its left edge lines up with the post's text, not the screen edge |
| Next photo | peeks in from the right: 74 of it shows |
| Last photo | rests 16 from the right screen edge; 116 of the photo before it shows on the left |
| The strip | runs edge to edge: photos slide under the avatar column to the left screen edge |

So the strip is not paged by the screen's width. Each photo has its own resting place, and the last one rests against the trailing margin. The peek on either side is what says "there is more".

## 2. The indicator

Small pills above the photos, left-aligned with them.

| | Chosen | Not chosen |
| --- | --- | --- |
| Width | 22 | 11 |
| Height | 4, fully rounded | 4, fully rounded |
| Colour | `#656565` | `#CECECE` |

- 6 between pills. The row's total width (39 for two photos) never changes.
- **It is tied to the scroll, not timed.** Half way through a swipe both pills were 16.5 wide and `#979797`: width and colour are a straight blend by how far the strip has moved between two resting places.
- It stops at the ends. Pulled past the first or last photo (section 4), the pills stay as they are.

## 3. Swiping

- **Under the finger:** the strip follows 1:1 (0 → 418 px in 0.52 s, in step with the drag).
- **Let go:** it carries on and settles on the nearest resting place. One flick (20.33 s) went 0 → 439 px: it arrived in about 0.40 s, ran 9 past, and eased back over about 0.45 s. No visible bounce after that.
- **One photo per swipe.** A hard flick never skips a photo.
- Nothing else in the post moves while the strip does: the name, the action row and the counts hold still.

## 4. The ends (rubber band)

- Pulled past the last photo, the strip follows with resistance, up to about 50 past the end while held (4.35–4.78 s).
- Pulled past the first, the same: 46 past the start (3.03–3.13 s).
- **Let go:** it springs back with no overshoot. Each frame (1/60 s) closes about 10–15% of what is left (−92, −76, −65, −55, −47, −40 … px), settling in about 0.45 s.

This is the system scroll view's own behaviour, so the app gets it by using the platform's scroller rather than imitating it.

## 5. A count changing

At 8.60 s the like count went 856 → 858 (a live update; nobody tapped).

- The old number slides up and out, the new one slides up from below, both clipped to the line.
- About 170 ms, start to finish.
- The icon beside it does not move.

## 6. Opening a photo

Tapped at 22.08 s.

| Time after the tap | What is on screen |
| --- | --- |
| 0 ms | the feed, untouched |
| 17 ms | the feed starts to dim; the photo lifts from its place |
| 67 ms | the photo is about three quarters of the screen's width; the feed is dark grey |
| 117 ms | about 92% |
| 170 ms | full width; the feed behind is black |
| 220 ms | settled |

- **The photo itself grows** from where it sat in the strip to the full width of the screen, keeping its own shape; its rounded corners square off on the way.
- It starts fast and eases out: most of the distance is covered in the first 100 ms.
- The rest of the screen (header, action row) fades with the dimming; nothing else moves.

## 7. Swiping photos full screen

- Photos are full-width pages, edge to edge.
- A swipe takes 250–300 ms to settle, easing out, with no bounce between pages.

## 8. What does not move

Worth as much as what does: no entrance animation on the photos, no parallax, no fade between photos, no motion on the indicator apart from following the finger.

## How Ajala uses it

| Motion | In the app |
| --- | --- |
| A card's photos | `CardPhotos`: a banner the card's whole width, 3 : 1, one photo at a time. More than one are pages in a native horizontal scroll view with paging on: one photo per swipe, and the rubber band at the ends is the system's (iOS's bounce, Android's stretch). |
| Which photo is in front | Dots at the photo's foot, 7 across and 7 apart: a white ring each, filled by how nearly its photo is the one in front, on the UI thread from the scroll position and held at the ends. A count at the foot's right ("1/4"). Both sit on a soft dark fade so they read on a pale photo. One photo alone has neither. |
| Opening | The tapped photo grows from its measured place to the fitted full-width frame in 220 ms (ease-out cubic) while black fades in behind it over the first 170 ms; then the viewer's pager takes over at the same frame. Scale and position only. It starts when the viewer's window has appeared, not when it is asked for: started sooner, most of the growth ran before anything was on screen. |
| Full-screen paging | The viewer's existing pager (system paging). |
| Count roll | 170 ms, for a count that changes while on screen (`RollingCount`): the comment count when a comment is added or deleted. Nothing is drawn at 0, so the first one rolls in from nothing. (The like count rolled the same way until liking was taken out, 24 Nov.) |
| Reduce Motion | The indicator still follows the finger (it is the finger's own movement). The viewer fades in instead of growing. Counts swap without rolling. |

## What the feed cannot show yet

The design's post has a like count, a comment count and the time it was posted. `GET /feed` sends none of them, and the API has no likes at all (spec §2.11: "No likes"). Until it does:

- **The heart** is not drawn. It was, kept on the phone per account with a count of the reader's own like, until product took liking out of the app (24 Nov).
- **The comment count** is read from the comments endpoint, one small call per post on screen, and rolls when it changes. The comment button opens the post at its comments.
- **The time it was posted** is not sent. The card's design (24 Nov) has no line for it, nor for the host or the distance.

Requests B10–B12 in `docs/api/backend-requests.md`.
