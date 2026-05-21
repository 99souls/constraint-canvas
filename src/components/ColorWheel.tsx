import React, { useRef, useEffect, useState, useMemo } from 'react';

import type { HsvColor } from '../lib/color';
import { hsvToHex } from '../lib/color';
import {
  calculateColorWheelLayout,
  determinePointerTarget,
  calculateHueFromPointer,
  calculateSvFromPointer,
} from '../lib/colorWheelUtils';

type ColorWheelProps = {
  value: HsvColor;
  onChange: (value: HsvColor) => void;
  size?: number;
};

export function ColorWheel({ value, onChange, size = 200 }: ColorWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeDrag, setActiveDrag] = useState<'hue' | 'sv' | null>(null);

  const layout = useMemo(() => calculateColorWheelLayout(size), [size]);
  const { cx, cy, rOuter, rInner, squareSize, sqLeft, sqTop, sqRight, sqBottom } = layout;

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    let handled = false;
    let { h, s, v } = value;
    const step = e.shiftKey ? 10 : 1;
    const svStep = e.shiftKey ? 0.1 : 0.02;

    if (e.key === 'ArrowUp') {
      v = Math.min(1, v + svStep);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      v = Math.max(0, v - svStep);
      handled = true;
    } else if (e.key === 'ArrowRight') {
      s = Math.min(1, s + svStep);
      handled = true;
    } else if (e.key === 'ArrowLeft') {
      s = Math.max(0, s - svStep);
      handled = true;
    } else if (e.key === 'PageUp') {
      h = (h + step) % 360;
      handled = true;
    } else if (e.key === 'PageDown') {
      h = (h - step + 360) % 360;
      handled = true;
    }

    if (handled) {
      e.preventDefault();
      onChange({ h, s, v });
    }
  };

  const handlePointer = (e: React.PointerEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let dragTarget = activeDrag;

    if (e.type === 'pointerdown') {
      dragTarget = determinePointerTarget(px, py, layout);
      if (dragTarget) {
        setActiveDrag(dragTarget);
        if (canvasRef.current && !canvasRef.current.hasPointerCapture(e.pointerId)) {
          canvasRef.current.setPointerCapture(e.pointerId);
        }
      }
    }

    if (dragTarget === 'hue') {
      const h = calculateHueFromPointer(px, py, layout);
      onChange({ ...value, h });
    } else if (dragTarget === 'sv') {
      const { s, v } = calculateSvFromPointer(px, py, layout);
      onChange({ ...value, s, v });
    }

    if (e.type === 'pointerup' || e.type === 'pointercancel') {
      setActiveDrag(null);
      if (canvasRef.current && canvasRef.current.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="inspector-color-wheel"
      width={size}
      height={size}
      tabIndex={0}
      role="application"
      aria-label="Color wheel. Use arrow keys to adjust saturation and brightness, PageUp and PageDown to adjust hue."
      style={{
        touchAction: 'none',
        cursor: 'crosshair',
        display: 'block',
        margin: '0 auto',
      }}
      onPointerDown={handlePointer}
      onPointerMove={activeDrag ? handlePointer : undefined}
      onPointerUp={activeDrag ? handlePointer : undefined}
      onPointerCancel={activeDrag ? handlePointer : undefined}
      onKeyDown={handleKeyDown}
    />
  );
}
