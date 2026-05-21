import {
  FastArrowDown,
  FastArrowUp,
  NavArrowDown,
  NavArrowUp,
  Palette,
  Position,
  Ruler,
} from 'iconoir-react';
import { useEffect, useState, type ReactNode } from 'react';

import type { SharedValue, InspectorSelectionSummary } from '../lib/inspector';
import type { LayerOrderAction } from '../lib/layering';

type SelectionInspectorCardProps = {
  summary: InspectorSelectionSummary | null;
  disabled: boolean;
  minWidth: number;
  minHeight: number;
  canLayer: boolean;
  onPatchSelection: (
    patch: Partial<{
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
    }>,
  ) => void;
  onLayerOrder: (order: LayerOrderAction) => void;
};

export function SelectionInspectorCard(props: SelectionInspectorCardProps) {
  if (!props.summary) {
    return null;
  }

  return (
    <section
      className="inspector-card"
      aria-label="Selection inspector"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="inspector-card-header">
        <div>
          <p className="inspector-kicker">Inspector</p>
          <h2>{props.summary.title}</h2>
          <p className="inspector-detail">{props.summary.detail}</p>
        </div>
      </header>

      <section className="inspector-section">
        <div className="inspector-section-title">
          <Position className="inspector-icon" />
          <span>Geometry</span>
        </div>

        <div className="inspector-grid">
          <InspectorNumberField
            label="X"
            value={props.summary.x}
            disabled={props.disabled}
            onCommit={(value) => props.onPatchSelection({ x: value })}
          />
          <InspectorNumberField
            label="Y"
            value={props.summary.y}
            disabled={props.disabled}
            onCommit={(value) => props.onPatchSelection({ y: value })}
          />
          <InspectorNumberField
            label="W"
            value={props.summary.width}
            disabled={props.disabled}
            min={props.minWidth}
            onCommit={(value) => props.onPatchSelection({ width: value })}
          />
          <InspectorNumberField
            label="H"
            value={props.summary.height}
            disabled={props.disabled}
            min={props.minHeight}
            onCommit={(value) => props.onPatchSelection({ height: value })}
          />
        </div>
      </section>

      <section className="inspector-section">
        <div className="inspector-section-title">
          <Palette className="inspector-icon" />
          <span>Appearance</span>
        </div>

        <InspectorColorField
          label="Fill"
          value={props.summary.color}
          previewColor={props.summary.colorPreview}
          disabled={props.disabled}
          onCommit={(value) => props.onPatchSelection({ color: value })}
        />
      </section>

      <section className="inspector-section">
        <div className="inspector-section-title">
          <Ruler className="inspector-icon" />
          <span>Layering</span>
        </div>

        <div className="inspector-layer-actions">
          <LayerActionButton
            label="To Back"
            icon={<FastArrowDown className="inspector-icon" />}
            disabled={props.disabled || !props.canLayer}
            onClick={() => props.onLayerOrder('send-to-back')}
          />
          <LayerActionButton
            label="Back"
            icon={<NavArrowDown className="inspector-icon" />}
            disabled={props.disabled || !props.canLayer}
            onClick={() => props.onLayerOrder('send-backward')}
          />
          <LayerActionButton
            label="Front"
            icon={<NavArrowUp className="inspector-icon" />}
            disabled={props.disabled || !props.canLayer}
            onClick={() => props.onLayerOrder('bring-forward')}
          />
          <LayerActionButton
            label="To Front"
            icon={<FastArrowUp className="inspector-icon" />}
            disabled={props.disabled || !props.canLayer}
            onClick={() => props.onLayerOrder('bring-to-front')}
          />
        </div>
      </section>
    </section>
  );
}

type InspectorNumberFieldProps = {
  label: string;
  value: SharedValue<number>;
  disabled: boolean;
  min?: number;
  onCommit: (value: number) => void;
};

function InspectorNumberField(props: InspectorNumberFieldProps) {
  const valueText = getSharedValueText(props.value);
  const [draftValue, setDraftValue] = useState(valueText);

  useEffect(() => {
    setDraftValue(valueText);
  }, [valueText]);

  const resetDraft = () => {
    setDraftValue(valueText);
  };

  const commitValue = () => {
    if (draftValue.trim() === '') {
      resetDraft();
      return;
    }

    const nextValue = Number(draftValue);

    if (!Number.isFinite(nextValue) || (props.min !== undefined && nextValue < props.min)) {
      resetDraft();
      return;
    }

    props.onCommit(nextValue);
  };

  return (
    <label className="inspector-field">
      <span>{props.label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draftValue}
        disabled={props.disabled}
        placeholder={props.value.kind === 'mixed' ? 'Mixed' : ''}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={commitValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }

          if (event.key === 'Escape') {
            resetDraft();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

type InspectorColorFieldProps = {
  label: string;
  value: SharedValue<string>;
  previewColor: string;
  disabled: boolean;
  onCommit: (value: string) => void;
};

function InspectorColorField(props: InspectorColorFieldProps) {
  const valueText = getSharedValueText(props.value);
  const [draftValue, setDraftValue] = useState(valueText);

  useEffect(() => {
    setDraftValue(valueText);
  }, [valueText]);

  const resetDraft = () => {
    setDraftValue(valueText);
  };

  const commitValue = () => {
    const nextValue = draftValue.trim();

    if (nextValue === '') {
      resetDraft();
      return;
    }

    props.onCommit(nextValue);
  };

  return (
    <label className="inspector-field inspector-field-color">
      <span>{props.label}</span>
      <div className="inspector-color-input">
        <span className="inspector-color-swatch" style={{ backgroundColor: props.previewColor }} />
        <input
          type="text"
          value={draftValue}
          disabled={props.disabled}
          placeholder={props.value.kind === 'mixed' ? 'Mixed' : ''}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }

            if (event.key === 'Escape') {
              resetDraft();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </label>
  );
}

type LayerActionButtonProps = {
  label: string;
  icon: ReactNode;
  disabled: boolean;
  onClick: () => void;
};

function LayerActionButton(props: LayerActionButtonProps) {
  return (
    <button
      type="button"
      className="inspector-layer-button"
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.icon}
      <span>{props.label}</span>
    </button>
  );
}

function getSharedValueText(value: SharedValue<number | string>): string {
  if (value.kind !== 'single') {
    return '';
  }

  return String(value.value);
}
