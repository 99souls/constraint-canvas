import { describe, expect, it } from 'vitest';

import { createInitialDocument } from '../types/Document';
import { parseDocument, serializeDocument } from './persistence';

describe('persistence', () => {
  it('serializes and parses a document', () => {
    const document = createInitialDocument();
    const parsedDocument = parseDocument(serializeDocument(document));

    expect(parsedDocument).toEqual(document);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseDocument('{this is not valid json}')).toThrowError(
      'The selected file is not valid JSON.',
    );
  });

  it('throws on invalid document shape', () => {
    expect(() =>
      parseDocument(JSON.stringify({ version: 1, document: { shapes: [{ id: 3 }] } })),
    ).toThrowError('The selected file does not match the expected document format.');
  });
});
