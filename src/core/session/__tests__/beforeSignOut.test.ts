import { describe, expect, it, jest } from '@jest/globals';

import { createSignOutTasks } from '../beforeSignOut';

describe('work before sign-out', () => {
  it('runs every registered task and waits for them', async () => {
    const tasks = createSignOutTasks();
    const done: string[] = [];
    tasks.register('a', async () => {
      done.push('a');
    });
    tasks.register('b', async () => {
      done.push('b');
    });
    await tasks.run();
    expect(done.sort()).toEqual(['a', 'b']);
  });

  it('does nothing, at once, with no tasks', async () => {
    await expect(createSignOutTasks().run(10)).resolves.toBeUndefined();
  });

  it('never rejects, whether a task rejects or throws before returning', async () => {
    const tasks = createSignOutTasks();
    tasks.register('rejects', async () => {
      throw new Error('network down');
    });
    tasks.register('throws', () => {
      throw new Error('sync');
    });
    const ran = jest.fn(async () => undefined);
    tasks.register('fine', ran);
    await expect(tasks.run()).resolves.toBeUndefined();
    expect(ran).toHaveBeenCalledTimes(1);
  });

  it('stops waiting when the time is up, so a hung network never blocks sign-out', async () => {
    jest.useFakeTimers();
    try {
      const tasks = createSignOutTasks();
      tasks.register('hangs', () => new Promise<void>(() => undefined));
      let finished = false;
      const running = tasks.run(3000).then(() => {
        finished = true;
      });
      await jest.advanceTimersByTimeAsync(2999);
      expect(finished).toBe(false);
      await jest.advanceTimersByTimeAsync(1);
      await running;
      expect(finished).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps one task per key, and removing an old one leaves its replacement', async () => {
    const tasks = createSignOutTasks();
    const first = jest.fn(async () => undefined);
    const second = jest.fn(async () => undefined);
    const removeFirst = tasks.register('push', first);
    tasks.register('push', second);
    removeFirst();
    await tasks.run();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('forgets a removed task', async () => {
    const tasks = createSignOutTasks();
    const task = jest.fn(async () => undefined);
    tasks.register('push', task)();
    await tasks.run();
    expect(task).not.toHaveBeenCalled();
  });
});
