export type ColorWheelLayout = {
  cx: number;
  cy: number;
  rOuter: number;
  rInner: number;
  squareSize: number;
  sqLeft: number;
  sqTop: number;
  sqRight: number;
  sqBottom: number;
};

export function calculateColorWheelLayout(size: number): ColorWheelLayout {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = size / 2 - 24;
  const squareSize = rInner * Math.SQRT2 - 4;
  const sqHalf = squareSize / 2;

  return {
    cx,
    cy,
    rOuter,
    rInner,
    squareSize,
    sqLeft: cx - sqHalf,
    sqTop: cy - sqHalf,
    sqRight: cx + sqHalf,
    sqBottom: cy + sqHalf,
  };
}

export function determinePointerTarget(
  px: number,
  py: number,
  layout: ColorWheelLayout,
): 'hue' | 'sv' | null {
  const dx = px - layout.cx;
  const dy = py - layout.cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist >= layout.rInner + 2 && dist <= layout.rOuter + 10) {
    return 'hue';
  }

  if (
    px >= layout.sqLeft - 10 &&
    px <= layout.sqRight + 10 &&
    py >= layout.sqTop - 10 &&
    py <= layout.sqBottom + 10
  ) {
    return 'sv';
  }

  if (dist >= layout.rInner - 5 && dist <= layout.rOuter + 10) {
    return 'hue';
  }

  return null;
}

export function calculateHueFromPointer(px: number, py: number, layout: ColorWheelLayout): number {
  let angle = Math.atan2(py - layout.cy, px - layout.cx) * (180 / Math.PI);
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

export function calculateSvFromPointer(
  px: number,
  py: number,
  layout: ColorWheelLayout,
): { s: number; v: number } {
  let s = (px - layout.sqLeft) / layout.squareSize;
  let v = (layout.sqBottom - py) / layout.squareSize;

  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  return { s, v };
}
