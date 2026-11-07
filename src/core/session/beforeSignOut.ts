/**
 * Work that must happen while the person is still signed in, just before
 * sign-out ends the session: today, telling the API to stop sending this phone
 * pushes (`POST /me/devices/unregister`, spec §2.10), which has to go before
 * `POST /auth/logout` because it needs the session.
 *
 * Why a registry: the feature that owns the work (notifications) already
 * imports auth for its signed-in requests, so auth cannot import it back
 * without a cycle. Instead the feature registers its task here and auth's
 * sign-out runs whatever is registered.
 *
 * Sign-out must never wait on a slow or dead network, so every task gets a
 * short time limit together, and a task that fails or hangs is ignored.
 */

export type SignOutTask = () => Promise<void>;

/** How long sign-out waits for all tasks together before going ahead anyway. */
export const BEFORE_SIGN_OUT_TIMEOUT_MS = 3000;

/**
 * A registry of tasks. The app uses the shared one below; tests make their own
 * so they don't leak tasks into each other.
 */
export function createSignOutTasks() {
  // Keyed, so a component that mounts twice replaces its task rather than adding a second.
  const tasks = new Map<string, SignOutTask>();

  return {
    /** Adds (or replaces) the task under `key`. Returns a function that removes it again. */
    register(key: string, task: SignOutTask): () => void {
      tasks.set(key, task);
      return () => {
        // Only remove our own task: a newer one under the same key stays.
        if (tasks.get(key) === task) tasks.delete(key);
      };
    },

    /**
     * Runs every task at once and resolves when they have all settled or the
     * time is up, whichever comes first. Never rejects.
     */
    async run(timeoutMs: number = BEFORE_SIGN_OUT_TIMEOUT_MS): Promise<void> {
      if (tasks.size === 0) return;
      const all = Promise.allSettled(
        [...tasks.values()].map((task) => {
          try {
            return task();
          } catch (e) {
            // A task that throws before returning its promise is treated like one that rejected.
            return Promise.reject(e);
          }
        }),
      );
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeUp = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, timeoutMs);
      });
      try {
        await Promise.race([all.then(() => undefined), timeUp]);
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

const shared = createSignOutTasks();

/** Registers work to run just before sign-out; see the file comment. */
export const registerBeforeSignOut = shared.register;

/** Runs the registered tasks, waiting at most `timeoutMs`. Never rejects. */
export const runBeforeSignOut = shared.run;
