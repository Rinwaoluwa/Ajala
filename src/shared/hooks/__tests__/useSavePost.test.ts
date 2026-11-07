import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MutationObserver, QueryClient } from '@tanstack/react-query';

import { ApiError } from '@core/api/ApiError';

import type { ApiRequester } from '../../state/apiRequester';
import { postSaves } from '../../state/postSaves';
import { savePostMutation } from '../useSavePost';

/** Runs the save mutation the way the hook does, against a bare client. */
function run(request: ApiRequester, client: QueryClient, next: boolean) {
  const observer = new MutationObserver(client, savePostMutation('p1', request, client));
  return observer.mutate(next).catch((e: unknown) => e);
}

describe('saving a post', () => {
  beforeEach(() => postSaves.reset());

  it('fills the bookmark at once, calls the API, then refreshes Saved lists', async () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    let seenDuringCall: boolean | undefined;
    const request = jest.fn(async () => {
      seenDuringCall = postSaves.get('p1');
      return undefined;
    }) as unknown as ApiRequester;

    await run(request, client, true);

    expect(seenDuringCall).toBe(true);
    expect(request).toHaveBeenCalledWith({ method: 'POST', path: '/api/v1/posts/p1/save' });
    expect(postSaves.get('p1')).toBe(true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['saved'] });
  });

  it('unsaves with DELETE', async () => {
    const client = new QueryClient();
    const request = jest.fn(async () => undefined) as unknown as ApiRequester;
    await run(request, client, false);
    expect(request).toHaveBeenCalledWith({ method: 'DELETE', path: '/api/v1/posts/p1/save' });
    expect(postSaves.get('p1')).toBe(false);
  });

  it('goes back to what the card showed when the API refuses (a 409 for a cancelled post)', async () => {
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    postSaves.set('p1', false);
    const request = (async () => {
      throw new ApiError({ code: 'CONFLICT', message: 'Cancelled.', status: 409 });
    }) as ApiRequester;

    const error = await run(request, client, true);

    expect(error).toMatchObject({ code: 'CONFLICT' });
    expect(postSaves.get('p1')).toBe(false);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('falls back to the server’s answer when the card had not been touched', async () => {
    const client = new QueryClient();
    const request = (async () => {
      throw new ApiError({ code: 'NETWORK', message: 'Offline.' });
    }) as ApiRequester;
    await run(request, client, true);
    expect(postSaves.get('p1')).toBeUndefined();
  });
});
