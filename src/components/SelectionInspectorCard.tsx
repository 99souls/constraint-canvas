import {
  FastArrowDown,
  FastArrowUp,
  NavArrowDown,
  NavArrowUp,
  Palette,
  Position,
  Ruler,
} from 'iconoir-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  resolveCssColorToHex,
  type HsvColor,
} from '../lib/color';
import type { SharedValue, InspectorSelectionSummary } from '../lib/inspector';
import type { LayerOrderAction } from '../lib/layering';
import { ColorWheel } from './ColorWheel';

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
  const lastCommittedHexRef = useRef<string>('#777777');
  const sourceColor = props.value.kind === 'single' ? props.value.value : props.previewColor;
  const resolvedColor = useMemo(
    () => resolveCssColorToHex(sourceColor) ?? '#777777',
    [sourceColor],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(resolvedColor);
  const [draftHsv, setDraftHsv] = useState<HsvColor>(() => hexToHsv(resolvedColor));

  useEffect(() => {
    setDraftValue(resolvedColor);
    setDraftHsv(hexToHsv(resolvedColor));
    lastCommittedHexRef.current = resolvedColor;
  }, [resolvedColor]);

  useEffect(() => {
    if (props.disabled) {
      setIsOpen(false);
    }
  }, [props.disabled]);

  const resetDraft = () => {
    setDraftValue(resolvedColor);
    setDraftHsv(hexToHsv(resolvedColor));
  };

  const commitValue = () => {
    const nextValue = normalizeHexColor(draftValue);

    if (!nextValue) {
      resetDraft();
      return;
    }

    if (nextValue === lastCommittedHexRef.current) {
      return;
    }

    lastCommittedHexRef.current = nextValue;
    props.onCommit(nextValue);
  };

  const closePopover = (shouldCommit: boolean) => {
    if (shouldCommit) {
      commitValue();
    } else {
      resetDraft();
    }

    setIsOpen(false);
  };

  const syncDraftFromHsv = (nextHsv: HsvColor) => {
    setDraftHsv(nextHsv);
    setDraftValue(hsvToHex(nextHsv));
  };

  return (
    <div
      className="inspector-field inspector-field-color"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          closePopover(true);
        }
      }}
    >
      <span>{props.label}</span>
      <div className="inspector-color-input">
        <button
          type="button"
          className="inspector-color-swatch-button"
          disabled={props.disabled}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label="Open fill color picker"
          onClick={() => {
            if (props.disabled) {
              return;
            }

            if (isOpen) {
              closePopover(true);
              return;
            }

            setDraftValue(resolvedColor);
            setDraftHsv(hexToHsv(resolvedColor));
            setIsOpen(true);
          }}
        >
          <span
            className="inspector-color-swatch"
            style={{ backgroundColor: props.previewColor }}
          />
        </button>
        <input
          type="text"
          value={draftValue}
          disabled={props.disabled}
          placeholder={props.value.kind === 'mixed' ? 'Mixed' : ''}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              closePopover(true);
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              closePopover(false);
            }
          }}
        />
      </div>

      {isOpen ? (
        <div className="inspector-color-popover" role="dialog" aria-label="Fill color picker">
          <div className="inspector-color-preview-row">
            <span>Preview</span>
            <span className="inspector-color-preview" style={{ backgroundColor: draftValue }} />
          </div>

          <div style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <ColorWheel value={draftHsv} onChange={syncDraftFromHsv} size={180} />
          </div>

          <div className="inspector-color-actions">
            <button
              type="button"
              className="inspector-color-action"
              onClick={() => closePopover(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inspector-color-action is-primary"
              onClick={() => closePopover(true)}
            >
              Apply
            </button>
          </div>
        </div>
      ) : null}
    </div>
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
