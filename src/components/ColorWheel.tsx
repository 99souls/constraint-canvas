import React, { useRef, useEffect, useState } from 'react';

import type { HsvColor } from '../lib/color';
import { hsvToHex } from '../lib/color';

type ColorWheelProps = {
  value: HsvColor;
  onChange: (value: HsvColor) => void;
  size?: number;
};

export function ColorWheel({ value, onChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeDrag, setActiveDrag] = useState<'hue' | 'sv' | null>(null);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 2;
  const rInner = size / 2 - 24;
  const squareSize = rInner * Math.SQRT2 - 4;
  const sqHalf = squareSize / 2;
  const sqLeft = cx - sqHalf;
  const sqTop = cy - sqHalf;
  const sqRight = cx + sqHalf;
  const sqBottom = cy + sqHalf;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw Hue Ring
    const gradient = ctx.createConicGradient(0, cx, cy);
    gradient.addColorStop(0, '#ff0000');
    gradient.addColorStop(1 / 6, '#ffff00');
    gradient.addColorStop(2 / 6, '#00ff00');
    gradient.addColorStop(3 / 6, '#00ffff');
    gradient.addColorStop(4 / 6, '#0000ff');
    gradient.addColorStop(5 / 6, '#ff00ff');
    gradient.addColorStop(1, '#ff0000');

    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2, true);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 2. Draw SV Square
    // Base color layer
    ctx.fillStyle = `hsl(${value.h}, 100%, 50%)`;
    ctx.fillRect(sqLeft, sqTop, squareSize, squareSize);

    // White gradient from left to right
    const whiteGrad = ctx.createLinearGradient(sqLeft, sqTop, sqRight, sqTop);
    whiteGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(sqLeft, sqTop, squareSize, squareSize);

    // Black gradient from bottom to top
    const blackGrad = ctx.createLinearGradient(sqLeft, sqBottom, sqLeft, sqTop);
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    blackGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(sqLeft, sqTop, squareSize, squareSize);

    // 3. Draw Hue Knob
    const hRad = value.h * (Math.PI / 180);
    const rMid = (rOuter + rInner) / 2;
    const hx = cx + Math.cos(hRad) * rMid;
    const hy = cy + Math.sin(hRad) * rMid;

    ctx.beginPath();
    ctx.arc(hx, hy, (rOuter - rInner) / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // 4. Draw SV Knob
    const sx = sqLeft + value.s * squareSize;
    const sy = sqBottom - value.v * squareSize;

    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, Math.PI * 2);
    ctx.fillStyle = hsvToHex(value);
    ctx.strokeStyle = value.v > 0.5 && value.s < 0.5 ? '#333' : '#fff';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
  }, [value, size, cx, cy, rOuter, rInner, squareSize, sqLeft, sqTop, sqRight, sqBottom]);

  const handlePointer = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let dragTarget = activeDrag;

    if (e.type === 'pointerdown') {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= rInner - 5 && dist <= rOuter + 5) {
        dragTarget = 'hue';
        setActiveDrag('hue');
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else if (
        px >= sqLeft - 10 &&
        px <= sqRight + 10 &&
        py >= sqTop - 10 &&
        py <= sqBottom + 10
      ) {
        dragTarget = 'sv';
        setActiveDrag('sv');
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    }

    if (dragTarget === 'hue') {
      let angle = Math.atan2(py - cy, px - cx) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      onChange({ ...value, h: angle });
    } else if (dragTarget === 'sv') {
      let s = (px - sqLeft) / squareSize;
      let v = (sqBottom - py) / squareSize;
      s = Math.max(0, Math.min(1, s));
      v = Math.max(0, Math.min(1, v));
      onChange({ ...value, s, v });
    }

    if (e.type === 'pointerup' || e.type === 'pointercancel') {
      setActiveDrag(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ touchAction: 'none', cursor: 'crosshair', display: 'block', margin: '0 auto' }}
      onPointerDown={handlePointer}
      onPointerMove={activeDrag ? handlePointer : undefined}
      onPointerUp={activeDrag ? handlePointer : undefined}
      onPointerCancel={activeDrag ? handlePointer : undefined}
    />
  );
}
