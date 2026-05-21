import { describe, expect, it } from 'vitest';

import type { Shape } from '../types/Shape';
import { reorderShapes } from './layering';

const shapes: Shape[] = [
  {
    id: 'a',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: 'red',
  },
  {
    id: 'b',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: 'blue',
  },
  {
    id: 'c',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: 'green',
  },
  {
    id: 'd',
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    color: 'yellow',
  },
];

describe('reorderShapes', () => {
  it('brings selected shapes to the front', () => {
    expect(reorderShapes(shapes, ['a', 'c'], 'bring-to-front').map((shape) => shape.id)).toEqual([
      'b',
      'd',
      'a',
      'c',
    ]);
  });

  it('moves selected shapes backward one step', () => {
    expect(reorderShapes(shapes, ['c'], 'send-backward').map((shape) => shape.id)).toEqual([
      'a',
      'c',
      'b',
      'd',
    ]);
  });
});
