import { describe, expect, it } from 'vitest';

import { resolveMoveSnapping, resolveResizeSnapping, snapValueToGrid } from './snapping';

describe('resolveMoveSnapping', () => {
  it('snaps a moving edge to a nearby target edge', () => {
    const result = resolveMoveSnapping({
      movingRect: {
        x: 98,
        y: 60,
        width: 100,
        height: 80,
      },
      stationaryRects: [
        {
          x: 100,
          y: 220,
          width: 120,
          height: 100,
        },
      ],
      threshold: 4,
    });

    expect(result.position).toEqual({ x: 100, y: 60 });
    expect(result.guides).toEqual([
      {
        orientation: 'vertical',
        x: 100,
        y1: 60,
        y2: 320,
      },
    ]);
  });

  it('returns no guides when nothing is within threshold', () => {
    const result = resolveMoveSnapping({
      movingRect: {
        x: 20,
        y: 20,
        width: 50,
        height: 50,
      },
      stationaryRects: [
        {
          x: 200,
          y: 200,
          width: 100,
          height: 100,
        },
      ],
      threshold: 4,
    });

    expect(result.position).toEqual({ x: 20, y: 20 });
    expect(result.guides).toEqual([]);
  });

  it('snaps a resizing east edge to a nearby target edge', () => {
    const result = resolveResizeSnapping({
      rect: {
        x: 20,
        y: 20,
        width: 99,
        height: 50,
      },
      stationaryRects: [
        {
          x: 120,
          y: 0,
          width: 40,
          height: 120,
        },
      ],
      handle: 'e',
      threshold: 4,
    });

    expect(result.rect).toEqual({
      x: 20,
      y: 20,
      width: 100,
      height: 50,
    });
    expect(result.guides).toEqual([
      {
        orientation: 'vertical',
        x: 120,
        y1: 0,
        y2: 120,
      },
    ]);
  });

  it('snaps values to the nearest grid line', () => {
    expect(snapValueToGrid(83, 40)).toBe(80);
    expect(snapValueToGrid(101, 40)).toBe(120);
  });
});
