import {
  AlignBottomBox,
  AlignHorizontalCenters,
  AlignHorizontalSpacing,
  AlignLeftBox,
  AlignRightBox,
  AlignTopBox,
  AlignVerticalCenters,
  AlignVerticalSpacing,
  RedoAction,
  UndoAction,
} from "iconoir-react";
import type { AlignMode } from "../lib/layout";

type CanvasToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  canAlign: boolean;
  canDistribute: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAlign: (mode: AlignMode) => void;
  onDistribute: (axis: "horizontal" | "vertical") => void;
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
          onClick={() => props.onAlign("left")}
          disabled={!props.canAlign}
          title="Align Left"
        >
          <AlignLeftBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign("right")}
          disabled={!props.canAlign}
          title="Align Right"
        >
          <AlignRightBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign("top")}
          disabled={!props.canAlign}
          title="Align Top"
        >
          <AlignTopBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign("bottom")}
          disabled={!props.canAlign}
          title="Align Bottom"
        >
          <AlignBottomBox />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign("horizontal-center")}
          disabled={!props.canAlign}
          title="Center Horizontally"
        >
          <AlignHorizontalCenters />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onAlign("vertical-center")}
          disabled={!props.canAlign}
          title="Center Vertically"
        >
          <AlignVerticalCenters />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group" role="group" aria-label="Distribution">
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onDistribute("horizontal")}
          disabled={!props.canDistribute}
          title="Distribute Horizontally"
        >
          <AlignHorizontalSpacing />
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => props.onDistribute("vertical")}
          disabled={!props.canDistribute}
          title="Distribute Vertically"
        >
          <AlignVerticalSpacing />
        </button>
      </div>
    </div>
  );
}
