import {
  AlignBottomBox,
  AlignHorizontalCenters,
  AlignHorizontalSpacing,
  AlignLeftBox,
  AlignRightBox,
  AlignTopBox,
  FastArrowDown,
  FastArrowUp,
  NavArrowDown,
  NavArrowUp,
  AlignVerticalCenters,
  AlignVerticalSpacing,
  RedoAction,
  UndoAction,
  ViewGrid,
} from 'iconoir-react';

import type { LayerOrderAction } from '../lib/layering';
import type { AlignMode } from '../lib/layout';

type CanvasToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  canAlign: boolean;
  canDistribute: boolean;
  canLayer: boolean;
  gridSnapEnabled: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: 'horizontal' | 'vertical') => void;
  onLayerOrder: (order: LayerOrderAction) => void;
  onToggleGridSnap: () => void;
};

export function CanvasToolbar(props: CanvasToolbarProps) {
  return (
    <div
      className="toolbar"
      aria-label="Canvas toolbar"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="toolbar-group" role="group" aria-label="History">
        <button
          type="button"
          className="toolbar-button"
          onClick={props.onUndo}
          disabled={!props.canUndo}
          title="Undo (⌘Z)"
        >
          <UndoAction />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={props.onRedo}
          disabled={!props.canRedo}
          title="Redo (⌘⇧Z)"
        >
          <RedoAction />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" role="group" aria-label="Alignment">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('left')}
          disabled={!props.canAlign}
          title="Align Left"
        >
          <AlignLeftBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('right')}
          disabled={!props.canAlign}
          title="Align Right"
        >
          <AlignRightBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('top')}
          disabled={!props.canAlign}
          title="Align Top"
        >
          <AlignTopBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('bottom')}
          disabled={!props.canAlign}
          title="Align Bottom"
        >
          <AlignBottomBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('horizontal-center')}
          disabled={!props.canAlign}
          title="Center Horizontally"
        >
          <AlignHorizontalCenters />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign('vertical-center')}
          disabled={!props.canAlign}
          title="Center Vertically"
        >
          <AlignVerticalCenters />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" role="group" aria-label="Layer order">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onLayerOrder('send-to-back')}
          disabled={!props.canLayer}
          title="Send to Back"
        >
          <FastArrowDown />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onLayerOrder('send-backward')}
          disabled={!props.canLayer}
          title="Send Backward"
        >
          <NavArrowDown />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onLayerOrder('bring-forward')}
          disabled={!props.canLayer}
          title="Bring Forward"
        >
          <NavArrowUp />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onLayerOrder('bring-to-front')}
          disabled={!props.canLayer}
          title="Bring to Front"
        >
          <FastArrowUp />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" role="group" aria-label="Distribution">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onDistribute('horizontal')}
          disabled={!props.canDistribute}
          title="Distribute Horizontally"
        >
          <AlignHorizontalSpacing />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onDistribute('vertical')}
          disabled={!props.canDistribute}
          title="Distribute Vertically"
        >
          <AlignVerticalSpacing />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" role="group" aria-label="Snap settings">
        <button
          type="button"
          className={`toolbar-button${props.gridSnapEnabled ? ' is-active' : ''}`}
          onClick={props.onToggleGridSnap}
          title={props.gridSnapEnabled ? 'Disable Grid Snap' : 'Enable Grid Snap'}
          aria-pressed={props.gridSnapEnabled}
        >
          <ViewGrid />
        </button>
      </div>
    </div>
  );
}
