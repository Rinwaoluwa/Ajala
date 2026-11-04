/**
 * Whether the app runs against the pretend API in `demoApi.ts` instead of the
 * real one. Off unless the bundle was started with `EXPO_PUBLIC_DEMO=1`
 * (`npm run demo`); never on in a store build, which does not set it.
 *
 * Read once at load: changing it needs Metro restarted, not a reload.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO === '1';
