import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';

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
} from '../lib/geometry';
import { createEditorId } from '../lib/ids';
import { getInspectorSelectionSummary } from '../lib/inspector';
import { type LayerOrderAction } from '../lib/layering';
import {
  alignShapes,
  distributeShapes,
  getOverlappingShapeIds,
  type AlignMode,
} from '../lib/layout';
import {
  clearAutosave,
  downloadDocument,
  loadAutosave,
  parseDocument,
  saveAutosave,
  type AutosaveSnapshot,
} from '../lib/persistence';
import {
  duplicateShapes,
  expandSelectionWithGroups,
  getSelectedGroupIds,
  getSelectionForShape,
} from '../lib/selection';
import {
  resolveMoveSnapping,
  resolveResizeSnapping,
  snapValueToGrid,
  type Guide,
} from '../lib/snapping';
import { createHistoryState, createInitialDocument, historyReducer } from '../types/Document';
import type { Shape } from '../types/Shape';
import type { Viewport } from '../types/Viewport';

type InteractionState =
  | { mode: 'idle' }
  | {
      mode: 'panning';
      pointerId: number;
      startClientPoint: Point;
      startViewport: Viewport;
    }
  | {
      mode: 'dragging-shapes';
      pointerId: number;
      leadShapeId: string;
      shapeIds: string[];
      startCanvasPoint: Point;
      startShapePositions: Record<string, Point>;
      previewPositions: Record<string, Point>;
      guides: Guide[];
    }
  | {
      mode: 'marquee';
      pointerId: number;
      startCanvasPoint: Point;
      currentCanvasPoint: Point;
    }
  | {
      mode: 'resizing-shape';
      pointerId: number;
      shapeId: string;
      handle: ResizeHandle;
      startCanvasPoint: Point;
      startRect: Rect;
      previewRect: Rect;
      guides: Guide[];
    };

const GRID_SIZE = 40;
const MIN_SHAPE_WIDTH = 56;
const MIN_SHAPE_HEIGHT = 56;
const RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

export function useCanvasEditor() {
  const worldRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const initialAutosave = useMemo(() => loadAutosave(), []);
  const [history, dispatchHistory] = useReducer(
    historyReducer,
    initialAutosave?.document ?? createInitialDocument(),
    createHistoryState,
  );
  const [viewport, setViewport] = useState<Viewport>({
    panX: 0,
    panY: 0,
    zoom: 1,
  });
  const [gridSnapEnabled, setGridSnapEnabled] = useState(true);
  const [autosaveSnapshot, setAutosaveSnapshot] = useState<AutosaveSnapshot | null>(
    initialAutosave,
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [interaction, setInteraction] = useState<InteractionState>({
    mode: 'idle',
  });

  const document = history.present;
  const isPanning = interaction.mode === 'panning';
  const isDraggingShape = interaction.mode === 'dragging-shapes';
  const isResizingShape = interaction.mode === 'resizing-shape';

  const shapeMap = useMemo(
    () => new Map(document.shapes.map((shape) => [shape.id, shape])),
    [document.shapes],
  );

  useEffect(() => {
    setSelectedShapeIds((currentSelection) => {
      const nextSelection = currentSelection.filter((shapeId) => shapeMap.has(shapeId));

      return nextSelection.length === currentSelection.length ? currentSelection : nextSelection;
    });
  }, [shapeMap]);

  useEffect(() => {
    const nextAutosave = saveAutosave(document);

    if (nextAutosave) {
      setAutosaveSnapshot(nextAutosave);
    }
  }, [document]);

  const runUndo = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    dispatchHistory({ type: 'undo' });
  }, [interaction.mode]);

  const runRedo = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    dispatchHistory({ type: 'redo' });
  }, [interaction.mode]);

  const runNewDocument = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    setSelectedShapeIds([]);
    dispatchHistory({
      type: 'document',
      action: {
        type: 'loadDocument',
        document: createInitialDocument(),
      },
    });
  }, [interaction.mode]);

  const runExportDocument = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    downloadDocument(document);
  }, [document, interaction.mode]);

  const runImportDocument = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    fileInputRef.current?.click();
  }, [interaction.mode]);

  const runRestoreAutosave = useCallback(() => {
    if (interaction.mode !== 'idle' || !autosaveSnapshot) {
      return;
    }

    setSelectedShapeIds([]);
    dispatchHistory({
      type: 'document',
      action: {
        type: 'loadDocument',
        document: autosaveSnapshot.document,
      },
    });
  }, [autosaveSnapshot, interaction.mode]);

  const runClearAutosave = useCallback(() => {
    clearAutosave();
    setAutosaveSnapshot(null);
  }, []);

  const runDeleteSelection = useCallback(() => {
    if (interaction.mode !== 'idle' || selectedShapeIds.length === 0) {
      return;
    }

    dispatchHistory({
      type: 'document',
      action: {
        type: 'deleteShapes',
        shapeIds: selectedShapeIds,
      },
    });
    setSelectedShapeIds([]);
  }, [interaction.mode, selectedShapeIds]);

  const runDuplicateSelection = useCallback(() => {
    if (interaction.mode !== 'idle' || selectedShapeIds.length === 0) {
      return;
    }

    const selectedShapes = document.shapes.filter((shape) => selectedShapeIds.includes(shape.id));

    if (selectedShapes.length === 0) {
      return;
    }

    const duplicatedShapes = duplicateShapes(selectedShapes, createEditorId);

    dispatchHistory({
      type: 'document',
      action: {
        type: 'addShapes',
        shapes: duplicatedShapes,
      },
    });
    setSelectedShapeIds(duplicatedShapes.map((shape) => shape.id));
  }, [document.shapes, interaction.mode, selectedShapeIds]);

  const runGroupSelection = useCallback(() => {
    if (interaction.mode !== 'idle' || selectedShapeIds.length < 2) {
      return;
    }

    const nextGroupId = createEditorId('group');

    dispatchHistory({
      type: 'document',
      action: {
        type: 'setShapeGroups',
        groupIdsByShapeId: Object.fromEntries(
          selectedShapeIds.map((shapeId) => [shapeId, nextGroupId] as const),
        ),
      },
    });
  }, [interaction.mode, selectedShapeIds]);

  const runUngroupSelection = useCallback(() => {
    if (interaction.mode !== 'idle') {
      return;
    }

    const selectedGroupIds = getSelectedGroupIds(selectedShapeIds, document.shapes);

    if (selectedGroupIds.length === 0) {
      return;
    }

    dispatchHistory({
      type: 'document',
      action: {
        type: 'setShapeGroups',
        groupIdsByShapeId: Object.fromEntries(
          document.shapes.flatMap((shape) => {
            if (!shape.groupId || !selectedGroupIds.includes(shape.groupId)) {
              return [];
            }

            return [[shape.id, undefined] as const];
          }),
        ),
      },
    });
  }, [document.shapes, interaction.mode, selectedShapeIds]);

  const runNudgeSelection = useCallback(
    (deltaX: number, deltaY: number) => {
      if (interaction.mode !== 'idle' || selectedShapeIds.length === 0) {
        return;
      }

      dispatchHistory({
        type: 'document',
        action: {
          type: 'moveShapes',
          positions: Object.fromEntries(
            document.shapes
              .filter((shape) => selectedShapeIds.includes(shape.id))
              .map((shape) => [shape.id, { x: shape.x + deltaX, y: shape.y + deltaY }] as const),
          ),
        },
      });
    },
    [document.shapes, interaction.mode, selectedShapeIds],
  );

  const runAlignAction = useCallback(
    (mode: AlignMode) => {
      if (interaction.mode !== 'idle') {
        return;
      }

      const selectedShapes = document.shapes.filter((shape) => selectedShapeIds.includes(shape.id));

      if (selectedShapes.length < 2) {
        return;
      }

      dispatchHistory({
        type: 'document',
        action: {
          type: 'moveShapes',
          positions: alignShapes(selectedShapes, mode),
        },
      });
    },
    [document.shapes, interaction.mode, selectedShapeIds],
  );

  const runDistributeAction = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (interaction.mode !== 'idle') {
        return;
      }

      const selectedShapes = document.shapes.filter((shape) => selectedShapeIds.includes(shape.id));

      if (selectedShapes.length < 3) {
        return;
      }

      dispatchHistory({
        type: 'document',
        action: {
          type: 'moveShapes',
          positions: distributeShapes(selectedShapes, axis),
        },
      });
    },
    [document.shapes, interaction.mode, selectedShapeIds],
  );

  const runPatchSelection = useCallback(
    (patch: Partial<Pick<Shape, 'x' | 'y' | 'width' | 'height' | 'color'>>) => {
      if (interaction.mode !== 'idle' || selectedShapeIds.length === 0) {
        return;
      }

      dispatchHistory({
        type: 'document',
        action: {
          type: 'patchShapes',
          shapeIds: selectedShapeIds,
          patch,
        },
      });
    },
    [interaction.mode, selectedShapeIds],
  );

  const runLayerOrderAction = useCallback(
    (order: LayerOrderAction) => {
      if (interaction.mode !== 'idle' || selectedShapeIds.length === 0) {
        return;
      }

      dispatchHistory({
        type: 'document',
        action: {
          type: 'reorderShapes',
          shapeIds: selectedShapeIds,
          order,
        },
      });
    },
    [interaction.mode, selectedShapeIds],
  );

  const toggleGridSnap = useCallback(() => {
    setGridSnapEnabled((current) => !current);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (interaction.mode !== 'idle' || isMenuOpen) {
        return;
      }

      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName))
      ) {
        return;
      }

      const hasCommandModifier = event.metaKey || event.ctrlKey;

      if (hasCommandModifier && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setSelectedShapeIds(document.shapes.map((shape) => shape.id));
        return;
      }

      if (hasCommandModifier) {
        switch (event.key.toLowerCase()) {
          case 'd': {
            event.preventDefault();
            runDuplicateSelection();
            return;
          }
          case 'g': {
            event.preventDefault();

            if (event.shiftKey) {
              runUngroupSelection();
              return;
            }

            runGroupSelection();
            return;
          }
          case 'o': {
            event.preventDefault();
            runImportDocument();
            return;
          }
          case 's': {
            event.preventDefault();
            runExportDocument();
            return;
          }
          case 'y': {
            event.preventDefault();
            runRedo();
            return;
          }
          case 'z': {
            event.preventDefault();

            if (event.shiftKey) {
              runRedo();
              return;
            }

            runUndo();
            return;
          }
        }
      }

      if (event.key === 'Escape') {
        setSelectedShapeIds([]);
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        runDeleteSelection();
        return;
      }

      const nudgeDistance = event.shiftKey ? 10 : 1;

      switch (event.key) {
        case 'ArrowUp': {
          event.preventDefault();
          runNudgeSelection(0, -nudgeDistance);
          return;
        }
        case 'ArrowDown': {
          event.preventDefault();
          runNudgeSelection(0, nudgeDistance);
          return;
        }
        case 'ArrowLeft': {
          event.preventDefault();
          runNudgeSelection(-nudgeDistance, 0);
          return;
        }
        case 'ArrowRight': {
          event.preventDefault();
          runNudgeSelection(nudgeDistance, 0);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    document.shapes,
    interaction.mode,
    isMenuOpen,
    runDeleteSelection,
    runDuplicateSelection,
    runExportDocument,
    runGroupSelection,
    runImportDocument,
    runNudgeSelection,
    runRedo,
    runUndo,
    runUngroupSelection,
  ]);

  const getLocalPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = worldRef.current?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  const capturePointer = useCallback((pointerId: number) => {
    if (worldRef.current && !worldRef.current.hasPointerCapture(pointerId)) {
      worldRef.current.setPointerCapture(pointerId);
    }
  }, []);

  const releasePointer = useCallback((pointerId: number) => {
    if (worldRef.current?.hasPointerCapture(pointerId)) {
      worldRef.current.releasePointerCapture(pointerId);
    }
  }, []);

  const handleImportFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const nextDocument = parseDocument(await file.text());

      setSelectedShapeIds([]);
      dispatchHistory({
        type: 'document',
        action: {
          type: 'loadDocument',
          document: nextDocument,
        },
      });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Unable to import the selected document.',
      );
    } finally {
      event.currentTarget.value = '';
    }
  }, []);

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();

      const localPoint = getLocalPoint(event.clientX, event.clientY);
      const canvasPoint = screenToCanvas(localPoint, viewport);
      const nextZoom = clampZoom(viewport.zoom * (event.deltaY < 0 ? 1.025 : 0.95));

      setViewport({
        zoom: nextZoom,
        panX: localPoint.x - canvasPoint.x * nextZoom,
        panY: localPoint.y - canvasPoint.y * nextZoom,
      });
    },
    [getLocalPoint, viewport],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      capturePointer(event.pointerId);

      if (event.shiftKey) {
        const startCanvasPoint = screenToCanvas(
          getLocalPoint(event.clientX, event.clientY),
          viewport,
        );

        setInteraction({
          mode: 'marquee',
          pointerId: event.pointerId,
          startCanvasPoint,
          currentCanvasPoint: startCanvasPoint,
        });

        return;
      }

      setSelectedShapeIds([]);
      setInteraction({
        mode: 'panning',
        pointerId: event.pointerId,
        startClientPoint: { x: event.clientX, y: event.clientY },
        startViewport: viewport,
      });
    },
    [capturePointer, getLocalPoint, viewport],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (interaction.mode === 'idle' || interaction.pointerId !== event.pointerId) {
        return;
      }

      if (interaction.mode === 'panning') {
        const dx = event.clientX - interaction.startClientPoint.x;
        const dy = event.clientY - interaction.startClientPoint.y;

        setViewport({
          ...interaction.startViewport,
          panX: interaction.startViewport.panX + dx,
          panY: interaction.startViewport.panY + dy,
        });
        return;
      }

      if (interaction.mode === 'dragging-shapes') {
        const currentCanvasPoint = screenToCanvas(
          getLocalPoint(event.clientX, event.clientY),
          viewport,
        );
        const dx = currentCanvasPoint.x - interaction.startCanvasPoint.x;
        const dy = currentCanvasPoint.y - interaction.startCanvasPoint.y;
        const leadShape = shapeMap.get(interaction.leadShapeId);
        const leadStartPosition = interaction.startShapePositions[interaction.leadShapeId];

        if (!leadShape || !leadStartPosition) {
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
            .map(shapeToRect),
          threshold: 8 / viewport.zoom,
        });
        let snappedPosition = { ...snappedLeadResult.position };
        const hasVerticalGuide = snappedLeadResult.guides.some(
          (guide) => guide.orientation === 'vertical',
        );
        const hasHorizontalGuide = snappedLeadResult.guides.some(
          (guide) => guide.orientation === 'horizontal',
        );

        if (gridSnapEnabled) {
          if (!hasVerticalGuide) {
            snappedPosition.x = snapValueToGrid(snappedPosition.x, GRID_SIZE);
          }

          if (!hasHorizontalGuide) {
            snappedPosition.y = snapValueToGrid(snappedPosition.y, GRID_SIZE);
          }
        }

        const snappedDx = snappedPosition.x - leadStartPosition.x;
        const snappedDy = snappedPosition.y - leadStartPosition.y;

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

      if (interaction.mode === 'resizing-shape') {
        const currentCanvasPoint = screenToCanvas(
          getLocalPoint(event.clientX, event.clientY),
          viewport,
        );
        const deltaX = currentCanvasPoint.x - interaction.startCanvasPoint.x;
        const deltaY = currentCanvasPoint.y - interaction.startCanvasPoint.y;
        const resizedRect = resizeRect(
          interaction.startRect,
          interaction.handle,
          deltaX,
          deltaY,
          MIN_SHAPE_WIDTH,
          MIN_SHAPE_HEIGHT,
        );
        const snappedResizeResult = resolveResizeSnapping({
          rect: resizedRect,
          stationaryRects: document.shapes
            .filter((shape) => shape.id !== interaction.shapeId)
            .map(shapeToRect),
          handle: interaction.handle,
          threshold: 8 / viewport.zoom,
        });
        const hasVerticalGuide = snappedResizeResult.guides.some(
          (guide) => guide.orientation === 'vertical',
        );
        const hasHorizontalGuide = snappedResizeResult.guides.some(
          (guide) => guide.orientation === 'horizontal',
        );
        const previewRect = gridSnapEnabled
          ? applyGridResizeSnap(
              snappedResizeResult.rect,
              interaction.handle,
              hasVerticalGuide,
              hasHorizontalGuide,
            )
          : snappedResizeResult.rect;

        setInteraction({
          ...interaction,
          previewRect,
          guides: snappedResizeResult.guides,
        });
        return;
      }

      const currentCanvasPoint = screenToCanvas(
        getLocalPoint(event.clientX, event.clientY),
        viewport,
      );
      const marqueeRect = makeRectFromPoints(interaction.startCanvasPoint, currentCanvasPoint);

      setSelectedShapeIds(
        expandSelectionWithGroups(
          document.shapes
            .filter((shape) => rectsIntersect(marqueeRect, shapeToRect(shape)))
            .map((shape) => shape.id),
          document.shapes,
        ),
      );
      setInteraction({
        ...interaction,
        currentCanvasPoint,
      });
    },
    [document.shapes, getLocalPoint, gridSnapEnabled, interaction, shapeMap, viewport],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (interaction.mode === 'idle' || interaction.pointerId !== event.pointerId) {
        return;
      }

      if (interaction.mode === 'dragging-shapes') {
        dispatchHistory({
          type: 'document',
          action: {
            type: 'moveShapes',
            positions: interaction.previewPositions,
          },
        });
      } else if (interaction.mode === 'resizing-shape') {
        dispatchHistory({
          type: 'document',
          action: {
            type: 'resizeShape',
            shapeId: interaction.shapeId,
            rect: clampRectSize(interaction.previewRect, MIN_SHAPE_WIDTH, MIN_SHAPE_HEIGHT),
          },
        });
      }

      releasePointer(event.pointerId);
      setInteraction({ mode: 'idle' });
    },
    [interaction, releasePointer],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (interaction.mode === 'idle' || interaction.pointerId !== event.pointerId) {
        return;
      }

      releasePointer(event.pointerId);
      setInteraction({ mode: 'idle' });
    },
    [interaction, releasePointer],
  );

  const handleShapePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, shapeId: string) => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();

      const shapeSelection = getSelectionForShape(shapeId, document.shapes);

      if (event.shiftKey) {
        setSelectedShapeIds((currentSelection) => {
          const expandedSelection = expandSelectionWithGroups(currentSelection, document.shapes);
          const isEntireSelectionActive = shapeSelection.every((selectedId) =>
            expandedSelection.includes(selectedId),
          );

          if (isEntireSelectionActive) {
            return expandedSelection.filter((selectedId) => !shapeSelection.includes(selectedId));
          }

          return expandSelectionWithGroups(
            [...expandedSelection, ...shapeSelection],
            document.shapes,
          );
        });
        return;
      }

      const shape = shapeMap.get(shapeId);

      if (!shape) {
        return;
      }

      const nextSelectedIds = shapeSelection.every((selectedId) =>
        selectedShapeIds.includes(selectedId),
      )
        ? selectedShapeIds
        : shapeSelection;
      const startShapePositions = Object.fromEntries(
        nextSelectedIds.flatMap((selectedId) => {
          const selectedShape = shapeMap.get(selectedId);

          if (!selectedShape) {
            return [];
          }

          return [[selectedId, { x: selectedShape.x, y: selectedShape.y }] as const];
        }),
      );

      capturePointer(event.pointerId);
      setSelectedShapeIds(nextSelectedIds);
      setInteraction({
        mode: 'dragging-shapes',
        pointerId: event.pointerId,
        leadShapeId: shapeId,
        shapeIds: nextSelectedIds,
        startCanvasPoint: screenToCanvas(getLocalPoint(event.clientX, event.clientY), viewport),
        startShapePositions,
        previewPositions: startShapePositions,
        guides: [],
      });
    },
    [capturePointer, document.shapes, getLocalPoint, selectedShapeIds, shapeMap, viewport],
  );

  const handleResizeHandlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, shapeId: string, handle: ResizeHandle) => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      const shape = shapeMap.get(shapeId);

      if (!shape) {
        return;
      }

      capturePointer(event.pointerId);
      setInteraction({
        mode: 'resizing-shape',
        pointerId: event.pointerId,
        shapeId,
        handle,
        startCanvasPoint: screenToCanvas(getLocalPoint(event.clientX, event.clientY), viewport),
        startRect: shapeToRect(shape),
        previewRect: shapeToRect(shape),
        guides: [],
      });
    },
    [capturePointer, getLocalPoint, shapeMap, viewport],
  );

  const renderedShapes = useMemo(
    () =>
      document.shapes.map((shape) => {
        if (interaction.mode === 'dragging-shapes') {
          const previewPosition = interaction.previewPositions[shape.id];

          if (previewPosition) {
            return {
              id: shape.id,
              type: shape.type,
              width: shape.width,
              height: shape.height,
              color: shape.color,
              groupId: shape.groupId,
              x: previewPosition.x,
              y: previewPosition.y,
            };
          }
        }

        if (interaction.mode === 'resizing-shape' && interaction.shapeId === shape.id) {
          return {
            id: shape.id,
            type: shape.type,
            color: shape.color,
            groupId: shape.groupId,
            x: interaction.previewRect.x,
            y: interaction.previewRect.y,
            width: interaction.previewRect.width,
            height: interaction.previewRect.height,
          };
        }

        return shape;
      }),
    [document.shapes, interaction],
  );

  const activeGuides =
    interaction.mode === 'dragging-shapes' || interaction.mode === 'resizing-shape'
      ? interaction.guides
      : [];
  const marqueeRect =
    interaction.mode === 'marquee'
      ? makeRectFromPoints(interaction.startCanvasPoint, interaction.currentCanvasPoint)
      : null;
  const selectedShapes = renderedShapes.filter((shape) => selectedShapeIds.includes(shape.id));
  const singleSelectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;
  const inspectorSummary = getInspectorSelectionSummary(selectedShapes);
  const selectionFrame = singleSelectedShape
    ? {
        shapeId: singleSelectedShape.id,
        x: singleSelectedShape.x,
        y: singleSelectedShape.y,
        width: singleSelectedShape.width,
        height: singleSelectedShape.height,
      }
    : null;
  const overlappingShapeIds = getOverlappingShapeIds(renderedShapes);
  const selectedGroupIds = getSelectedGroupIds(selectedShapeIds, document.shapes);
  const canUndo = history.past.length > 0 && interaction.mode === 'idle';
  const canRedo = history.future.length > 0 && interaction.mode === 'idle';
  const canAlign = selectedShapeIds.length >= 2 && interaction.mode === 'idle';
  const canDistribute = selectedShapeIds.length >= 3 && interaction.mode === 'idle';
  const canEditSelection = selectedShapeIds.length > 0 && interaction.mode === 'idle';
  const canGroup = selectedShapeIds.length >= 2 && interaction.mode === 'idle';
  const canUngroup = selectedGroupIds.length > 0 && interaction.mode === 'idle';
  const autosaveLabel = autosaveSnapshot
    ? `Autosaved ${new Date(autosaveSnapshot.savedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : 'No autosave available';

  return {
    worldRef,
    fileInputRef,
    renderedShapes,
    selectedShapeIds,
    overlappingShapeIds,
    activeGuides,
    marqueeRect,
    selectionFrame,
    interaction,
    viewport,
    gridSnapEnabled,
    worldStyle: {
      backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
      backgroundSize: `${GRID_SIZE * viewport.zoom}px ${GRID_SIZE * viewport.zoom}px`,
      cursor: isPanning || isDraggingShape || isResizingShape ? 'grabbing' : 'grab',
    },
    screenStyle: {
      transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
    },
    resizeHandles: RESIZE_HANDLES,
    menuProps: {
      autosaveLabel,
      canRestoreAutosave: Boolean(autosaveSnapshot),
      canEditSelection,
      canGroup,
      canUngroup,
      onOpenChange: setIsMenuOpen,
      onNewDocument: runNewDocument,
      onExportDocument: runExportDocument,
      onImportDocument: runImportDocument,
      onRestoreAutosave: runRestoreAutosave,
      onClearAutosave: runClearAutosave,
      onDuplicateSelection: runDuplicateSelection,
      onDeleteSelection: runDeleteSelection,
      onGroupSelection: runGroupSelection,
      onUngroupSelection: runUngroupSelection,
    },
    toolbarProps: {
      canUndo,
      canRedo,
      canAlign,
      canDistribute,
      canLayer: canEditSelection,
      gridSnapEnabled,
      onUndo: runUndo,
      onRedo: runRedo,
      onAlign: runAlignAction,
      onDistribute: runDistributeAction,
      onLayerOrder: runLayerOrderAction,
      onToggleGridSnap: toggleGridSnap,
    },
    inspectorProps: {
      summary: inspectorSummary,
      disabled: interaction.mode !== 'idle',
      minWidth: MIN_SHAPE_WIDTH,
      minHeight: MIN_SHAPE_HEIGHT,
      canLayer: canEditSelection,
      onPatchSelection: runPatchSelection,
      onLayerOrder: runLayerOrderAction,
    },
    handleImportFileChange,
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleShapePointerDown,
    handleResizeHandlePointerDown,
  };
}

function shapeToRect(shape: Shape): Rect {
  return {
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
  };
}

function applyGridResizeSnap(
  rect: Rect,
  handle: ResizeHandle,
  hasVerticalGuide: boolean,
  hasHorizontalGuide: boolean,
): Rect {
  let nextRect = { ...rect };

  if (!hasVerticalGuide) {
    if (handle.includes('e')) {
      const snappedRight = snapValueToGrid(rect.x + rect.width, GRID_SIZE);
      nextRect.width = Math.max(MIN_SHAPE_WIDTH, snappedRight - rect.x);
    } else if (handle.includes('w')) {
      const right = rect.x + rect.width;
      const snappedLeft = snapValueToGrid(rect.x, GRID_SIZE);
      nextRect.x = Math.min(snappedLeft, right - MIN_SHAPE_WIDTH);
      nextRect.width = right - nextRect.x;
    }
  }

  if (!hasHorizontalGuide) {
    if (handle.includes('s')) {
      const snappedBottom = snapValueToGrid(rect.y + rect.height, GRID_SIZE);
      nextRect.height = Math.max(MIN_SHAPE_HEIGHT, snappedBottom - rect.y);
    } else if (handle.includes('n')) {
      const bottom = rect.y + rect.height;
      const snappedTop = snapValueToGrid(rect.y, GRID_SIZE);
      nextRect.y = Math.min(snappedTop, bottom - MIN_SHAPE_HEIGHT);
      nextRect.height = bottom - nextRect.y;
    }
  }

  return nextRect;
}
