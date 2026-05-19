# Constraint Canvas Technical Approach

## Objective

Translate the product brief into a frontend architecture that supports rich canvas interactions, deterministic state transitions, and a clear path toward more advanced constraint behaviour.

## Technical Goals

1. Keep the core editor state deterministic and inspectable
2. Separate source document state from transient interaction state
3. Make geometry and snapping logic testable outside the UI
4. Preserve smooth interaction under drag, resize, pan, and zoom
5. Avoid over-engineering a full generic constraint solver too early

## Recommended Frontend Shape

Suggested stack direction:

1. React + TypeScript
2. SVG or HTML/CSS canvas-style rendering for the MVP
3. A reducer-driven state model for document edits
4. Pure utility modules for geometry, snapping, and layout actions
5. A lightweight store if needed, but avoid unnecessary abstraction early

This project is interaction-heavy, so correctness of state and geometry matters more than framework novelty.

## Architectural Principles

1. Source of truth first
   Persist only document state that represents the layout itself.

2. Derived data second
   Compute guides, snap candidates, selection bounds, and overlap warnings from source state.

3. Ephemeral interaction state separately
   Pointer drag state, marquee rectangles, hover guides, and temporary previews should not pollute the document model.

4. Action-based document updates
   Align, distribute, group, move, resize, and load operations should be explicit state transitions.

5. Solver-lite for MVP
   Treat the initial system as rule-assisted editing, not a full declarative constraint engine.

## Recommended Module Boundaries

### `document`

Owns persisted entities and document-level actions.

Examples:

1. create element
2. move element
3. resize element
4. group selection
5. delete element
6. load document

### `viewport`

Owns pan, zoom, coordinate transforms, and screen-to-canvas conversions.

### `selection`

Owns selection sets, marquee selection, selection bounds, and selection affordances.

### `geometry`

Pure helpers for rectangles, intersections, distances, bounding boxes, handles, and guide calculations.

### `snapping`

Pure logic for snap candidate generation and snap resolution.

### `history`

Undo and redo stacks plus operation coalescing.

### `rendering`

Canvas surface, overlays, guides, selection chrome, and interaction handles.

## Suggested Data Model

### Document

```ts
type DocumentModel = {
  id: string
  name: string
  elements: Record<string, ElementModel>
  groups: Record<string, GroupModel>
  rootOrder: string[]
}
```

### Element

```ts
type ElementModel = {
  id: string
  type: "block"
  x: number
  y: number
  width: number
  height: number
  lockedPosition: boolean
  lockedSize: boolean
  parentGroupId?: string
}
```

### Group

```ts
type GroupModel = {
  id: string
  childIds: string[]
}
```

### View State

```ts
type ViewState = {
  zoom: number
  panX: number
  panY: number
  selectedIds: string[]
}
```

### Interaction State

```ts
type InteractionState = {
  mode: "idle" | "dragging" | "resizing" | "marquee" | "panning"
  pointerStart?: Point
  pointerCurrent?: Point
  dragSnapshot?: DragSnapshot
  activeGuides: Guide[]
}
```

## Coordinate System

Use a stable canvas coordinate system independent of screen pixels.

Requirements:

1. All persisted element positions and sizes live in canvas space.
2. Pointer events are transformed from viewport space into canvas space.
3. Zoom and pan affect rendering and pointer mapping, not document coordinates.

This is critical. Many canvas editors become fragile when coordinate concerns leak into document state.

## Rendering Strategy

For MVP, prefer the simplest rendering approach that still gives precise control.

Options:

1. Absolutely positioned HTML elements inside a transformed canvas layer
2. SVG for element outlines, guides, and overlays
3. Hybrid approach where blocks are HTML and guides/selection overlays are SVG

Recommended MVP path:

1. use HTML for blocks if you want easier future content rendering
2. use SVG overlay for guides, bounds, and handles

This tends to be a good balance between flexibility and implementation clarity.

## Interaction Model

### Pointer Down

1. determine hit target
2. update selection if needed
3. capture starting geometry snapshot
4. enter interaction mode

### Pointer Move

1. convert pointer to canvas coordinates
2. compute proposed geometry from snapshot
3. compute snap candidates
4. resolve snapped geometry
5. update ephemeral preview state

### Pointer Up

1. commit final document action
2. push a single history entry
3. clear transient interaction state

This approach avoids spamming document state on every raw movement event.

## Snapping Strategy

For MVP, snapping should be advisory and interaction-local rather than permanently enforced.

Suggested snap sources:

1. canvas origin or preset guides
2. sibling element edges
3. sibling element centers
4. selection bounding box edges

Suggested behaviour:

1. compute all nearby candidates within threshold
2. rank by proximity and priority
3. choose the most relevant horizontal and vertical snaps independently
4. render the chosen guides visibly

Important rule:

Do not try to solve all constraints globally during MVP drag interactions.

## Alignment and Distribution Actions

Treat these as deterministic batch transforms.

Examples:

1. align left: set all selected element `x` to the minimum selected `x`
2. align vertical center: set each center `x` to the selection center
3. distribute horizontally: sort selected elements by `x`, preserve total outer span, equalize gaps

These functions should live in pure modules and be tested directly.

## Grouping Model

For MVP, groups should behave as logical collections rather than full layout containers.

Recommended rules:

1. a group move offsets all descendants equally
2. group resize is optional for MVP unless behaviour is very clear
3. editing a child inside a group should still be possible via explicit selection behaviour

Avoid introducing parent-driven reflow in the first version.

## Overlap Handling

Recommended MVP behaviour:

1. detect overlaps as derived state
2. highlight overlap warnings visually
3. do not forcibly resolve overlaps yet

This is easier to reason about and less frustrating than auto-pushing elements around.

## Undo and Redo

History should operate on committed document actions, not raw pointer frames.

Recommendations:

1. store pre- and post-action snapshots or reversible patches
2. coalesce drag and resize into one history entry per interaction
3. keep load and delete actions reversible where practical

## Persistence

Start with local JSON export/import.

Recommendations:

1. version the document schema from day one
2. validate imported JSON before hydration
3. isolate persistence adapters from document reducers

## Testing Strategy

The hard parts of this project are mostly not visual styling. They are geometry and state transitions.

Prioritize tests for:

1. coordinate transforms
2. snapping candidate selection
3. alignment actions
4. distribution actions
5. grouping transforms
6. overlap detection
7. undo and redo correctness

Use UI-level tests for a smaller set of critical behaviours:

1. drag interaction commits expected geometry
2. guides appear during snapping
3. marquee selection selects expected elements

## Performance Considerations

1. Keep transient pointer updates lightweight.
2. Derive only what is needed for the current frame.
3. Avoid re-rendering unrelated panels during drag.
4. Consider throttling or `requestAnimationFrame` coordination if raw event volume becomes noisy.
5. Introduce virtualization only if canvas density actually demands it.

Do not prematurely optimize around thousands of elements unless that is a real product target.

## Accessibility Considerations

Even for a visual editor, accessibility still matters.

Baseline expectations:

1. keyboard access for selection and common actions
2. visible focus states
3. non-color-only guide and warning cues where possible
4. command palette or shortcut list later if the product deepens

## Suggested Delivery Phases

### Phase 1: Foundations

1. App shell
2. Document model
3. Canvas viewport
4. Basic block rendering
5. Selection

### Phase 2: Core Editing

1. Dragging
2. Resizing
3. Snap guides
4. Undo and redo

### Phase 3: Structured Editing

1. Align and distribute actions
2. Grouping
3. Overlap warnings
4. Save and load

### Phase 4: Deepening the Product

1. Constraint inspector
2. Persistent rules
3. Keyboard-first workflows
4. Responsive presets

## Important Tradeoffs

1. A full generic constraint engine is intellectually appealing but risky for an MVP.
2. Action-driven layout assistance will likely produce a better first user experience.
3. Group semantics should stay simple until users clearly need container reflow.
4. Rendering complexity should follow actual needs, not imagined scale.

## Recommended MVP Definition

From a technical perspective, MVP is successful if:

1. the editor model remains clean and debuggable
2. drag and resize feel good
3. snap and alignment behaviour feel trustworthy
4. history is reliable
5. the codebase leaves room for richer constraint features later

## Future Extension Paths

If the MVP lands well, the architecture should allow:

1. auto-layout containers
2. persistent spacing and alignment constraints
3. responsive layout presets
4. JSON schema export for app builders
5. multi-user document sync
