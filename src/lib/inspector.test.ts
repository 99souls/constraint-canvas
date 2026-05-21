import { describe, expect, it } from 'vitest';

import type { Shape } from '../types/Shape';
import { getInspectorSelectionSummary, getSharedValue } from './inspector';

const shapes: Shape[] = [
  {
    id: 'shape-1',
    type: 'rectangle',
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    color: '#ff0000',
    groupId: 'group-1',
  },
  {
    id: 'shape-2',
    type: 'rectangle',
    x: 10,
    y: 20,
    width: 50,
    height: 40,
    color: '#00ff00',
    groupId: 'group-1',
  },
];

describe('inspector helpers', () => {
  it('returns a shared value when all values match', () => {
    expect(getSharedValue([4, 4, 4])).toEqual({ kind: 'single', value: 4 });
  });

  it('returns a mixed value when values differ', () => {
    expect(getSharedValue([4, 5])).toEqual({ kind: 'mixed' });
  });

  it('derives grouped multi-selection summary', () => {
    const summary = getInspectorSelectionSummary(shapes);

    expect(summary).toMatchObject({
      title: 'Grouped Selection',
      detail: '2 shapes in one group',
      x: { kind: 'single', value: 10 },
      y: { kind: 'single', value: 20 },
      width: { kind: 'mixed' },
      color: { kind: 'mixed' },
      colorPreview: '#ff0000',
    });
  });
});
