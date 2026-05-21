import type { Shape } from '../types/Shape';
import { rectsIntersect, type Rect } from './geometry';

export type AlignMode =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'horizontal-center'
  | 'vertical-center';

export type DistributeAxis = 'horizontal' | 'vertical';

export type ShapePositionMap = Record<string, { x: number; y: number }>;

export function alignShapes(shapes: Shape[], mode: AlignMode): ShapePositionMap {
  if (shapes.length === 0) {
    return {};
  }

  const left = Math.min(...shapes.map((shape) => shape.x));
  const right = Math.max(...shapes.map((shape) => shape.x + shape.width));
  const top = Math.min(...shapes.map((shape) => shape.y));
  const bottom = Math.max(...shapes.map((shape) => shape.y + shape.height));
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;

  return Object.fromEntries(
    shapes.map((shape) => {
      switch (mode) {
        case 'left':
          return [shape.id, { x: left, y: shape.y }];
        case 'right':
          return [shape.id, { x: right - shape.width, y: shape.y }];
        case 'top':
          return [shape.id, { x: shape.x, y: top }];
        case 'bottom':
          return [shape.id, { x: shape.x, y: bottom - shape.height }];
        case 'horizontal-center':
          return [shape.id, { x: centerX - shape.width / 2, y: shape.y }];
        case 'vertical-center':
          return [shape.id, { x: shape.x, y: centerY - shape.height / 2 }];
      }
    }),
  );
}

export function distributeShapes(shapes: Shape[], axis: DistributeAxis): ShapePositionMap {
  if (shapes.length < 3) {
    return Object.fromEntries(shapes.map((shape) => [shape.id, { x: shape.x, y: shape.y }]));
  }

  const sortedShapes = shapes.toSorted((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
  const firstShape = sortedShapes[0];
  const lastShape = sortedShapes[sortedShapes.length - 1];

  if (!firstShape || !lastShape) {
    return {};
  }

  const totalSize = sortedShapes.reduce(
    (sum, shape) => sum + (axis === 'horizontal' ? shape.width : shape.height),
    0,
  );
  const outerSpan =
    axis === 'horizontal'
      ? lastShape.x + lastShape.width - firstShape.x
      : lastShape.y + lastShape.height - firstShape.y;
  const gap = (outerSpan - totalSize) / (sortedShapes.length - 1);

  let cursor = axis === 'horizontal' ? firstShape.x : firstShape.y;

  return Object.fromEntries(
    sortedShapes.map((shape, index) => {
      const position =
        axis === 'horizontal' ? { x: cursor, y: shape.y } : { x: shape.x, y: cursor };

      cursor += (axis === 'horizontal' ? shape.width : shape.height) + gap;

      if (index === 0) {
        cursor =
          (axis === 'horizontal'
            ? firstShape.x + firstShape.width
            : firstShape.y + firstShape.height) + gap;
      }

      return [shape.id, position];
    }),
  );
}

export function getOverlappingShapeIds(shapes: Shape[]): string[] {
  const overlappingIds = new Set<string>();

  for (let index = 0; index < shapes.length; index += 1) {
    const currentShape = shapes[index];

    if (!currentShape) {
      continue;
    }

    for (let nextIndex = index + 1; nextIndex < shapes.length; nextIndex += 1) {
      const nextShape = shapes[nextIndex];

      if (!nextShape) {
        continue;
      }

      if (rectsIntersect(shapeToRect(currentShape), shapeToRect(nextShape))) {
        overlappingIds.add(currentShape.id);
        overlappingIds.add(nextShape.id);
      }
    }
  }

  return [...overlappingIds];
}

function shapeToRect(shape: Shape): Rect {
  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
}
