import { describe, expect, it } from '@jest/globals';

import { createRepeatGuard } from '../repeatGuard';

/** A guard on a clock the test moves, whose "thread is free" the test decides. */
function guard(windowMs: number, idleAtOnce = true) {
  const state = { time: 0, waiting: [] as (() => void)[] };
  const allow = createRepeatGuard(windowMs, {
    now: () => state.time,
    whenIdle: (done) => (idleAtOnce ? done() : void state.waiting.push(done)),
  });
  return { allow, state, goIdle: () => state.waiting.splice(0).forEach((done) => done()) };
}

describe('the repeat guard', () => {
  it('refuses the same thing again inside the window, and allows it after', () => {
    const { allow, state } = guard(500);
    expect(allow('/messages')).toBe(true);
    state.time = 150; // the second tap of a double tap
    expect(allow('/messages')).toBe(false);
    state.time = 700; // 550ms after that
    expect(allow('/messages')).toBe(true);
  });

  it('never holds back something different', () => {
    const { allow, state } = guard(500);
    expect(allow('/messages')).toBe(true);
    state.time = 50;
    expect(allow('/notifications')).toBe(true);
    state.time = 100;
    expect(allow('/notifications')).toBe(false);
    expect(allow('/messages')).toBe(true);
  });

  it('counts a burst as one: each refused repeat starts the wait again', () => {
    const { allow, state } = guard(500);
    expect(allow('a')).toBe(true);
    for (const time of [300, 600, 900, 1200]) {
      state.time = time;
      expect(allow('a')).toBe(false);
    }
    state.time = 1650; // 450ms after the last press
    expect(allow('a')).toBe(false);
    state.time = 2200; // 550ms after that one
    expect(allow('a')).toBe(true);
  });

  it('holds while the work the first press started is still going', () => {
    // The first tap opens a screen, which keeps the thread busy; the other taps wait in
    // line and run seconds later. They must still be refused.
    const { allow, state, goIdle } = guard(500, false);
    expect(allow('/messages')).toBe(true);
    state.time = 3_000;
    expect(allow('/messages')).toBe(false);
    goIdle();
    state.time = 3_300; // the wait is counted from when the thread was free
    expect(allow('/messages')).toBe(false);
    state.time = 3_900;
    expect(allow('/messages')).toBe(true);
  });

  it('goes by when the finger touched, however late the press is handled', () => {
    const { allow, state } = guard(500);
    expect(allow('press', 10_000)).toBe(true);
    // Handled 2s later (the thread was busy), but touched 150ms after the first.
    state.time = 2_000;
    expect(allow('press', 10_150)).toBe(false);
    // A real second press, touched 3s after.
    state.time = 5_000;
    expect(allow('press', 13_150)).toBe(true);
  });

  it('ignores a touch clock that went backwards', () => {
    const { allow, state } = guard(500);
    expect(allow('press', 50_000)).toBe(true);
    state.time = 2_000;
    expect(allow('press', 120)).toBe(true);
  });
});
