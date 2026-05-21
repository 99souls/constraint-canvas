import { describe, expect, it } from 'vitest';

import { resolveMoveSnapping } from './snapping';

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
});
