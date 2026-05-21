import type { Shape } from '../types/Shape';

export function getSelectionForShape(shapeId: string, shapes: Shape[]): string[] {
  const shape = shapes.find((currentShape) => currentShape.id === shapeId);

  if (!shape) {
    return [];
  }

  if (!shape.groupId) {
    return [shape.id];
  }

  return shapes
    .filter((currentShape) => currentShape.groupId === shape.groupId)
    .map((currentShape) => currentShape.id);
}

export function expandSelectionWithGroups(shapeIds: string[], shapes: Shape[]): string[] {
  const expandedIds = new Set<string>();

  for (const shapeId of shapeIds) {
    for (const selectedId of getSelectionForShape(shapeId, shapes)) {
      expandedIds.add(selectedId);
    }
  }

  return [...expandedIds];
}

export function getSelectedGroupIds(shapeIds: string[], shapes: Shape[]): string[] {
  const groupIds = new Set<string>();

  for (const shape of shapes) {
    if (shape.groupId && shapeIds.includes(shape.id)) {
      groupIds.add(shape.groupId);
    }
  }

  return [...groupIds];
}

export function duplicateShapes(
  shapes: Shape[],
  createId: (prefix: 'shape' | 'group') => string,
  offset = 24,
): Shape[] {
  const nextGroupIds = new Map<string, string>();

  return shapes.map((shape) => {
    let groupId = shape.groupId;

    if (shape.groupId) {
      groupId = nextGroupIds.get(shape.groupId);

      if (!groupId) {
        groupId = createId('group');
        nextGroupIds.set(shape.groupId, groupId);
      }
    }

    return {
      ...shape,
      id: createId('shape'),
      x: shape.x + offset,
      y: shape.y + offset,
      groupId,
    };
  });
}
