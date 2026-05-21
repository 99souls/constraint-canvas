import type { Shape } from '../types/Shape';

export type SharedValue<T> = { kind: 'empty' } | { kind: 'mixed' } | { kind: 'single'; value: T };

export type InspectorSelectionSummary = {
  title: string;
  detail: string;
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  color: SharedValue<string>;
  colorPreview: string;
};

export function getInspectorSelectionSummary(shapes: Shape[]): InspectorSelectionSummary | null {
  if (shapes.length === 0) {
    return null;
  }

  const uniqueGroupIds = new Set(shapes.flatMap((shape) => (shape.groupId ? [shape.groupId] : [])));

  const title =
    shapes.length === 1
      ? 'Shape'
      : uniqueGroupIds.size === 1 && shapes.every((shape) => shape.groupId)
        ? 'Grouped Selection'
        : `${shapes.length} Shapes`;
  const detail =
    shapes.length === 1
      ? `ID ${shapes[0]?.id ?? ''}`
      : uniqueGroupIds.size === 1 && shapes.every((shape) => shape.groupId)
        ? `${shapes.length} shapes in one group`
        : `${shapes.length} shapes selected`;
  const color = getSharedValue(shapes.map((shape) => shape.color));

  return {
    title,
    detail,
    x: getSharedValue(shapes.map((shape) => shape.x)),
    y: getSharedValue(shapes.map((shape) => shape.y)),
    width: getSharedValue(shapes.map((shape) => shape.width)),
    height: getSharedValue(shapes.map((shape) => shape.height)),
    color,
    colorPreview: color.kind === 'single' ? color.value : (shapes[0]?.color ?? '#777777'),
  };
}

export function getSharedValue<T>(values: T[]): SharedValue<T> {
  if (values.length === 0) {
    return { kind: 'empty' };
  }

  const [firstValue, ...rest] = values;

  if (rest.every((value) => value === firstValue)) {
    return {
      kind: 'single',
      value: firstValue,
    };
  }

  return { kind: 'mixed' };
}
