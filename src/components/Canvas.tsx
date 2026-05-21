import type { Shape } from './../types/Shape';
import { CanvasToolbar } from './CanvasToolbar';
import { DocumentMenu } from './DocumentMenu';
import { SelectionInspectorCard } from './SelectionInspectorCard';
import { useCanvasEditor } from './useCanvasEditor';

export default function Canvas() {
  const editor = useCanvasEditor();

  return (
    <div
      ref={editor.worldRef}
      className="world"
      style={editor.worldStyle}
      onPointerDown={editor.handlePointerDown}
      onPointerMove={editor.handlePointerMove}
      onPointerUp={editor.handlePointerUp}
      onPointerCancel={editor.handlePointerCancel}
    >
      <DocumentMenu {...editor.menuProps} />
      <input
        ref={editor.fileInputRef}
        type="file"
        accept="application/json"
        className="visually-hidden"
        onChange={editor.handleImportFileChange}
      />

      <div className="screen" onWheel={editor.handleWheel} style={editor.screenStyle}>
        {editor.renderedShapes.map((shape: Shape) => (
          <div
            key={'shape' + shape.id}
            className={`shape${editor.selectedShapeIds.includes(shape.id) ? ' is-selected' : ''}${
              editor.interaction.mode === 'dragging-shapes' &&
              editor.interaction.shapeIds.includes(shape.id)
                ? ' is-dragging'
                : ''
            }${editor.overlappingShapeIds.includes(shape.id) ? ' is-overlapping' : ''}${
              editor.interaction.mode === 'resizing-shape' &&
              editor.interaction.shapeId === shape.id
                ? ' is-resizing'
                : ''
            }`}
            style={{
              left: shape.x + 'px',
              top: shape.y + 'px',
              width: shape.width,
              height: shape.height,
              backgroundColor: shape.color,
            }}
            onPointerDown={(event) => editor.handleShapePointerDown(event, shape.id)}
          />
        ))}

        {editor.selectionFrame ? (
          <div
            className="selection-frame"
            style={{
              left: editor.selectionFrame.x,
              top: editor.selectionFrame.y,
              width: editor.selectionFrame.width,
              height: editor.selectionFrame.height,
            }}
          >
            {editor.resizeHandles.map((handle) => (
              <div
                key={handle}
                className={`resize-handle resize-handle-${handle}`}
                onPointerDown={(event) =>
                  editor.handleResizeHandlePointerDown(event, editor.selectionFrame.shapeId, handle)
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <svg className="overlay" aria-hidden="true">
        <g
          transform={`translate(${editor.viewport.panX}, ${editor.viewport.panY}) scale(${editor.viewport.zoom})`}
        >
          {editor.activeGuides.map((guide) => {
            if (guide.orientation === 'vertical') {
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

          {editor.marqueeRect ? (
            <rect
              className="marquee"
              x={editor.marqueeRect.x}
              y={editor.marqueeRect.y}
              width={editor.marqueeRect.width}
              height={editor.marqueeRect.height}
            />
          ) : null}
        </g>
      </svg>

      <SelectionInspectorCard {...editor.inspectorProps} />

      <CanvasToolbar {...editor.toolbarProps} />
    </div>
  );
}
