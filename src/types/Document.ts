import { reorderShapes, type LayerOrderAction } from '../lib/layering';
import type { Shape } from './Shape';

export type CanvasDocument = {
  shapes: Shape[];
};

export type MoveShapesAction = {
  type: 'moveShapes';
  positions: Record<string, { x: number; y: number }>;
};

export type AddShapesAction = {
  type: 'addShapes';
  shapes: Shape[];
};

export type DeleteShapesAction = {
  type: 'deleteShapes';
  shapeIds: string[];
};

export type ReorderShapesAction = {
  type: 'reorderShapes';
  shapeIds: string[];
  order: LayerOrderAction;
};

export type PatchShapesAction = {
  type: 'patchShapes';
  shapeIds: string[];
  patch: Partial<Pick<Shape, 'x' | 'y' | 'width' | 'height' | 'color'>>;
};

export type ResizeShapeAction = {
  type: 'resizeShape';
  shapeId: string;
  rect: { x: number; y: number; width: number; height: number };
};

export type SetShapeGroupsAction = {
  type: 'setShapeGroups';
  groupIdsByShapeId: Record<string, string | undefined>;
};

export type LoadDocumentAction = {
  type: 'loadDocument';
  document: CanvasDocument;
};

export type DocumentAction =
  | MoveShapesAction
  | AddShapesAction
  | DeleteShapesAction
  | ReorderShapesAction
  | PatchShapesAction
  | ResizeShapeAction
  | SetShapeGroupsAction
  | LoadDocumentAction;

export type DocumentHistory = {
  past: CanvasDocument[];
  present: CanvasDocument;
  future: CanvasDocument[];
};

export type HistoryAction =
  | {
      type: 'document';
      action: DocumentAction;
    }
  | {
      type: 'undo';
    }
  | {
      type: 'redo';
    };

const INITIAL_SHAPES: Shape[] = [
  {
    id: '1',
    type: 'rectangle',
    x: 150,
    y: 150,
    width: 200,
    height: 100,
    color: 'red',
  },
  {
    id: '2',
    type: 'rectangle',
    x: 1600,
    y: 900,
    width: 100,
    height: 100,
    color: 'blue',
  },
  {
    id: '3',
    type: 'rectangle',
    x: 900,
    y: 500,
    width: 100,
    height: 200,
    color: 'green',
  },
];

export function createInitialDocument(): CanvasDocument {
  return cloneDocument({
    shapes: INITIAL_SHAPES,
  });
}

export function createHistoryState(
  document: CanvasDocument = createInitialDocument(),
): DocumentHistory {
  return {
    past: [],
    present: cloneDocument(document),
    future: [],
  };
}

export function createInitialHistoryState(): DocumentHistory {
  return createHistoryState();
}

export function documentReducer(document: CanvasDocument, action: DocumentAction): CanvasDocument {
  switch (action.type) {
    case 'loadDocument': {
      return cloneDocument(action.document);
    }
    case 'addShapes': {
      if (action.shapes.length === 0) {
        return document;
      }

      return {
        ...document,
        shapes: [...document.shapes, ...action.shapes.map(cloneShape)],
      };
    }
    case 'deleteShapes': {
      const nextShapes = document.shapes.filter((shape) => !action.shapeIds.includes(shape.id));

      if (nextShapes.length === document.shapes.length) {
        return document;
      }

      return {
        ...document,
        shapes: nextShapes,
      };
    }
    case 'reorderShapes': {
      const nextShapes = reorderShapes(document.shapes, action.shapeIds, action.order);

      if (nextShapes.every((shape, index) => shape === document.shapes[index])) {
        return document;
      }

      return {
        ...document,
        shapes: nextShapes,
      };
    }
    case 'patchShapes': {
      if (action.shapeIds.length === 0 || Object.keys(action.patch).length === 0) {
        return document;
      }

      const selectedShapeIds = new Set(action.shapeIds);
      let didChange = false;

      const nextShapes = document.shapes.map((shape) => {
        if (!selectedShapeIds.has(shape.id)) {
          return shape;
        }

        const nextShape = {
          ...shape,
          ...action.patch,
        };

        if (
          nextShape.x === shape.x &&
          nextShape.y === shape.y &&
          nextShape.width === shape.width &&
          nextShape.height === shape.height &&
          nextShape.color === shape.color
        ) {
          return shape;
        }

        didChange = true;
        return nextShape;
      });

      if (!didChange) {
        return document;
      }

      return {
        ...document,
        shapes: nextShapes,
      };
    }
    case 'moveShapes': {
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
    case 'resizeShape': {
      let didChange = false;

      const nextShapes = document.shapes.map((shape) => {
        if (shape.id !== action.shapeId) {
          return shape;
        }

        if (
          shape.x === action.rect.x &&
          shape.y === action.rect.y &&
          shape.width === action.rect.width &&
          shape.height === action.rect.height
        ) {
          return shape;
        }

        didChange = true;

        return {
          ...shape,
          x: action.rect.x,
          y: action.rect.y,
          width: action.rect.width,
          height: action.rect.height,
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
    case 'setShapeGroups': {
      let didChange = false;

      const nextShapes = document.shapes.map((shape) => {
        if (!Object.hasOwn(action.groupIdsByShapeId, shape.id)) {
          return shape;
        }

        const nextGroupId = action.groupIdsByShapeId[shape.id];

        if (shape.groupId === nextGroupId) {
          return shape;
        }

        didChange = true;

        if (nextGroupId === undefined) {
          const { groupId: _groupId, ...shapeWithoutGroup } = shape;
          return shapeWithoutGroup;
        }

        return {
          ...shape,
          groupId: nextGroupId,
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

export function historyReducer(history: DocumentHistory, action: HistoryAction): DocumentHistory {
  switch (action.type) {
    case 'document': {
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
    case 'undo': {
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
    case 'redo': {
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

function cloneShape(shape: Shape): Shape {
  return {
    ...shape,
  };
}

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return {
    shapes: document.shapes.map(cloneShape),
  };
}
