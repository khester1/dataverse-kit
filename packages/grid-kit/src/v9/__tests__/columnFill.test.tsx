// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { render, cleanup } from '@testing-library/react';
import type { ColumnDef } from '../../types';
import { DataGrid } from '../hosts/DataGrid';
import { wrapper } from './testUtils';

interface Row extends Record<string, unknown> {
  key: string;
  a: string;
  b: string;
  c: number;
}
const items: Row[] = [{ key: '1', a: 'x', b: 'y', c: 5 }];
const columns: ColumnDef<Row>[] = [
  { key: 'a', fieldName: 'a', name: 'A', rendererType: 'text', width: 300 },
  { key: 'b', fieldName: 'b', name: 'B', rendererType: 'text', width: 100 },
  { key: 'c', fieldName: 'c', name: 'C', rendererType: 'number', width: 150, minWidth: 60, aggregate: 'sum' },
];

const headerCells = (): HTMLElement[] => [...document.querySelectorAll('[role="columnheader"]')] as HTMLElement[];
const footerCells = (): HTMLElement[] =>
  [...document.querySelectorAll('[data-gridkit-aggregate-footer] [role="gridcell"]')] as HTMLElement[];

// A ResizeObserver that reports a fixed content width — jsdom has no layout.
let reported = 0;
const RealRO = (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
beforeEach(() => {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    constructor(private cb: (e: Array<{ contentRect: { width: number } }>) => void) {}
    observe(): void {
      this.cb([{ contentRect: { width: reported } }]);
    }
    unobserve(): void {}
    disconnect(): void {}
  };
});
afterEach(() => {
  cleanup();
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RealRO;
});

describe("v9 DataGrid columnFill: 'proportional'", () => {
  // ★★ jsdom has no layout, so these pin the STYLE width Fluent is given, which is the CONTENT box:
  //    Fluent cells add 8px padding each side, so rendered = style + 16 (MEASURED in Chrome by
  //    shared/pcf-gallery/scripts/verify-aggregate-footer-browser.mjs, which pins rendered pixels).
  it('resizable: widths scale by ONE factor to fill the measured container (selection cell excluded)', () => {
    reported = 1100 + 44; // 550 of base widths → factor 2 after the 44px selection cell
    render(<DataGrid items={items} columns={columns} resizableColumns columnFill="proportional" selectionMode="multiple" />, { wrapper });
    // rendered 600/200/300 = base × 2  ⇒  content widths 584/184/284
    expect(headerCells().map((h) => h.style.width)).toEqual(['584px', '184px', '284px']);
    // the in-grid footer joins the same sizing
    expect(footerCells().map((c) => c.style.width)).toEqual(['584px', '184px', '284px']);
  });

  it('resizable: a container narrower than the columns keeps the base widths (scrolls, never shrinks)', () => {
    reported = 400;
    render(<DataGrid items={items} columns={columns} resizableColumns columnFill="proportional" />, { wrapper });
    // rendered = the view widths exactly (300/100/150) ⇒ content 284/84/134
    expect(headerCells().map((h) => h.style.width)).toEqual(['284px', '84px', '134px']);
  });

  it('non-resizable: CSS flex in proportion to the base width on header, body AND footer cells', () => {
    reported = 0; // no measurement needed on this path
    render(<DataGrid items={items} columns={columns} columnFill="proportional" />, { wrapper });
    // grow ∝ view width, basis = view width − 16 ⇒ rendered = view width × one factor, exactly
    const want = ['300 0 284px', '100 0 84px', '150 0 134px'];
    expect(headerCells().map((h) => h.style.flex)).toEqual(want);
    const body = [...document.querySelectorAll('[role="rowgroup"]:not([data-gridkit-aggregate-footer]) [role="gridcell"]')] as HTMLElement[];
    expect(body.map((c) => c.style.flex)).toEqual(want);
    expect(footerCells().map((c) => c.style.flex)).toEqual(want);
  });

  it("default 'none' is unchanged: no flex style, resizable ideal = width", () => {
    reported = 1144;
    render(<DataGrid items={items} columns={columns} resizableColumns resizableColumnsOptions={{ autoFitColumns: false }} />, { wrapper });
    expect(headerCells().map((h) => h.style.width)).toEqual(['300px', '100px', '150px']);
    cleanup();
    render(<DataGrid items={items} columns={columns} />, { wrapper });
    expect(headerCells().every((h) => h.style.flex === '')).toBe(true);
  });
});
