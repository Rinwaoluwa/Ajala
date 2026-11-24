import { describe, expect, it } from '@jest/globals';

import {
  FULL_RUN_MS,
  PAGE_GAP,
  PagerStep,
  cornerRoundness,
  easeOutPower,
  landingPage,
  runToRest,
  screenCornerRadius,
  startsInSwipeZone,
  swipeEdge,
} from '../pageSwipe';

// The recorded phone: 414 points wide, so a page and its gap are 426.
const SPAN = 414 + PAGE_GAP;

describe('where a swipe lands', () => {
  it('goes to the page it is thrown at, however little of it shows', () => {
    expect(landingPage(0.1 * SPAN, SPAN, 900, 0, 4)).toBe(1);
    expect(landingPage(1.9 * SPAN, SPAN, -900, 2, 4)).toBe(1);
  });

  it('comes back when thrown back, even from past half way', () => {
    expect(landingPage(0.7 * SPAN, SPAN, -900, 0, 4)).toBe(0);
  });

  it('let go slowly, takes the page showing most', () => {
    expect(landingPage(0.4 * SPAN, SPAN, 50, 0, 4)).toBe(0);
    expect(landingPage(0.6 * SPAN, SPAN, -50, 0, 4)).toBe(1);
  });

  it('stays put when thrown while at rest on a page', () => {
    expect(landingPage(SPAN, SPAN, 900, 1, 4)).toBe(1);
    expect(landingPage(SPAN, SPAN, -900, 1, 4)).toBe(1);
  });

  it('moves one page a swipe, and never past the ends', () => {
    expect(landingPage(1.4 * SPAN, SPAN, 900, 0, 4)).toBe(1);
    expect(landingPage(0, SPAN, -900, 0, 4)).toBe(0);
    expect(landingPage(3 * SPAN, SPAN, 900, 3, 4)).toBe(3);
  });
});

describe('the run to rest', () => {
  it('takes the whole curve for a whole page, and its tail for less', () => {
    expect(runToRest(SPAN, SPAN, 3000).duration).toBeCloseTo(FULL_RUN_MS, 0);
    // Half a page: 0.43s × ½^¼.
    expect(runToRest(SPAN / 2, SPAN, 3000).duration).toBeCloseTo(361.6, 0);
    expect(runToRest(SPAN / 10, SPAN, 3000).duration).toBeCloseTo(241.8, 0);
  });

  it('never snaps: a page nearly home still glides', () => {
    expect(runToRest(0.5, SPAN, 0).duration).toBeGreaterThanOrEqual(140);
  });

  it('is the full quartic for a thrown page, gentler for one let go slowly or at rest', () => {
    expect(runToRest(211, SPAN, 2100).power).toBe(4);
    const slow = runToRest(160, SPAN, 1440).power;
    expect(slow).toBeGreaterThan(3);
    expect(slow).toBeLessThan(3.6);
    expect(runToRest(200, SPAN, 0).power).toBe(2.2);
    // Moving away from where it will land counts as not moving towards it.
    expect(runToRest(200, SPAN, -800).power).toBe(2.2);
  });

  it('leaves at about the speed the finger had it', () => {
    const distance = 160;
    const speed = 1440;
    const { duration, power } = runToRest(distance, SPAN, speed);
    // An ease-out of power p leaves at p × distance ÷ duration.
    const leavesAt = (power * distance) / (duration / 1000);
    expect(leavesAt).toBeGreaterThan(speed);
    expect(leavesAt).toBeLessThan(speed * 1.2);
  });

  it('follows the recording: a page let go 211 points out, thrown at 2,100 points a second', () => {
    // Measured (frames 421 to 433 of the recording), points left to go, 16.7ms apart.
    const measured = [211, 176, 145, 117, 93, 73, 56, 43, 32, 23, 17, 12, 8];
    const { duration, power } = runToRest(211, SPAN, 2100);
    measured.forEach((left, frame) => {
      const model = 211 * (1 - easeOutPower((frame * 16.667) / duration, power));
      // Within three points (six pixels on that phone) all the way in.
      expect(Math.abs(model - left)).toBeLessThan(3);
    });
  });
});

describe('the ease-out', () => {
  it('starts at 0, ends at 1 and only ever moves on', () => {
    expect(easeOutPower(0, 4)).toBe(0);
    expect(easeOutPower(1, 4)).toBe(1);
    expect(easeOutPower(1.4, 4)).toBe(1);
    let last = -1;
    for (let t = 0; t <= 1; t += 0.05) {
      const now = easeOutPower(t, 3.3);
      expect(now).toBeGreaterThan(last);
      last = now;
    }
  });

  it('is steep: three quarters of the way there in the first third of the time', () => {
    expect(easeOutPower(1 / 3, 4)).toBeGreaterThan(0.75);
  });
});

describe('a moving page’s corners', () => {
  it('are square at rest on any page', () => {
    expect(cornerRoundness(0, SPAN)).toBe(0);
    expect(cornerRoundness(2 * SPAN, SPAN)).toBe(0);
  });

  it('are fully round within a few points of leaving, whichever way', () => {
    expect(cornerRoundness(5, SPAN)).toBe(0.5);
    expect(cornerRoundness(SPAN - 5, SPAN)).toBe(0.5);
    expect(cornerRoundness(40, SPAN)).toBe(1);
    expect(cornerRoundness(SPAN / 2, SPAN)).toBe(1);
  });
});

describe('the screen’s corner radius', () => {
  it('follows how deep the notch or island is on an iPhone', () => {
    // An island (top inset 59 to 62): close to the screen's own 55.
    expect(screenCornerRadius(62, true)).toBe(56);
    expect(screenCornerRadius(59, true)).toBe(53);
    // A notch (top inset 44 to 47).
    expect(screenCornerRadius(47, true)).toBe(41);
  });

  it('is modest on a screen with square corners, and on Android', () => {
    expect(screenCornerRadius(20, true)).toBe(16);
    expect(screenCornerRadius(24, false)).toBe(20);
  });
});

describe('where a swipe may start on a page that is dragged sideways itself (a map)', () => {
  // An iPhone 17: 402 × 874, the tab bar's top 82 points above the foot of the screen.
  const W = 402;
  const H = 874;
  const BAND = 82;
  const edge = swipeEdge(true);
  const starts = (x: number, y: number) => startsInSwipeZone(x, y, W, H, edge, BAND);

  it('from either side of the screen, at any height', () => {
    expect(starts(10, 120)).toBe(true);
    expect(starts(edge, 500)).toBe(true);
    expect(starts(W - 10, 300)).toBe(true);
    expect(starts(W - edge, 700)).toBe(true);
  });

  it('from the band at the foot, where the tab bar is', () => {
    expect(starts(200, H - 40)).toBe(true);
    expect(starts(200, H - BAND)).toBe(true);
  });

  it('not from the middle: that drag is the map’s', () => {
    expect(starts(200, 400)).toBe(false);
    expect(starts(edge + 1, 400)).toBe(false);
    expect(starts(W - edge - 1, 400)).toBe(false);
    expect(starts(200, H - BAND - 1)).toBe(false);
  });

  it('is wider on Android, past the system’s own back gesture', () => {
    expect(swipeEdge(false)).toBeGreaterThan(swipeEdge(true));
    expect(swipeEdge(false)).toBeGreaterThan(24);
  });
});

describe('keeping the pager and its owner in step', () => {
  it('lets its own landing pass when it comes back as the index', () => {
    const step = new PagerStep(2);
    expect(step.landed(3, step.epoch)).toBe(true);
    expect(step.changed(3)).toBe(false);
  });

  it('follows a change from outside', () => {
    const step = new PagerStep(0);
    expect(step.changed(2)).toBe(true);
    // And is then settled there.
    expect(step.changed(2)).toBe(false);
  });

  it('is not thrown by two landings told before the owner draws once', () => {
    // Trips to Profile and straight back: the owner had Trips, and has Trips again, so its
    // index never changes and nothing comes back. A tab tapped later is still from outside.
    const step = new PagerStep(2);
    expect(step.landed(3, step.epoch)).toBe(true);
    expect(step.landed(2, step.epoch)).toBe(true);
    expect(step.changed(3)).toBe(true);
    expect(step.changed(2)).toBe(true);
  });

  it('is not thrown when only the last of two landings comes back', () => {
    const step = new PagerStep(0);
    expect(step.landed(1, step.epoch)).toBe(true);
    expect(step.landed(2, step.epoch)).toBe(true);
    expect(step.changed(2)).toBe(false);
    // The one never seen is not waited for: going there later is a change from outside.
    expect(step.changed(1)).toBe(true);
  });

  it('lets an earlier landing pass when it comes back while the row has gone on', () => {
    // Landed on 1 and told; the draw with 1 arrives while a second swipe is under way.
    const step = new PagerStep(0);
    expect(step.landed(1, step.epoch)).toBe(true);
    expect(step.changed(1)).toBe(false);
    expect(step.landed(2, step.epoch)).toBe(true);
    expect(step.changed(2)).toBe(false);
  });

  it('drops a landing that a change from outside has overtaken', () => {
    const step = new PagerStep(2);
    // The row lands on 3, but before the owner is told a tab is tapped: the row is sent to 0.
    const under = step.epoch;
    expect(step.changed(0)).toBe(true);
    expect(step.landed(3, under)).toBe(false);
    // The owner stays on 0, and a swipe from there counts again.
    expect(step.changed(0)).toBe(false);
    expect(step.landed(1, step.epoch)).toBe(true);
  });
});
