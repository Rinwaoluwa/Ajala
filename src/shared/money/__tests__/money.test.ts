import { describe, expect, it } from '@jest/globals';

import { CURRENCIES, currencyExponent, currencyInfo, searchCurrencies } from '../currencies';
import { regionOf } from '../locale';
import { amountAsInput, amountKeyboard, formatAmount, formatMinor, parseAmount, pricePresets } from '../money';
import { convertAmount, formatEquivalent, roundEstimate } from '../rates';
import { currencyOfRegion } from '../regionCurrency';

const NG = { locale: 'en-NG', home: 'NGN' };
const US = { locale: 'en-US', home: 'USD' };
const DE = { locale: 'de-DE', home: 'EUR' };
const CA = { locale: 'en-CA', home: 'CAD' };

describe('the currency table', () => {
  it('knows every currency once, with a name and a mark', () => {
    expect(new Set(CURRENCIES.map((c) => c.code)).size).toBe(CURRENCIES.length);
    expect(CURRENCIES.length).toBeGreaterThan(140);
    for (const c of CURRENCIES) {
      expect(c.code).toMatch(/^[A-Z]{3}$/);
      expect(c.name.length).toBeGreaterThan(2);
      expect(c.symbol.length).toBeGreaterThan(0);
    }
  });

  it('gives each its own decimals', () => {
    expect(currencyExponent('NGN')).toBe(2);
    expect(currencyExponent('JPY')).toBe(0);
    expect(currencyExponent('KWD')).toBe(3);
    // One the table does not have: its code, two decimals.
    expect(currencyInfo('abc')).toEqual({ code: 'ABC', name: 'ABC', symbol: 'ABC', exponent: 2 });
  });

  it('finds a currency by code, name or mark', () => {
    expect(searchCurrencies('ngn')[0]?.code).toBe('NGN');
    expect(searchCurrencies('naira')[0]?.code).toBe('NGN');
    expect(searchCurrencies('₦')[0]?.code).toBe('NGN');
    expect(searchCurrencies('dollar').map((c) => c.code)).toEqual(expect.arrayContaining(['USD', 'CAD', 'AUD']));
    expect(searchCurrencies('')).toHaveLength(CURRENCIES.length);
    expect(searchCurrencies('zzzz')).toHaveLength(0);
  });

  it('maps every country to a currency it knows', () => {
    expect(currencyOfRegion('NG')).toBe('NGN');
    expect(currencyOfRegion('gb')).toBe('GBP');
    expect(currencyOfRegion('FR')).toBe('EUR');
    expect(currencyOfRegion('ZZ')).toBeNull();
    expect(currencyOfRegion(null)).toBeNull();
  });

  it("reads the region from the phone's locale", () => {
    expect(regionOf('en-NG')).toBe('NG');
    expect(regionOf('zh-Hans-CN')).toBe('CN');
    expect(regionOf('en_US@rg=gbzzzz')).toBe('US');
    expect(regionOf('en')).toBeNull();
  });
});

describe('writing money', () => {
  it('drops the decimals of a whole amount and keeps them otherwise', () => {
    expect(formatMinor(1_200_000, 'NGN', 2, NG)).toBe('₦12,000');
    expect(formatMinor(2_050, 'USD', 2, US)).toBe('$20.50');
    expect(formatAmount(15_000, 'NGN', NG)).toBe('₦15,000');
    expect(formatAmount(20.5, 'USD', US)).toBe('$20.50');
  });

  it("uses each currency's own decimals", () => {
    expect(formatMinor(1_500, 'JPY', 0, US)).toBe('¥1,500');
    expect(formatMinor(1_250, 'KWD', 3, US)).toBe('KWD 1.250');
    // The table's decimals when the server's are not to hand.
    expect(formatMinor(1_500, 'JPY', null, US)).toBe('¥1,500');
  });

  it('never leaves a foreign dollar looking like the local one', () => {
    expect(formatMinor(2_000, 'CAD', 2, NG)).toBe('CA$20');
    expect(formatMinor(2_000, 'CAD', 2, CA)).toBe('$20');
    expect(formatMinor(2_000, 'USD', 2, CA)).toBe('$20');
    expect(formatMinor(2_000, 'USD', 2, NG)).toBe('$20');
  });

  it('keeps a space after a mark that is letters', () => {
    expect(formatMinor(150_000, 'KES', 2, NG)).toBe('KSh 1,500');
    expect(formatMinor(5_000, 'AED', 2, NG)).toBe('AED 50');
    expect(formatMinor(5_000, 'GHS', 2, NG)).toBe('GH₵50');
  });

  it("writes the number the way the phone's region does", () => {
    expect(formatMinor(1_200_050, 'EUR', 2, DE)).toBe('12.000,50 €');
    expect(formatMinor(1_200_050, 'EUR', 2, US)).toBe('€12,000.50');
  });
});

describe('reading an amount', () => {
  it('reads whole amounts, grouped or not', () => {
    expect(parseAmount('5000', 'NGN', NG)).toBe(500_000);
    expect(parseAmount('12,000', 'NGN', NG)).toBe(1_200_000);
    expect(parseAmount('1,000,000', 'NGN', NG)).toBe(100_000_000);
    expect(parseAmount(' 12 000 ', 'NGN', NG)).toBe(1_200_000);
  });

  it('reads either decimal mark', () => {
    expect(parseAmount('20.50', 'USD', US)).toBe(2_050);
    expect(parseAmount('20,50', 'USD', US)).toBe(2_050);
    expect(parseAmount('20,5', 'EUR', DE)).toBe(2_050);
    expect(parseAmount('12.000,50', 'EUR', DE)).toBe(1_200_050);
    expect(parseAmount('12,000.50', 'USD', US)).toBe(1_200_050);
    expect(parseAmount('12.000', 'EUR', DE)).toBe(1_200_000);
  });

  it("holds each currency to its own decimals", () => {
    expect(parseAmount('1500', 'JPY', US)).toBe(1_500);
    expect(parseAmount('1500.5', 'JPY', US)).toBeNull();
    expect(parseAmount('1500.0', 'JPY', US)).toBe(1_500);
    expect(parseAmount('20.505', 'USD', US)).toBeNull();
    expect(parseAmount('1.250', 'KWD', US)).toBe(1_250);
  });

  it('refuses what is not an amount', () => {
    for (const text of ['', '  ', 'abc', '12a', '.', ',', '1.2.3,4', '-5']) {
      expect(parseAmount(text, 'USD', US)).toBeNull();
    }
  });

  it('writes an amount back for the field', () => {
    expect(amountAsInput(500_000, 'NGN', NG)).toBe('5000');
    expect(amountAsInput(2_050, 'USD', US)).toBe('20.50');
    expect(amountAsInput(2_050, 'EUR', DE)).toBe('20,50');
    expect(amountAsInput(1_500, 'JPY', US)).toBe('1500');
    // And reads its own writing.
    expect(parseAmount(amountAsInput(2_050, 'EUR', DE), 'EUR', DE)).toBe(2_050);
  });

  it('asks for the keys the currency needs', () => {
    expect(amountKeyboard('JPY')).toBe('number-pad');
    expect(amountKeyboard('NGN')).toBe('decimal-pad');
  });
});

describe('round amounts to offer', () => {
  it('keeps the naira choices the design drew', () => {
    expect(pricePresets('NGN')).toEqual([5_000, 10_000, 25_000, 50_000]);
  });

  it('offers round amounts in any currency', () => {
    expect(pricePresets('USD')).toEqual([10, 20, 50, 100]);
    expect(pricePresets('JPY')).toEqual([1_000, 2_000, 5_000, 10_000]);
    expect(pricePresets('KWD')).toEqual([5, 10, 25, 50]);
    expect(pricePresets('xyz')).toEqual([10, 20, 50, 100]);
  });
});

describe('a rough equivalent in another currency', () => {
  const rates = { date: '2026-11-21', perUsd: { USD: 1, NGN: 1500, EUR: 0.9, GBP: 0.75, JPY: 150 } };

  it('goes through the dollar for any pair', () => {
    expect(convertAmount(15_000, 'NGN', 'USD', rates)).toBeCloseTo(10);
    expect(convertAmount(15_000, 'NGN', 'EUR', rates)).toBeCloseTo(9);
    expect(convertAmount(9, 'EUR', 'NGN', rates)).toBeCloseTo(15_000);
    expect(convertAmount(20, 'usd', 'USD', rates)).toBe(20);
  });

  it('has nothing to say without a rate', () => {
    expect(convertAmount(10, 'NGN', 'XYZ', rates)).toBeNull();
    expect(convertAmount(10, 'NGN', 'EUR', null)).toBeNull();
    expect(formatEquivalent(1_500_000, 2, 'NGN', 'EUR', null, US)).toBeNull();
  });

  it('rounds like an estimate', () => {
    expect(roundEstimate(8.4567, 'EUR')).toBe(8.46);
    expect(roundEstimate(15_234.56, 'NGN')).toBe(15_235);
    expect(roundEstimate(1_499.6, 'JPY')).toBe(1_500);
  });

  it('writes it with ≈, and not at all in the same currency', () => {
    expect(formatEquivalent(1_500_000, 2, 'NGN', 'EUR', rates, DE)).toBe('≈ 9 €');
    expect(formatEquivalent(1_425_000, 2, 'NGN', 'EUR', rates, US)).toBe('≈ €8.55');
    expect(formatEquivalent(1_000, 2, 'EUR', 'NGN', rates, NG)).toBe('≈ ₦16,667');
    expect(formatEquivalent(1_500_000, 2, 'NGN', 'NGN', rates, NG)).toBeNull();
    // The table's decimals when the server's are not to hand.
    expect(formatEquivalent(1_500, null, 'JPY', 'USD', rates, US)).toBe('≈ $10');
  });
});
