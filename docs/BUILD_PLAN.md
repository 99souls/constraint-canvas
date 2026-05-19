# Constraint Canvas Build Plan

## Goal

Ship a narrow MVP that proves the editor feels good before investing in persistent constraints, responsive behavior, or heavier architecture.

The core bet is:

1. direct manipulation can feel fast and trustworthy
2. rule-assisted editing is useful even without a full solver
3. a small, clean architecture will support deeper constraint features later

## Delivery Strategy

Build in vertical slices, but keep the underlying geometry and state transitions testable outside the UI.

Working rules:

- keep persisted state in canvas coordinates
- keep transient interaction state out of the document model
- commit document changes on interaction end, not every raw pointer frame
- prefer explicit actions over clever hidden behavior
- treat constraints as guidance first, persistence later

## Suggested Stack

- React
- TypeScript
- Vite
- Vitest

Avoid at the start:

- drag-and-drop frameworks
- heavyweight canvas engines
- global state libraries
- full constraint solver dependencies

## Plain-English Glossary

This section exists to turn the plan language into actual implementation guidance.

### What is a full-screen shell?

A full-screen shell is just the outer app layout that fills the browser window.

In practice, that usually means:

- the app takes up `100vw` and `100vh`
- there is one main editor region that fills most of the page
- there may also be a sidebar or top bar for controls later

For this project, the shell does not need to be fancy. The goal is just to create a stable place where the canvas can live.

The minimum useful shell is:

1. a root container that fills the screen
2. a main canvas surface that stretches to fill available space
3. optional small HUD text showing zoom, selection, or debug info

### What is the canvas surface?

The canvas surface is the interactive area where blocks appear and where pan, zoom, drag, and selection happen.

It is not necessarily an HTML `<canvas>` element.

For MVP, the simplest version is usually:

- a large `<div>` that receives pointer and wheel events
- HTML elements for the blocks
- an SVG overlay for guides and selection outlines

That gives you straightforward DOM rendering while still letting you draw editor-style lines and overlays cleanly.

### What are canvas coordinates?

Canvas coordinates are the "real" positions of your blocks inside the document.

Example:

- a block might live at `x: 300, y: 180, width: 200, height: 120`
- those numbers should mean the same thing no matter how zoomed in or out the user is

This matters because zoom and pan are view concerns, not document concerns.

Bad approach:

- storing screen pixels after zoom in the document model

Good approach:

- storing stable canvas-space values in the document
- converting pointer positions from screen space into canvas space before using them

### What is a vertical slice?

A vertical slice is a tiny but complete piece of the product.

It is not just one utility function and not just one UI mockup. It should be something you can run and interact with.

For this project, a good first vertical slice is:

1. open the app
2. see a canvas and a few blocks
3. click a block
4. drag it around
5. see snap guides appear

That is enough to validate whether the editor feels promising.

## Core Modules Explained

These modules are not about bureaucracy. They are just a way to keep different kinds of logic from getting mixed together.

### `document`

Responsibility:

- owns the saved layout data
- defines what a block is
- defines actions that change the saved layout

This is where you put things like:

- `DocumentModel`
- `ElementModel`
- `createElement`
- `moveElement`
- `resizeElement`
- `deleteElement`

Important rule:

- `document` should not care about the current mouse position, hover state, or temporary drag preview details

How to implement it:

1. start with a plain TypeScript type for the document
2. add a reducer or a set of pure functions that take the old document and return the new one
3. keep the functions deterministic so the same input always gives the same output

Good mental model:

- `document` is the saved truth

### `viewport`

Responsibility:

- owns zoom and pan
- converts between screen space and canvas space

This is where you put things like:

- current zoom level
- current pan offset
- `screenToCanvas()`
- `canvasToScreen()`

Why it matters:

- if viewport math is sloppy, every interaction will feel wrong

How to implement it:

1. store `zoom`, `panX`, and `panY`
2. when the mouse moves, convert the pointer position into canvas coordinates before doing geometry math
3. when rendering blocks, apply the viewport transform so they appear in the right place on screen

Good mental model:

- `viewport` is the camera looking at the document

### `geometry`

Responsibility:

- owns reusable math helpers
- knows nothing about React and nothing about the UI tree

This is where you put things like:

- rectangle intersection checks
- bounding boxes
- center-point calculations
- resize handle positions
- distance calculations
- translation helpers

How to implement it:

1. define small pure functions that take numbers in and return numbers out
2. keep them boring and testable
3. resist the temptation to mix event handling into these helpers

Good mental model:

- `geometry` is the math toolbox

### `snapping`

Responsibility:

- figures out whether a moving element should snap to something nearby
- decides which guide lines to show

This is where you put things like:

- candidate generation for nearby edges and centers
- snap threshold checks
- ranking the nearest valid candidate
- guide line output

How to implement it:

1. take the moving rectangle as input
2. take the stationary rectangles as input
3. compare moving edges and centers against nearby target edges and centers
4. if a candidate is within threshold, compute the delta needed to line things up
5. choose the best horizontal snap and the best vertical snap
6. return both the snapped geometry and the guides to render

Important rule:

- `snapping` should advise a drag or resize interaction, not mutate the document directly

Good mental model:

- `snapping` is a suggestion engine for alignment

### `selection`

Responsibility:

- tracks what the user currently has selected
- later owns marquee selection and selection bounds

Early on, this can be very small:

- `selectedId: string | null`

Later, it grows into:

- `selectedIds: string[]`
- marquee rectangle state
- helper functions for selection bounds

Good mental model:

- `selection` is what the user is currently acting on

### `history`

Responsibility:

- supports undo and redo
- stores committed changes, not every tiny move frame

How to implement it:

1. keep a `past`, `present`, and `future`
2. when an action is committed, push the old state into `past`
3. when undo is used, move the current state into `future` and restore the last past state

Important rule:

- a drag should usually create one history entry, not hundreds

Good mental model:

- `history` is time travel for committed edits

### `rendering`

Responsibility:

- turns state into visible UI
- draws blocks, guides, overlays, and handles

It should mainly answer:

- what should appear on screen right now?

It should not be where your geometry rules live.

Good mental model:

- `rendering` is the presentation layer

## How The Pieces Work Together

This is the simplest useful data flow:

1. pointer event happens on the canvas surface
2. `viewport` converts screen coordinates into canvas coordinates
3. interaction code computes a proposed move or resize
4. `snapping` adjusts that proposal if there is a nearby guide target
5. `rendering` shows the preview and any active guides
6. on pointer up, `document` commits the final change
7. `history` records that committed action

That flow is the heart of the editor.

## Milestone 0 Explained In More Concrete Terms

When the plan says:

- scaffold Vite + React + TypeScript
- add base CSS and full-screen shell
- add document, viewport, geometry, and snapping modules

it really means this:

### 1. Get the app booting

You want the smallest possible React app that renders reliably in the browser.

Done means:

- there is a root React entry point
- there is one top-level `App` component
- the browser shows something stable

### 2. Make the page fill the browser cleanly

You want:

- `html`, `body`, and the root element to fill the viewport
- no weird default margins
- one main editor area that can receive pointer events

Done means:

- you have a predictable area to build the editor in

### 3. Create the initial state shapes before fancy UI

Even before real interactions, define the shapes of the data you expect.

Example categories:

- document data: blocks and their positions
- viewport data: zoom and pan
- interaction data: dragging, resizing, marquee, or idle

Done means:

- you can describe the editor state clearly in TypeScript before building lots of UI around it

### 4. Write a few pure helper functions early

Before building lots of drag code, it helps to have a few small utilities such as:

- convert screen point to canvas point
- get rectangle center
- offset a rectangle by a delta
- choose the nearest snap candidate

Done means:

- your event handlers stay smaller and your math is easier to test

### 5. Add one small test around snapping or geometry

This is not about chasing test coverage numbers.

It is about proving the project setup supports testing the hard logic outside the UI.

Good first tests:

- when a left edge is 4 pixels from another left edge, it snaps
- when an edge is outside the threshold, it does not snap

## What To Build First, In Human Terms

If you are staring at a blank repo and wondering what to do first, do this:

1. make the browser show a full-page app shell
2. render one large editor area with a subtle background
3. hardcode two or three blocks with `x`, `y`, `width`, and `height`
4. render those blocks using absolute positioning inside the editor area
5. add a zoom value and pan values to state
6. add one helper that converts mouse position to canvas position
7. make background dragging pan the camera
8. make mouse wheel zoom in and out
9. make clicking a block select it
10. make dragging a selected block move it
11. add one snap rule and draw one guide line

That is enough to start learning from the product instead of just planning it.

## Milestone 0: Project Shell

Outcome:

- app boots
- full-screen editor surface renders
- TypeScript and tests are wired

Tasks:

1. scaffold Vite + React + TypeScript
2. add base CSS and full-screen shell
3. add document, viewport, geometry, and snapping modules
4. add one test file for pure snapping logic

Exit criteria:

- `npm run dev` starts cleanly
- `npm run test` runs at least one passing unit test

## Milestone 1: Viewport Foundations

Outcome:

- stable canvas-space coordinate system
- pan and zoom work predictably

Tasks:

1. define canvas and viewport types
2. implement screen-to-canvas and canvas-to-screen transforms
3. add wheel zoom around cursor
4. add background drag panning
5. verify positions do not drift while zoom changes

Exit criteria:

- blocks stay in the same canvas coordinates regardless of zoom level
- pointer math remains correct while panning and zooming

## Milestone 2: Basic Elements And Selection

Outcome:

- rectangular blocks render from document state
- single selection works clearly

Tasks:

1. define `DocumentModel` and `ElementModel`
2. render a few hardcoded blocks from reducer state
3. add selected styling
4. clear selection on empty-canvas pointer down

Exit criteria:

- selected block is visually obvious
- no view logic leaks into persisted element coordinates

## Milestone 3: Dragging

Outcome:

- selected blocks can be dragged smoothly
- raw motion previews do not spam committed state

Tasks:

1. capture drag start snapshot
2. update transient preview state on pointer move
3. commit a single move action on pointer up
4. keep drag logic separate from block rendering

Exit criteria:

- dragging feels smooth at common zoom levels
- final committed coordinates match preview result

## Milestone 4: Resizing

Outcome:

- a selected block can be resized predictably

Tasks:

1. add visible resize handles
2. implement handle hit targets in canvas space
3. compute resized geometry from snapshot + pointer delta
4. enforce a simple minimum size

Exit criteria:

- resize direction matches handle used
- size updates remain stable under zoom

## Milestone 5: Snap Guides

Outcome:

- drag and resize receive lightweight alignment assistance

Tasks:

1. define snap candidates from sibling edges and centers
2. convert snap threshold from screen units into canvas units
3. resolve horizontal and vertical snaps independently
4. render clear guide lines during active snapping

Exit criteria:

- snap behavior feels predictable, not sticky or random
- users can infer why snapping happened from the overlay

## Milestone 6: Multi-Select And Marquee

Outcome:

- users can select multiple blocks and prepare for batch actions

Tasks:

1. expand selection model from single ID to selected ID set
2. add additive selection semantics
3. add marquee rectangle in canvas space
4. compute selection bounds as derived state

Exit criteria:

- marquee behavior is understandable
- selection bounds remain correct under zoom and pan

## Milestone 7: Align And Distribute

Outcome:

- selected items can be cleaned up quickly with deterministic actions

Tasks:

1. implement align left, right, top, bottom
2. implement align horizontal center and vertical center
3. implement distribute horizontally and vertically
4. test the pure action helpers directly

Exit criteria:

- identical inputs always produce identical layout results
- actions are easy to explain in plain geometry terms

## Milestone 8: Undo And Redo

Outcome:

- experimentation is safe

Tasks:

1. add history stack around committed document actions
2. coalesce drag and resize into one history entry each
3. make destructive actions reversible

Exit criteria:

- undo after drag restores the exact prior geometry
- redo reproduces the exact committed result

## Milestone 9: Save And Load JSON

Outcome:

- layouts can be persisted locally

Tasks:

1. version the document schema
2. export document JSON
3. import and validate document JSON
4. handle malformed data gracefully

Exit criteria:

- a saved document can be reopened without geometry drift
- invalid JSON does not crash the editor

## Milestone 10: Grouping

Outcome:

- related items can move as a unit

Tasks:

1. define a minimal group model
2. support group and ungroup actions
3. offset all descendants on group move
4. keep child editing rules explicit and simple

Exit criteria:

- group motion preserves child relative positions
- ungrouping restores direct child editing cleanly

## Detailed Milestone Walkthrough

This section is the "okay, but what do I actually do" version of the milestone list.

## Milestone 1: Viewport Foundations, Explained

This milestone is about building the camera for the editor.

Without this, every later interaction gets confusing because you will not know whether a bug is coming from drag logic or from bad coordinate math.

What you are trying to achieve:

1. blocks have stable positions in document space
2. the user can move the camera around those blocks
3. the user can zoom in and out without changing the actual document data

What state you need:

1. `zoom`
2. `panX`
3. `panY`

What helper functions you need:

1. `screenToCanvas(point, viewport)`
2. `canvasToScreen(point, viewport)`

How to build it:

1. hardcode one or two blocks with canvas-space coordinates
2. render them inside a container that can be transformed by pan and zoom
3. add wheel handling so scrolling adjusts `zoom`
4. when zoom changes, keep the point under the cursor stable if you can
5. add background drag panning by updating `panX` and `panY`

What can go wrong here:

1. zooming toward the top-left instead of toward the cursor
2. pointer math using raw screen coordinates instead of converted canvas coordinates
3. document positions changing when only the camera should change

How to know it is working:

1. a block at `x: 300` is still at `x: 300` in the document no matter how zoomed in you are
2. clicking the same visual point after zoom still maps to the expected canvas position

## Milestone 2: Basic Elements And Selection, Explained

This milestone makes the editor feel like it contains real objects instead of just a background.

What you are trying to achieve:

1. render blocks from document data, not from random inline values scattered through JSX
2. make one block selectable
3. make empty-space clicks clear selection

What state you need:

1. a document object containing blocks by ID
2. an order array if you care about render order
3. a `selectedId` for the first pass

How to build it:

1. define an `ElementModel` with `id`, `x`, `y`, `width`, and `height`
2. define a `DocumentModel` that stores elements
3. render the elements with absolute positioning inside the canvas layer
4. on block pointer down, set the selected block ID
5. on empty canvas pointer down, clear selection
6. add obvious selected styling so you can tell selection works instantly

What can go wrong here:

1. letting view-only properties creep into the saved model too early
2. making selection invisible or ambiguous
3. tightly coupling selection logic to rendering details

How to know it is working:

1. you can add or remove blocks by changing document data only
2. selection state is easy to inspect and reason about

## Milestone 3: Dragging, Explained

This is the first place the editor starts feeling alive.

What you are trying to achieve:

1. click a block
2. drag it smoothly
3. show live movement while dragging
4. commit one final move when the drag ends

Important idea:

- dragging has two phases: preview and commit

Preview means:

- the user is moving the pointer and the UI shows temporary movement

Commit means:

- on pointer up, the final position is written into the document state

Why this split matters:

- it keeps history cleaner
- it avoids needlessly hammering your saved state on every raw movement event

What state you need during drag:

1. which element is being dragged
2. where the pointer started in canvas space
3. what the element rect looked like at drag start
4. what the current preview rect is

How to build it:

1. on pointer down, capture the pointer and record the drag snapshot
2. on pointer move, convert the current pointer into canvas space
3. subtract current pointer from start pointer to get a delta
4. apply that delta to the starting rect to get a preview rect
5. render the preview rect
6. on pointer up, dispatch one `moveElement` action with the final preview values

What can go wrong here:

1. forgetting pointer capture, which makes drag break when the cursor leaves the element
2. using screen deltas instead of canvas deltas under zoom
3. writing document state on every pointer move and making history painful later

How to know it is working:

1. drag stays stable even when zoomed in or out
2. the element ends exactly where the preview showed it would end

## Milestone 4: Resizing, Explained

Resizing is drag logic with more rules.

Instead of moving the whole rect, you are changing one or more edges depending on which handle the user grabbed.

What you are trying to achieve:

1. show resize handles for the selected block
2. let the user drag a handle
3. compute the new width and height predictably

What you need to decide first:

1. which handles exist: corners only, or edges too?
2. whether resizing can flip past zero, or whether you clamp to a minimum size

Recommended simple choice:

1. start with corner handles
2. enforce a minimum width and height
3. do not allow negative sizes yet

How to build it:

1. compute handle positions from the block rect
2. render small visible controls at those positions
3. on handle pointer down, record which handle is active
4. on pointer move, compute how that specific handle should change the rect
5. clamp width and height so they never get too small
6. preview during move, commit on pointer up

What can go wrong here:

1. resizing from the wrong anchor point
2. handles feeling tiny or hard to hit
3. width and height becoming negative and making later math messy

How to know it is working:

1. dragging the bottom-right handle grows down and right
2. dragging the top-left handle moves the top-left corner while preserving the opposite corner as the anchor

## Milestone 5: Snap Guides, Explained

This is where the editor starts helping instead of just reacting.

What you are trying to achieve:

1. when a moving element gets near another element's edge or center, it should line up neatly
2. the user should see why that line-up happened

What snapping actually is:

1. compare the moving rect to nearby target rects
2. look at left, right, and center values on each axis
3. if any values are close enough, compute the offset needed to align them
4. choose the best candidate

Important detail:

- the threshold should usually feel consistent on screen, not in document units

That means:

- if you want an 8-pixel snap feel, you often convert that 8-pixel threshold into canvas units based on current zoom

How to build it:

1. collect stationary rects from every other visible block
2. compare horizontal values separately from vertical values
3. gather possible candidates within threshold
4. choose the closest candidate on each axis
5. return a snapped preview rect and one or two guide lines
6. render those guides in an overlay layer

What can go wrong here:

1. snapping feels too sticky and blocks stop where the user does not want
2. multiple candidates fight each other in confusing ways
3. guide lines appear but do not match the actual snap result

How to know it is working:

1. the editor usually snaps where you expect
2. you can visually explain each snap with the guide that appears

## Milestone 6: Multi-Select And Marquee, Explained

This milestone turns the editor from single-object manipulation into layout editing.

What you are trying to achieve:

1. select more than one block
2. drag a selection box over blocks to select them
3. prepare for align, distribute, and grouping actions

What state changes:

1. `selectedId` becomes something like `selectedIds`
2. you add marquee interaction state: start point, current point, active rectangle

How marquee selection works:

1. user presses on empty canvas
2. instead of panning immediately, you may enter marquee mode depending on the interaction design you choose
3. as the pointer moves, you build a rectangle from the start point to the current point
4. any blocks intersecting that rectangle become selected

One design choice you need to make:

1. is empty-space drag always pan?
2. or does a modifier key switch between pan and marquee?

Recommended simple answer:

1. reserve one interaction for pan and another for marquee
2. do not make one gesture try to mean two different things without a clear rule

How to build it:

1. change selection state to a set or array of IDs
2. add helper functions like `isSelected(id)` and `getSelectionBounds(ids, elements)`
3. render a marquee rectangle during selection drag
4. compute which rects intersect it
5. update selection from that result

What can go wrong here:

1. selection semantics feel inconsistent
2. marquee uses screen space while elements are compared in canvas space
3. users cannot tell whether they are panning or selecting

How to know it is working:

1. selected groups feel obvious on screen
2. batch actions have the right input set later

## Milestone 7: Align And Distribute, Explained

This milestone is where the product starts proving its value.

These actions are not magical. They are deterministic geometry transforms.

What align means:

1. align left: set every selected rect's left edge to the smallest selected left edge
2. align right: set every selected rect's right edge to the largest selected right edge
3. align horizontal center: set each rect's center `x` to a shared center `x`

What distribute means:

1. sort the selected rects by position
2. preserve the outer span from the first rect to the last rect
3. divide the remaining gap space evenly between them

How to build it:

1. write pure functions that take selected rects and return updated rects
2. keep these functions totally independent from React
3. dispatch one document action to apply the result
4. add unit tests for obvious cases and uneven spacing cases

What can go wrong here:

1. distributing based on centers when you meant edges
2. mutating the input array and creating hard-to-debug side effects
3. making the action depend on render order accidentally when you meant geometric order

How to know it is working:

1. identical input selections always produce identical output layouts
2. you can explain each action with one simple sentence

## Milestone 8: Undo And Redo, Explained

This milestone makes the editor safe to explore.

What you are trying to achieve:

1. any committed edit can be rolled back
2. undo does not corrupt state
3. drag and resize feel like one action each in history

The simplest working model is:

1. `past`
2. `present`
3. `future`

How it works:

1. before a committed action, store the current `present` in `past`
2. apply the action to produce the new `present`
3. clear `future`
4. undo pops the latest past state back into `present`
5. redo reapplies from `future`

What should count as a committed action:

1. final drag result on pointer up
2. final resize result on pointer up
3. align action
4. distribute action
5. delete action
6. load action if you want it reversible

What should usually not count as separate history entries:

1. every pointer move during drag
2. every pointer move during resize

What can go wrong here:

1. mutating old states instead of replacing them
2. recording too often and making undo useless
3. forgetting to clear redo history after a new action branch

How to know it is working:

1. undo after drag returns to the exact start state
2. redo gets you back to the exact end state

## Milestone 9: Save And Load JSON, Explained

This milestone makes the work persist.

What you are trying to achieve:

1. export the current document to a file
2. import it later
3. avoid breaking when the file is malformed or outdated

What to store:

1. document version
2. document name or ID if useful
3. all elements and their geometry
4. groups later if they exist

What not to store in the document file:

1. temporary drag previews
2. hover state
3. in-progress marquee rectangles
4. other purely ephemeral interaction state

How to build it:

1. define a versioned JSON shape early
2. create one function that serializes your current document state
3. create one function that validates incoming JSON before accepting it
4. if validation fails, show an error instead of crashing the app
5. after load, verify blocks render in the same places as before save

What can go wrong here:

1. loading invalid data directly into app state
2. forgetting schema versioning and regretting it later
3. mixing file format concerns directly into UI components

How to know it is working:

1. save, reload, and reopen produce the same layout
2. malformed files fail gracefully

## Milestone 10: Grouping, Explained

Grouping is useful, but it is also an easy place to accidentally build a mini layout engine too early.

So keep it simple.

What you are trying to achieve:

1. the user selects several blocks
2. they choose group
3. those blocks can now move together
4. ungroup restores direct editing

Recommended MVP meaning of a group:

1. a logical collection of child IDs
2. not a full container with its own layout rules
3. not an auto-layout parent

How to build it:

1. create a `GroupModel` that mainly stores an ID and child IDs
2. add `groupSelection` and `ungroup` document actions
3. when a group moves, apply the same delta to every child block
4. keep child positions stored explicitly rather than trying to infer everything from a parent transform

One important design decision:

1. can the user directly select a child inside a group?
2. or do they need a special gesture to "drill in"?

Recommended simple answer:

1. keep the interaction explicit
2. do not invent clever nested editing behavior too early

What can go wrong here:

1. groups quietly becoming containers with reflow semantics
2. group resize ballooning into a hard layout problem
3. nested groups making selection behavior confusing before the basics are stable

How to know it is working:

1. moving a group preserves child offsets exactly
2. ungroup returns children to plain independent blocks without weird side effects

## Explicit Non-Goals For This MVP

Do not build these yet:

- persistent constraint editing
- full solver-based layout resolution
- auto-layout containers
- responsive breakpoints
- collaboration
- code export

## Testing Plan

Prioritize unit tests for:

- coordinate transforms
- snapping resolution
- align actions
- distribute actions
- overlap detection
- history correctness

Use browser-level tests later for:

- drag commit behavior
- guide visibility while snapping
- marquee selection behavior

## Suggested Folder Shape

```text
src/
  editor/
    document.ts
    geometry.ts
    snapping.ts
    types.ts
  App.tsx
  main.tsx
  index.css
```

As the app grows, add modules only when the current file boundaries become painful.

## Immediate Next Step

The first worthwhile checkpoint is a tiny editor shell with:

1. pan and zoom
2. three hardcoded blocks
3. single selection
4. pointer-driven drag
5. visible snap guides

Once that works and feels clean, move to resize and multi-select.

## Bottom Line

If the editor core is satisfying, the project is viable.

If the editor core is messy, constraints will not save it. So the build plan should stay ruthlessly focused on geometry, interaction quality, and deterministic state before any advanced rule system work.
