import type { Shape } from '../types/Shape';

export type LayerOrderAction =
  | 'bring-forward'
  | 'send-backward'
  | 'bring-to-front'
  | 'send-to-back';

export function reorderShapes(
  shapes: Shape[],
  selectedShapeIds: string[],
  action: LayerOrderAction,
): Shape[] {
  if (selectedShapeIds.length === 0) {
    return shapes;
  }

  const selectedIds = new Set(selectedShapeIds);

  switch (action) {
    case 'bring-to-front':
      return [
        ...shapes.filter((shape) => !selectedIds.has(shape.id)),
        ...shapes.filter((shape) => selectedIds.has(shape.id)),
      ];
    case 'send-to-back':
      return [
        ...shapes.filter((shape) => selectedIds.has(shape.id)),
        ...shapes.filter((shape) => !selectedIds.has(shape.id)),
      ];
    case 'bring-forward': {
      const nextShapes = [...shapes];

      for (let index = nextShapes.length - 2; index >= 0; index -= 1) {
        const currentShape = nextShapes[index];
        const nextShape = nextShapes[index + 1];

        if (!currentShape || !nextShape) {
          continue;
        }

        if (selectedIds.has(currentShape.id) && !selectedIds.has(nextShape.id)) {
          nextShapes[index] = nextShape;
          nextShapes[index + 1] = currentShape;
        }
      }

      return nextShapes;
    }
    case 'send-backward': {
      const nextShapes = [...shapes];

      for (let index = 1; index < nextShapes.length; index += 1) {
        const previousShape = nextShapes[index - 1];
        const currentShape = nextShapes[index];

        if (!previousShape || !currentShape) {
          continue;
        }

        if (selectedIds.has(currentShape.id) && !selectedIds.has(previousShape.id)) {
          nextShapes[index - 1] = currentShape;
          nextShapes[index] = previousShape;
        }
      }

      return nextShapes;
    }
  }
}
