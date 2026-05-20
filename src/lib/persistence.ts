import type { CanvasDocument } from "../types/Document";
import type { Shape } from "../types/Shape";

const AUTOSAVE_STORAGE_KEY = "constraint-canvas.autosave.v1";
const DOCUMENT_VERSION = 1;

type SerializedDocument = {
  version: number;
  document: CanvasDocument;
};

type SerializedAutosave = SerializedDocument & {
  savedAt: number;
};

export type AutosaveSnapshot = {
  document: CanvasDocument;
  savedAt: number;
};

export function serializeDocument(canvasDocument: CanvasDocument): string {
  return JSON.stringify(
    {
      version: DOCUMENT_VERSION,
      document: canvasDocument,
    },
    null,
    2,
  );
}

export function parseDocument(serializedDocument: string): CanvasDocument {
  let parsedDocument: unknown;

  try {
    parsedDocument = JSON.parse(serializedDocument);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!isSerializedDocument(parsedDocument)) {
    throw new Error("The selected file does not match the expected document format.");
  }

  return cloneDocument(parsedDocument.document);
}

export function downloadDocument(canvasDocument: CanvasDocument): void {
  const serializedDocument = serializeDocument(canvasDocument);
  const blob = new Blob([serializedDocument], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replaceAll(":", "-");

  anchor.href = objectUrl;
  anchor.download = `constraint-canvas-${timestamp}.json`;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export function saveAutosave(canvasDocument: CanvasDocument): AutosaveSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const snapshot: SerializedAutosave = {
    version: DOCUMENT_VERSION,
    savedAt: Date.now(),
    document: canvasDocument,
  };

  window.localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(snapshot));

  return {
    document: cloneDocument(canvasDocument),
    savedAt: snapshot.savedAt,
  };
}

export function loadAutosave(): AutosaveSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const serializedAutosave = window.localStorage.getItem(AUTOSAVE_STORAGE_KEY);

  if (!serializedAutosave) {
    return null;
  }

  let parsedAutosave: unknown;

  try {
    parsedAutosave = JSON.parse(serializedAutosave);
  } catch {
    return null;
  }

  if (!isSerializedAutosave(parsedAutosave)) {
    return null;
  }

  return {
    document: cloneDocument(parsedAutosave.document),
    savedAt: parsedAutosave.savedAt,
  };
}

export function clearAutosave(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
}

function isSerializedDocument(value: unknown): value is SerializedDocument {
  if (!isRecord(value)) {
    return false;
  }

  return value.version === DOCUMENT_VERSION && isCanvasDocument(value.document);
}

function isSerializedAutosave(value: unknown): value is SerializedAutosave {
  return isSerializedDocument(value) && typeof value.savedAt === "number";
}

function isCanvasDocument(value: unknown): value is CanvasDocument {
  return isRecord(value) && Array.isArray(value.shapes) && value.shapes.every(isShape);
}

function isShape(value: unknown): value is Shape {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.type === "rectangle" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.width === "number" &&
    typeof value.height === "number" &&
    typeof value.color === "string" &&
    (value.groupId === undefined || typeof value.groupId === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function cloneDocument(document: CanvasDocument): CanvasDocument {
  return {
    shapes: document.shapes.map((shape) => ({
      ...shape,
    })),
  };
}
