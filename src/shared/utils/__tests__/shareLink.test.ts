import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Platform, Share } from 'react-native';

import { shareLink } from '../shareLink';

describe('shareLink', () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
  const os = Platform.OS;
  afterEach(() => {
    share.mockClear();
    Platform.OS = os;
  });

  it('hands the link over once on iOS: in url, not also in the message', () => {
    Platform.OS = 'ios';
    shareLink('AJALA on Ajala', 'https://go.ajalatrvl.com/posts/p1');
    expect(share).toHaveBeenCalledWith({ message: 'AJALA on Ajala', url: 'https://go.ajalatrvl.com/posts/p1' });
  });

  it('writes the link into the message on Android, which ignores url', () => {
    Platform.OS = 'android';
    shareLink('AJALA on Ajala', 'https://go.ajalatrvl.com/posts/p1');
    expect(share).toHaveBeenCalledWith({ message: 'AJALA on Ajala\nhttps://go.ajalatrvl.com/posts/p1' });
  });
});
