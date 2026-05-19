import type { Shape } from "./Shape";

export type CanvasDocument = {
  shapes: Shape[];
};

export type MoveShapesAction = {
  type: "moveShapes";
  positions: Record<string, { x: number; y: number }>;
};

export type DocumentAction = MoveShapesAction;

export type DocumentHistory = {
  past: CanvasDocument[];
  present: CanvasDocument;
  future: CanvasDocument[];
};

export type HistoryAction =
  | {
      type: "document";
      action: DocumentAction;
    }
  | {
      type: "undo";
    }
  | {
      type: "redo";
    };

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

export function createInitialDocument(): CanvasDocument {
  return {
    shapes: INITIAL_SHAPES,
  };
}

export function createInitialHistoryState(): DocumentHistory {
  return {
    past: [],
    present: createInitialDocument(),
    future: [],
  };
}

export function documentReducer(
  document: CanvasDocument,
  action: DocumentAction,
): CanvasDocument {
  switch (action.type) {
    case "moveShapes": {
      let didChange = false;

      const nextShapes = document.shapes.map((shape) => {
        const nextPosition = action.positions[shape.id];

        if (!nextPosition) {
          return shape;
        }

        if (shape.x === nextPosition.x && shape.y === nextPosition.y) {
          return shape;
        }

        didChange = true;

        return {
          ...shape,
          x: nextPosition.x,
          y: nextPosition.y,
        };
      });

      if (!didChange) {
        return document;
      }

      return {
        ...document,
        shapes: nextShapes,
      };
    }
  }
}

export function historyReducer(
  history: DocumentHistory,
  action: HistoryAction,
): DocumentHistory {
  switch (action.type) {
    case "document": {
      const nextDocument = documentReducer(history.present, action.action);

      if (nextDocument === history.present) {
        return history;
      }

      return {
        past: [...history.past, history.present],
        present: nextDocument,
        future: [],
      };
    }
    case "undo": {
      const previous = history.past[history.past.length - 1];

      if (!previous) {
        return history;
      }

      return {
        past: history.past.slice(0, -1),
        present: previous,
        future: [history.present, ...history.future],
      };
    }
    case "redo": {
      const next = history.future[0];

      if (!next) {
        return history;
      }

      return {
        past: [...history.past, history.present],
        present: next,
        future: history.future.slice(1),
      };
    }
  }
}
