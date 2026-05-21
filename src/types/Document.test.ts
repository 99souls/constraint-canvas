import { describe, expect, it } from 'vitest';

import {
  createInitialDocument,
  createInitialHistoryState,
  documentReducer,
  historyReducer,
} from './Document';

describe('documentReducer', () => {
  it('moves only the targeted shapes', () => {
    const document = createInitialDocument();

    const nextDocument = documentReducer(document, {
      type: 'moveShapes',
      positions: {
        '1': { x: 300, y: 320 },
      },
    });

    expect(nextDocument.shapes.find((shape) => shape.id === '1')).toMatchObject({
      x: 300,
      y: 320,
    });
    expect(nextDocument.shapes.find((shape) => shape.id === '2')).toMatchObject({
      x: 1600,
      y: 900,
    });
  });

  it('resizes the targeted shape', () => {
    const document = createInitialDocument();

    const nextDocument = documentReducer(document, {
      type: 'resizeShape',
      shapeId: '2',
      rect: { x: 1550, y: 880, width: 150, height: 120 },
    });

    expect(nextDocument.shapes.find((shape) => shape.id === '2')).toMatchObject({
      x: 1550,
      y: 880,
      width: 150,
      height: 120,
    });
  });

  it('adds and deletes shapes', () => {
    const document = createInitialDocument();

    const addedDocument = documentReducer(document, {
      type: 'addShapes',
      shapes: [
        {
          id: 'new-shape',
          type: 'rectangle',
          x: 10,
          y: 20,
          width: 30,
          height: 40,
          color: 'purple',
        },
      ],
    });

    expect(addedDocument.shapes.some((shape) => shape.id === 'new-shape')).toBe(true);

    const deletedDocument = documentReducer(addedDocument, {
      type: 'deleteShapes',
      shapeIds: ['new-shape'],
    });

    expect(deletedDocument.shapes.some((shape) => shape.id === 'new-shape')).toBe(false);
  });

  it('sets and clears shape group ids', () => {
    const document = createInitialDocument();

    const groupedDocument = documentReducer(document, {
      type: 'setShapeGroups',
      groupIdsByShapeId: {
        '1': 'group-alpha',
        '2': 'group-alpha',
      },
    });

    expect(groupedDocument.shapes.find((shape) => shape.id === '1')).toMatchObject({
      groupId: 'group-alpha',
    });

    const ungroupedDocument = documentReducer(groupedDocument, {
      type: 'setShapeGroups',
      groupIdsByShapeId: {
        '1': undefined,
      },
    });

    expect(ungroupedDocument.shapes.find((shape) => shape.id === '1')).not.toHaveProperty(
      'groupId',
    );
  });

  it('reorders shapes through the reducer', () => {
    const document = createInitialDocument();

    const nextDocument = documentReducer(document, {
      type: 'reorderShapes',
      shapeIds: ['1'],
      order: 'bring-to-front',
    });

    expect(nextDocument.shapes.map((shape) => shape.id)).toEqual(['2', '3', '1']);
  });

  it('patches multiple selected shapes', () => {
    const document = createInitialDocument();

    const nextDocument = documentReducer(document, {
      type: 'patchShapes',
      shapeIds: ['1', '2'],
      patch: {
        x: 42,
        color: '#123456',
      },
    });

    expect(nextDocument.shapes.find((shape) => shape.id === '1')).toMatchObject({
      x: 42,
      color: '#123456',
    });
    expect(nextDocument.shapes.find((shape) => shape.id === '2')).toMatchObject({
      x: 42,
      color: '#123456',
    });
  });
});

describe('historyReducer', () => {
  it('tracks document actions and supports undo/redo', () => {
    const initialHistory = createInitialHistoryState();

    const movedHistory = historyReducer(initialHistory, {
      type: 'document',
      action: {
        type: 'moveShapes',
        positions: {
          '1': { x: 250, y: 275 },
        },
      },
    });

    expect(movedHistory.past).toHaveLength(1);
    expect(movedHistory.present.shapes.find((shape) => shape.id === '1')).toMatchObject({
      x: 250,
      y: 275,
    });

    const undoneHistory = historyReducer(movedHistory, { type: 'undo' });

    expect(undoneHistory.present.shapes.find((shape) => shape.id === '1')).toMatchObject({
      x: 150,
      y: 150,
    });
    expect(undoneHistory.future).toHaveLength(1);

    const redoneHistory = historyReducer(undoneHistory, { type: 'redo' });

    expect(redoneHistory.present.shapes.find((shape) => shape.id === '1')).toMatchObject({
      x: 250,
      y: 275,
    });
  });

  it('does not create history entries for no-op actions', () => {
    const initialHistory = createInitialHistoryState();

    const nextHistory = historyReducer(initialHistory, {
      type: 'document',
      action: {
        type: 'moveShapes',
        positions: {
          '1': { x: 150, y: 150 },
        },
      },
    });

    expect(nextHistory).toBe(initialHistory);
  });
});
