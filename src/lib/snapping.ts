import { getRectCenter, type Point, type Rect } from "./geometry";

export type Guide =
  | {
      orientation: "vertical";
      x: number;
      y1: number;
      y2: number;
    }
  | {
      orientation: "horizontal";
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

export function resolveMoveSnapping(
  input: ResolveMoveSnappingInput,
): ResolveMoveSnappingResult {
  const vertical = pickClosestCandidate(
    collectVerticalCandidates(input.movingRect, input.stationaryRects, input.threshold),
  );
  const horizontal = pickClosestCandidate(
    collectHorizontalCandidates(
      input.movingRect,
      input.stationaryRects,
      input.threshold,
    ),
  );

  return {
    position: {
      x: input.movingRect.x + (vertical?.delta ?? 0),
      y: input.movingRect.y + (horizontal?.delta ?? 0),
    },
    guides: [vertical?.guide, horizontal?.guide].filter(
      (guide): guide is Guide => Boolean(guide),
    ),
  };
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
              orientation: "vertical" as const,
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
              orientation: "horizontal" as const,
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

function pickClosestCandidate(
  candidates: SnapCandidate[],
): SnapCandidate | undefined {
  return candidates.reduce<SnapCandidate | undefined>((closest, candidate) => {
    if (!closest) {
      return candidate;
    }

    return Math.abs(candidate.delta) < Math.abs(closest.delta)
      ? candidate
      : closest;
  }, undefined);
}
