import { describe, expect, it } from '@jest/globals';

import {
  buildDeviceRegistration,
  isChatPush,
  pushNotificationOf,
  pushOpenOf,
  shouldAskForPushPermission,
} from '../rules/pushRules';

const identity = { deviceId: 'ios-1234', timezone: 'Africa/Lagos' };

describe('the device registration body', () => {
  it('sends the token, platform, sign-in device id and time zone', () => {
    expect(buildDeviceRegistration({ token: 'abc', platform: 'ios' }, identity)).toEqual({
      token: 'abc',
      platform: 'ios',
      deviceId: 'ios-1234',
      timezone: 'Africa/Lagos',
    });
  });

  it('leaves out a missing or over-long time zone rather than sending a wrong one', () => {
    expect(buildDeviceRegistration({ token: 'abc', platform: 'android' }, { ...identity, timezone: null })).toEqual({
      token: 'abc',
      platform: 'android',
      deviceId: 'ios-1234',
    });
    const long = buildDeviceRegistration({ token: 'abc', platform: 'android' }, { ...identity, timezone: 'x'.repeat(65) });
    expect(long).not.toHaveProperty('timezone');
  });

  it('sends nothing for a token or device id the API would refuse', () => {
    expect(buildDeviceRegistration({ token: '  ', platform: 'ios' }, identity)).toBeNull();
    expect(buildDeviceRegistration({ token: 'x'.repeat(513), platform: 'ios' }, identity)).toBeNull();
    expect(buildDeviceRegistration({ token: 'abc', platform: 'ios' }, { ...identity, deviceId: '' })).toBeNull();
    expect(
      buildDeviceRegistration({ token: 'abc', platform: 'ios' }, { ...identity, deviceId: 'd'.repeat(129) }),
    ).toBeNull();
  });

  it('accepts the limits exactly', () => {
    const body = buildDeviceRegistration(
      { token: 't'.repeat(512), platform: 'ios' },
      { deviceId: 'd'.repeat(128), timezone: 'z'.repeat(64) },
    );
    expect(body?.token).toHaveLength(512);
    expect(body?.timezone).toHaveLength(64);
  });
});

describe('asking for permission', () => {
  it('asks only someone who has never answered, once per install', () => {
    expect(shouldAskForPushPermission('undetermined', false)).toBe(true);
    expect(shouldAskForPushPermission('undetermined', true)).toBe(false);
    expect(shouldAskForPushPermission('denied', false)).toBe(false);
    expect(shouldAskForPushPermission('granted', false)).toBe(false);
  });
});

describe('where a tapped push opens', () => {
  it('opens the post, as the inbox row would', () => {
    expect(pushOpenOf({ kind: 'post_reminder', postId: 'p1' })).toEqual({
      target: { to: 'post', postId: 'p1' },
      notificationId: null,
    });
  });

  it('opens a chat push in its conversation, with no inbox item to mark', () => {
    expect(pushOpenOf({ kind: 'chat.message', conversationId: 'c1' })).toEqual({
      target: { to: 'messages', conversationId: 'c1' },
      notificationId: null,
    });
  });

  it('opens a post whose time or place changed', () => {
    expect(pushOpenOf({ category: 'post_update', kind: 'post.details_changed', postId: 'p-jazz' }).target).toEqual({
      to: 'post',
      postId: 'p-jazz',
    });
    // Without the category, the kind alone still says it.
    expect(pushNotificationOf({ kind: 'post.details_changed', postId: 'p-jazz' }).kind).toBe('post_update');
  });

  it('opens a message in its conversation, whichever spelling of the kind', () => {
    expect(pushOpenOf({ kind: 'new_message', conversationId: 'c1' }).target).toEqual({
      to: 'messages',
      conversationId: 'c1',
    });
    // The demo's spelling, with a postId that must not win over the chat.
    expect(pushOpenOf({ kind: 'message', postId: 'p1', conversationId: 'c1' }).target).toEqual({
      to: 'messages',
      conversationId: 'c1',
    });
    expect(pushOpenOf({ kind: 'new_message' }).target).toEqual({ to: 'messages', conversationId: null });
    // An unfamiliar kind with a conversation is still a message.
    expect(pushOpenOf({ kind: 'dm', conversationId: 'c2' }).target).toEqual({ to: 'messages', conversationId: 'c2' });
  });

  it('tells chat pushes from the rest, which refresh the inbox', () => {
    expect(isChatPush({ kind: 'chat.message', conversationId: 'c1' })).toBe(true);
    expect(isChatPush({ kind: 'new_comment', postId: 'p1' })).toBe(false);
    expect(isChatPush({ category: 'post_update', kind: 'post.details_changed', postId: 'p1' })).toBe(false);
    expect(isChatPush({})).toBe(false);
  });

  it('opens the paywall for a subscription notice', () => {
    expect(pushOpenOf({ kind: 'subscription.ending' }).target).toEqual({ to: 'paywall' });
    expect(pushOpenOf({ kind: 'subscription' }).target).toEqual({ to: 'paywall' });
  });

  it('reads each of Swagger’s kinds as its category', () => {
    const cases: [string, string][] = [
      ['rsvp.requested', 'join_request'],
      ['rsvp.accepted', 'request_accepted'],
      ['rsvp.promoted', 'post_update'],
      ['rsvp.removed', 'post_update'],
      ['post.cancelled', 'post_update'],
      ['post.taken_down', 'post_update'],
      ['post.reminder', 'post_reminder'],
      ['comment.new', 'new_comment'],
      ['moderation.warning', 'moderation'],
      ['trusted.request', 'trusted_person'],
      ['trusted.plans', 'trusted_person'],
      ['trusted.ended', 'trusted_person'],
      ['trusted.something_new', 'trusted_person'],
    ];
    for (const [kind, category] of cases) expect(pushNotificationOf({ kind, postId: 'p1' }).kind).toBe(category);
    expect(pushOpenOf({ kind: 'rsvp.requested', postId: 'p1' }).target).toEqual({ to: 'post', postId: 'p1' });
  });

  it('stays put for a trusted-person push (no screens yet) and a moderation warning', () => {
    expect(pushOpenOf({ kind: 'trusted.plans', linkId: 'tl-1' }).target).toBeNull();
    expect(pushOpenOf({ kind: 'moderation.warning' }).target).toBeNull();
  });

  it('prefers category over kind when both are sent', () => {
    expect(pushNotificationOf({ category: 'subscription', kind: 'renewal', postId: 'p1' }).kind).toBe('subscription');
  });

  it('still opens the post for a kind this build does not know, and stays put without one', () => {
    expect(pushOpenOf({ kind: 'brand_new', postId: 'p9' }).target).toEqual({ to: 'post', postId: 'p9' });
    expect(pushOpenOf({ kind: 'report_resolved' }).target).toBeNull();
    expect(pushOpenOf({}).target).toBeNull();
  });

  it('ignores ids that are not text', () => {
    expect(pushOpenOf({ kind: 'post_update', postId: 42 }).target).toBeNull();
  });

  it('names the inbox item to mark read when the push carries it', () => {
    expect(pushOpenOf({ kind: 'new_comment', postId: 'p1', notificationId: 'n-1' }).notificationId).toBe('n-1');
  });
});
