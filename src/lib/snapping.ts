import { getRectCenter, type Point, type Rect, type ResizeHandle } from './geometry';

export type Guide =
  | {
      orientation: 'vertical';
      x: number;
      y1: number;
      y2: number;
    }
  | {
      orientation: 'horizontal';
      y: number;
      x1: number;
      x2: number;
    };

type SnapCandidate = {
  delta: number;
  guide: Guide;
};

type ResolveMoveSnappingInput = {
  movingRect: Rect;
  stationaryRects: Rect[];
  threshold: number;
};

type ResolveMoveSnappingResult = {
  position: Point;
  guides: Guide[];
};

type ResolveResizeSnappingInput = {
  rect: Rect;
  stationaryRects: Rect[];
  handle: ResizeHandle;
  threshold: number;
};

type ResolveResizeSnappingResult = {
  rect: Rect;
  guides: Guide[];
};

export function resolveMoveSnapping(input: ResolveMoveSnappingInput): ResolveMoveSnappingResult {
  const vertical = pickClosestCandidate(
    collectVerticalCandidates(input.movingRect, input.stationaryRects, input.threshold),
  );
  const horizontal = pickClosestCandidate(
    collectHorizontalCandidates(input.movingRect, input.stationaryRects, input.threshold),
  );

  return {
    position: {
      x: input.movingRect.x + (vertical?.delta ?? 0),
      y: input.movingRect.y + (horizontal?.delta ?? 0),
    },
    guides: [vertical?.guide, horizontal?.guide].filter((guide): guide is Guide => Boolean(guide)),
  };
}

export function resolveResizeSnapping(
  input: ResolveResizeSnappingInput,
): ResolveResizeSnappingResult {
  const horizontal = input.handle.includes('e')
    ? pickClosestCandidate(
        collectVerticalCandidates(
          { ...input.rect, x: input.rect.x + input.rect.width, width: 0 },
          input.stationaryRects,
          input.threshold,
        ),
      )
    : input.handle.includes('w')
      ? pickClosestCandidate(
          collectVerticalCandidates(
            { ...input.rect, width: 0 },
            input.stationaryRects,
            input.threshold,
          ),
        )
      : undefined;

  const vertical = input.handle.includes('s')
    ? pickClosestCandidate(
        collectHorizontalCandidates(
          { ...input.rect, y: input.rect.y + input.rect.height, height: 0 },
          input.stationaryRects,
          input.threshold,
        ),
      )
    : input.handle.includes('n')
      ? pickClosestCandidate(
          collectHorizontalCandidates(
            { ...input.rect, height: 0 },
            input.stationaryRects,
            input.threshold,
          ),
        )
      : undefined;

  let nextRect = { ...input.rect };

  if (horizontal) {
    if (input.handle.includes('e')) {
      nextRect.width += horizontal.delta;
    } else {
      nextRect.x += horizontal.delta;
      nextRect.width -= horizontal.delta;
    }
  }

  if (vertical) {
    if (input.handle.includes('s')) {
      nextRect.height += vertical.delta;
    } else {
      nextRect.y += vertical.delta;
      nextRect.height -= vertical.delta;
    }
  }

  return {
    rect: nextRect,
    guides: [horizontal?.guide, vertical?.guide].filter((guide): guide is Guide => Boolean(guide)),
  };
}

export function snapValueToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function collectVerticalCandidates(
  movingRect: Rect,
  stationaryRects: Rect[],
  threshold: number,
): SnapCandidate[] {
  const movingLeft = movingRect.x;
  const movingRight = movingRect.x + movingRect.width;
  const movingCenter = getRectCenter(movingRect).x;

  return stationaryRects.flatMap((rect) => {
    const targetLeft = rect.x;
    const targetRight = rect.x + rect.width;
    const targetCenter = getRectCenter(rect).x;

    return [movingLeft, movingRight, movingCenter].flatMap((movingValue) => {
      return [targetLeft, targetRight, targetCenter].flatMap((targetValue) => {
        const delta = targetValue - movingValue;

        if (Math.abs(delta) > threshold) {
          return [];
        }

        return [
          {
            delta,
            guide: {
              orientation: 'vertical' as const,
              x: targetValue,
              y1: Math.min(movingRect.y, rect.y),
              y2: Math.max(movingRect.y + movingRect.height, rect.y + rect.height),
            },
          },
        ];
      });
    });
  });
}

function collectHorizontalCandidates(
  movingRect: Rect,
  stationaryRects: Rect[],
  threshold: number,
): SnapCandidate[] {
  const movingTop = movingRect.y;
  const movingBottom = movingRect.y + movingRect.height;
  const movingCenter = getRectCenter(movingRect).y;

  return stationaryRects.flatMap((rect) => {
    const targetTop = rect.y;
    const targetBottom = rect.y + rect.height;
    const targetCenter = getRectCenter(rect).y;

    return [movingTop, movingBottom, movingCenter].flatMap((movingValue) => {
      return [targetTop, targetBottom, targetCenter].flatMap((targetValue) => {
        const delta = targetValue - movingValue;

        if (Math.abs(delta) > threshold) {
          return [];
        }

        return [
          {
            delta,
            guide: {
              orientation: 'horizontal' as const,
              y: targetValue,
              x1: Math.min(movingRect.x, rect.x),
              x2: Math.max(movingRect.x + movingRect.width, rect.x + rect.width),
            },
          },
        ];
      });
    });
  });
}

function pickClosestCandidate(candidates: SnapCandidate[]): SnapCandidate | undefined {
  return candidates.reduce<SnapCandidate | undefined>((closest, candidate) => {
    if (!closest) {
      return candidate;
    }

    return Math.abs(candidate.delta) < Math.abs(closest.delta) ? candidate : closest;
  }, undefined);
}
