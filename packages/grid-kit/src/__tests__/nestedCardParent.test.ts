import { describe, it, expect } from 'vitest';
import { resolveCardLayout, cardGridStyle } from '../hosts/cardLayout';
import type { ColumnDef } from '../types';

// grid-kit has no jsdom/RTL — these are pure-logic assertions over the shared
// card-layout derivation (used by <CardGrid> and the new <NestedCardParent>) and
// the card-parent multi-expand semantics. The Storybook story is the render proof.

const cols: ColumnDef[] = [
  { key: 'name', fieldName: 'name', name: 'Name', rendererType: 'text' },
  { key: 'image', fieldName: 'image', name: 'Image', rendererType: 'text' },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'text' },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency' },
];

describe('resolveCardLayout (shared card-layout derivation)', () => {
  it('defaults titleField to the first column when unset', () => {
    expect(resolveCardLayout(cols, undefined).titleField).toBe('name');
  });

  it('honors an explicit titleField', () => {
    expect(resolveCardLayout(cols, { titleField: 'status' }).titleField).toBe('status');
  });

  it('defaults cardsPerRow to 3 and honors an explicit value', () => {
    expect(resolveCardLayout(cols, undefined).cardsPerRow).toBe(3);
    expect(resolveCardLayout(cols, { cardsPerRow: 2 }).cardsPerRow).toBe(2);
  });

  it('passes minCardWidth through from CardConfig (undefined when unset)', () => {
    expect(resolveCardLayout(cols, { minCardWidth: 240 }).minCardWidth).toBe(240);
    expect(resolveCardLayout(cols, undefined).minCardWidth).toBeUndefined();
  });

  it('bodyColumns excludes the title/subtitle/image fields by default', () => {
    const { bodyColumns } = resolveCardLayout(cols, {
      titleField: 'name',
      subtitleField: 'status',
      imageField: 'image',
    });
    expect(bodyColumns.map((c) => c.fieldName)).toEqual(['revenue']);
  });

  it('bodyColumns defaults to all but the default (first) title column', () => {
    // titleField defaults to the first column (name) → excluded; subtitle/image unset.
    const { bodyColumns } = resolveCardLayout(cols, undefined);
    expect(bodyColumns.map((c) => c.fieldName)).toEqual(['image', 'status', 'revenue']);
  });

  it('honors explicit bodyFields verbatim (order preserved) and drops unknown fields', () => {
    expect(resolveCardLayout(cols, { bodyFields: ['revenue', 'name'] }).bodyColumns.map((c) => c.fieldName)).toEqual(
      ['revenue', 'name']
    );
    expect(resolveCardLayout(cols, { bodyFields: ['revenue', 'nope'] }).bodyColumns.map((c) => c.fieldName)).toEqual(
      ['revenue']
    );
  });

  it('byField maps every column by fieldName and passes through card sizing', () => {
    const r = resolveCardLayout(cols, { cardHeight: 200, subtitleField: 'status', imageField: 'image' });
    expect(r.byField.size).toBe(4);
    expect(r.byField.get('revenue')?.name).toBe('Revenue');
    expect(r.cardHeight).toBe(200);
    expect(r.subtitleField).toBe('status');
    expect(r.imageField).toBe('image');
  });
});

describe('cardGridStyle (card grid column track)', () => {
  // Pure-CSS assertions — the Storybook ResponsiveCards story is the render proof.

  it('default branch (no minCardWidth) is byte-identical to the legacy fixed grid', () => {
    // toEqual pins the EXACT object: a fixed cardsPerRow-column grid and NO maxWidth,
    // so any drift from the original `repeat(N, minmax(0, 1fr))` fails here.
    expect(cardGridStyle(3)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
    expect(cardGridStyle(2)).toEqual({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' });
  });

  it('treats undefined / 0 / negative minCardWidth as the default branch', () => {
    expect(cardGridStyle(3, undefined)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
    expect(cardGridStyle(3, 0)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
    expect(cardGridStyle(3, -5)).toEqual({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
  });

  it('with minCardWidth: reflowing auto-fill columns, capped at cardsPerRow via maxWidth', () => {
    // maxWidth = N * minCardWidth + (N-1) * gap(12) = 3*240 + 2*12 = 744 — exactly the
    // width at which the 3rd column first fits, so the grid never shows more than 3.
    expect(cardGridStyle(3, 240)).toEqual({
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
      maxWidth: 744,
    });
  });

  it('cardsPerRow=1 caps the grid at a single minCardWidth column (no stretch)', () => {
    // (1-1)*12 = 0 → maxWidth is exactly minCardWidth.
    expect(cardGridStyle(1, 240)).toEqual({
      gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))',
      maxWidth: 240,
    });
  });
});

describe('card-parent expand set (multi-expand semantics)', () => {
  // Mirrors NestedCardParent.toggleExpand: add on first toggle, remove on second;
  // multiple parents can be open at once (no single-expand in v1).
  const toggle = (prev: Set<string>, key: string): Set<string> => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  it('expands then collapses a key while keeping other expanded keys', () => {
    let s = new Set<string>();
    s = toggle(s, 'a');
    expect([...s]).toEqual(['a']);
    s = toggle(s, 'b');
    expect([...s].sort()).toEqual(['a', 'b']); // multi-expand
    s = toggle(s, 'a');
    expect([...s]).toEqual(['b']);
  });
});
