# Constraint Canvas Review And Starting Point

## What I Reviewed

- `docs/initial/PRD.md`
- `docs/initial/PRODUCT_SCOPE.md`
- `docs/initial/TECH_APPROACH.md`

## Short Take

The docs are pointing toward a strong MVP, but the best first version is not a full constraint solver.

The most practical path is:

1. build a solid spatial editor first
2. treat constraints as smart actions and snap behavior in MVP
3. defer persistent constraint editing and deeper solver logic until the core interactions feel good

This matches the docs well and fits a minimum-dependency approach.

## Main Findings

### 1. The MVP boundary is still a little fuzzy

There is some tension between the product and technical docs around how much constraint UI belongs in the first version.

- `PRODUCT_SCOPE.md` includes a constraint sidebar in initial scope
- `PRD.md` says rule visibility matters
- `TECH_APPROACH.md` puts a constraint inspector later

Recommended call:

- do not build a full constraint inspector in MVP
- if needed, show lightweight rule visibility only, such as active snap guides or a tiny selection summary

### 2. Group resize is a complexity trap early on

One doc flow assumes users can resize groups while preserving internal spacing, but the technical approach correctly treats group resize as optional unless behavior is very clear.

Recommended call:

- support group move in MVP
- skip group resize for the first serious pass

### 3. Responsive behavior should stay out of MVP

The docs mention responsive reasoning as an appealing use case, but the PRD also excludes breakpoints from MVP.

Recommended call:

- keep the document model clean enough for responsive features later
- do not build breakpoints, reflow, or responsive presets in the first version

### 4. Overlap handling should be advisory, not automatic

The docs leave room for either preventing overlaps or highlighting them.

Recommended call:

- detect overlaps as derived state
- highlight them visually
- do not auto-push or auto-reflow elements yet

That is easier to reason about and less frustrating for users.

## What The Project Actually Is

At this stage, this project is best understood as a structured canvas editor with:

- pan and zoom
- canvas-space geometry
- drag and resize
- selection and marquee selection
- snap guides
- deterministic align and distribute actions
- simple grouping
- undo and redo
- local JSON persistence

That is already a meaningful and technically interesting product.

## Recommended Starting Point

Build the core editor before worrying about advanced constraints.

Suggested order:

1. viewport and coordinate transforms
2. block rendering
3. single selection
4. dragging
5. resizing
6. multi-select and marquee
7. snap guides
8. align and distribute actions
9. undo and redo
10. save and load JSON
11. grouping

If steps 1 through 8 feel good, the project has strong legs.

## First Vertical Slice

The best first slice is small but real:

1. a pan-and-zoom canvas
2. three hardcoded rectangles
3. stable canvas coordinates
4. single selection
5. drag with pointer capture
6. SVG guide overlay
7. one snap behavior: align to nearby element edges or centers

This will tell you very quickly whether the interaction model is satisfying.

## Minimum-Dependency Approach

Recommended stack:

- React
- TypeScript
- Vite
- Vitest

Recommended implementation style:

- `useReducer` for document actions
- plain React state for ephemeral interaction state
- raw Pointer Events instead of a drag-and-drop framework
- HTML for blocks
- SVG overlay for guides, handles, and selection chrome
- pure geometry and snapping modules outside the UI

Avoid early unless a real need emerges:

- `dnd-kit`
- `react-dnd`
- heavyweight canvas scene libraries
- global state libraries
- full constraint solver dependencies

## Why This Approach Makes Sense

It keeps the hard parts in your codebase instead of in opaque abstractions:

- coordinate math
- interaction semantics
- geometry
- snapping
- history
- deterministic state transitions

It also avoids getting trapped in drag-and-drop library assumptions that do not map well to a canvas editor.

## Suggested Architecture Shape

Keep the boundaries simple:

- `document`: persisted layout entities and document actions
- `viewport`: pan, zoom, and coordinate transforms
- `selection`: selected IDs, marquee behavior, selection bounds
- `geometry`: rect math, handles, intersections, distances
- `snapping`: candidate generation and resolution
- `history`: undo and redo with drag coalescing
- `rendering`: blocks, guides, overlays, handles

Important principle:

- persisted document state should stay in canvas space
- screen space should only exist in rendering and pointer mapping
- transient interaction previews should stay out of the document model

## Questions Worth Settling Before You Build Too Much

1. Is this MVP primarily a structured whiteboard, a dashboard planner, or a generic layout tool?
2. Are constraints in MVP just action-driven assistance, or do you want any persistent rules at all?
3. Do groups in MVP only move together, or do they need any stronger semantics?
4. Is overlap only a warning, or should some actions refuse to create overlaps?

My recommendation:

- frame MVP as a structured whiteboard or layout sketch tool
- keep constraints action-driven in MVP
- keep groups simple
- keep overlap advisory only

## Resources And Helpful Links

### Core Browser APIs

- MDN Pointer Events: <https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events>
- MDN `setPointerCapture`: <https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture>
- MDN `DOMMatrix`: <https://developer.mozilla.org/en-US/docs/Web/API/DOMMatrix>
- MDN SVG: <https://developer.mozilla.org/en-US/docs/Web/SVG>
- MDN `requestAnimationFrame`: <https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame>

### Reference Editors To Study

- Excalidraw repo: <https://github.com/excalidraw/excalidraw>
- tldraw repo: <https://github.com/tldraw/tldraw>
- tldraw site and docs: <https://www.tldraw.dev/>

Use these as reference material for editor architecture, input handling, and history behavior. Avoid importing their complexity into the first pass unless you discover a specific need.

### Constraint And Layout Reading For Later

- Kiwi constraint solver: <https://github.com/nucleic/kiwi>
- Cassowary overview: <https://en.wikipedia.org/wiki/Cassowary_(software)>
- Auto layout and constraints background: <https://www.objc.io/issues/3-views/advanced-auto-layout-toolbox/>

These are useful once you want persistent relationships such as equal spacing, alignment locks, or aspect-ratio rules. They are not the right starting point for the MVP.

### Testing Focus

- Vitest: <https://vitest.dev/>
- React Testing Library: <https://testing-library.com/docs/react-testing-library/intro/>
- Playwright: <https://playwright.dev/>

Prioritize tests for:

- coordinate transforms
- snapping resolution
- align and distribute actions
- overlap detection
- undo and redo correctness

Use browser-level tests for a smaller number of critical flows such as drag, guides appearing, and marquee selection.

## Recommended Immediate Next Step

Start by building a tiny but correct editor shell:

1. Vite + React + TypeScript app
2. full-screen canvas surface
3. viewport transform model
4. hardcoded rectangles in canvas space
5. pointer-driven single-item drag
6. SVG overlay for guides

If that feels clean, continue deeper. If that already feels messy, fix the architecture before adding features.

## Bottom Line

The docs support a low-dependency build path.

You do not need off-the-shelf drag-and-drop or constraint tooling to get a compelling MVP. In fact, avoiding them early is probably the better move. The first win is making the editor feel trustworthy, smooth, and understandable. The advanced constraint story can come after that.
