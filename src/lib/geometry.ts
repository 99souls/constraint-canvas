import type { Viewport } from '../types/Viewport';

export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function clampZoom(zoom: number): number {
  return Math.min(2.5, Math.max(0.4, zoom));
}

export function screenToCanvas(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.panX) / viewport.zoom,
    y: (point.y - viewport.panY) / viewport.zoom,
  };
}

export function canvasToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.zoom + viewport.panX,
    y: point.y * viewport.zoom + viewport.panY,
  };
}

export function translatePoint(point: Point, dx: number, dy: number): Point {
  return {
    x: point.x + dx,
    y: point.y + dy,
  };
}

export function makeRectFromPoints(start: Point, end: Point): Rect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function getRectCenter(rect: Rect): Point {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function clampRectSize(rect: Rect, minimumWidth: number, minimumHeight: number): Rect {
  return {
    ...rect,
    width: Math.max(minimumWidth, rect.width),
    height: Math.max(minimumHeight, rect.height),
  };
}

export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  minimumWidth: number,
  minimumHeight: number,
): Rect {
  let nextLeft = rect.x;
  let nextTop = rect.y;
  let nextRight = rect.x + rect.width;
  let nextBottom = rect.y + rect.height;

  if (handle.includes('w')) {
    nextLeft = Math.min(nextLeft + deltaX, nextRight - minimumWidth);
  }

  if (handle.includes('e')) {
    nextRight = Math.max(nextRight + deltaX, nextLeft + minimumWidth);
  }

  if (handle.includes('n')) {
    nextTop = Math.min(nextTop + deltaY, nextBottom - minimumHeight);
  }

  if (handle.includes('s')) {
    nextBottom = Math.max(nextBottom + deltaY, nextTop + minimumHeight);
  }

  return {
    x: nextLeft,
    y: nextTop,
    width: nextRight - nextLeft,
    height: nextBottom - nextTop,
  };
}
