import { describe, expect, it } from '@jest/globals';

import { DEFAULT_LINKS_HOST, LINKS_HOST, LINKS_ORIGIN, appPathForLink } from '../links';

const HOST = 'dev-go.ajalatrvl.com';

describe('share links', () => {
  it('defaults to the production links host', () => {
    // Tests run without EXPO_PUBLIC_LINKS_HOST set.
    expect(DEFAULT_LINKS_HOST).toBe('go.ajalatrvl.com');
    expect(LINKS_HOST).toBe('go.ajalatrvl.com');
    expect(LINKS_ORIGIN).toBe('https://go.ajalatrvl.com');
  });
});

describe('appPathForLink', () => {
  it('sends a post link to the post page and a user link to the profile', () => {
    expect(appPathForLink(`https://${HOST}/posts/p-1`, HOST)).toBe('/post/p-1');
    expect(appPathForLink(`https://${HOST}/users/u-1`, HOST)).toBe('/user/u-1');
  });

  it('takes a bare path, a trailing slash, and drops a query or fragment', () => {
    expect(appPathForLink('/posts/p-1', HOST)).toBe('/post/p-1');
    expect(appPathForLink('/users/u-1/', HOST)).toBe('/user/u-1');
    expect(appPathForLink(`https://${HOST}/posts/p-1?utm_source=wa#top`, HOST)).toBe('/post/p-1');
  });

  it('takes the app’s own scheme', () => {
    expect(appPathForLink('ajala://posts/p-1', HOST)).toBe('/post/p-1');
    expect(appPathForLink('ajala:///users/u-1', HOST)).toBe('/user/u-1');
  });

  it('matches the host without regard to case, and keeps an encoded id as it is', () => {
    expect(appPathForLink('https://DEV-GO.ajalatrvl.com/posts/p%201', HOST)).toBe('/post/p%201');
  });

  it('leaves everything else alone', () => {
    for (const url of [
      'https://go.ajalatrvl.com/posts/p-1', // another environment's host
      'https://example.com/posts/p-1',
      `https://${HOST}/posts`,
      `https://${HOST}/posts/p-1/comments`,
      `https://${HOST}/about`,
      '/post/p-1',
      '/settings',
      'ajala://oauthredirect?code=x',
      'com.googleusercontent.apps.123:/oauth2redirect',
    ]) {
      expect(appPathForLink(url, HOST)).toBe(url);
    }
  });
});
