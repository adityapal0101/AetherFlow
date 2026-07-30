import { describe, it, expect } from 'vitest';
import { swapOutputStroops, displayQuote } from '../lib/amm';

describe('swapOutputStroops (AetherPool constant-product)', () => {
  it('matches constant product calculation (1000/1000, in=100 -> 91)', () => {
    expect(swapOutputStroops(1000n, 1000n, 100n)).toBe(91n);
  });

  it('yields positive output strictly below output reserve', () => {
    const rIn = 1000n;
    const rOut = 1000n;
    const amtIn = 100n;
    const out = swapOutputStroops(rIn, rOut, amtIn);
    expect(out).toBeGreaterThan(0n);
    expect(out).toBeLessThan(rOut);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(swapOutputStroops(0n, 1000n, 100n)).toBe(0n);
    expect(swapOutputStroops(1000n, 1000n, 0n)).toBe(0n);
    expect(swapOutputStroops(1000n, 0n, 100n)).toBe(0n);
  });
});

describe('displayQuote', () => {
  it('multiplies by price for AFT -> XLM', () => {
    expect(displayQuote(0.05, '100', 'AFT_TO_XLM')).toBe('5.000000');
  });

  it('divides by price for XLM -> AFT', () => {
    expect(displayQuote(0.05, '5', 'XLM_TO_AFT')).toBe('100.000000');
  });

  it('returns empty string for invalid / empty / zero input', () => {
    expect(displayQuote(0.05, '', 'AFT_TO_XLM')).toBe('');
    expect(displayQuote(0.05, '0', 'AFT_TO_XLM')).toBe('');
    expect(displayQuote(0, '100', 'AFT_TO_XLM')).toBe('');
  });
});
