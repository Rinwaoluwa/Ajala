import { describe, expect, it } from '@jest/globals';

import { flagEmoji } from '../flagEmoji';

describe('flagEmoji', () => {
  it('turns a country code into its flag', () => {
    expect(flagEmoji('ng')).toBe('\u{1F1F3}\u{1F1EC}');
    expect(flagEmoji('GB')).toBe('\u{1F1EC}\u{1F1E7}');
  });

  it('gives a plain flag for anything that is not a country code', () => {
    expect(flagEmoji('')).toBe('\u{1F3F3}');
  });
});
