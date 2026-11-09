import { describe, expect, it } from '@jest/globals';

import { handleFormatProblem, normalizeHandle, suggestHandles } from '../rules/handleRules';
import {
  MAX_DESTINATIONS,
  TRAVEL_STYLES,
  canContinueBasics,
  canContinueInterests,
  missingBasics,
  splitFullName,
  toggle,
  travelStyleLabel,
} from '../rules/profileSetupRules';

describe('choosing from a list', () => {
  it('adds and removes', () => {
    expect(toggle(['en'], 'es')).toEqual(['en', 'es']);
    expect(toggle(['en', 'es'], 'en')).toEqual(['es']);
  });

  it('leaves a full list as it is, but still lets one go', () => {
    const full = Array.from({ length: MAX_DESTINATIONS }, (_, i) => `city${i}`);
    expect(toggle(full, 'Oslo', MAX_DESTINATIONS)).toEqual(full);
    expect(toggle(full, 'city0', MAX_DESTINATIONS)).toHaveLength(MAX_DESTINATIONS - 1);
  });
});

describe('travel styles', () => {
  it('maps every chip to a distinct API value, all 36 of them', () => {
    const values = TRAVEL_STYLES.map((s) => s.value);
    expect(new Set(values).size).toBe(36);
    expect(values).toContain('local_life');
    expect(values).toContain('digital_nomad');
  });

  it('labels a value, and shows one it does not know as words', () => {
    expect(travelStyleLabel('city_break')).toBe('City break');
    expect(travelStyleLabel('van_life')).toBe('van life');
  });
});

describe('interests', () => {
  it('needs five to eight', () => {
    expect(canContinueInterests(4)).toBe(false);
    expect(canContinueInterests(5)).toBe(true);
    expect(canContinueInterests(8)).toBe(true);
    expect(canContinueInterests(9)).toBe(false);
  });
});

describe('basic details', () => {
  const ready = {
    homePlaceId: 'ChIJ-london',
    languages: ['en'],
    gender: 'woman' as const,
    fullName: '',
    dateOfBirth: null,
  };
  const nothingMissing = { name: false, dateOfBirth: false };

  it('needs a city and a language; gender is optional', () => {
    expect(canContinueBasics(ready, nothingMissing)).toBe(true);
    expect(canContinueBasics({ ...ready, homePlaceId: null }, nothingMissing)).toBe(false);
    expect(canContinueBasics({ ...ready, languages: [] }, nothingMissing)).toBe(false);
    expect(canContinueBasics({ ...ready, gender: null }, nothingMissing)).toBe(true);
  });

  it('asks for a name and a date of birth only when the account lacks them', () => {
    const missing = missingBasics({
      firstName: 'Sarah',
      lastName: null,
      dateOfBirth: null,
    });
    expect(missing).toEqual({ name: true, dateOfBirth: true });
    expect(canContinueBasics(ready, missing)).toBe(false);
    expect(
      canContinueBasics({ ...ready, fullName: 'Sarah Mitchell', dateOfBirth: '1994-03-02' }, missing),
    ).toBe(true);
  });

  it('splits a full name on the first space', () => {
    expect(splitFullName('  Sarah  Jane Mitchell ')).toEqual({
      firstName: 'Sarah',
      lastName: 'Jane Mitchell',
    });
  });
});

describe('handles', () => {
  it('drops the @ and spaces the person types', () => {
    expect(normalizeHandle(' @sarah mitchell ')).toBe('sarahmitchell');
  });

  it('checks the format before anyone is asked', () => {
    expect(handleFormatProblem('ab')).toBe('tooShort');
    expect(handleFormatProblem('a'.repeat(21))).toBe('tooLong');
    expect(handleFormatProblem('sarah-m')).toBe('characters');
    expect(handleFormatProblem('sarah.m_1')).toBeNull();
  });

  it('suggests valid handles from the name, accents and all', () => {
    expect(suggestHandles('Zoë', 'Okafor-Smith')).toEqual(['zoe.okaforsmith', 'zoeokaforsmith', 'zoe_o']);
    for (const handle of suggestHandles('A', 'B')) expect(handleFormatProblem(handle)).toBeNull();
    expect(suggestHandles(null, 'Mitchell')).toEqual([]);
  });
});
