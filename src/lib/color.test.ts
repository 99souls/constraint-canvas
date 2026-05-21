import { describe, expect, it } from 'vitest';

import {
  hexToHsv,
  hsvToHex,
  isValidHexColor,
  normalizeHexColor,
  resolveCssColorToHex,
} from './color';

describe('color helpers', () => {
  it('normalizes full and shorthand hex values', () => {
    expect(normalizeHexColor('#A1B2C3')).toBe('#a1b2c3');
    expect(normalizeHexColor('#f0c')).toBe('#ff00cc');
  });

  it('rejects invalid hex values', () => {
    expect(isValidHexColor('red')).toBe(false);
    expect(normalizeHexColor('#12')).toBeNull();
  });

  it('resolves known named colors without the DOM', () => {
    expect(resolveCssColorToHex('red')).toBe('#ff0000');
    expect(resolveCssColorToHex('blue')).toBe('#0000ff');
  });

  it('converts between hex and hsv', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hsvToHex({ h: 300, s: 1, v: 1 })).toBe('#ff00ff');
  });
});
