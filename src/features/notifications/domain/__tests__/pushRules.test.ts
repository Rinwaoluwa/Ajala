import { describe, expect, it } from '@jest/globals';

import {
  buildDeviceRegistration,
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

  it('opens the paywall for a subscription notice', () => {
    expect(pushOpenOf({ kind: 'subscription' }).target).toEqual({ to: 'paywall' });
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
