import { useRef, useState } from "react";
import {
  clampZoom,
  screenToCanvas,
  translatePoint,
  type Point,
} from "../lib/geometry";
import type { CanvasDocument } from "../types/Document";
import type { Shape } from "./../types/Shape";
import type { Viewport } from "../types/Viewport";

const INITIAL_SHAPES: Shape[] = [
  {
    id: "1",
    type: "rectangle",
    x: 150,
    y: 150,
    width: 200,
    height: 100,
    color: "red",
  },
  {
    id: "2",
    type: "rectangle",
    x: 1600,
    y: 900,
    width: 100,
    height: 100,
    color: "blue",
  },
  {
    id: "3",
    type: "rectangle",
    x: 900,
    y: 500,
    width: 100,
    height: 200,
    color: "green",
  },
];

type InteractionState =
  | { mode: "idle" }
  | {
      mode: "panning";
      pointerId: number;
      startClientPoint: Point;
      startViewport: Viewport;
    }
  | {
      mode: "dragging-shape";
      pointerId: number;
      shapeId: string;
      startCanvasPoint: Point;
      startShapePosition: Point;
      previewPosition: Point;
    };

function createInitialDocument(): CanvasDocument {
  return {
    shapes: INITIAL_SHAPES,
  };
}

export default function Canvas() {
  const worldRef = useRef<HTMLDivElement | null>(null);
  const [document, setDocument] = useState<CanvasDocument>(createInitialDocument);
  const [viewport, setViewport] = useState<Viewport>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>({
    mode: "idle",
  });

  const isPanning = interaction.mode === "panning";
  const isDraggingShape = interaction.mode === "dragging-shape";

  const getLocalPoint = (clientX: number, clientY: number): Point => {
    const rect = worldRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const capturePointer = (pointerId: number) => {
    if (worldRef.current && !worldRef.current.hasPointerCapture(pointerId)) {
      worldRef.current.setPointerCapture(pointerId);
    }
  };

  const releasePointer = (pointerId: number) => {
    if (worldRef.current?.hasPointerCapture(pointerId)) {
      worldRef.current.releasePointerCapture(pointerId);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    const localPoint = getLocalPoint(e.clientX, e.clientY);
    const canvasPoint = screenToCanvas(localPoint, viewport);
    const nextZoom = clampZoom(viewport.zoom * (e.deltaY < 0 ? 1.025 : 0.95));

    setViewport({
      zoom: nextZoom,
      panX: localPoint.x - canvasPoint.x * nextZoom,
      panY: localPoint.y - canvasPoint.y * nextZoom,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) {
      return;
    }

    capturePointer(e.pointerId);
    setSelectedShapeId(null);
    setInteraction({
      mode: "panning",
      pointerId: e.pointerId,
      startClientPoint: { x: e.clientX, y: e.clientY },
      startViewport: viewport,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.pointerId !== e.pointerId) {
      return;
    }

    if (interaction.mode === "panning") {
      const dx = e.clientX - interaction.startClientPoint.x;
      const dy = e.clientY - interaction.startClientPoint.y;

      setViewport({
        ...interaction.startViewport,
        panX: interaction.startViewport.panX + dx,
        panY: interaction.startViewport.panY + dy,
      });

      return;
    }

    if (interaction.mode === "dragging-shape") {
      const currentCanvasPoint = screenToCanvas(
        getLocalPoint(e.clientX, e.clientY),
        viewport,
      );
      const dx = currentCanvasPoint.x - interaction.startCanvasPoint.x;
      const dy = currentCanvasPoint.y - interaction.startCanvasPoint.y;

      setInteraction({
        ...interaction,
        previewPosition: translatePoint(interaction.startShapePosition, dx, dy),
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.mode === "idle" || interaction.pointerId !== e.pointerId) {
      return;
    }

    if (interaction.mode === "dragging-shape") {
      setDocument((current) => ({
        ...current,
        shapes: current.shapes.map((shape) =>
          shape.id === interaction.shapeId
            ? {
                ...shape,
                x: interaction.previewPosition.x,
                y: interaction.previewPosition.y,
              }
            : shape,
        ),
      }));
    }

    releasePointer(e.pointerId);
    setInteraction({ mode: "idle" });
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.mode === "idle" || interaction.pointerId !== e.pointerId) {
      return;
    }

    releasePointer(e.pointerId);
    setInteraction({ mode: "idle" });
  };

  const handleShapePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    shapeId: string,
  ) => {
    if (e.button !== 0) {
      return;
    }

    e.stopPropagation();
    const shape = document.shapes.find((currentShape) => currentShape.id === shapeId);

    if (!shape) {
      return;
    }

    capturePointer(e.pointerId);
    setSelectedShapeId(shapeId);
    setInteraction({
      mode: "dragging-shape",
      pointerId: e.pointerId,
      shapeId,
      startCanvasPoint: screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport),
      startShapePosition: { x: shape.x, y: shape.y },
      previewPosition: { x: shape.x, y: shape.y },
    });
  };

  const renderedShapes = document.shapes.map((shape) => {
    if (interaction.mode === "dragging-shape" && interaction.shapeId === shape.id) {
      return {
        ...shape,
        x: interaction.previewPosition.x,
        y: interaction.previewPosition.y,
      };
    }

    return shape;
  });

  return (
    <div
      ref={worldRef}
      className="world"
      style={{
        backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
        backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
        cursor: isPanning || isDraggingShape ? "grabbing" : "grab",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className="screen"
        onWheel={handleWheel}
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        }}
      >
        {renderedShapes.map((shape: Shape) => (
          <div
            key={"shape" + shape.id}
            className={`shape${selectedShapeId === shape.id ? " is-selected" : ""}${
              interaction.mode === "dragging-shape" && interaction.shapeId === shape.id
                ? " is-dragging"
                : ""
            }`}
            style={{
              left: shape.x + "px",
              top: shape.y + "px",
              width: shape.width,
              height: shape.height,
              backgroundColor: shape.color,
            }}
            onPointerDown={(e) => handleShapePointerDown(e, shape.id)}
          />
        ))}
      </div>

      <div className="hud">
        <span>zoom {viewport.zoom.toFixed(2)}x</span>
        <span>selected {selectedShapeId ?? "none"}</span>
        <span>mode {interaction.mode}</span>
      </div>
    </div>
  );
}
