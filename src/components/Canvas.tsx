import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  clampZoom,
  clampRectSize,
  makeRectFromPoints,
  rectsIntersect,
  resizeRect,
  screenToCanvas,
  translatePoint,
  type Point,
  type Rect,
  type ResizeHandle,
} from "../lib/geometry";
import {
  alignShapes,
  distributeShapes,
  getOverlappingShapeIds,
  type AlignMode,
} from "../lib/layout";
import { resolveMoveSnapping, type Guide } from "../lib/snapping";
import type { Shape } from "./../types/Shape";
import { createInitialHistoryState, historyReducer } from "../types/Document";
import type { Viewport } from "../types/Viewport";

type InteractionState =
  | { mode: "idle" }
  | {
      mode: "panning";
      pointerId: number;
      startClientPoint: Point;
      startViewport: Viewport;
    }
  | {
      mode: "dragging-shapes";
      pointerId: number;
      leadShapeId: string;
      shapeIds: string[];
      startCanvasPoint: Point;
      startShapePositions: Record<string, Point>;
      previewPositions: Record<string, Point>;
      guides: Guide[];
    }
  | {
      mode: "marquee";
      pointerId: number;
      startCanvasPoint: Point;
      currentCanvasPoint: Point;
    }
  | {
      mode: "resizing-shape";
      pointerId: number;
      shapeId: string;
      handle: ResizeHandle;
      startCanvasPoint: Point;
      startRect: Rect;
      previewRect: Rect;
    };

const MIN_SHAPE_WIDTH = 56;
const MIN_SHAPE_HEIGHT = 56;
const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export default function Canvas() {
  const worldRef = useRef<HTMLDivElement | null>(null);
  const [history, dispatchHistory] = useReducer(
    historyReducer,
    undefined,
    createInitialHistoryState,
  );
  const [viewport, setViewport] = useState<Viewport>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [interaction, setInteraction] = useState<InteractionState>({
    mode: "idle",
  });

  const isPanning = interaction.mode === "panning";
  const isDraggingShape = interaction.mode === "dragging-shapes";
  const isResizingShape = interaction.mode === "resizing-shape";
  const document = history.present;

  const shapeMap = useMemo(() => {
    return new Map(document.shapes.map((shape) => [shape.id, shape]));
  }, [document.shapes]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (interaction.mode !== "idle") {
        return;
      }

      const hasUndoModifier = event.metaKey || event.ctrlKey;

      if (hasUndoModifier && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedShapeIds(document.shapes.map((shape) => shape.id));
        return;
      }

      if (!hasUndoModifier || event.key.toLowerCase() !== "z") {
        if (hasUndoModifier && event.key.toLowerCase() === "y") {
          event.preventDefault();
          setInteraction({ mode: "idle" });
          dispatchHistory({ type: "redo" });
        }

        return;
      }

      event.preventDefault();
      setInteraction({ mode: "idle" });
      dispatchHistory({ type: event.shiftKey ? "redo" : "undo" });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [document.shapes, interaction.mode]);

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

    if (e.shiftKey) {
      const startCanvasPoint = screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport);

      setInteraction({
        mode: "marquee",
        pointerId: e.pointerId,
        startCanvasPoint,
        currentCanvasPoint: startCanvasPoint,
      });

      return;
    }

    setSelectedShapeIds([]);
    setInteraction({
      mode: "panning",
      pointerId: e.pointerId,
      startClientPoint: { x: e.clientX, y: e.clientY },
      startViewport: viewport,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.mode === "idle") {
      return;
    }

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

    if (interaction.mode === "dragging-shapes") {
      const currentCanvasPoint = screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport);
      const dx = currentCanvasPoint.x - interaction.startCanvasPoint.x;
      const dy = currentCanvasPoint.y - interaction.startCanvasPoint.y;
      const leadShape = shapeMap.get(interaction.leadShapeId);

      if (!leadShape) {
        return;
      }

      const leadStartPosition = interaction.startShapePositions[interaction.leadShapeId];

      if (!leadStartPosition) {
        return;
      }

      const snappedLeadResult = resolveMoveSnapping({
        movingRect: {
          x: leadStartPosition.x + dx,
          y: leadStartPosition.y + dy,
          width: leadShape.width,
          height: leadShape.height,
        },
        stationaryRects: document.shapes
          .filter((shape) => !interaction.shapeIds.includes(shape.id))
          .map((shape) => ({
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
          })),
        threshold: 8 / viewport.zoom,
      });
      const snappedDx = snappedLeadResult.position.x - leadStartPosition.x;
      const snappedDy = snappedLeadResult.position.y - leadStartPosition.y;

      const previewPositions = Object.fromEntries(
        interaction.shapeIds.flatMap((shapeId) => {
          const startPosition = interaction.startShapePositions[shapeId];

          if (!startPosition) {
            return [];
          }

          return [[shapeId, translatePoint(startPosition, snappedDx, snappedDy)] as const];
        }),
      );

      setInteraction({
        ...interaction,
        previewPositions,
        guides: snappedLeadResult.guides,
      });

      return;
    }

    if (interaction.mode === "resizing-shape") {
      const currentCanvasPoint = screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport);
      const deltaX = currentCanvasPoint.x - interaction.startCanvasPoint.x;
      const deltaY = currentCanvasPoint.y - interaction.startCanvasPoint.y;

      setInteraction({
        ...interaction,
        previewRect: resizeRect(
          interaction.startRect,
          interaction.handle,
          deltaX,
          deltaY,
          MIN_SHAPE_WIDTH,
          MIN_SHAPE_HEIGHT,
        ),
      });

      return;
    }

    const currentCanvasPoint = screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport);
    const marqueeRect = makeRectFromPoints(interaction.startCanvasPoint, currentCanvasPoint);

    setSelectedShapeIds(
      document.shapes
        .filter((shape) => rectsIntersect(marqueeRect, shapeToRect(shape)))
        .map((shape) => shape.id),
    );
    setInteraction({
      ...interaction,
      currentCanvasPoint,
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interaction.mode === "idle" || interaction.pointerId !== e.pointerId) {
      return;
    }

    if (interaction.mode === "dragging-shapes") {
      dispatchHistory({
        type: "document",
        action: {
          type: "moveShapes",
          positions: interaction.previewPositions,
        },
      });
    } else if (interaction.mode === "resizing-shape") {
      dispatchHistory({
        type: "document",
        action: {
          type: "resizeShape",
          shapeId: interaction.shapeId,
          rect: clampRectSize(interaction.previewRect, MIN_SHAPE_WIDTH, MIN_SHAPE_HEIGHT),
        },
      });
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

  const handleShapePointerDown = (e: React.PointerEvent<HTMLDivElement>, shapeId: string) => {
    if (e.button !== 0) {
      return;
    }

    e.stopPropagation();

    if (e.shiftKey) {
      setSelectedShapeIds((current) =>
        current.includes(shapeId) ? current.filter((id) => id !== shapeId) : [...current, shapeId],
      );

      return;
    }

    const shape = shapeMap.get(shapeId);

    if (!shape) {
      return;
    }

    const nextSelectedIds = selectedShapeIds.includes(shapeId) ? selectedShapeIds : [shapeId];
    const startShapePositions = Object.fromEntries(
      nextSelectedIds.flatMap((selectedId) => {
        const selectedShape = shapeMap.get(selectedId);

        if (!selectedShape) {
          return [];
        }

        return [[selectedId, { x: selectedShape.x, y: selectedShape.y }] as const];
      }),
    );

    capturePointer(e.pointerId);
    setSelectedShapeIds(nextSelectedIds);
    setInteraction({
      mode: "dragging-shapes",
      pointerId: e.pointerId,
      leadShapeId: shapeId,
      shapeIds: nextSelectedIds,
      startCanvasPoint: screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport),
      startShapePositions,
      previewPositions: startShapePositions,
      guides: [],
    });
  };

  const handleResizeHandlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    shapeId: string,
    handle: ResizeHandle,
  ) => {
    if (e.button !== 0) {
      return;
    }

    e.stopPropagation();

    const shape = shapeMap.get(shapeId);

    if (!shape) {
      return;
    }

    capturePointer(e.pointerId);
    setInteraction({
      mode: "resizing-shape",
      pointerId: e.pointerId,
      shapeId,
      handle,
      startCanvasPoint: screenToCanvas(getLocalPoint(e.clientX, e.clientY), viewport),
      startRect: shapeToRect(shape),
      previewRect: shapeToRect(shape),
    });
  };

  const runAlignAction = (mode: AlignMode) => {
    if (interaction.mode !== "idle") {
      return;
    }

    const selectedShapes = document.shapes.filter((shape) => selectedShapeIds.includes(shape.id));

    if (selectedShapes.length < 2) {
      return;
    }

    dispatchHistory({
      type: "document",
      action: {
        type: "moveShapes",
        positions: alignShapes(selectedShapes, mode),
      },
    });
  };

  const runDistributeAction = (axis: "horizontal" | "vertical") => {
    if (interaction.mode !== "idle") {
      return;
    }

    const selectedShapes = document.shapes.filter((shape) => selectedShapeIds.includes(shape.id));

    if (selectedShapes.length < 3) {
      return;
    }

    dispatchHistory({
      type: "document",
      action: {
        type: "moveShapes",
        positions: distributeShapes(selectedShapes, axis),
      },
    });
  };

  const renderedShapes = document.shapes.map((shape) => {
    if (interaction.mode === "dragging-shapes") {
      const previewPosition = interaction.previewPositions[shape.id];

      if (previewPosition) {
        return {
          id: shape.id,
          type: shape.type,
          width: shape.width,
          height: shape.height,
          color: shape.color,
          x: previewPosition.x,
          y: previewPosition.y,
        };
      }
    }

    if (interaction.mode === "resizing-shape" && interaction.shapeId === shape.id) {
      return {
        id: shape.id,
        type: shape.type,
        color: shape.color,
        x: interaction.previewRect.x,
        y: interaction.previewRect.y,
        width: interaction.previewRect.width,
        height: interaction.previewRect.height,
      };
    }

    return shape;
  });
  const activeGuides = interaction.mode === "dragging-shapes" ? interaction.guides : [];
  const marqueeRect =
    interaction.mode === "marquee"
      ? makeRectFromPoints(interaction.startCanvasPoint, interaction.currentCanvasPoint)
      : null;
  const selectedShapes = renderedShapes.filter((shape) => selectedShapeIds.includes(shape.id));
  const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const overlappingShapeIds = getOverlappingShapeIds(renderedShapes);
  const canAlign = selectedShapeIds.length >= 2 && interaction.mode === "idle";
  const canDistribute = selectedShapeIds.length >= 3 && interaction.mode === "idle";

  return (
    <div
      ref={worldRef}
      className="world"
      style={{
        backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
        backgroundSize: `${40 * viewport.zoom}px ${40 * viewport.zoom}px`,
        cursor: isPanning || isDraggingShape || isResizingShape ? "grabbing" : "grab",
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
            className={`shape${selectedShapeIds.includes(shape.id) ? " is-selected" : ""}${
              interaction.mode === "dragging-shapes" && interaction.shapeIds.includes(shape.id)
                ? " is-dragging"
                : ""
            }${overlappingShapeIds.includes(shape.id) ? " is-overlapping" : ""}${
              interaction.mode === "resizing-shape" && interaction.shapeId === shape.id
                ? " is-resizing"
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

        {singleSelectedShape ? (
          <div
            className="selection-frame"
            style={{
              left: singleSelectedShape.x,
              top: singleSelectedShape.y,
              width: singleSelectedShape.width,
              height: singleSelectedShape.height,
            }}
          >
            {RESIZE_HANDLES.map((handle) => (
              <div
                key={handle}
                className={`resize-handle resize-handle-${handle}`}
                onPointerDown={(e) =>
                  handleResizeHandlePointerDown(e, singleSelectedShape.id, handle)
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <svg className="overlay" aria-hidden="true">
        <g transform={`translate(${viewport.panX}, ${viewport.panY}) scale(${viewport.zoom})`}>
          {activeGuides.map((guide) => {
            if (guide.orientation === "vertical") {
              return (
                <line
                  key={`guide-v-${guide.x}-${guide.y1}-${guide.y2}`}
                  className="snap-guide"
                  x1={guide.x}
                  x2={guide.x}
                  y1={guide.y1}
                  y2={guide.y2}
                />
              );
            }

            return (
              <line
                key={`guide-h-${guide.y}-${guide.x1}-${guide.x2}`}
                className="snap-guide"
                x1={guide.x1}
                x2={guide.x2}
                y1={guide.y}
                y2={guide.y}
              />
            );
          })}

          {marqueeRect ? (
            <rect
              className="marquee"
              x={marqueeRect.x}
              y={marqueeRect.y}
              width={marqueeRect.width}
              height={marqueeRect.height}
            />
          ) : null}
        </g>
      </svg>

      <div className="hud">
        <span>zoom {viewport.zoom.toFixed(2)}x</span>
        <span>selected {selectedShapeIds.length > 0 ? selectedShapeIds.join(",") : "none"}</span>
        <span>mode {interaction.mode}</span>
        <span>
          history {history.past.length}/{history.future.length}
        </span>
        <span>shift+drag marquee</span>
        <span>cmd/ctrl+z undo</span>
      </div>

      <div className="toolbar" onPointerDown={(event) => event.stopPropagation()}>
        <button type="button" disabled={!canAlign} onClick={() => runAlignAction("left")}>
          Align Left
        </button>
        <button type="button" disabled={!canAlign} onClick={() => runAlignAction("right")}>
          Align Right
        </button>
        <button type="button" disabled={!canAlign} onClick={() => runAlignAction("top")}>
          Align Top
        </button>
        <button type="button" disabled={!canAlign} onClick={() => runAlignAction("bottom")}>
          Align Bottom
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => runAlignAction("horizontal-center")}
        >
          Center X
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => runAlignAction("vertical-center")}
        >
          Center Y
        </button>
        <button
          type="button"
          disabled={!canDistribute}
          onClick={() => runDistributeAction("horizontal")}
        >
          Distribute X
        </button>
        <button
          type="button"
          disabled={!canDistribute}
          onClick={() => runDistributeAction("vertical")}
        >
          Distribute Y
        </button>
      </div>
    </div>
  );
}

function shapeToRect(shape: Shape): Rect {
  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
}
