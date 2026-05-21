import { describe, expect, it } from 'vitest';

import { canvasToScreen, resizeRect, screenToCanvas } from './geometry';

describe('geometry', () => {
  it('converts between screen and canvas coordinates', () => {
    const viewport = {
      panX: 120,
      panY: -40,
      zoom: 2,
    };
    const canvasPoint = { x: 50, y: 75 };

    const screenPoint = canvasToScreen(canvasPoint, viewport);

    expect(screenPoint).toEqual({ x: 220, y: 110 });
    expect(screenToCanvas(screenPoint, viewport)).toEqual(canvasPoint);
  });

  it('resizes from the south-east handle', () => {
    expect(resizeRect({ x: 100, y: 100, width: 80, height: 60 }, 'se', 20, 15, 40, 40)).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 75,
    });
  });

  it('clamps north-west resizing to the minimum size', () => {
    expect(resizeRect({ x: 100, y: 100, width: 80, height: 60 }, 'nw', 100, 100, 50, 40)).toEqual({
      x: 130,
      y: 120,
      width: 50,
      height: 40,
    });
  });
});
