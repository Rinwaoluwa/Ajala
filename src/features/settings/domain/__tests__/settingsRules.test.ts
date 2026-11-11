import { describe, expect, it } from '@jest/globals';

import type { Account } from '../entities/Settings';
import {
  canRequestExport,
  diffProfile,
  interestsCountOk,
  editedAgo,
  filterDrafts,
  hasPassword,
  isDisplayNameValid,
  isHandleFormatValid,
  mergeExtras,
  normaliseHandle,
  passwordChecks,
  sortSessions,
  splitDisplayName,
  toggleIn,
} from '../rules/settingsRules';
import { isTravelStyle, travelStyleLabel, TRAVEL_STYLES } from '../rules/travelStyles';

const account: Account = {
  id: 'me',
  firstName: 'Maya',
  lastName: 'Chen',
  handle: 'mayawanders',
  email: 'maya@example.com',
  bio: 'Taking the scenic route.',
  avatarUrl: null,
  homePlace: { placeId: 'ChIJ-london', name: 'London', label: 'London, UK' },
  languages: ['en', 'zh'],
  socialLinks: { instagram: '@mayawanders', tiktok: null, website: null },
  travelStyles: ['solo', 'foodie'],
  favouriteDestinations: [{ placeId: 'ChIJ-accra', name: 'Accra', label: 'Accra, Ghana' }],
  interests: [
    { id: 'i-hiking', slug: 'hiking', name: 'Hiking', emoji: '🥾' },
    { id: 'i-food', slug: 'food', name: 'Food & drink', emoji: '🍜' },
    { id: 'i-art', slug: 'art', name: 'Arts & culture', emoji: '🎨' },
  ],
  photos: [{ id: 'p1', url: 'https://m/p1.jpg', thumbUrl: 'https://m/p1-thumb.jpg' }],
  identities: [{ provider: 'email' }],
  extras: { languages: ['en', 'zh'], pronouns: 'she/her', socialLinks: { instagram: '@mayawanders' } },
};

describe('profile edits', () => {
  it('splits a display name into first and last', () => {
    expect(splitDisplayName('  Maya  Li Chen ')).toEqual({ firstName: 'Maya', lastName: 'Li Chen' });
    expect(isDisplayNameValid('Maya')).toBe(false);
    expect(isDisplayNameValid('Maya Chen')).toBe(true);
  });

  it('checks handles as the API does', () => {
    expect(normaliseHandle('@maya.w')).toBe('maya.w');
    expect(isHandleFormatValid('maya.w_1')).toBe(true);
    expect(isHandleFormatValid('ma')).toBe(false);
    expect(isHandleFormatValid('maya wanders')).toBe(false);
  });

  it('sends only what changed', () => {
    expect(
      diffProfile(account, { firstName: 'Maya', lastName: 'Chen', bio: 'Taking the scenic route.' }),
    ).toEqual({});
    expect(
      diffProfile(account, { bio: '', homePlaceId: 'ChIJ-lisbon', languages: ['en', 'zh'], handle: 'maya.w' }),
    ).toEqual({ bio: null, homePlaceId: 'ChIJ-lisbon', handle: 'maya.w' });
    expect(diffProfile(account, { homePlaceId: 'ChIJ-london' })).toEqual({});
  });

  it('merges languages and links into extras without losing the rest', () => {
    const merged = mergeExtras(account.extras, {
      languages: ['en'],
      socialLinks: { instagram: '@m', tiktok: null, website: 'https://maya.com' },
    });
    expect(merged).toEqual({
      languages: ['en'],
      pronouns: 'she/her',
      socialLinks: { instagram: '@m', tiktok: null, website: 'https://maya.com' },
    });
  });
});

describe('interests', () => {
  it('sends the ids only when the set changed', () => {
    expect(diffProfile(account, { interestIds: ['i-hiking', 'i-food', 'i-art'] })).toEqual({});
    expect(diffProfile(account, { interestIds: ['i-hiking', 'i-food', 'i-art', 'i-jazz'] })).toEqual({
      interestIds: ['i-hiking', 'i-food', 'i-art', 'i-jazz'],
    });
  });

  it('allows none, or three to eight', () => {
    expect([0, 1, 2, 3, 8, 9].map(interestsCountOk)).toEqual([true, false, false, true, true, false]);
  });
});

describe('travel style and favourite destinations', () => {
  it('sends them only when they changed, in the order picked', () => {
    expect(
      diffProfile(account, { travelStyles: ['solo', 'foodie'], favouriteDestinationIds: ['ChIJ-accra'] }),
    ).toEqual({});
    expect(
      diffProfile(account, {
        travelStyles: ['foodie', 'solo'],
        favouriteDestinationIds: ['ChIJ-accra', 'ChIJ-lisbon'],
      }),
    ).toEqual({ travelStyles: ['foodie', 'solo'], favouriteDestinationIds: ['ChIJ-accra', 'ChIJ-lisbon'] });
  });

  it('merges them into extras, and an empty list clears', () => {
    const merged = mergeExtras(
      { ...account.extras, favouriteCityIds: ['old'] },
      { travelStyles: [], favouriteDestinationIds: ['ChIJ-lisbon'] },
    );
    expect(merged).toMatchObject({
      pronouns: 'she/her',
      travelStyles: [],
      favouriteDestinationIds: ['ChIJ-lisbon'],
    });
    // PATCH /me rejects fields it does not list, so the old key never goes back.
    expect(merged).not.toHaveProperty('favouriteCityIds');
  });

  it('knows the API’s 36 styles and their words', () => {
    expect(TRAVEL_STYLES).toHaveLength(36);
    expect(new Set(TRAVEL_STYLES.map((s) => s.value)).size).toBe(36);
    expect(travelStyleLabel('digital_nomad')).toBe('Digital nomad');
    expect(isTravelStyle('foodie')).toBe(true);
    expect(isTravelStyle('space_tourism')).toBe(false);
  });

  it('stops adding at the cap but always lets one go', () => {
    expect(toggleIn(['a', 'b'], 'c', 2)).toEqual(['a', 'b']);
    expect(toggleIn(['a', 'b'], 'a', 2)).toEqual(['b']);
  });
});

describe('account', () => {
  it('has a password only with an email identity', () => {
    expect(hasPassword(account)).toBe(true);
    expect(hasPassword({ identities: [{ provider: 'google' }, { provider: 'apple' }] })).toBe(false);
  });

  it('lets a new export be asked for unless one is being built', () => {
    const base = { id: 'x', requestedAt: '', readyAt: null, expiresAt: null, downloadUrl: null };
    expect(canRequestExport(null)).toBe(true);
    expect(canRequestExport({ ...base, status: 'queued' })).toBe(false);
    expect(canRequestExport({ ...base, status: 'ready' })).toBe(true);
    expect(canRequestExport({ ...base, status: 'failed' })).toBe(true);
  });
});

describe('passwords', () => {
  it('needs 8+ characters, an uppercase letter and a digit', () => {
    expect(passwordChecks('abc')).toEqual({ length: false, upper: false, digit: false });
    expect(passwordChecks('Travel2026')).toEqual({ length: true, upper: true, digit: true });
  });
});

describe('lists', () => {
  it('says how long ago a draft was edited', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    expect(editedAgo('2026-10-30T12:00:00Z', now)).toBe('Edited 3 days ago');
    expect(editedAgo('2026-11-02T11:59:40Z', now)).toBe('Edited just now');
    expect(editedAgo('2026-11-02T10:00:00Z', now)).toBe('Edited 2 hours ago');
  });

  it('filters drafts by type', () => {
    const drafts = [
      { id: 'a', type: 'plan' as const, title: 'A', updatedAt: '2026-11-01' },
      { id: 'b', type: 'event' as const, title: 'B', updatedAt: '2026-11-02' },
    ];
    expect(filterDrafts(drafts, 'event').map((d) => d.id)).toEqual(['b']);
    expect(filterDrafts(drafts, 'all')).toHaveLength(2);
  });

  it('puts this device first, then the most recently used', () => {
    const list = [
      { id: 'old', current: false, lastUsedAt: '2026-10-01' },
      { id: 'me', current: true, lastUsedAt: '2026-09-01' },
      { id: 'new', current: false, lastUsedAt: '2026-11-01' },
    ];
    expect(sortSessions(list).map((s) => s.id)).toEqual(['me', 'new', 'old']);
  });
});
