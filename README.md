# Constraint Canvas

Constraint Canvas is a small browser-based layout editor for experimenting with rectangle positioning, selection, snapping, alignment, grouping, and document persistence.

The app is built with Bun, React 19, TypeScript, and Vitest. It runs as a Bun-served single-page application with the editor mounted from `src/index.html`.

## Features

- Pan and zoom an infinite-feeling canvas.
- Select rectangles directly or with a marquee selection.
- Move, resize, duplicate, delete, group, and ungroup selections.
- Snap movement and resizing to a 40px grid and nearby shape edges/centers.
- Align and distribute multiple selected shapes.
- Reorder layers with bring forward/backward and send to front/back controls.
- Edit selection geometry and fill color from the floating inspector.
- Undo and redo document edits.
- Autosave to `localStorage` and import/export versioned JSON documents.

## Requirements

- [Bun](https://bun.sh/)

## Getting Started

Install dependencies:

```bash
bun install
```

Start the development server with hot reload:

```bash
bun dev
```

Build the production bundle:

```bash
bun run build
```

Run the production server:

```bash
bun start
```

## Quality Checks

Run these before considering a change complete:

```bash
bun fmt
bun lint
bun typecheck
bun run test
```

Use `bun run test`, not `bun test`; the project test script runs Vitest.

## Editor Controls

- Drag empty canvas: pan.
- Mouse wheel: zoom around the pointer.
- Click a shape: select it and start dragging.
- Shift-click a shape: add or remove it from the selection.
- Shift-drag empty canvas: marquee select.
- Drag resize handles: resize a single selected shape.
- Arrow keys: nudge the current selection by 1px.
- Shift + Arrow keys: nudge by 10px.
- Delete or Backspace: delete the current selection.
- Escape: clear selection.
- Cmd/Ctrl + A: select all shapes.
- Cmd/Ctrl + D: duplicate selection.
- Cmd/Ctrl + G: group selection.
- Cmd/Ctrl + Shift + G: ungroup selection.
- Cmd/Ctrl + Z: undo.
- Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y: redo.
- Cmd/Ctrl + S: export the document as JSON.
- Cmd/Ctrl + O: import a JSON document.

## Document Format

Exported documents are JSON and currently use document version `1`:

```json
{
  "version": 1,
  "document": {
    "shapes": [
      {
        "id": "1",
        "type": "rectangle",
        "x": 150,
        "y": 150,
        "width": 200,
        "height": 100,
        "color": "red"
      }
    ]
  }
}
```

Grouped rectangles include a `groupId` string. Autosave uses the same document shape and is stored under `constraint-canvas.autosave.v1` in browser `localStorage`.

## Project Structure

- `src/index.ts`: Bun server entry point.
- `src/index.html`: browser entry point used by Bun's bundler.
- `src/frontend.tsx`: React root setup.
- `src/App.tsx`: app shell.
- `src/components/Canvas.tsx`: canvas rendering and component composition.
- `src/components/useCanvasEditor.ts`: editor state, interactions, history, persistence wiring, and shortcuts.
- `src/components/CanvasToolbar.tsx`: toolbar controls.
- `src/components/DocumentMenu.tsx`: document and selection menu actions.
- `src/components/SelectionInspectorCard.tsx`: floating selection inspector.
- `src/lib/`: pure editor logic for geometry, snapping, layout, layering, selection, color, and persistence.
- `src/types/`: shared document, shape, and viewport types.
- `specs/`: feature notes and design specs.

## Notes

The canvas currently works with rectangle shapes only. The sample initial document contains three rectangles so editor behavior is visible immediately after launch.
