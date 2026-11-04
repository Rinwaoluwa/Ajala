import { baseRoutes, fail, type DemoRequest } from './demoStore';
import { areaRoutes } from './routes';

/**
 * A pretend Ajala API for demos and UI testing, switched on with
 * `EXPO_PUBLIC_DEMO=1` (see docs/DEMO.md). `apiClient` hands every request here
 * instead of the network, so every feature runs its real repositories, mappers
 * and caches against answers shaped exactly like the API's (spec §6).
 *
 * The world itself — state, helpers and the shared routes — is `demoStore.ts`;
 * each area adds its answers in `routes/`. Area files import the store, never
 * this file, so nothing here is read before it has loaded.
 */

const LATENCY_MS = 350;

/** Answers one request as the API would, after a short, realistic wait. */
export async function demoRequest<T>(request: DemoRequest): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  const [pathname, search = ''] = request.path.split('?');
  const query = new URLSearchParams(search);
  for (const [method, pattern, handle] of [...baseRoutes, ...areaRoutes()]) {
    if (method !== request.method) continue;
    const match = (pathname ?? '').match(pattern);
    if (match) return handle(match, request, query) as T;
  }
  return fail(404, 'NOT_FOUND', `The demo has no answer for ${request.method} ${pathname}.`) as T;
}

export { resetDemo } from './demoStore';
export type { DemoPost, DemoRoute } from './demoStore';
