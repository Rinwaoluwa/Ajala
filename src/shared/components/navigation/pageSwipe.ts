/**
 * The numbers behind swiping between the app's pages (`SwipePager`), from a
 * frame-by-frame study of a reference recording (docs/design/page-swipe-motion.md).
 *
 * Plain arithmetic, marked as worklets so the gesture can run it on the UI
 * thread; it runs the same on the JavaScript side, where it is tested.
 */

/** The strip between two pages, in points. */
export const PAGE_GAP = 12;

/** A whole page's run, end to end, takes this long on the measured curve. */
export const FULL_RUN_MS = 430;
/** The shortest a run to rest takes: a page nearly home still glides in rather than snaps. */
const SHORTEST_RUN_MS = 140;
/** Let go moving faster than this (points a second), the page goes the way it was thrown. */
export const THROW_SPEED = 400;
/** The curve's steepness: 4 for a thrown page, down to this for one let go at rest. */
const GENTLEST_POWER = 2.2;
const STEEPEST_POWER = 4;

/**
 * Which page a swipe lands on when it is let go.
 *
 *   - Thrown (faster than `THROW_SPEED`): the page ahead in that direction,
 *     however little of it is showing.
 *   - Otherwise: whichever page shows most.
 *
 * Never further than one page from `from` (where the swipe began), and never
 * past the first or last page.
 *
 * @param offset   how far the row of pages has moved, in points (0 is the first page at rest)
 * @param span     one page and its gap
 * @param speed    points a second, positive towards later pages
 */
export function landingPage(offset: number, span: number, speed: number, from: number, count: number): number {
  'worklet';
  const at = offset / span;
  let page = Math.round(at);
  // A hair of tolerance, so a page exactly at rest is not "ahead" of itself.
  if (speed >= THROW_SPEED) page = Math.ceil(at - 0.001);
  else if (speed <= -THROW_SPEED) page = Math.floor(at + 0.001);
  const nearest = Math.min(from + 1, Math.max(from - 1, page));
  return Math.min(count - 1, Math.max(0, nearest));
}

/**
 * How a page runs to rest once it is let go: how long it takes, and how steep
 * its ease-out is. The page's place is then
 *
 *     left to go = distance × (1 − t / duration) ^ power
 *
 * Measured: the run is the tail of one curve, a quartic ease-out that takes
 * `FULL_RUN_MS` for a whole page. A page with a share `s` of its way left
 * takes `FULL_RUN_MS × s^¼` (half a page: 0.36s; a tenth: 0.24s), so a page
 * nearly home is not rushed and one far out is not slow.
 *
 * The power keeps the page's speed unbroken as the finger leaves it: thrown
 * hard it is the full quartic; let go slowly it is gentler (the recording's
 * slowest swipe ran at a power of about 3.4), and at rest gentler still, so it
 * never lurches off.
 *
 * @param distance     points left to the page's place
 * @param speedToward  points a second towards that place when let go (0 or less: not moving that way)
 */
export function runToRest(distance: number, span: number, speedToward: number): { duration: number; power: number } {
  'worklet';
  const share = Math.min(1, Math.max(0, distance / span));
  const duration = Math.max(SHORTEST_RUN_MS, FULL_RUN_MS * Math.pow(share, 0.25));
  // An ease-out of power p leaves at p × distance ÷ duration: p from the speed it must leave at.
  // The 1.12 is the recording's: its pages left a little faster than the finger had them.
  const matched = distance > 0 ? (1.12 * Math.max(0, speedToward) * (duration / 1000)) / distance : STEEPEST_POWER;
  const power = Math.min(STEEPEST_POWER, Math.max(GENTLEST_POWER, matched));
  return { duration, power };
}

/** Where the ease-out has got to: 0 at the start of the run, 1 at rest. */
export function easeOutPower(t: number, power: number): number {
  'worklet';
  return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), power);
}

/**
 * How round a moving page's corners are, 0 (square, at rest) to 1.
 *
 * In the recording a page is square at rest and has the screen's own corner
 * radius from the first frame it moves, so each page reads as a card the shape
 * of the screen. On that phone the change cannot be seen: the glass hides the
 * corners at rest. On a phone with square corners it would pop, so here the
 * rounding comes in over the first few points of travel and goes the same way.
 */
export function cornerRoundness(offset: number, span: number): number {
  'worklet';
  const fromRest = Math.abs(offset - Math.round(offset / span) * span);
  return Math.min(1, fromRest / 10);
}

/**
 * The radius of the screen's corners, as near as can be told without asking the
 * phone (React Native has no way to). On an iPhone the notch or island is as
 * deep as the corners are round, give or take: 39 to 62 points across the range,
 * against a top inset of 44 to 62. Kept a little under, so a page's corner is
 * always inside the glass's. An iPhone with a square screen (top inset 20) and
 * every Android phone get a modest radius; the fade above covers the difference.
 */
export function screenCornerRadius(topInset: number, ios: boolean): number {
  if (!ios) return 20;
  return Math.min(56, Math.max(16, topInset - 6));
}

/**
 * How far in from a side of the screen a swipe may start on a page that keeps
 * sideways drags for itself (a map). A little more than iOS gives its own
 * back-swipe. Wider on Android, where the first 24 or so belong to the
 * system's back gesture when the phone is driven by gestures.
 */
export function swipeEdge(ios: boolean): number {
  return ios ? 32 : 40;
}

/**
 * Whether a touch at (x, y) may start a swipe on a page that keeps sideways
 * drags for itself: within `edge` of either side, or in the `band` at the foot
 * of the screen, where the tab bar is.
 */
export function startsInSwipeZone(
  x: number,
  y: number,
  width: number,
  height: number,
  edge: number,
  band: number,
): boolean {
  'worklet';
  return x <= edge || x >= width - edge || y >= height - band;
}

/**
 * Keeps a pager and its owner in step.
 *
 * The row of pages moves on the UI thread, and the owner (React, on the
 * JavaScript thread) hears of a landing a moment later. So the owner's `index`
 * runs behind the row, and a change of `index` is one of two things: the
 * pager's own landing coming back, which needs nothing done, or a change from
 * outside (a tab tapped, a link opened), which the row must be sent to.
 *
 * What tells them apart is one number: `expected`, where the owner's index is
 * known to be heading. Telling the owner of a landing makes it that page, at
 * once (the owner changes its index in the same breath, and any draw after that
 * shows it). So a change of `index` to `expected` is the pager's own, however
 * late it arrives and however many landings were told meanwhile; anything else
 * is from outside.
 *
 * It does not keep a list of landings told and wait for each to come back:
 * when two are told before the owner draws once, only the last comes back (or
 * none, if it is the page the owner already had), and the ones never seen
 * again were then mistaken for a later change from outside.
 *
 * `epoch` counts changes from outside. A landing is told with the count it
 * happened under; one from before a change is stale, the row having since been
 * sent elsewhere, and is dropped rather than told.
 */
export class PagerStep {
  private expected: number;
  private changes = 0;

  constructor(index: number) {
    this.expected = index;
  }

  /** How many changes from outside there have been: what a landing is stamped with. */
  get epoch(): number {
    return this.changes;
  }

  /**
   * A landing on `page` that happened under `epoch`. True when it stands and
   * the owner should be told; false when a change from outside has overtaken it.
   */
  landed(page: number, epoch: number): boolean {
    if (epoch !== this.changes) return false;
    this.expected = page;
    return true;
  }

  /** The owner's `index` as now given. True when it is a change from outside, to be followed. */
  changed(index: number): boolean {
    if (index === this.expected) return false;
    this.expected = index;
    this.changes += 1;
    return true;
  }
}
