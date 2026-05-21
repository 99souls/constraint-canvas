import { describe, expect, it } from 'vitest';

import {
  calculateColorWheelLayout,
  determinePointerTarget,
  calculateHueFromPointer,
  calculateSvFromPointer,
} from './colorWheelUtils';

describe('colorWheelUtils', () => {
  it('calculates layout correctly', () => {
    const layout = calculateColorWheelLayout(200);
    expect(layout.cx).toBe(100);
    expect(layout.cy).toBe(100);
    expect(layout.rOuter).toBe(98);
    expect(layout.rInner).toBe(76);
    expect(layout.sqLeft).toBeLessThan(layout.cx);
    expect(layout.sqRight).toBeGreaterThan(layout.cx);
  });

  describe('determinePointerTarget', () => {
    const layout = calculateColorWheelLayout(200);

    it('identifies hue ring', () => {
      // Right edge of the ring
      expect(determinePointerTarget(190, 100, layout)).toBe('hue');
      // Left edge of the ring
      expect(determinePointerTarget(10, 100, layout)).toBe('hue');
    });

    it('identifies sv square', () => {
      // Center
      expect(determinePointerTarget(100, 100, layout)).toBe('sv');
      // Top left corner
      expect(determinePointerTarget(layout.sqLeft, layout.sqTop, layout)).toBe('sv');
    });

    it('returns null for outside bounds', () => {
      // Outside the canvas
      expect(determinePointerTarget(300, 300, layout)).toBeNull();
    });

    it('prioritizes SV square over inner edge of hue ring near square corners', () => {
      // The distance of the square corner from center is exactly layout.rInner.
      // Because we use padding for the SV square (10px), if a user clicks exactly
      // at the corner, it should register as SV, not hue.
      expect(determinePointerTarget(layout.sqLeft, layout.sqTop, layout)).toBe('sv');

      // However, if we click far enough outside the corner (into the ring),
      // it should register as hue ring.

      // Calculate a point that is layout.rInner + 3 away from center,
      // along the diagonal towards the top-left corner.
      const distJustOutside = layout.rInner + 3;
      // angle = 135 degrees (top-left) => radians = 135 * PI / 180 = 3 * PI / 4
      const angle = (135 * Math.PI) / 180;
      const px = layout.cx + Math.cos(angle) * distJustOutside;
      const py = layout.cy - Math.sin(angle) * distJustOutside; // -sin for top

      expect(determinePointerTarget(px, py, layout)).toBe('hue');
    });
  });

  describe('calculateHueFromPointer', () => {
    const layout = calculateColorWheelLayout(200);

    it('calculates 0 degrees for right', () => {
      expect(calculateHueFromPointer(200, 100, layout)).toBe(0);
    });

    it('calculates 90 degrees for bottom', () => {
      expect(calculateHueFromPointer(100, 200, layout)).toBe(90);
    });

    it('calculates 180 degrees for left', () => {
      expect(calculateHueFromPointer(0, 100, layout)).toBe(180);
    });

    it('calculates 270 degrees for top', () => {
      expect(calculateHueFromPointer(100, 0, layout)).toBe(270);
    });
  });

  describe('calculateSvFromPointer', () => {
    const layout = calculateColorWheelLayout(200);

    it('maps bottom-left to (0,0)', () => {
      const sv = calculateSvFromPointer(layout.sqLeft, layout.sqBottom, layout);
      expect(sv.s).toBe(0);
      expect(sv.v).toBe(0);
    });

    it('maps top-right to (1,1)', () => {
      const sv = calculateSvFromPointer(layout.sqRight, layout.sqTop, layout);
      expect(sv.s).toBe(1);
      expect(sv.v).toBe(1);
    });

    it('clamps values going out of bounds', () => {
      const sv1 = calculateSvFromPointer(layout.sqLeft - 50, layout.sqBottom + 50, layout);
      expect(sv1.s).toBe(0);
      expect(sv1.v).toBe(0);

      const sv2 = calculateSvFromPointer(layout.sqRight + 50, layout.sqTop - 50, layout);
      expect(sv2.s).toBe(1);
      expect(sv2.v).toBe(1);
    });
  });
});
