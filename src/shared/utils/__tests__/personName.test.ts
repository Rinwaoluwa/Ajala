import { describe, expect, it } from '@jest/globals';

import { hasOnlyNameCharacters, isNameAllowed } from '../personName';

describe('name characters', () => {
  it('takes letters in any script, with accents either way', () => {
    for (const name of ['Sarah', 'Zoë', 'Zoë', 'Ọládélé', '李明', 'محمد']) {
      expect(isNameAllowed(name)).toBe(true);
    }
  });

  it('takes spaces, apostrophes (straight or curly), hyphens and full stops', () => {
    for (const name of ["O'Brien", 'O’Brien', 'Anne-Marie', 'St. John', 'Mary Jane']) {
      expect(isNameAllowed(name)).toBe(true);
    }
  });

  it('refuses digits, emoji and other punctuation', () => {
    for (const name of ['Qa2', 'Qa😀', 'Anne–Marie', 'Qa_b', 'Qa, Jr', 'a@b', 'Line​break']) {
      expect(hasOnlyNameCharacters(name)).toBe(false);
      expect(isNameAllowed(name)).toBe(false);
    }
  });

  it('needs a letter', () => {
    expect(isNameAllowed('...')).toBe(false);
    expect(isNameAllowed("-'")).toBe(false);
    expect(isNameAllowed('')).toBe(false);
  });

  it('finds nothing wrong in an empty name: being empty is the form’s complaint', () => {
    expect(hasOnlyNameCharacters('')).toBe(true);
    expect(hasOnlyNameCharacters('   ')).toBe(true);
  });
});
