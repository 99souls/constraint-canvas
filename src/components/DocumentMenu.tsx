import {
  Copy,
  Download,
  FloppyDisk,
  Group,
  MenuScale,
  PagePlus,
  RefreshCircle,
  Trash,
  Unjoin3d,
  Upload,
} from 'iconoir-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';

type MenuAction = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  disabled?: boolean;
};

type DocumentMenuProps = {
  autosaveLabel: string;
  canRestoreAutosave: boolean;
  canEditSelection: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  onNewDocument: () => void;
  onExportDocument: () => void;
  onImportDocument: () => void;
  onRestoreAutosave: () => void;
  onClearAutosave: () => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onGroupSelection: () => void;
  onUngroupSelection: () => void;
};

export function DocumentMenu(props: DocumentMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const {
    autosaveLabel,
    canRestoreAutosave,
    canEditSelection,
    canGroup,
    canUngroup,
    onOpenChange,
    onNewDocument,
    onExportDocument,
    onImportDocument,
    onRestoreAutosave,
    onClearAutosave,
    onDuplicateSelection,
    onDeleteSelection,
    onGroupSelection,
    onUngroupSelection,
  } = props;

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const documentActions: MenuAction[] = [
    { label: 'New Document', icon: PagePlus, onSelect: onNewDocument },
    { label: 'Export JSON', icon: Download, onSelect: onExportDocument },
    { label: 'Import JSON', icon: Upload, onSelect: onImportDocument },
    {
      label: 'Restore Autosave',
      icon: RefreshCircle,
      onSelect: onRestoreAutosave,
      disabled: !canRestoreAutosave,
    },
    {
      label: 'Clear Autosave',
      icon: Trash,
      onSelect: onClearAutosave,
      disabled: !canRestoreAutosave,
    },
  ];
  const selectionActions: MenuAction[] = [
    {
      label: 'Duplicate Selection',
      icon: Copy,
      onSelect: onDuplicateSelection,
      disabled: !canEditSelection,
    },
    {
      label: 'Delete Selection',
      icon: Trash,
      onSelect: onDeleteSelection,
      disabled: !canEditSelection,
    },
    {
      label: 'Group Selection',
      icon: Group,
      onSelect: onGroupSelection,
      disabled: !canGroup,
    },
    {
      label: 'Ungroup Selection',
      icon: Unjoin3d,
      onSelect: onUngroupSelection,
      disabled: !canUngroup,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="document-menu-shell"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="document-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="document-menu-dropdown"
        onClick={() => setIsOpen((current) => !current)}
      >
        <MenuScale />
      </button>

      {isOpen ? (
        <div
          id="document-menu-dropdown"
          className="document-menu-dropdown"
          role="menu"
          aria-label="Document menu"
        >
          <div className="document-menu-section">
            <p className="document-menu-title">Document</p>
            <p className="document-menu-status">
              <FloppyDisk className="document-menu-icon" />
              {autosaveLabel}
            </p>
            {documentActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  className="document-menu-item"
                  disabled={action.disabled}
                  onClick={() => {
                    action.onSelect();
                    setIsOpen(false);
                  }}
                >
                  <Icon className="document-menu-icon" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>

          <div className="document-menu-divider" />

          <div className="document-menu-section">
            <p className="document-menu-title">Selection</p>
            {selectionActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  className="document-menu-item"
                  disabled={action.disabled}
                  onClick={() => {
                    action.onSelect();
                    setIsOpen(false);
                  }}
                >
                  <Icon className="document-menu-icon" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
