import { describe, expect, it } from '@jest/globals';

import { pushDataOf, pushMessageOf } from '../pushPayload';

const pushTrigger = (extra: Record<string, unknown>) => ({ type: 'push', ...extra });

describe("reading a push's data", () => {
  it('reads an Android data message from content.data', () => {
    const n = {
      request: {
        identifier: 'fcm-1',
        content: { data: { kind: 'post_reminder', postId: 'p1' } },
        trigger: pushTrigger({ remoteMessage: { data: { kind: 'post_reminder', postId: 'p1' } } }),
      },
    };
    expect(pushMessageOf(n)).toEqual({ id: 'fcm-1', data: { kind: 'post_reminder', postId: 'p1' } });
  });

  it('reads iOS keys sent beside aps, which leave content.data empty', () => {
    const n = {
      request: {
        identifier: 'apns-1',
        content: { data: null },
        trigger: pushTrigger({
          payload: { aps: { alert: { title: 'Hi' } }, kind: 'new_comment', postId: 'p2' },
        }),
      },
    };
    expect(pushDataOf(n)).toEqual({ kind: 'new_comment', postId: 'p2' });
  });

  it('undoes nesting under data or body, including a JSON string', () => {
    const nested = {
      request: { content: {}, trigger: pushTrigger({ payload: { aps: {}, data: { kind: 'message', conversationId: 'c1' } } }) },
    };
    expect(pushDataOf(nested)).toEqual({ kind: 'message', conversationId: 'c1' });

    const asString = {
      request: { content: { data: { body: '{"kind":"subscription"}', experienceId: 'x' } } },
    };
    expect(pushDataOf(asString)).toEqual({ experienceId: 'x', kind: 'subscription' });
  });

  it('keeps a plain-text body as an ordinary key', () => {
    const n = { request: { content: { data: { body: 'hello', postId: 'p3' } } } };
    expect(pushDataOf(n)).toEqual({ body: 'hello', postId: 'p3' });
  });

  it('gives an empty object for a push with no data, or no notification at all', () => {
    expect(pushDataOf({ request: { content: { data: {} }, trigger: pushTrigger({ payload: { aps: {} } }) } })).toEqual({});
    expect(pushDataOf(null)).toEqual({});
    expect(pushMessageOf(undefined)).toEqual({ id: '', data: {} });
  });
});
