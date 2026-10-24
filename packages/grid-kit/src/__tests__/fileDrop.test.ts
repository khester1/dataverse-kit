import { describe, it, expect } from 'vitest';
import { isFileAccepted } from '../dnd/useFileDrop';
import { createCellRegistry } from '../registry';
import type { ColumnDef } from '../types';

describe('isFileAccepted', () => {
  it('empty/undefined accept allows anything', () => {
    expect(isFileAccepted('x.exe')).toBe(true);
    expect(isFileAccepted('x.exe', [])).toBe(true);
  });

  it('matches case-insensitively, leading dot optional', () => {
    expect(isFileAccepted('Report.PDF', ['.pdf'])).toBe(true);
    expect(isFileAccepted('photo.JPG', ['jpg', 'png'])).toBe(true);
  });

  it('rejects non-matching extensions', () => {
    expect(isFileAccepted('notes.txt', ['.pdf', '.png'])).toBe(false);
    expect(isFileAccepted('archive.tar.gz', ['.zip'])).toBe(false);
  });
});

describe('fileDrop cell type', () => {
  it('is registered with a read renderer and resolves', () => {
    const r = createCellRegistry();
    expect(typeof r.get('fileDrop')?.read).toBe('function');
    const col: ColumnDef = { key: 'doc', fieldName: 'doc', name: 'Doc', rendererType: 'fileDrop' };
    expect(r.resolve(col, false)).toBe(r.get('fileDrop')!.read);
  });
});
